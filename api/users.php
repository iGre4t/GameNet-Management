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
        // Frontend expects permissions object
        if (!empty($r['permissions_json'])) {
            $r['permissions'] = json_decode($r['permissions_json'], true) ?: ['tabs'=>[], 'parts'=>[]];
        } else {
            $r['permissions'] = ['tabs'=>[], 'parts'=>[]];
        }
        unset($r['permissions_json']);
        // For compatibility: do NOT expose password hashes; leave password empty
        $r['password'] = '';
    }
    gn_json(['ok' => true, 'users' => $rows]);
} catch (Throwable $e) {
    gn_json(['ok' => false, 'error' => 'server_error'], 500);
}

