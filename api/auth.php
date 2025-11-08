<?php
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/http.php';

require_method(['POST']);
$in = read_json();
$identifier = trim((string)($in['identifier'] ?? ''));
$password = (string)($in['password'] ?? '');
if ($identifier === '' || $password === '') {
  json_out(['ok' => false, 'error' => 'Missing credentials'], 422);
  exit;
}

try {
  $pdo = db_conn();
  $stmt = $pdo->prepare('SELECT id, name, phone, email, code, active, password_hash FROM users WHERE (phone = ? OR code = ?) LIMIT 1');
  $stmt->execute([$identifier, $identifier]);
  $u = $stmt->fetch();
  if (!$u || !(int)$u['active']) {
    json_out(['ok' => false, 'error' => 'Invalid user or inactive'], 401);
    exit;
  }
  if (!password_verify($password, (string)$u['password_hash'])) {
    json_out(['ok' => false, 'error' => 'Invalid password'], 401);
    exit;
  }
  unset($u['password_hash']);
  json_out(['ok' => true, 'user' => $u]);
} catch (Throwable $e) {
  json_out(['ok' => false, 'error' => $e->getMessage()], 500);
}

