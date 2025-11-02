<?php
require_once __DIR__ . '/db.php';
gn_session_start();

if (!isset($_SESSION['uid'])) { gn_json(['ok'=>false]); exit; }

try {
    $pdo = gn_db();
    $stmt = $pdo->prepare('SELECT id, code, first, last, phone, email, active FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$_SESSION['uid']]);
    $u = $stmt->fetch();
    if (!$u) { gn_json(['ok'=>false]); return; }
    gn_json(['ok'=>true,'user'=>$u]);
} catch (Throwable $e) {
    // File fallback: return minimal user from session
    $id = (string)$_SESSION['uid'];
    $user = [ 'id'=>$id, 'code'=>($id==='admin'?'00000':''), 'first'=>($id==='admin'?'Admin':''), 'last'=>($id==='admin'?'User':''), 'phone'=>'', 'email'=>($id==='admin'?'admin@example.com':''), 'active'=>1 ];
    gn_json(['ok'=>true, 'user'=>$user]);
}
