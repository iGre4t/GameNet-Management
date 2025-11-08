<?php
// One-time migration from app_store.k='branches' JSON to normalized tables
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/http.php';
require __DIR__ . '/lib/branches_persist.php';

header('Content-Type: application/json; charset=utf-8');

try {
  $debug = isset($_GET['debug']);
  $pdo = db_conn();
  $hasAny = (int)$pdo->query('SELECT COUNT(*) FROM branches')->fetchColumn();
  if ($hasAny > 0 && !isset($_GET['force'])) {
    $payload = ['ok' => false, 'error' => 'Branches table is not empty. Append ?force=1 to run anyway.'];
    if ($debug) { json_out($payload, 200); } else { json_out($payload, 409); }
    exit;
  }

  $stmt = $pdo->prepare('SELECT data FROM app_store WHERE k = ? LIMIT 1');
  $stmt->execute(['branches']);
  $row = $stmt->fetch();
  if (!$row || empty($row['data'])){
    json_out(['ok' => true, 'migrated' => 0, 'note' => 'No JSON branches found in app_store']);
    exit;
  }
  $data = json_decode((string)$row['data'], true);
  if (!is_array($data)){
    $payload = ['ok' => false, 'error' => 'Invalid branches JSON in app_store'];
    if ($debug) { json_out($payload, 200); } else { json_out($payload, 422); }
    exit;
  }

  persist_branches($pdo, $data);

  $count = count($data);
  json_out(['ok' => true, 'migrated' => $count]);
} catch (Throwable $e) {
  $payload = ['ok' => false, 'error' => $e->getMessage()];
  if (isset($e->xdebug_message)) { $payload['xdebug'] = $e->xdebug_message; }
  if (isset($_GET['debug'])) { json_out($payload, 200); } else { json_out($payload, 500); }
}
