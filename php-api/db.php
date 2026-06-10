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
                created_at TEXT NOT NULL
            );
        ');
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
