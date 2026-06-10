<?php

function db(): SQLite3
{
    static $db = null;
    if ($db !== null) {
        return $db;
    }

    $dataDir = getenv('DATA_DIR') ?: dirname(__DIR__) . '/data';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }

    $dbPath = getenv('DATABASE_PATH') ?: $dataDir . '/tennis-league.db';
    $db = new SQLite3($dbPath);
    $db->enableExceptions(true);
    $db->exec('PRAGMA foreign_keys = ON');

    $db->exec('
        CREATE TABLE IF NOT EXISTS players (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            photo TEXT
        );
        CREATE TABLE IF NOT EXISTS seasons (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS matches (
            id TEXT PRIMARY KEY,
            season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
            player1_id TEXT NOT NULL,
            player2_id TEXT NOT NULL,
            sets TEXT NOT NULL,
            played_at TEXT NOT NULL,
            notes TEXT
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    ');

    migrate_players_photo_column($db);
    migrate_auth_tables($db);

    return $db;
}

function migrate_auth_tables(SQLite3 $db): void
{
    $db->exec('
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            player_id TEXT,
            is_admin INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );
    ');

    $playerCols = $db->query('PRAGMA table_info(players)');
    $hasUserId = false;
    while ($col = $playerCols->fetchArray(SQLITE3_ASSOC)) {
        if (($col['name'] ?? '') === 'user_id') {
            $hasUserId = true;
            break;
        }
    }
    if (!$hasUserId) {
        $db->exec('ALTER TABLE players ADD COLUMN user_id TEXT');
    }

    $userCols = [];
    $result = $db->query('PRAGMA table_info(users)');
    while ($col = $result->fetchArray(SQLITE3_ASSOC)) {
        $userCols[] = $col['name'] ?? '';
    }
    if ($userCols && !in_array('username', $userCols, true)) {
        $db->exec('DROP TABLE IF EXISTS users');
        $db->exec('
            CREATE TABLE users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                player_id TEXT,
                is_admin INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
        ');
    } elseif (!in_array('is_admin', $userCols, true)) {
        $db->exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
    }

    $adminUsername = trim(getenv('ADMIN_USERNAME') ?: ($GLOBALS['APP_CONFIG']['ADMIN_USERNAME'] ?? ''));
    if ($adminUsername !== '') {
        $stmt = $db->prepare('UPDATE users SET is_admin = 1 WHERE username = :username COLLATE NOCASE');
        $stmt->bindValue(':username', $adminUsername, SQLITE3_TEXT);
        $stmt->execute();
    }
}

function migrate_players_photo_column(SQLite3 $db): void
{
    $columns = $db->query('PRAGMA table_info(players)');
    while ($col = $columns->fetchArray(SQLITE3_ASSOC)) {
        if (($col['name'] ?? '') === 'photo') {
            return;
        }
    }
    $db->exec('ALTER TABLE players ADD COLUMN photo TEXT');
}

function uploads_dir(): string
{
    $dir = getenv('UPLOADS_DIR') ?: dirname(__DIR__) . '/uploads';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

function public_base(): string
{
    $script = $_SERVER['SCRIPT_NAME'] ?? '';
    $base = dirname(dirname($script));
    if ($base === '/' || $base === '\\' || $base === '.') {
        return '';
    }
    return rtrim($base, '/');
}

function photo_url(?string $photo): ?string
{
    if ($photo === null || $photo === '') {
        return null;
    }
    $path = uploads_dir() . '/' . $photo;
    $v = is_file($path) ? filemtime($path) : time();
    return public_base() . '/uploads/' . $photo . '?v=' . $v;
}

function format_player(array $row): array
{
    return [
        'id' => $row['id'],
        'name' => $row['name'],
        'photoUrl' => photo_url($row['photo'] ?? null),
        'isClaimed' => !empty($row['user_id']),
    ];
}

function get_player(string $id): ?array
{
    $stmt = db()->prepare('SELECT id, name, photo, user_id FROM players WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
    return $row ? format_player($row) : null;
}

function delete_player_photo_file(?string $photo): void
{
    if ($photo === null || $photo === '') {
        return;
    }
    $path = uploads_dir() . '/' . $photo;
    if (is_file($path)) {
        unlink($path);
    }
}

function delete_player_completely(string $playerId): bool
{
    $db = db();
    $stmt = $db->prepare('SELECT photo, user_id FROM players WHERE id = :id');
    $stmt->bindValue(':id', $playerId, SQLITE3_TEXT);
    $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
    if (!$row) {
        return false;
    }

    delete_player_photo_file($row['photo'] ?? null);

    $stmt = $db->prepare('DELETE FROM matches WHERE player1_id = :id OR player2_id = :id');
    $stmt->bindValue(':id', $playerId, SQLITE3_TEXT);
    $stmt->execute();

    if (!empty($row['user_id'])) {
        $stmt = $db->prepare('DELETE FROM users WHERE id = :id');
        $stmt->bindValue(':id', $row['user_id'], SQLITE3_TEXT);
        $stmt->execute();
    }

    $stmt = $db->prepare('DELETE FROM users WHERE player_id = :id');
    $stmt->bindValue(':id', $playerId, SQLITE3_TEXT);
    $stmt->execute();

    $stmt = $db->prepare('DELETE FROM players WHERE id = :id');
    $stmt->bindValue(':id', $playerId, SQLITE3_TEXT);
    $stmt->execute();

    return true;
}

function uid(): string
{
    return bin2hex(random_bytes(16));
}

function json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond(int $code, mixed $data = null): void
{
    http_response_code($code);
    if ($data !== null) {
        echo json_encode($data);
    }
    exit;
}

function get_active_season_id(): ?string
{
    $db = db();
    $stmt = $db->prepare("SELECT value FROM settings WHERE key = 'activeSeasonId'");
    $result = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
    return $result['value'] ?? null;
}

function set_active_season_id(?string $id): void
{
    $db = db();
    if ($id === null) {
        $db->exec("DELETE FROM settings WHERE key = 'activeSeasonId'");
        return;
    }
    $stmt = $db->prepare(
        "INSERT INTO settings (key, value) VALUES ('activeSeasonId', :id)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    );
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    $stmt->execute();
}

function get_setting_value(string $key): ?string
{
    $stmt = db()->prepare('SELECT value FROM settings WHERE key = :key');
    $stmt->bindValue(':key', $key, SQLITE3_TEXT);
    $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
    return isset($row['value']) ? (string) $row['value'] : null;
}

function set_setting_value(string $key, string $value): void
{
    $stmt = db()->prepare(
        'INSERT INTO settings (key, value) VALUES (:key, :value)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    $stmt->bindValue(':key', $key, SQLITE3_TEXT);
    $stmt->bindValue(':value', $value, SQLITE3_TEXT);
    $stmt->execute();
}

function delete_setting_value(string $key): void
{
    $stmt = db()->prepare('DELETE FROM settings WHERE key = :key');
    $stmt->bindValue(':key', $key, SQLITE3_TEXT);
    $stmt->execute();
}

function default_site_title(): string
{
    return 'Tennis League';
}

function default_site_tagline(): string
{
    return 'Shared standings for your crew';
}

function get_site_title(): string
{
    $value = trim(get_setting_value('siteTitle') ?? '');
    return $value !== '' ? $value : default_site_title();
}

function get_site_tagline(): string
{
    $value = trim(get_setting_value('siteTagline') ?? '');
    return $value !== '' ? $value : default_site_tagline();
}

function get_branding(): array
{
    return [
        'logoUrl' => get_logo_url(),
        'title' => get_site_title(),
        'tagline' => get_site_tagline(),
    ];
}

function save_site_branding(string $title, string $tagline): array
{
    $title = trim($title);
    $tagline = trim($tagline);
    if ($title === '') {
        respond(400, ['error' => 'Title is required']);
    }
    if (strlen($title) > 60) {
        respond(400, ['error' => 'Title must be 60 characters or less']);
    }
    if (strlen($tagline) > 120) {
        respond(400, ['error' => 'Tagline must be 120 characters or less']);
    }

    set_setting_value('siteTitle', $title);
    if ($tagline === '') {
        delete_setting_value('siteTagline');
    } else {
        set_setting_value('siteTagline', $tagline);
    }

    return get_branding();
}

function get_logo_url(): ?string
{
    $stmt = db()->prepare("SELECT value FROM settings WHERE key = 'siteLogo'");
    $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
    $filename = $row['value'] ?? null;
    if (!$filename) {
        return null;
    }
    $path = uploads_dir() . '/' . $filename;
    if (!is_file($path)) {
        return null;
    }
    $v = filemtime($path);
    return public_base() . '/uploads/' . $filename . '?v=' . $v;
}

function delete_logo_files(): void
{
    foreach (glob(uploads_dir() . '/site-logo.*') ?: [] as $file) {
        if (is_file($file)) {
            unlink($file);
        }
    }
}

function save_logo(string $tmpPath, string $mime): ?string
{
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif', 'image/svg+xml' => 'svg'];
    if (!isset($allowed[$mime])) {
        return null;
    }
    delete_logo_files();
    $filename = 'site-logo.' . $allowed[$mime];
    if (!copy($tmpPath, uploads_dir() . '/' . $filename)) {
        return null;
    }
    $stmt = db()->prepare(
        "INSERT INTO settings (key, value) VALUES ('siteLogo', :value)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    );
    $stmt->bindValue(':value', $filename, SQLITE3_TEXT);
    $stmt->execute();
    return get_logo_url();
}

function remove_logo(): void
{
    delete_logo_files();
    db()->exec("DELETE FROM settings WHERE key = 'siteLogo'");
}

function fetch_all_data(): array
{
    $db = db();

    $players = [];
    $result = $db->query('SELECT id, name, photo, user_id FROM players ORDER BY name');
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $players[] = format_player($row);
    }

    $seasons = [];
    $result = $db->query('SELECT id, name, created_at AS createdAt FROM seasons ORDER BY created_at DESC');
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $seasons[] = $row;
    }

    $matches = [];
    $result = $db->query(
        'SELECT id, season_id AS seasonId, player1_id AS player1Id, player2_id AS player2Id,
                sets, played_at AS playedAt, notes FROM matches ORDER BY played_at DESC'
    );
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $row['sets'] = json_decode($row['sets'], true);
        $matches[] = $row;
    }

    return [
        'players' => $players,
        'seasons' => $seasons,
        'matches' => $matches,
        'activeSeasonId' => get_active_season_id(),
    ];
}
