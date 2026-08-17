/*
  Warnings:

  - Added the required column `plan_key` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "intent" TEXT NOT NULL DEFAULT 'signup',
ADD COLUMN     "plan_key" TEXT NOT NULL;
