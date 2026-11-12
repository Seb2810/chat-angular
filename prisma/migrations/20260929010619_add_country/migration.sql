/*
  Warnings:

  - Added the required column `country` to the `Info` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Info" ADD COLUMN     "country" TEXT NOT NULL;
