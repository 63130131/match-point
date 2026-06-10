<?php

function load_config(): void
{
    $config = __DIR__ . '/config.php';
    if (is_file($config)) {
        require $config;
    }
}

function config_value(string $key, string $default = ''): string
{
    $value = getenv($key);
    if ($value !== false && $value !== '') {
        return trim($value);
    }
    $fromFile = $GLOBALS['APP_CONFIG'][$key] ?? null;
    if (is_string($fromFile) && $fromFile !== '') {
        return trim($fromFile);
    }
    return $default;
}

function jwt_secret(): string
{
    return config_value('JWT_SECRET', 'dev-secret-change-me');
}

function base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string
{
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
}

function create_session_token(string $userId): string
{
    $header = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64url_encode(json_encode([
        'sub' => $userId,
        'exp' => time() + 60 * 60 * 24 * 30,
    ]));
    $sig = base64url_encode(hash_hmac('sha256', "$header.$payload", jwt_secret(), true));
    return "$header.$payload.$sig";
}

function verify_session_token(?string $token): ?string
{
    if (!$token) {
        return null;
    }
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$header, $payload, $sig] = $parts;
    $expected = base64url_encode(hash_hmac('sha256', "$header.$payload", jwt_secret(), true));
    if (!hash_equals($expected, $sig)) {
        return null;
    }
    $data = json_decode(base64url_decode($payload), true);
    if (!is_array($data) || ($data['exp'] ?? 0) < time()) {
        return null;
    }
    return $data['sub'] ?? null;
}

function bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(\S+)/i', $header, $m)) {
        return $m[1];
    }
    return null;
}

function hash_password(string $password): string
{
    return password_hash($password, PASSWORD_DEFAULT);
}

function verify_password(string $password, string $hash): bool
{
    return password_verify($password, $hash);
}

function admin_username(): string
{
    return config_value('ADMIN_USERNAME');
}

function is_configured_admin(string $username): bool
{
    $admin = admin_username();
    return $admin !== '' && strcasecmp($admin, $username) === 0;
}

function format_user(array $row): array
{
    $row['isAdmin'] = !empty($row['isAdmin']);
    return $row;
}

function get_user(string $id): ?array
{
    $stmt = db()->prepare(
        'SELECT id, username, player_id AS playerId, is_admin AS isAdmin, created_at AS createdAt FROM users WHERE id = :id'
    );
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
    return $row ? format_user($row) : null;
}

function promote_admin_if_configured(string $userId, string $username): ?array
{
    if (!is_configured_admin($username)) {
        return get_user($userId);
    }
    $stmt = db()->prepare('UPDATE users SET is_admin = 1 WHERE id = :id');
    $stmt->bindValue(':id', $userId, SQLITE3_TEXT);
    $stmt->execute();
    return get_user($userId);
}

function get_user_by_username(string $username): ?array
{
    $stmt = db()->prepare('SELECT id FROM users WHERE username = :username COLLATE NOCASE');
    $stmt->bindValue(':username', $username, SQLITE3_TEXT);
    $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
    return $row ? get_user($row['id']) : null;
}

function get_user_with_hash(string $username): ?array
{
    $stmt = db()->prepare('SELECT id, username, password_hash, player_id FROM users WHERE username = :username COLLATE NOCASE');
    $stmt->bindValue(':username', $username, SQLITE3_TEXT);
    return $stmt->execute()->fetchArray(SQLITE3_ASSOC) ?: null;
}

function require_auth(): array
{
    $userId = verify_session_token(bearer_token());
    if (!$userId) {
        respond(401, ['error' => 'Sign in required']);
    }
    $user = get_user($userId);
    if (!$user) {
        respond(401, ['error' => 'Invalid session']);
    }
    return promote_admin_if_configured($userId, $user['username']) ?? $user;
}

function can_edit_player(array $user, string $playerId): bool
{
    if (($user['playerId'] ?? null) === $playerId) {
        return true;
    }
    return !empty($user['isAdmin']);
}

function assert_owns_player(array $user, string $playerId): void
{
    if (($user['playerId'] ?? null) === $playerId) {
        return;
    }
    if (!empty($user['isAdmin'])) {
        return;
    }
    respond(403, ['error' => 'Only the admin can change other players']);
}

function assert_admin(array $user): void
{
    if (empty($user['isAdmin'])) {
        respond(403, ['error' => 'Only the admin can remove players']);
    }
}

function can_delete_match(array $user, string $player1Id, string $player2Id): bool
{
    if (!empty($user['isAdmin'])) {
        return true;
    }
    $playerId = $user['playerId'] ?? null;
    if (!$playerId) {
        return false;
    }
    return $playerId === $player1Id || $playerId === $player2Id;
}

function assert_can_delete_match(array $user, string $player1Id, string $player2Id): void
{
    if (!can_delete_match($user, $player1Id, $player2Id)) {
        respond(403, ['error' => 'You can only delete matches you played in']);
    }
}

function auth_response(array $user): array
{
    $player = $user['playerId'] ? get_player($user['playerId']) : null;
    return [
        'token' => create_session_token($user['id']),
        'user' => $user,
        'player' => $player,
    ];
}

function validate_credentials(string $username, string $password): void
{
    if (strlen($username) < 3) {
        respond(400, ['error' => 'Username must be at least 3 characters']);
    }
    if (strlen($password) < 6) {
        respond(400, ['error' => 'Password must be at least 6 characters']);
    }
}

function login_user(string $username, string $password): array
{
    $row = get_user_with_hash($username);
    if (!$row || !verify_password($password, $row['password_hash'])) {
        respond(401, ['error' => 'Wrong username or password']);
    }
    return promote_admin_if_configured($row['id'], $row['username']);
}

function register_user(string $username, string $password, string $name, ?string $playerId = null): array
{
    validate_credentials($username, $password);

    if (get_user_by_username($username)) {
        respond(400, ['error' => 'Username already taken']);
    }

    $userId = uid();

    if ($playerId) {
        $stmt = db()->prepare('SELECT id, name, user_id FROM players WHERE id = :id');
        $stmt->bindValue(':id', $playerId, SQLITE3_TEXT);
        $player = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
        if (!$player) {
            respond(404, ['error' => 'Player not found']);
        }
        if (!empty($player['user_id'])) {
            respond(400, ['error' => 'Player already claimed']);
        }
        $stmt = db()->prepare('UPDATE players SET user_id = :uid WHERE id = :id');
        $stmt->bindValue(':uid', $userId, SQLITE3_TEXT);
        $stmt->bindValue(':id', $playerId, SQLITE3_TEXT);
        $stmt->execute();
        $linkedPlayerId = $playerId;
    } else {
        if ($name === '') {
            respond(400, ['error' => 'Name is required']);
        }
        $linkedPlayerId = uid();
        $stmt = db()->prepare('INSERT INTO players (id, name, user_id) VALUES (:id, :name, :uid)');
        $stmt->bindValue(':id', $linkedPlayerId, SQLITE3_TEXT);
        $stmt->bindValue(':name', $name, SQLITE3_TEXT);
        $stmt->bindValue(':uid', $userId, SQLITE3_TEXT);
        $stmt->execute();
    }

    $isAdmin = is_configured_admin($username) ? 1 : 0;
    $stmt = db()->prepare(
        'INSERT INTO users (id, username, password_hash, player_id, is_admin, created_at) VALUES (:id, :username, :hash, :pid, :is_admin, :created)'
    );
    $stmt->bindValue(':id', $userId, SQLITE3_TEXT);
    $stmt->bindValue(':username', $username, SQLITE3_TEXT);
    $stmt->bindValue(':hash', hash_password($password), SQLITE3_TEXT);
    $stmt->bindValue(':pid', $linkedPlayerId, SQLITE3_TEXT);
    $stmt->bindValue(':is_admin', $isAdmin, SQLITE3_INTEGER);
    $stmt->bindValue(':created', gmdate('c'), SQLITE3_TEXT);
    $stmt->execute();

    return get_user($userId);
}

function list_unclaimed_players(): array
{
    $players = [];
    $result = db()->query('SELECT id, name, photo, user_id FROM players WHERE user_id IS NULL ORDER BY name');
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $players[] = format_player($row);
    }
    return $players;
}
