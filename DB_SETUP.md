**MySQL Setup**
- Uses Docker to run MySQL 8 and phpMyAdmin.
- Default DB: `gamenet` with user/password `gamenet`.

**Start Services**
- Prereq: Docker Desktop running.
- Run: `docker compose up -d`
- MySQL: `localhost:3306` (user `gamenet`, pass `gamenet`)
- phpMyAdmin: `http://localhost:8080` (server `mysql`, user `gamenet`, pass `gamenet`)

**Schema**
- Schema auto-loads from `sql/init/_schema.sql` at first start.
- Source copy also in `sql/schema.sql`.

**Manual Import (optional)**
- `docker exec -i gamenet-mysql mysql -u root -prootpass gamenet < sql/schema.sql`

**PHP Config**
- Copy `api/config.sample.php` to `api/config.php` and adjust if needed.
- Env vars supported: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`.

**Ping Test (optional)**
- If PHP is installed: `php -S 127.0.0.1:8000 -t api`
- Visit: `http://127.0.0.1:8000/ping.php` (expects JSON with status `ok`).

