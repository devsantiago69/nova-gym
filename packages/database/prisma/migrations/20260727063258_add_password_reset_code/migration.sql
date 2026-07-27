/*
  Warnings:

  - Added the required column `code` to the `password_reset_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "password_reset_tokens" ADD COLUMN     "code" VARCHAR(8) NOT NULL;
