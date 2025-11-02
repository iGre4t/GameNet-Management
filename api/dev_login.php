<?php
require_once __DIR__ . '/db.php';
gn_session_start();

// Only enabled if DEV_LOGIN_KEY is set in config.php
try {
    @require __DIR__ . '/config.php';
} catch (Throwable $e) {}

if (!defined('DEV_LOGIN_KEY') || !DEV_LOGIN_KEY) {
    gn_json(['ok'=>false, 'error'=>'disabled'], 403);
    exit;
}

$key = isset($_GET['key']) ? (string)$_GET['key'] : '';
if (!hash_equals(DEV_LOGIN_KEY, $key)) {
    gn_json(['ok'=>false, 'error'=>'forbidden'], 403);
    exit;
}

// Set session to admin and seed admin in DB or file store
$_SESSION['uid'] = 'admin';

// Try DB seed
try {
    $pdo = gn_db();
    $exists = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE id='admin' OR code='00000' OR email='admin@example.com'")->fetchColumn();
    if ($exists === 0) {
        $ph = password_hash('1234', PASSWORD_DEFAULT);
        $perms = json_encode(['tabs'=>new stdClass(), 'parts'=>new stdClass()], JSON_UNESCAPED_UNICODE);
        $pdo->prepare("INSERT INTO users (id, code, first, last, email, password_hash, active, permissions_json) VALUES ('admin','00000','Admin','User','admin@example.com',:ph,1,:perms)")->execute([':ph'=>$ph, ':perms'=>$perms]);
    }
    gn_json(['ok'=>true, 'mode'=>'db']);
    return;
} catch (Throwable $e) {
    // File fallback
    $list = gn_load_users_file();
    $found = false; foreach ($list as $u){ if (($u['id']??'')==='admin') { $found=true; break; } }
    if (!$found) {
        $list[] = [ 'id'=>'admin', 'code'=>'00000', 'first'=>'Admin', 'last'=>'User', 'phone'=>'', 'email'=>'admin@example.com', 'password_hash'=>password_hash('1234', PASSWORD_DEFAULT), 'active'=>1, 'permissions'=>['tabs'=>new stdClass(),'parts'=>new stdClass()] ];
        gn_save_users_file($list);
    }
    gn_json(['ok'=>true, 'mode'=>'file']);
}

