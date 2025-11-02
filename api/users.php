<?php
require_once __DIR__ . '/db.php';

// For now, expose only GET list; mutations go via sync endpoint to match frontend semantics.
gn_session_start();
if (!isset($_SESSION['uid'])) { gn_json(['ok' => false, 'error' => 'unauthorized'], 401); exit; }

try {
    $pdo = gn_db();
    $stmt = $pdo->query('SELECT id, code, first, last, phone, email, active, permissions_json FROM users ORDER BY created_at ASC');
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['active'] = (int)$r['active'] === 1;
        if (!empty($r['permissions_json'])) {
            $r['permissions'] = json_decode($r['permissions_json'], true) ?: ['tabs'=>[], 'parts'=>[]];
        } else { $r['permissions'] = ['tabs'=>[], 'parts'=>[]]; }
        unset($r['permissions_json']);
        $r['password'] = '';
    }
    gn_json(['ok' => true, 'users' => $rows]);
} catch (Throwable $e) {
    // Fallback to file storage
    $rows = gn_load_users_file();
    $out = [];
    foreach ($rows as $r){
        $out[] = [
            'id'=>$r['id']??'', 'code'=>$r['code']??'', 'first'=>$r['first']??'', 'last'=>$r['last']??'',
            'phone'=>$r['phone']??'', 'email'=>$r['email']??'', 'active'=>!empty($r['active']),
            'permissions'=>$r['permissions'] ?? ['tabs'=>[], 'parts'=>[]], 'password'=>''
        ];
    }
    gn_json(['ok'=>true, 'users'=>$out]);
}
