<?php
function db_conn(): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;
  $configFile = __DIR__ . '/../config.php';
  if (!file_exists($configFile)) {
    $configFile = __DIR__ . '/../config.sample.php';
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
  ]);
  return $pdo;
}

