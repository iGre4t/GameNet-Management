<?php
function json_out($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function read_json(): array {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw ?: 'null', true);
  return is_array($data) ? $data : [];
}

function require_method(array $methods): void {
  if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', $methods, true)) {
    json_out(['error' => 'Method not allowed'], 405);
    exit;
  }
}

