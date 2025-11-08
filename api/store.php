<?php
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/http.php';
require __DIR__ . '/lib/branches_persist.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
  $key = (string)($_GET['key'] ?? '');
  ensure_allowed_key($key, $ALLOWED_KEYS);
  try {
    $pdo = db_conn();
    if ($key === 'branches') {
      $data = assemble_branches($pdo);
      json_out(['ok' => true, 'key' => $key, 'data' => $data]);
      exit;
    }
    $stmt = $pdo->prepare('SELECT JSON_PRETTY(data) AS data FROM app_store WHERE k = ? LIMIT 1');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    $data = $row && isset($row['data']) ? json_decode($row['data'], true) : null;
    json_out(['ok' => true, 'key' => $key, 'data' => $data]);
  } catch (Throwable $e) {
    json_out(['ok' => false, 'error' => $e->getMessage()], 500);
  }
  exit;
}

if ($method === 'POST') {
  $in = read_json();
  $key = (string)($in['key'] ?? '');
  ensure_allowed_key($key, $ALLOWED_KEYS);
  $data = $in['data'] ?? null;
  if ($data === null) { json_out(['ok' => false, 'error' => 'Missing data'], 422); exit; }
  try {
    $pdo = db_conn();
    if ($key === 'branches') {
      if (!is_array($data)) { json_out(['ok'=>false,'error'=>'Invalid branches payload'], 422); exit; }
      persist_branches($pdo, $data);
      json_out(['ok' => true]);
      exit;
    }
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $stmt = $pdo->prepare('INSERT INTO app_store(k, data) VALUES(?, JSON_EXTRACT(?, "$")) ON DUPLICATE KEY UPDATE data = VALUES(data)');
    $stmt->execute([$key, $json]);
    json_out(['ok' => true]);
  } catch (Throwable $e) {
    json_out(['ok' => false, 'error' => $e->getMessage()], 500);
  }
  exit;
}

json_out(['ok' => false, 'error' => 'Method not allowed'], 405);
