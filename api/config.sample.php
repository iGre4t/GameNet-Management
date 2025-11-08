<?php
// GameNet Management - Sample DB config
// Copy to api/config.php and adjust credentials if needed.

return [
  'db' => [
    'host' => getenv('DB_HOST') ?: '127.0.0.1',
    'port' => getenv('DB_PORT') ?: '3306',
    'name' => getenv('DB_NAME') ?: 'gamenet',
    'user' => getenv('DB_USER') ?: 'gamenet',
    'pass' => getenv('DB_PASS') ?: 'gamenet',
    'charset' => 'utf8mb4',
  ],
];

