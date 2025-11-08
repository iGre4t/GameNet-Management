**MySQL Setup**
- Uses Docker to run MySQL 8 and phpMyAdmin.
- Default DB: `gamenet` with user/password `gamenet`.

**Start Services**
- Prereq: Docker Desktop running.
- Run: `docker compose up -d`
- MySQL: `localhost:3306` (user `gamenet`, pass `gamenet`)
- phpMyAdmin: `http://localhost:8080` (server `mysql`, user `gamenet`, pass `gamenet`)
- API (PHP/Apache): `http://localhost:8000` (auto-loads from `api/`)

**Schema**
- Schema auto-loads from `sql/init/_schema.sql` at first start.
- Source copy also in `sql/schema.sql`.

**Manual Import (optional)**
- `docker exec -i gamenet-mysql mysql -u root -prootpass gamenet < sql/schema.sql`

**PHP Config**
- Copy `api/config.sample.php` to `api/config.php` and adjust if needed.
- Env vars supported: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`.

**Ping Test (optional)**
- Option A: via Docker API container → `http://localhost:8000/ping.php`
- Option B: local PHP → `php -S 127.0.0.1:8001 -t api` then `http://127.0.0.1:8001/ping.php`

**Branches Persistence**
- UI stores branches in `localStorage` under key `gamenet_branches`.
- We added a bridge (`api/storage-bridge.js`) that transparently persists this key to MySQL via `api/store.php` and table `app_store`.
- No UI changes needed; all branch edits now save to the DB.

**Migration (old JSON → normalized tables)**
- If you previously had branches stored in `app_store` as JSON, run once:
  - With Docker: open `http://localhost:8000/migrate_branches.php`
  - It will migrate only if `branches` table is empty. To force: `http://localhost:8000/migrate_branches.php?force=1`
- After migration, data is served from normalized tables via `api/store.php?key=branches`.
