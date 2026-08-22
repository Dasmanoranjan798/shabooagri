#!/bin/bash
# ==============================================================================
# SHABOOAGRI PRODUCTION DATABASE BACKUP SCRIPT
# Non-destructive automated PostgreSQL logical backup with retention policy.
#
# Backs up BOTH databases the product depends on, each to its own dated file
# with the same retention policy:
#   1. Operational DB  (backend/.env DATABASE_URL, shabooagri_db) ->
#        shabooagri_prod_<ts>.sql.gz        (bookings, jobs, invoices, ...)
#   2. Platform DB     (platform-backend/.env PLATFORM_DATABASE_URL,
#        shabooagri_platform_db) -> shabooagri_platform_<ts>.sql.gz
#        (customer accounts, licenses, payments)
#
# The two databases are deliberately isolated (separate DBs/roles), so each is
# dumped independently: a failure backing up one must NOT prevent the other
# from being backed up, and the script exits non-zero if EITHER fails so the
# cron log / monitoring can catch it.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "${SCRIPT_DIR}")"
REPO_ROOT="$(dirname "${BACKEND_DIR}")"
PLATFORM_DIR="${REPO_ROOT}/platform-backend"

BACKUP_DIR="${BACKUP_DIR:-${REPO_ROOT}/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}"

if ! command -v pg_dump > /dev/null 2>&1; then
  echo "[ERROR] pg_dump tool not found in PATH."
  exit 1
fi

# Reads a connection string from a given .env file WITHOUT printing it.
# $1 = env file path, $2 = variable name. Echoes the value (may be empty).
read_env_url() {
  local env_file="$1" var_name="$2"
  [ -f "${env_file}" ] || return 0
  (cd "$(dirname "${env_file}")" && node -r dotenv/config -e \
    "process.stdout.write(process.env.${var_name} || '')" \
    dotenv_config_path="${env_file}")
}

# Dumps one database. $1 = human label, $2 = connection URL,
# $3 = file prefix (used for both the dated filename and retention glob).
# Returns non-zero on any failure. Never leaks the URL to stdout/log.
backup_one() {
  local label="$1" url="$2" prefix="$3"
  local out_file="${BACKUP_DIR}/${prefix}_${TIMESTAMP}.sql.gz"

  if [ -z "${url}" ]; then
    echo "[ERROR] ${label}: connection URL not set — cannot back up."
    return 1
  fi

  echo "[$(date)] Starting ${label} backup..."
  # Fail if pg_dump fails even though its output is piped into gzip.
  set -o pipefail
  if pg_dump "${url}" | gzip > "${out_file}"; then
    chmod 600 "${out_file}"
    echo "[$(date)] ${label} backup completed successfully: ${out_file} (Size: $(du -h "${out_file}" | cut -f1))"
    echo "[$(date)] Cleaning up ${label} backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -type f -name "${prefix}_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
    echo "[$(date)] ${label} retention cleanup completed."
    return 0
  else
    echo "[ERROR] ${label}: pg_dump failed."
    # Remove any partial/truncated file so it can never be mistaken for a
    # valid backup during a restore.
    rm -f "${out_file}"
    return 1
  fi
}

OPERATIONAL_URL="$(read_env_url "${BACKEND_DIR}/.env" DATABASE_URL)"
PLATFORM_URL="$(read_env_url "${PLATFORM_DIR}/.env" PLATFORM_DATABASE_URL)"

exit_code=0
backup_one "Operational DB (shabooagri_db)" "${OPERATIONAL_URL}" "shabooagri_prod" || exit_code=1
backup_one "Platform DB (shabooagri_platform_db)" "${PLATFORM_URL}" "shabooagri_platform" || exit_code=1

if [ "${exit_code}" -ne 0 ]; then
  echo "[$(date)] One or more database backups FAILED — see errors above."
fi
exit "${exit_code}"
