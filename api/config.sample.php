<?php
// Copy this file to config.php on the server and fill in your DB details.
// Do NOT commit real credentials to git and do NOT expose them in frontend JS.

// Example DSN: mysql:host=localhost;dbname=gamenet;charset=utf8mb4
define('DB_DSN', 'mysql:host=localhost;dbname=CHANGE_ME;charset=utf8mb4');
define('DB_USER', 'CHANGE_ME');
define('DB_PASS', 'CHANGE_ME');

// Session cookie options (adjust domain/secure in production if needed)
define('SESSION_NAME', 'GNSESSID');

