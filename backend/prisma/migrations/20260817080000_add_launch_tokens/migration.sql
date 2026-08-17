-- New, additive table only. Applied by hand (not via `prisma migrate dev`)
-- for the same reason as the platformUserId migration: the shadow-database
-- diff for this project shows pre-existing drift on unrelated tables from
-- an earlier `prisma db push`, and `migrate dev` would demand a full
-- reset to reconcile it. Not acceptable against a live database.

CREATE TABLE "launch_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "launch_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "launch_tokens_token_hash_key" ON "launch_tokens"("token_hash");

ALTER TABLE "launch_tokens" ADD CONSTRAINT "launch_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
