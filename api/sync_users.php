<?php
require_once __DIR__ . '/db.php';
gn_require_method('POST');
$uid = gn_require_login();

// Only allow admin to sync
try {
    $pdo = gn_db();
    $me = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $me->execute([$uid]);
    $meRow = $me->fetch();
    if (!$meRow || !gn_is_admin_row($meRow)) { gn_json(['ok'=>false,'error'=>'forbidden'],403); return; }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) { gn_json(['ok'=>false,'error'=>'invalid_body'],400); return; }
    $users = $data['users'] ?? $data; if (!is_array($users)) { gn_json(['ok'=>false,'error'=>'invalid_users_array'],400); return; }

    $pdo->beginTransaction();
    $currStmt = $pdo->query('SELECT id, password_hash FROM users');
    $curr = []; foreach ($currStmt as $r) { $curr[$r['id']] = $r; }
    $up = $pdo->prepare('UPDATE users SET code=?, first=?, last=?, phone=?, email=?, active=?, permissions_json=?, updated_at=NOW() WHERE id=?');
    $ins = $pdo->prepare('INSERT INTO users (id, code, first, last, phone, email, password_hash, active, permissions_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $seen = [];
    foreach ($users as $u) {
      if (!is_array($u)) continue;
      $id = (string)($u['id'] ?? ''); if ($id==='') $id = bin2hex(random_bytes(8));
      $code = isset($u['code']) ? (string)$u['code'] : null;
      $first = (string)($u['first'] ?? '');
      $last = (string)($u['last'] ?? '');
      $phone = isset($u['phone']) ? (string)$u['phone'] : null;
      $email = isset($u['email']) && $u['email'] !== '' ? (string)$u['email'] : null;
      $active = !empty($u['active']) ? 1 : 0;
      $perms = json_encode($u['permissions'] ?? ['tabs'=>new stdClass(), 'parts'=>new stdClass()], JSON_UNESCAPED_UNICODE);
      $seen[$id] = true;
      if (isset($curr[$id])) {
        $up->execute([$code, $first, $last, $phone, $email, $active, $perms, $id]);
        if (isset($u['password']) && $u['password'] !== '') {
          $ph = password_hash((string)$u['password'], PASSWORD_DEFAULT);
          $pdo->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([$ph, $id]);
        }
      } else {
        $ph = isset($u['password']) && $u['password'] !== '' ? password_hash((string)$u['password'], PASSWORD_DEFAULT) : password_hash('1234', PASSWORD_DEFAULT);
        $ins->execute([$id, $code, $first, $last, $phone, $email, $ph, $active, $perms]);
      }
    }
    $pdo->commit();
    gn_json(['ok'=>true]);
} catch (Throwable $e) {
    // File fallback: only allow if session uid is 'admin'
    if ($uid !== 'admin') { gn_json(['ok'=>false,'error':'forbidden'],403); return; }
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true); if (!is_array($data)) { gn_json(['ok'=>false,'error':'invalid_body'],400); return; }
    $users = $data['users'] ?? $data; if (!is_array($users)) { gn_json(['ok'=>false,'error':'invalid_users_array'],400); return; }
    // Normalize and drop passwords to 'password_hash'
    $out = [];
    foreach ($users as $u){ if (!is_array($u)) continue; $id = (string)($u['id'] ?? ''); if ($id==='') $id = bin2hex(random_bytes(8)); $u['id']=$id; if (!isset($u['active'])) $u['active']=1; unset($u['password']); $out[]=$u; }
    gn_save_users_file($out);
    gn_json(['ok'=>true]);
}
