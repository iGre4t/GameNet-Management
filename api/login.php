<?php
require_once __DIR__ . '/db.php';
gn_require_method('POST');

// Accept JSON or form-encoded
$raw = file_get_contents('php://input');
$data = [];
if ($raw) {
    $j = json_decode($raw, true);
    if (is_array($j)) $data = $j;
}
$u = trim($data['username'] ?? ($_POST['username'] ?? ''));
$p = strval($data['password'] ?? ($_POST['password'] ?? ''));

if ($u === '' || $p === '') {
    gn_json(['ok' => false, 'error' => 'missing_fields'], 400);
    exit;
}

// Attempt DB-backed login first
try {
    $pdo = gn_db();
    // Verify schema
    $pdo->query('SELECT 1 FROM users LIMIT 1');

    if (strtolower($u) === 'admin') {
        // Seed admin if absent
        $exists = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE id='admin' OR code='00000' OR email='admin@example.com'")->fetchColumn();
        if ($exists === 0) {
            $ph = password_hash('1234', PASSWORD_DEFAULT);
            $perms = json_encode(['tabs'=>new stdClass(), 'parts'=>new stdClass()], JSON_UNESCAPED_UNICODE);
            $pdo->prepare("INSERT INTO users (id, code, first, last, email, password_hash, active, permissions_json) VALUES ('admin','00000','Admin','User','admin@example.com',:ph,1,:perms)")
                ->execute([':ph'=>$ph, ':perms'=>$perms]);
        }
    }

    $find = $pdo->prepare('SELECT * FROM users WHERE (code = :u OR phone = :u OR email = :u OR id = :u) LIMIT 1');
    $lookup = (strtolower($u) === 'admin') ? '00000' : $u;
    $find->execute([':u' => $lookup]);
    $row = $find->fetch();
    if (!$row) throw new RuntimeException('not_found');
    if (!(int)$row['active']) throw new RuntimeException('inactive');
    if (!password_verify($p, $row['password_hash'])) throw new RuntimeException('bad_password');

    gn_session_start();
    $_SESSION['uid'] = (string)$row['id'];
    $user = [ 'id'=>$row['id'], 'code'=>$row['code'], 'first'=>$row['first'], 'last'=>$row['last'], 'phone'=>$row['phone'], 'email'=>$row['email'], 'active'=>((int)$row['active']===1) ];
    gn_json(['ok'=>true, 'user'=>$user]);
    return;
} catch (Throwable $dbErr) {
    // Fall back to file-based auth to keep you unblocked
    $list = gn_load_users_file();
    if (!is_array($list)) $list = [];
    if (strtolower($u) === 'admin' && count($list) === 0) {
        $list[] = [ 'id'=>'admin', 'code'=>'00000', 'first'=>'Admin', 'last':'User', 'phone'=>'', 'email'=>'admin@example.com', 'password_hash'=>password_hash('1234', PASSWORD_DEFAULT), 'active'=>1, 'permissions'=>['tabs'=>new stdClass(),'parts'=>new stdClass()] ];
        gn_save_users_file($list);
    }
    // find by id/code/phone/email
    $found = null;
    foreach ($list as $it){
        $keys = [ (string)($it['id']??''), (string)($it['code']??''), (string)($it['phone']??''), (string)($it['email']??'') ];
        if (in_array($u, $keys, true)) { $found = $it; break; }
    }
    if (!$found) { gn_json(['ok'=>false,'error'=>'invalid_credentials','reason'=>'not_found'],401); return; }
    if (empty($found['active'])) { gn_json(['ok'=>false,'error'=>'invalid_credentials','reason'=>'inactive'],401); return; }
    $hash = (string)($found['password_hash'] ?? '');
    $plain = (string)($found['password'] ?? '');
    $ok = ($hash && password_verify($p, $hash)) || ($plain !== '' && hash_equals($plain, $p));
    if (!$ok) { gn_json(['ok'=>false,'error'=>'invalid_credentials','reason'=>'bad_password'],401); return; }
    gn_session_start();
    $_SESSION['uid'] = (string)($found['id'] ?? '');
    $user = [ 'id'=>$found['id']??'', 'code'=>$found['code']??'', 'first'=>$found['first']??'', 'last'=>$found['last']??'', 'phone'=>$found['phone']??'', 'email'=>$found['email']??'', 'active'=>!empty($found['active']) ];
    gn_json(['ok'=>true, 'user'=>$user]);
}
