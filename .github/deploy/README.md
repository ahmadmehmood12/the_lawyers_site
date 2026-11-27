# Deploying the site on Contabo (aaPanel) with CI/CD, without touching the database

This is the one guide for the server, from the first setup to everyday deploys. Do steps 1–5 **once**
(for https://thelawyer.duckdns.org they were done on 2026-11-27; use them as a checklist). After that,
step 7 is all you ever do: **push to `main` and the site updates itself.**

| | |
|---|---|
| Repository | `ahmadmehmood12/the_lawyers_site` |
| Site | https://thelawyer.duckdns.org |
| Server folder | `/www/wwwroot/thelawyer.duckdns.org`: a git checkout, owned by `www` |
| PHP | 8.3 at `/www/server/php/83/bin/php` (aaPanel) |
| Workflow (runs on GitHub) | `.github/workflows/deploy.yml` |
| Release script (runs on the server) | `.github/deploy/release.sh` |
| Automatic database backups | `/www/backup/deploy/thelawyer.duckdns.org/` (newest 10 kept) |
| Court scrapers | `judgements-scrapers/<court>-scraper/` (lhc, phc, sc, shc, ihc, bhc) |

```
git push main ──▶ GitHub Actions "check": composer, Vite build, every migration on an empty MySQL, app boots
                        │ passes
                        ▼
                  GitHub Actions "deploy": builds the assets ──SSH──▶ server
                        • git push of the commit into the server's .git (no GitHub login on the server)
                        • rsync of public/build
                        • release.sh: code → (backup + migrations, only if new) → caches → health check
                        • scrapers folder move (once) + Tesseract install (once)
```

---

## 1 · Your database is safe: what a deploy does and doesn't do to it

The live database on Contabo is **never recreated, emptied or seeded** by a deploy.

| A deploy… | |
|---|---|
| runs `php artisan migrate --force` | **only** when the pushed commit adds new migration files, or the server has pending ones. Before that it takes a full `mysqldump` (gzip) into `/www/backup/deploy/thelawyer.duckdns.org/` and puts the site in maintenance mode. If nothing is new, the database isn't even opened for writing. |
| never runs | `migrate:fresh`, `migrate:refresh`, `migrate:reset`, `db:wipe`, `db:seed`, any seeder, `git clean` |
| never changes | `.env`, `storage/` (uploads, stored judgment PDFs, logs), `public/.user.ini`, `.well-known/`, the scrapers' `.venv`, `.env` and `storage/` |

Migrations only **add** to the database (new tables and columns, wider columns). The CI "check" job runs every
migration on a separate, empty MySQL on GitHub first, so a broken migration stops the deploy before it reaches the
server. If a migration fails on the server, the previous code is put back automatically and the log names
the backup file to restore from (step 9).

> **Never run on the server:** `php artisan migrate:fresh`, `db:seed`, `db:wipe`, or "Production install" commands
> from older notes. Those are for an **empty** database on a brand-new install only.

---

## 2 · Server software (once)

aaPanel → **App Store**: Nginx, MySQL 8, **PHP-8.3** with the extensions `fileinfo`, `opcache`, `intl`
(plus the defaults: bcmath, gd, mbstring, pdo_mysql, zip). Then aaPanel → **Terminal**:

```bash
apt-get update && apt-get install -y git rsync curl util-linux python3 python3-venv tesseract-ocr
command -v composer || (curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer)
```

`tesseract-ocr` reads scanned judgment PDFs. The deploy also installs it if it's missing (step 7), so skip it here
if apt gives you trouble.

## 3 · The site folder becomes a git checkout (once; keeps the database and uploads)

The deploy needs `/www/wwwroot/thelawyer.duckdns.org` to be a git checkout with its `.env`. **Already done for
thelawyer.duckdns.org.** Check it in aaPanel → Terminal:

```bash
cd /www/wwwroot/thelawyer.duckdns.org && test -d .git && test -f .env && git -c safe.directory='*' log -1 --oneline
```

If that prints a commit, go to step 4. Only for a site folder that is **not** a git checkout yet (for example a
folder uploaded by hand), convert it in place. This changes no files, uploads or database rows:

```bash
# Server (aaPanel → Terminal): an empty repository inside the existing folder
cd /www/wwwroot/thelawyer.duckdns.org && git init -q && git config core.fileMode false
```
```bash
# Your Mac, in the law_site folder: send the current main into it (same key as the deploys, see step 5)
git push --receive-pack="git -c safe.directory='*' receive-pack" \
  "root@<SERVER-IP>:/www/wwwroot/thelawyer.duckdns.org" main:refs/deploy/main
```
```bash
# Server: point HEAD at that commit WITHOUT touching the files (a "mixed" reset only fills git's index)
cd /www/wwwroot/thelawyer.duckdns.org
git -c safe.directory='*' branch -f main refs/deploy/main
git -c safe.directory='*' symbolic-ref HEAD refs/heads/main
git -c safe.directory='*' reset -q
git -c safe.directory='*' status --short | head -50   # files that differ on the server from git
chown -R www:www .git
```

Look at that `status` list: the first deploy makes every **tracked** file identical to git. A file someone edited on
the server by hand is overwritten, so commit any change you want to keep. Untracked files (`.env`, `storage/`,
uploads, `.user.ini`) are never touched.

## 4 · Server-only settings (once, then whenever they change)

- **`.env`** exists only on the server (`/www/wwwroot/thelawyer.duckdns.org/.env`): `APP_ENV=production`,
  `APP_DEBUG=false`, `APP_URL=https://thelawyer.duckdns.org`, `APP_TIMEZONE=Asia/Karachi`, `DB_*`, `MAIL_*`,
  `SESSION_ENCRYPT=true`, `QUEUE_CONNECTION=database`, **`JUDGMENTS_IMPORT_TOKEN`** (the scrapers' token, see step 8),
  optional `ANTHROPIC_API_KEY`, `WHATSAPP_*`, and the public `VITE_*` values (the build reads only `APP_NAME` and
  `VITE_*` from here). Config is cached: after editing `.env`, run the workflow again (step 7, *Run workflow*).
- **Queue worker** (notifications are queued). aaPanel → App Store → *Supervisor*, or `/etc/supervisor/conf.d/thelawyer.conf`:
  ```ini
  [program:thelawyer-queue]
  command=/www/server/php/83/bin/php /www/wwwroot/thelawyer.duckdns.org/artisan queue:work --tries=3 --backoff=60 --max-time=3600
  user=www
  autostart=true
  autorestart=true
  stopwaitsecs=3600
  ```
  Each deploy runs `queue:restart`, so the workers pick up the new code by themselves.
- **Scheduler** (reminders 07:00 PKT, subscriptions, weekly judgment search index). `crontab -u www -e`:
  ```
  * * * * * cd /www/wwwroot/thelawyer.duckdns.org && /www/server/php/83/bin/php artisan schedule:run >> /dev/null 2>&1
  ```
- **Uploads:** PHP `upload_max_filesize` / `post_max_size` ≥ 64M and Nginx `client_max_body_size 64m`.

## 5 · Connect GitHub to the server (once; done 2026-11-27)

The deploys use the same key as the blog sites: `~/.ssh/newsnet_deploy` on your Mac. Its public key is in the
server's `/root/.ssh/authorized_keys`. Set or refresh the repository secrets from your Mac:

```bash
bash "/Users/usmanzafar/Desktop/Custom Softwares/set-deploy-secrets.sh"
```

or by hand (GitHub → repo → Settings → Secrets and variables → Actions):

| Secret | Value | |
|---|---|---|
| `DEPLOY_HOST` | the server IP | required |
| `DEPLOY_SSH_KEY` | full contents of `~/.ssh/newsnet_deploy` (with BEGIN/END lines) | required |
| `DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan <SERVER-IP>` | recommended |
| `DEPLOY_USER` / `DEPLOY_PORT` | `root` / `22` | optional (these are the defaults) |

The workflow's `production` environment and the folder/URL (`APP_DIR`, `SITE_URL`) are at the top of
`.github/workflows/deploy.yml`.

---

## 6 · Before a push: see what will happen to the database

Optional, but it takes a minute and shows whether the database will be touched at all:

```bash
# Mac: which migrations does this push add compared with what the server runs now?
SERVER_SHA=$(ssh -i ~/.ssh/newsnet_deploy root@<SERVER-IP> "git -C /www/wwwroot/thelawyer.duckdns.org -c safe.directory='*' rev-parse HEAD")
git fetch origin && git diff --name-only "$SERVER_SHA" HEAD -- database/migrations
```

Empty output = **no migrations, the database is not written to** by this deploy. Otherwise read those files: they
should only create or add (`Schema::create`, `$table->…->nullable()`, `->change()` to widen). If one drops or renames
anything, stop and rethink it before pushing.

Extra safety copy by hand, any time (aaPanel → **Databases** → *Backup*, or in the Terminal):

```bash
cd /www/wwwroot/thelawyer.duckdns.org && DB=$(grep -E '^DB_DATABASE=' .env | cut -d= -f2-)
mkdir -p /www/backup/manual && mysqldump -uroot -p --single-transaction --quick --routines --triggers "$DB" | gzip > "/www/backup/manual/$DB-$(date +%F-%H%M).sql.gz"
```

## 7 · Deploy (every time)

```bash
git add -A && git commit -m "…" && git push origin main
```

GitHub → **Actions** → *CI/CD*: **check** (~4 min) → **deploy** (~3–6 min). Green tick = live. Pull requests only
run *check*. To redeploy without a new commit (for example after editing the server `.env`): Actions → *CI/CD* →
**Run workflow** on `main`.

The deploy log shows each step on the server:

1. **Checks**: commit received, migrations new / pending (`new migrations: 0 · pending now: 0` means the database won't change).
2. **Database backup + maintenance**: only when step 1 found migrations.
3. **Code**: `git reset --hard` to the commit (tracked files only), `composer install --no-dev`, new assets swapped in.
4. **Migrations**: only when step 1 found migrations.
5. **Caches**: config/route caches rebuilt, php-fpm reloaded (fresh OPcache), queue workers restarted; scraper
   `.venv`s get `pip install -r` when a `requirements.txt` changed.
6. **Health check**: `https://thelawyer.duckdns.org/up` must answer 200. If it doesn't, the previous commit is put back.
7. **Court scrapers** (never fails the deploy):
   - **One-time move.** The first deploy after the scrapers moved into `judgements-scrapers/` carries each old
     `./<court>-scraper` folder's server-only `.venv`, `.env` and `storage/` (state.json, logs, saved pages) into
     `judgements-scrapers/<court>-scraper/`. It then leaves a **symlink at the old path**, so existing cron lines and
     the `.venv`'s own script paths keep working. A scraper that is running at that moment is moved on the next deploy.
   - **Tesseract OCR** is installed if missing (`apt-get install tesseract-ocr`, or `dnf`/`yum install tesseract`).
     If that fails, the log shows a warning and nothing else changes.

## 8 · Court scrapers on the server (or on your Mac)

Each scraper has its own `.venv`, `.env` (import URL + token) and `storage/` (state of what was sent), none of them
in git. Set one up once:

```bash
cd /www/wwwroot/thelawyer.duckdns.org/judgements-scrapers/sc-scraper
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env   # set JUDGMENTS_IMPORT_URL=https://thelawyer.duckdns.org/api/judgments/import and JUDGMENTS_IMPORT_TOKEN
```

**The token must match.** `JUDGMENTS_IMPORT_TOKEN` in the scraper's `.env` must equal `JUDGMENTS_IMPORT_TOKEN` in the
site's `.env`. If the site's value is blank, the import endpoint stays closed. On 2026-11-28 the site answered
**401 Unauthorized** to the scrapers' token, so the two differ. Compare them without printing either one:

```bash
# server (site)                                   # Mac (scraper)
grep '^JUDGMENTS_IMPORT_TOKEN=' .env | cut -d= -f2- | tr -d '\r"' | sha256sum | cut -c1-12
grep '^JUDGMENTS_IMPORT_TOKEN=' judgements-scrapers/sc-scraper/.env | cut -d= -f2- | tr -d '\r"' | shasum -a 256 | cut -c1-12
```

Make them the same (aaPanel → Files → edit the site's `.env`), then **Run workflow** (step 7) so the cached config
picks it up. A quick test that only checks the token and saves nothing: an empty POST must answer **422**
(validation), not 401:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://thelawyer.duckdns.org/api/judgments/import \
  -H 'Accept: application/json' -H "Authorization: Bearer <token>"
```

**Cron** (server timezone Asia/Karachi), new paths. Old lines keep working through the symlink; switch when convenient:

```
0 2 * * * cd /www/wwwroot/thelawyer.duckdns.org/judgements-scrapers/lhc-scraper && .venv/bin/python scraper.py >> storage/cron.log 2>&1
```

(same for `phc-`, `shc-`, `ihc-`, `bhc-scraper`; check `crontab -l` and `crontab -u www -l` for the current lines.)
Then once a week: `php artisan judgments:optimize-search-index` (already in the Laravel scheduler, Sundays 04:00).

**Supreme Court reported judgments** come from saved search pages, because the court's search is behind reCAPTCHA:

1. https://scp.gov.pk/JudgmentsSearch → **Reported = Yes** → *Search Judgments* → set **100 per page** next to
   "Search Results" (39 pages, 3,883 rows, on 2026-11-28).
2. Save every page (Cmd/Ctrl+S, "Web page, HTML only") into `judgements-scrapers/sc-scraper/storage/saved/`.
   The 39 pages from 2026-11-28 are already there on the Mac.
3. `cd judgements-scrapers/sc-scraper && .venv/bin/python scraper.py`. This imports, stores each PDF on the site and
   indexes its text in one pass (the first full load takes hours and is safe to stop and resume). AI summaries run only
   when `ANTHROPIC_API_KEY` is set in that `.env`.
4. `.venv/bin/python prune_saved.py` reports which pages are fully imported; `--delete` removes those pages.
   49 old rows (2000–2013) have no PDF link on the court site and can never be imported; they don't keep a page.
   One link is broken at the court (`Const.P.20to27-39&45.pdf`, HTTP 400).

The import never overwrites a filled field and never duplicates a judgment, so re-running is always safe.

## 9 · When something goes wrong

| Problem | What to do |
|---|---|
| *check* failed | Nothing reached the server. Fix it locally, push again. |
| *deploy* failed before "Code" | The site is unchanged. Read the red line (missing secret, no `.env`, database unreachable). |
| *deploy* failed after "Code" | The previous commit was put back automatically; the site runs the old version. |
| A migration ran and was wrong | Restore the backup the log names: `gunzip -c /www/backup/deploy/thelawyer.duckdns.org/<file>.sql.gz \| mysql -u<DB_USERNAME> -p <DB_DATABASE>`. Rows written after the backup are lost, so only do this for a real problem. |
| Roll back code | `git revert <commit>` + push (never `git reset` on the server). |
| "another deploy is running" | Wait; deploys queue up and run one at a time. |
| Scraper gets 401 | Token mismatch, see step 8. |
| `tesseract could not be installed` warning | Install by hand: `apt-get install -y tesseract-ocr`, then `scraper.py --reindex-scanned` for the scanned judgments. |

## 10 · Rules

- Don't edit tracked files or run `git pull` on the server. The next deploy overwrites them; change code locally and push.
- `.env` and uploads exist only on the server. Back them up with aaPanel's site backup, not git.
- Write migrations that only add (new tables, new nullable columns, wider columns). Never drop data in a migration.
- Never run `migrate:fresh`, `db:seed`, `db:wipe` on the server.
