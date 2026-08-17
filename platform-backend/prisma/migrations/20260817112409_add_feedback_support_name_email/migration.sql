/*
  Warnings:

  - Added the required column `email` to the `feedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `feedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `support_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `support_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "feedback" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "support_requests" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;
