<?php

function load_config(): void
{
    $config = __DIR__ . '/config.php';
    if (is_file($config)) {
        require $config;
    }
}

function jwt_secret(): string
{
    return getenv('JWT_SECRET') ?: 'dev-secret-change-me';
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

function get_user(string $id): ?array
{
    $stmt = db()->prepare(
        'SELECT id, username, player_id AS playerId, created_at AS createdAt FROM users WHERE id = :id'
    );
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
    return $row ?: null;
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
    return $user;
}

function assert_owns_player(array $user, string $playerId): void
{
    if ($user['playerId'] !== $playerId) {
        respond(403, ['error' => 'You can only edit your own profile']);
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
    return get_user($row['id']);
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

    $stmt = db()->prepare(
        'INSERT INTO users (id, username, password_hash, player_id, created_at) VALUES (:id, :username, :hash, :pid, :created)'
    );
    $stmt->bindValue(':id', $userId, SQLITE3_TEXT);
    $stmt->bindValue(':username', $username, SQLITE3_TEXT);
    $stmt->bindValue(':hash', hash_password($password), SQLITE3_TEXT);
    $stmt->bindValue(':pid', $linkedPlayerId, SQLITE3_TEXT);
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
