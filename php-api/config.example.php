<?php

// Copy to config.php on your server (do not commit config.php).
$APP_CONFIG = [
    'JWT_SECRET' => 'use-a-long-random-string-here',
    // Must match your login username exactly (case-insensitive)
    'ADMIN_USERNAME' => 'Miha',
];

foreach ($APP_CONFIG as $key => $value) {
    if (getenv($key) === false) {
        putenv("$key=$value");
    }
}
