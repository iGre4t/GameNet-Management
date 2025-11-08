<?php
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/http.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
  try {
    $pdo = db_conn();
    $stmt = $pdo->query('SELECT id, name, address, phone, active, created_at, updated_at FROM branches ORDER BY id DESC');
    $rows = $stmt->fetchAll();
    json_out(['ok' => true, 'data' => $rows]);
  } catch (Throwable $e) {
    json_out(['ok' => false, 'error' => $e->getMessage()], 500);
  }
  exit;
}

if ($method === 'POST') {
  $in = read_json();
  $name = trim($in['name'] ?? '');
  $address = trim($in['address'] ?? '');
  $phone = trim($in['phone'] ?? '');
  if ($name === '') { json_out(['ok' => false, 'error' => 'Missing name'], 422); exit; }
  try {
    $pdo = db_conn();
    $stmt = $pdo->prepare('INSERT INTO branches(name, address, phone, active) VALUES(?,?,?,1)');
    $stmt->execute([$name, $address ?: null, $phone ?: null]);
    $id = (int)$pdo->lastInsertId();
    json_out(['ok' => true, 'id' => $id]);
  } catch (Throwable $e) {
    json_out(['ok' => false, 'error' => $e->getMessage()], 500);
  }
  exit;
}

if ($method === 'PATCH' || $method === 'PUT') {
  $in = read_json();
  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) { json_out(['ok' => false, 'error' => 'Missing id'], 422); exit; }
  $fields = [];
  $values = [];
  foreach ([
    'name' => 'name',
    'address' => 'address',
    'phone' => 'phone',
  ] as $k => $col) {
    if (array_key_exists($k, $in)) { $fields[] = "$col = ?"; $values[] = ($in[$k] === '' ? null : $in[$k]); }
  }
  if (array_key_exists('active', $in)) { $fields[] = 'active = ?'; $values[] = (int)!!$in['active']; }
  if (!$fields) { json_out(['ok' => false, 'error' => 'No fields to update'], 422); exit; }
  $values[] = $id;
  try {
    $pdo = db_conn();
    $sql = 'UPDATE branches SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);
    json_out(['ok' => true]);
  } catch (Throwable $e) {
    json_out(['ok' => false, 'error' => $e->getMessage()], 500);
  }
  exit;
}

if ($method === 'DELETE') {
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) { json_out(['ok' => false, 'error' => 'Missing id'], 422); exit; }
  try {
    $pdo = db_conn();
    $stmt = $pdo->prepare('DELETE FROM branches WHERE id = ?');
    $stmt->execute([$id]);
    json_out(['ok' => true]);
  } catch (Throwable $e) {
    json_out(['ok' => false, 'error' => $e->getMessage()], 500);
  }
  exit;
}

json_out(['error' => 'Method not allowed'], 405);

