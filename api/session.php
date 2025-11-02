<?php
require_once __DIR__ . '/db.php';
gn_session_start();

if (!isset($_SESSION['uid'])) {
    gn_json(['ok' => false]);
    exit;
}

try {
    $pdo = gn_db();
    $stmt = $pdo->prepare('SELECT id, code, first, last, phone, email, active FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$_SESSION['uid']]);
    $u = $stmt->fetch();
    if (!$u) {
        gn_json(['ok' => false]);
        exit;
    }
    gn_json(['ok' => true, 'user' => $u]);
} catch (Throwable $e) {
    gn_json(['ok' => false]);
}

