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
    // Ensure table exists
    $pdo->exec('CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(10) UNIQUE,
        first VARCHAR(100),
        last VARCHAR(100),
        phone VARCHAR(20) UNIQUE,
        email VARCHAR(190) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        permissions_json TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

    // If username is 'admin', ensure an admin row exists (idempotent)
    if (strtolower($u) === 'admin') {
        // Insert a stable admin row with primary key 'admin' to avoid duplicates
        $sql = "INSERT INTO users (id, code, first, last, email, password_hash, active, permissions_json)
                VALUES ('admin', '00000', 'Admin', 'User', 'admin@example.com', :ph, 1, :perms)
                ON DUPLICATE KEY UPDATE updated_at = NOW()";
        $ph = password_hash('1234', PASSWORD_DEFAULT);
        $perms = json_encode(['tabs'=>new stdClass(), 'parts'=>new stdClass()], JSON_UNESCAPED_UNICODE);
        $pdo->prepare($sql)->execute([':ph'=>$ph, ':perms'=>$perms]);
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
