<?php
declare(strict_types=1);

// Central DB + session bootstrap
function gn_db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $cfg = __DIR__ . '/config.php';
    if (!is_file($cfg)) {
        throw new RuntimeException('missing_config');
    }
    require_once $cfg;
    $pdo = new PDO(DB_DSN, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function gn_session_start(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    if (defined('SESSION_NAME') && SESSION_NAME) {
        session_name(SESSION_NAME);
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function gn_json($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
}

function gn_require_method(string $method): void {
    if ($_SERVER['REQUEST_METHOD'] !== strtoupper($method)) {
        gn_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
        exit;
    }
}

function gn_require_login(): string {
    gn_session_start();
    if (!isset($_SESSION['uid']) || !is_string($_SESSION['uid']) || $_SESSION['uid'] === '') {
        gn_json(['ok' => false, 'error' => 'unauthorized'], 401);
        exit;
    }
    return $_SESSION['uid'];
}

function gn_is_admin_row(array $row): bool {
    // Heuristic: admin has code '00000' or email set to admin@example.com
    return (isset($row['code']) && $row['code'] === '00000') || (isset($row['email']) && $row['email'] === 'admin@example.com');
}

