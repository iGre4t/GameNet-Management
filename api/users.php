<?php
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/http.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// List users
if ($method === 'GET') {
  try {
    $pdo = db_conn();
    $stmt = $pdo->query('SELECT id, name, phone, email, code, active, created_at, updated_at FROM users ORDER BY id DESC');
    $rows = $stmt->fetchAll();
    json_out(['ok' => true, 'data' => $rows]);
  } catch (Throwable $e) {
    json_out(['ok' => false, 'error' => $e->getMessage()], 500);
  }
  exit;
}

// Create user
if ($method === 'POST') {
  $in = read_json();
  $name = trim((string)($in['name'] ?? ''));
  $phone = trim((string)($in['phone'] ?? ''));
  $password = (string)($in['password'] ?? '');
  $email = trim((string)($in['email'] ?? ''));
  $code = trim((string)($in['code'] ?? ''));

  // When the panel does not send a name, fall back to a friendly default.
  if ($name === '') {
    $name = 'کاربر جدید';
  }

  if ($phone === '' || strlen($password) < 4) {
    json_out(['ok' => false, 'error' => 'Invalid phone or password'], 422);
    exit;
  }

  try {
    $pdo = db_conn();
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare('INSERT INTO users(name, phone, email, password_hash, code, active) VALUES(?,?,?,?,?,1)');
    $stmt->execute([$name, $phone, $email ?: null, $hash, $code ?: null]);
    $id = (int)$pdo->lastInsertId();
    json_out(['ok' => true, 'id' => $id]);
  } catch (Throwable $e) {
    $msg = $e->getMessage();
    if (stripos($msg, 'Duplicate') !== false) {
      json_out(['ok' => false, 'error' => 'Duplicate phone or email'], 409);
    } else {
      json_out(['ok' => false, 'error' => $msg], 500);
    }
  }
  exit;
}

// Update user
if ($method === 'PATCH' || $method === 'PUT') {
  $in = read_json();
  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) {
    json_out(['ok' => false, 'error' => 'Missing id'], 422);
    exit;
  }

  $fields = [];
  $values = [];

  foreach ([
    'name'  => 'name',
    'phone' => 'phone',
    'email' => 'email',
    'code'  => 'code',
  ] as $k => $col) {
    if (array_key_exists($k, $in)) {
      $fields[] = "$col = ?";
      $values[] = ($in[$k] === '' ? null : $in[$k]);
    }
  }

  if (array_key_exists('active', $in)) {
    $fields[] = 'active = ?';
    $values[] = (int)!!$in['active'];
  }

  if (array_key_exists('password', $in)) {
    $fields[] = 'password_hash = ?';
    $values[] = password_hash((string)$in['password'], PASSWORD_BCRYPT);
  }

  if (!$fields) {
    json_out(['ok' => false, 'error' => 'No fields to update'], 422);
    exit;
  }

  $values[] = $id;

  try {
    $pdo = db_conn();
    $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);
    json_out(['ok' => true]);
  } catch (Throwable $e) {
    json_out(['ok' => false, 'error' => $e->getMessage()], 500);
  }
  exit;
}

// Delete user
if ($method === 'DELETE') {
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) {
    json_out(['ok' => false, 'error' => 'Missing id'], 422);
    exit;
  }

  try {
    $pdo = db_conn();
    $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$id]);
    json_out(['ok' => true]);
  } catch (Throwable $e) {
    json_out(['ok' => false, 'error' => $e->getMessage()], 500);
  }
  exit;
}

json_out(['error' => 'Method not allowed'], 405);

