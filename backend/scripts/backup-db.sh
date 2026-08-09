#!/bin/bash
# ==============================================================================
# SHABOOAGRI PRODUCTION DATABASE BACKUP SCRIPT
# Non-destructive automated PostgreSQL logical backup with retention policy
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "${SCRIPT_DIR}")"
REPO_ROOT="$(dirname "${BACKEND_DIR}")"

DATABASE_URL=""
if [ -f "${BACKEND_DIR}/.env" ]; then
  DATABASE_URL=$(cd "${BACKEND_DIR}" && node -r dotenv/config -e "console.log(process.env.DATABASE_URL || '')" dotenv_config_path="${BACKEND_DIR}/.env")
fi

BACKUP_DIR="${BACKUP_DIR:-${REPO_ROOT}/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/shabooagri_prod_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting ShabooAgri database backup..."

if command -v pg_dump > /dev/null 2>&1; then
  if [ -n "${DATABASE_URL}" ]; then
    pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILE}"
    chmod 600 "${BACKUP_FILE}"
    echo "[$(date)] Backup completed successfully: ${BACKUP_FILE} (Size: $(du -h "${BACKUP_FILE}" | cut -f1))"
    
    # Retention cleanup: Remove backups older than RETENTION_DAYS
    echo "[$(date)] Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -type f -name "shabooagri_prod_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
    echo "[$(date)] Backup retention cleanup completed."
  else
    echo "[ERROR] DATABASE_URL not set in environment or backend/.env"
    exit 1
  fi
else
  echo "[ERROR] pg_dump tool not found in PATH."
  exit 1
fi
