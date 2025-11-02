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

try {
    $pdo = gn_db();
    // Verify table exists (no CREATE to avoid needing CREATE privilege)
    try {
        $pdo->query("SELECT 1 FROM users LIMIT 1");
    } catch (Throwable $e) {
        gn_json(['ok' => false, 'error' => 'missing_schema'], 500);
        return;
    }

    // If username is 'admin', ensure an admin row exists (idempotent)
    if (strtolower($u) === 'admin') {
        // Insert admin user only if it does not exist (avoid requiring UPDATE privilege)
        $exists = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE id='admin' OR code='00000' OR email='admin@example.com'")->fetchColumn();
        if ($exists === 0) {
            $ph = password_hash('1234', PASSWORD_DEFAULT);
            $perms = json_encode(['tabs'=>new stdClass(), 'parts'=>new stdClass()], JSON_UNESCAPED_UNICODE);
            $ins = $pdo->prepare("INSERT INTO users (id, code, first, last, email, password_hash, active, permissions_json) VALUES ('admin','00000','Admin','User','admin@example.com',:ph,1,:perms)");
            $ins->execute([':ph'=>$ph, ':perms'=>$perms]);
        }
    }

    // Find by code OR phone OR email (admin can use 'admin' shortcut as email)
    $find = $pdo->prepare('SELECT * FROM users WHERE (code = :u OR phone = :u OR email = :u OR id = :u) LIMIT 1');
    $lookup = (strtolower($u) === 'admin') ? '00000' : $u;
    $find->execute([':u' => $lookup]);
    $row = $find->fetch();
    if (!$row) {
        gn_json(['ok' => false, 'error' => 'invalid_credentials', 'reason' => 'not_found'], 401);
        exit;
    }
    if (!(int)$row['active']) {
        gn_json(['ok' => false, 'error' => 'invalid_credentials', 'reason' => 'inactive'], 401);
        exit;
    }
    if (!password_verify($p, $row['password_hash'])) {
        gn_json(['ok' => false, 'error' => 'invalid_credentials', 'reason' => 'bad_password'], 401);
        exit;
    }

    gn_session_start();
    $_SESSION['uid'] = $row['id'];

    $user = [
        'id' => $row['id'],
        'code' => $row['code'],
        'first' => $row['first'],
        'last' => $row['last'],
        'phone' => $row['phone'],
        'email' => $row['email'],
        'active' => (int)$row['active'] === 1,
    ];
    gn_json(['ok' => true, 'user' => $user]);
} catch (Throwable $e) {
    gn_json(['ok' => false, 'error' => 'server_error'], 500);
}
