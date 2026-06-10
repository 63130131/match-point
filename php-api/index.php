<?php

require __DIR__ . '/auth.php';
load_config();
require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '';
$scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$path = $uri;

if ($scriptDir !== '' && str_starts_with($path, $scriptDir)) {
    $path = substr($path, strlen($scriptDir));
}

$path = '/' . trim($path, '/');
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($path === '/health' && $method === 'GET') {
        respond(200, ['ok' => true]);
    }

    if ($path === '/data' && $method === 'GET') {
        require_auth();
        respond(200, fetch_all_data());
    }

    if ($path === '/auth/login' && $method === 'POST') {
        $body = json_body();
        $username = trim((string) ($body['username'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        if ($username === '' || $password === '') {
            respond(400, ['error' => 'Username and password required']);
        }
        $user = login_user($username, $password);
        respond(200, auth_response($user));
    }

    if ($path === '/auth/register' && $method === 'POST') {
        $body = json_body();
        $username = trim((string) ($body['username'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        $name = trim((string) ($body['name'] ?? ''));
        $playerId = ($body['playerId'] ?? null) ? (string) $body['playerId'] : null;
        $user = register_user($username, $password, $name, $playerId);
        respond(201, auth_response($user));
    }

    if ($path === '/auth/me' && $method === 'GET') {
        $user = require_auth();
        respond(200, auth_response($user));
    }

    if ($path === '/auth/unclaimed' && $method === 'GET') {
        respond(200, ['players' => list_unclaimed_players()]);
    }

    if ($path === '/players' && $method === 'POST') {
        respond(403, ['error' => 'Use sign in and claim a profile instead']);
    }

    if (preg_match('#^/players/([^/]+)$#', $path, $m) && $method === 'PUT') {
        $user = require_auth();
        $id = $m[1];
        assert_owns_player($user, $id);
        $existing = get_player($id);
        if (!$existing) {
            respond(404, ['error' => 'Player not found']);
        }
        $body = json_body();
        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            respond(400, ['error' => 'Name is required']);
        }
        $stmt = db()->prepare('UPDATE players SET name = :name WHERE id = :id');
        $stmt->bindValue(':name', $name, SQLITE3_TEXT);
        $stmt->bindValue(':id', $id, SQLITE3_TEXT);
        $stmt->execute();
        respond(200, get_player($id));
    }

    if (preg_match('#^/players/([^/]+)/photo$#', $path, $m) && $method === 'POST') {
        $user = require_auth();
        $id = $m[1];
        assert_owns_player($user, $id);
        $existing = get_player($id);
        if (!$existing) {
            respond(404, ['error' => 'Player not found']);
        }
        if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
            respond(400, ['error' => 'Photo upload failed']);
        }
        $file = $_FILES['photo'];
        if ($file['size'] > 2 * 1024 * 1024) {
            respond(400, ['error' => 'Image must be under 2 MB']);
        }
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
        if (!isset($allowed[$mime])) {
            respond(400, ['error' => 'Use JPG, PNG, WebP, or GIF']);
        }
        $stmt = db()->prepare('SELECT photo FROM players WHERE id = :id');
        $stmt->bindValue(':id', $id, SQLITE3_TEXT);
        $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
        delete_player_photo_file($row['photo'] ?? null);

        $filename = $id . '.' . $allowed[$mime];
        if (!move_uploaded_file($file['tmp_name'], uploads_dir() . '/' . $filename)) {
            respond(500, ['error' => 'Could not save photo']);
        }
        $stmt = db()->prepare('UPDATE players SET photo = :photo WHERE id = :id');
        $stmt->bindValue(':photo', $filename, SQLITE3_TEXT);
        $stmt->bindValue(':id', $id, SQLITE3_TEXT);
        $stmt->execute();
        respond(200, get_player($id));
    }

    if (preg_match('#^/players/([^/]+)/photo$#', $path, $m) && $method === 'DELETE') {
        $user = require_auth();
        $id = $m[1];
        assert_owns_player($user, $id);
        $existing = get_player($id);
        if (!$existing) {
            respond(404, ['error' => 'Player not found']);
        }
        $stmt = db()->prepare('SELECT photo FROM players WHERE id = :id');
        $stmt->bindValue(':id', $id, SQLITE3_TEXT);
        $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
        delete_player_photo_file($row['photo'] ?? null);
        $stmt = db()->prepare('UPDATE players SET photo = NULL WHERE id = :id');
        $stmt->bindValue(':id', $id, SQLITE3_TEXT);
        $stmt->execute();
        respond(200, get_player($id));
    }

    if (preg_match('#^/players/([^/]+)$#', $path, $m) && $method === 'DELETE') {
        $user = require_auth();
        $id = $m[1];
        assert_admin($user);
        if (($user['playerId'] ?? null) === $id) {
            respond(403, ['error' => 'You cannot delete your own account']);
        }
        if (!delete_player_completely($id)) {
            respond(404, ['error' => 'Player not found']);
        }
        respond(204);
    }

    if ($path === '/seasons' && $method === 'POST') {
        require_auth();
        $body = json_body();
        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            respond(400, ['error' => 'Name is required']);
        }
        $season = [
            'id' => uid(),
            'name' => $name,
            'createdAt' => gmdate('c'),
        ];
        $stmt = db()->prepare('INSERT INTO seasons (id, name, created_at) VALUES (:id, :name, :created)');
        $stmt->bindValue(':id', $season['id'], SQLITE3_TEXT);
        $stmt->bindValue(':name', $season['name'], SQLITE3_TEXT);
        $stmt->bindValue(':created', $season['createdAt'], SQLITE3_TEXT);
        $stmt->execute();
        set_active_season_id($season['id']);
        respond(201, $season);
    }

    if (preg_match('#^/seasons/([^/]+)$#', $path, $m) && $method === 'DELETE') {
        require_auth();
        $id = $m[1];
        $stmt = db()->prepare('DELETE FROM seasons WHERE id = :id');
        $stmt->bindValue(':id', $id, SQLITE3_TEXT);
        $stmt->execute();
        if (get_active_season_id() === $id) {
            $next = db()->query('SELECT id FROM seasons ORDER BY created_at DESC LIMIT 1')->fetchArray(SQLITE3_ASSOC);
            set_active_season_id($next['id'] ?? null);
        }
        respond(204);
    }

    if ($path === '/active-season' && $method === 'PUT') {
        require_auth();
        $body = json_body();
        $seasonId = $body['seasonId'] ?? null;
        if ($seasonId) {
            $stmt = db()->prepare('SELECT id FROM seasons WHERE id = :id');
            $stmt->bindValue(':id', $seasonId, SQLITE3_TEXT);
            $exists = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
            if (!$exists) {
                respond(404, ['error' => 'Season not found']);
            }
        }
        set_active_season_id($seasonId ?: null);
        respond(200, ['activeSeasonId' => $seasonId]);
    }

    if ($path === '/matches' && $method === 'POST') {
        require_auth();
        $body = json_body();
        $seasonId = $body['seasonId'] ?? '';
        $player1Id = $body['player1Id'] ?? '';
        $player2Id = $body['player2Id'] ?? '';
        $sets = $body['sets'] ?? null;
        $playedAt = $body['playedAt'] ?? '';

        if (!$seasonId || !$player1Id || !$player2Id || !$sets || !$playedAt) {
            respond(400, ['error' => 'Missing required fields']);
        }
        if ($player1Id === $player2Id) {
            respond(400, ['error' => 'Pick two different players']);
        }

        $notes = trim((string) ($body['notes'] ?? ''));
        $match = [
            'id' => uid(),
            'seasonId' => $seasonId,
            'player1Id' => $player1Id,
            'player2Id' => $player2Id,
            'sets' => $sets,
            'playedAt' => $playedAt,
            'notes' => $notes !== '' ? $notes : null,
        ];

        $stmt = db()->prepare(
            'INSERT INTO matches (id, season_id, player1_id, player2_id, sets, played_at, notes)
             VALUES (:id, :seasonId, :p1, :p2, :sets, :playedAt, :notes)'
        );
        $stmt->bindValue(':id', $match['id'], SQLITE3_TEXT);
        $stmt->bindValue(':seasonId', $match['seasonId'], SQLITE3_TEXT);
        $stmt->bindValue(':p1', $match['player1Id'], SQLITE3_TEXT);
        $stmt->bindValue(':p2', $match['player2Id'], SQLITE3_TEXT);
        $stmt->bindValue(':sets', json_encode($match['sets']), SQLITE3_TEXT);
        $stmt->bindValue(':playedAt', $match['playedAt'], SQLITE3_TEXT);
        $stmt->bindValue(':notes', $match['notes'], $match['notes'] === null ? SQLITE3_NULL : SQLITE3_TEXT);
        $stmt->execute();
        respond(201, $match);
    }

    if (preg_match('#^/matches/([^/]+)$#', $path, $m) && $method === 'DELETE') {
        require_auth();
        $stmt = db()->prepare('DELETE FROM matches WHERE id = :id');
        $stmt->bindValue(':id', $m[1], SQLITE3_TEXT);
        $stmt->execute();
        respond(204);
    }

    respond(404, ['error' => 'Not found']);
} catch (Throwable $e) {
    respond(500, ['error' => 'Server error']);
}
