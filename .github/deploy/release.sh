#!/usr/bin/env bash
# Runs ON THE SERVER. Started by .github/workflows/deploy.yml over SSH (`bash -s < this file`), never by hand.
# Before it runs, the workflow has pushed the commit into $APP_DIR/.git (refs/deploy/main) and uploaded the
# Vite build to $APP_DIR/public/build.new.
#
# What a deploy NEVER touches: .env, storage/, uploads, any file git does not track (scraper .venv/state,
# public/.user.ini, .well-known, node_modules), and the database, except `migrate --force` right after a
# mysqldump backup. It never seeds and never runs migrate:fresh / db:wipe / git clean.
#
# Inputs (environment): APP_DIR, SHA, SITE_URL.  Guide: docs → "Automatic deploys".
set -Eeuo pipefail

: "${APP_DIR:?}" "${SHA:?}" "${SITE_URL:?}"
PHP="${PHP:-/www/server/php/83/bin/php}"
PHP_FPM_INIT="${PHP_FPM_INIT:-/etc/init.d/php-fpm-83}"
COMPOSER="$(command -v composer)"
NAME="$(basename "$APP_DIR")"
BACKUP_DIR="/www/backup/deploy/$NAME"
KEEP_BACKUPS=10
HOST="${SITE_URL#*://}"; HOST="${HOST%%/*}"

log()  { printf '\n\033[1;34m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  ✓ %s\n' "$*"; }
warn() { printf '::warning::%s\n' "$*"; }
fail() { printf '::error::%s\n' "$*"; exit 1; }

cd "$APP_DIR" 2>/dev/null || fail "$APP_DIR does not exist on the server"
[ -d .git ] && [ -f artisan ] || fail "$APP_DIR is not the Laravel git checkout"
[ -f .env ] || fail "$APP_DIR/.env is missing (it is server-only and must exist before deploying)"
OWNER="$(stat -c %U "$APP_DIR")"

exec 9>"/tmp/deploy-$NAME.lock"
flock -n 9 || fail "another deploy of $NAME is running"

git_root() { git -c safe.directory="$APP_DIR" "$@"; }
as_app()   { sudo -u "$OWNER" -H env PATH="$(dirname "$PHP"):/usr/local/bin:/usr/bin:/bin" "$@"; }
artisan()  { as_app "$PHP" artisan --no-interaction "$@"; }
envval()   { grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -E 's/[[:space:]]+#.*$//; s/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'; }

# Files git tracks belong to the site user (pushes and resets run as root). storage/ is skipped on purpose:
# the queue worker writes there as another user and its permissions must stay as they are.
fix_owner() {
  { git_root ls-files -z; git_root ls-tree -rd --name-only -z HEAD; } \
    | grep -zv '^storage/' | xargs -0 -r chown -h "$OWNER:$OWNER" 2>/dev/null || true
  chown -R "$OWNER:$OWNER" .git
}

clear_and_cache() {
  artisan config:cache >/dev/null
  if [ "$HAD_ROUTE_CACHE" = 1 ]; then artisan route:cache >/dev/null; else artisan route:clear >/dev/null; fi
  if [ "$HAD_EVENT_CACHE" = 1 ]; then artisan event:cache >/dev/null; else artisan event:clear >/dev/null; fi
  artisan view:clear >/dev/null
}

reload_php() {   # OPcache must forget the old files
  if [ -x "$PHP_FPM_INIT" ]; then "$PHP_FPM_INIT" reload >/dev/null 2>&1 || warn "php-fpm reload failed"
  else warn "$PHP_FPM_INIT not found; PHP may keep serving cached old code until php-fpm restarts"; fi
}

backup_db() {
  local conn db user pass host port
  conn="$(envval DB_CONNECTION)"; db="$(envval DB_DATABASE)"; user="$(envval DB_USERNAME)"
  pass="$(envval DB_PASSWORD)"; host="$(envval DB_HOST)"; port="$(envval DB_PORT)"
  case "$conn" in mysql|mariadb) ;; *) fail "database backup supports MySQL only (DB_CONNECTION=$conn); not migrating" ;; esac
  install -d -m 700 "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/$(date +%Y%m%d-%H%M%S)-before-${SHA:0:7}.sql.gz"
  MYSQL_PWD="$pass" mysqldump -h"${host:-127.0.0.1}" -P"${port:-3306}" -u"$user" \
    --single-transaction --quick --routines --triggers --no-tablespaces "$db" | gzip -6 > "$BACKUP_FILE.part"
  mv "$BACKUP_FILE.part" "$BACKUP_FILE"; chmod 600 "$BACKUP_FILE"
  ok "database $db backed up → $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
  ls -1t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f
}

healthy() {
  local code i
  for i in 1 2 3 4 5 6; do
    code="$(curl -sk -o /dev/null -w '%{http_code}' --max-time 20 --resolve "$HOST:443:127.0.0.1" "https://$HOST/up" || true)"
    [ "$code" = 200 ] && return 0
    sleep 5
  done
  warn "https://$HOST/up answered $code (expected 200)"; return 1
}

# ── Rollback: any failure after the code changed puts the previous commit back ────────────────────────
STAGE=checks; DOWN=0; MIGRATED=0; BACKUP_FILE=""; DONE=0
on_exit() {
  local rc=$?
  [ "$DONE" = 1 ] && return
  trap - EXIT; set +e
  if [ "$STAGE" = changed ]; then
    warn "deploy failed; putting back the previous commit ${PREV:0:7}"
    git_root reset -q --hard "$PREV"; fix_owner
    as_app "$PHP" "$COMPOSER" install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-progress -q
    if [ -d public/build.prev ]; then rm -rf public/build; mv public/build.prev public/build; fi
    clear_and_cache; reload_php; artisan queue:restart >/dev/null
  fi
  rm -rf public/build.new
  [ "$DOWN" = 1 ] && artisan up >/dev/null
  if [ "$MIGRATED" = 1 ]; then
    warn "migrations of the new commit already ran. Database backup from just before: $BACKUP_FILE"
    warn "restore only if needed: gunzip -c $BACKUP_FILE | mysql -u<user> -p <database>"
  fi
  printf '::error::deploy of %s failed (exit %s); the site runs %s\n' "${SHA:0:7}" "$rc" "$([ "$STAGE" = changed ] && echo "the previous commit again" || echo "unchanged")"
  exit "$rc"
}
trap on_exit EXIT

# ── 1. Checks (nothing has changed yet) ────────────────────────────────────────────────────────────────
log "Checks"
git_root cat-file -e "$SHA^{commit}" 2>/dev/null || fail "commit $SHA was not pushed to the server"
PREV="$(git_root rev-parse HEAD)"
git_root config core.fileMode false
[ -f bootstrap/cache/routes-v7.php ] && HAD_ROUTE_CACHE=1 || HAD_ROUTE_CACHE=0
[ -f bootstrap/cache/events.php ]    && HAD_EVENT_CACHE=1 || HAD_EVENT_CACHE=0
status="$(artisan migrate:status 2>&1)" || { echo "$status" | tail -5; fail "cannot read the migration status (is the database reachable?)"; }
PENDING_NOW="$(grep -c 'Pending' <<<"$status" || true)"
NEW_MIGRATIONS="$(git_root diff --name-only --diff-filter=AR "$PREV" "$SHA" -- database/migrations | wc -l)"
[ "$PENDING_NOW" -gt 0 ] || [ "$NEW_MIGRATIONS" -gt 0 ] && WILL_MIGRATE=1 || WILL_MIGRATE=0
ok "${PREV:0:7} → ${SHA:0:7} · new migrations: $NEW_MIGRATIONS · pending now: $PENDING_NOW"
git_root diff --stat "$PREV" "$SHA" | tail -1 | sed 's/^/  /'

# ── 2. Database backup + maintenance mode, only when migrations will run ───────────────────────────────
if [ "$WILL_MIGRATE" = 1 ]; then
  log "Database backup (migrations will run)"
  backup_db
  artisan down --retry=15 >/dev/null; DOWN=1; ok "maintenance mode on"
fi

# ── 3. Code ────────────────────────────────────────────────────────────────────────────────────────────
log "Code"
STAGE=changed
git_root reset -q --hard "$SHA"     # tracked files only; untracked and ignored files stay exactly as they are
fix_owner
ok "checked out ${SHA:0:7}"
as_app "$PHP" "$COMPOSER" install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-progress -q
ok "composer install"

if [ -d public/build.new ]; then
  chown -R "$OWNER:$OWNER" public/build.new
  rm -rf public/build.prev
  [ -d public/build ] && mv public/build public/build.prev
  mv public/build.new public/build
  ok "assets switched"
fi

# ── 4. Database ────────────────────────────────────────────────────────────────────────────────────────
if [ "$WILL_MIGRATE" = 1 ]; then
  log "Migrations"
  MIGRATED=1
  artisan migrate --force
fi

# ── 5. Caches, workers ─────────────────────────────────────────────────────────────────────────────────
log "Caches"
[ -e public/storage ] || artisan storage:link >/dev/null
clear_and_cache
reload_php
artisan queue:restart >/dev/null
if [ "$DOWN" = 1 ]; then artisan up >/dev/null; DOWN=0; ok "maintenance mode off"; fi
ok "config/route/view caches rebuilt, php-fpm reloaded, queue workers told to restart"

# Python helpers with their own .venv (e.g. the court scrapers): reinstall when requirements.txt changed.
for req in $(git_root diff --name-only "$PREV" "$SHA" -- '*/requirements.txt'); do
  venv="$(dirname "$req")/.venv"
  [ -x "$venv/bin/pip" ] || continue
  sudo -u "$(stat -c %U "$venv")" "$venv/bin/pip" install -q -r "$req" && ok "pip install -r $req" || warn "pip install -r $req failed"
done

# ── 6. Health check ────────────────────────────────────────────────────────────────────────────────────
log "Health check"
healthy || exit 1
ok "https://$HOST/up → 200"
rm -rf public/build.prev
DONE=1

# ── 7. Court scrapers (never fail the deploy; the site is already live) ───────────────────────────────
# The scrapers moved from ./<court>-scraper to ./judgements-scrapers/<court>-scraper. git moved the tracked
# files; this carries each one's server-only .venv, .env and storage/ (state, logs) across once, then leaves
# a symlink at the old path so existing cron lines and the .venv's own script paths keep working.
# A scraper that is running right now (its storage/scraper.lock is held) is left for the next deploy.
move_scraper() {
  local old="$1" new="judgements-scrapers/$1" item name
  [ -d "$old" ] && [ ! -L "$old" ] && [ -d "$new" ] || return 0
  if [ -f "$old/storage/scraper.lock" ] && ! flock -n "$old/storage/scraper.lock" true; then
    warn "$old is running; it moves to $new on the next deploy"; return 0
  fi
  shopt -s dotglob nullglob
  for item in "$old"/storage/*; do
    name="$(basename "$item")"
    if [ -e "$new/storage/$name" ] && [ "$name" = .gitkeep ]; then rm -f "$item"
    elif [ -e "$new/storage/$name" ]; then warn "$new/storage/$name already exists; kept, $item left in place"
    else mv "$item" "$new/storage/"; fi
  done
  rmdir "$old/storage" 2>/dev/null || true
  rm -rf "$old/__pycache__"
  for item in "$old"/*; do
    name="$(basename "$item")"
    if [ -e "$new/$name" ]; then warn "$new/$name already exists; $item left in place"; else mv "$item" "$new/"; fi
  done
  shopt -u dotglob nullglob
  if rmdir "$old" 2>/dev/null; then
    ln -s "$new" "$old" && chown -h "$OWNER:$OWNER" "$old"
    ok "$old → $new (.venv, .env, storage moved; symlink left at the old path)"
  else
    warn "$old still holds files (see above); not replaced by a symlink"
  fi
}
for court in lhc phc sc shc ihc bhc; do move_scraper "$court-scraper" || warn "moving $court-scraper failed"; done

# Tesseract OCR reads scanned judgment PDFs (scrapers' text index, --reindex-scanned). Installed once.
install_tesseract() {
  local sudo=""; [ "$(id -u)" = 0 ] || sudo="sudo -n"
  if command -v apt-get >/dev/null; then
    $sudo env DEBIAN_FRONTEND=noninteractive timeout 600 apt-get install -y -q tesseract-ocr >/dev/null 2>&1 \
      || { $sudo timeout 300 apt-get update -q >/dev/null 2>&1 && $sudo env DEBIAN_FRONTEND=noninteractive timeout 600 apt-get install -y -q tesseract-ocr >/dev/null 2>&1; }
  elif command -v dnf >/dev/null; then $sudo timeout 600 dnf install -y -q tesseract >/dev/null 2>&1
  elif command -v yum >/dev/null; then $sudo timeout 600 yum install -y -q tesseract >/dev/null 2>&1
  else return 1; fi
}
if command -v tesseract >/dev/null; then ok "tesseract present ($(tesseract --version 2>&1 | head -1))"
elif install_tesseract && command -v tesseract >/dev/null; then ok "tesseract installed ($(tesseract --version 2>&1 | head -1))"
else warn "tesseract could not be installed automatically (apt install tesseract-ocr); scanned judgments wait for OCR"; fi

log "Deployed ${SHA:0:7} to $SITE_URL"
