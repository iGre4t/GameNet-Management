<?php
require_once __DIR__ . '/db.php';
try {
    // Check config and DB connectivity
    $pdo = gn_db();
    $pdo->query('SELECT 1');
    gn_json(['ok' => true]);
} catch (RuntimeException $e) {
    if ($e->getMessage() === 'missing_config') {
        gn_json(['ok' => false, 'error' => 'missing_config']);
    } else {
        gn_json(['ok' => false, 'error' => 'db_error']);
    }
} catch (Throwable $e) {
    gn_json(['ok' => false, 'error' => 'db_error']);
}

