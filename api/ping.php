<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');

// Note: we always return HTTP 200 so hosts/CDN (e.g. Cloudflare)
// don't replace our JSON body with a generic 500 page. The actual
// DB / PHP error is reported inside the JSON payload.

$info = [
  'status' => 'ok',
  'php' => [
    'version' => PHP_VERSION,
    'sapi' => PHP_SAPI,
  ],
  'mysql' => [
    'connected' => false,
    'error' => null,
  ],
  'time' => gmdate('c'),
];

try {
  $configFile = __DIR__ . '/config.php';
  if (!file_exists($configFile)) {
    $configFile = __DIR__ . '/config.sample.php';
  }
  $cfg = require $configFile;

  $db = $cfg['db'] ?? [];
  $host = $db['host'] ?? '127.0.0.1';
  $port = $db['port'] ?? '3306';
  $name = $db['name'] ?? 'gamenet';
  $user = $db['user'] ?? 'gamenet';
  $pass = $db['pass'] ?? 'gamenet';
  $charset = $db['charset'] ?? 'utf8mb4';

  $dsn = "mysql:host={$host};port={$port};dbname={$name};charset={$charset}";
  $pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_TIMEOUT => 3,
  ]);
  $row = $pdo->query('SELECT 1 AS ping')->fetch();
  $info['mysql']['connected'] = true;
  $info['mysql']['ping'] = (int)($row['ping'] ?? 0);
} catch (Throwable $e) {
  $info['status'] = 'error';
  $info['mysql']['error'] = $e->getMessage();
}

echo json_encode($info, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

