-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "staff_invites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "village_id" UUID,
    "token_hash" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invited_by_user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_invites_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_village_id_fkey" FOREIGN KEY ("village_id") REFERENCES "villages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
