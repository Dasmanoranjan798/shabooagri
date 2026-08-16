-- Add SAAS_RESET value to OtpPurpose enum, used for SaaS customer password-reset tokens (kept separate from the tenant-app RESET purpose to avoid identifier/purpose collisions across the two user tables)
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'SAAS_RESET';
