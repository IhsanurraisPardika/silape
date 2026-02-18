/*
  Warnings:

  - A unique constraint covering the columns `[timKode,periodeId]` on the table `pengguna` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `pengguna_timKode_key` ON `pengguna`;

-- AlterTable
ALTER TABLE `pengguna` ADD COLUMN `periodeId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `pengguna_timKode_periodeId_key` ON `pengguna`(`timKode`, `periodeId`);

-- AddForeignKey
ALTER TABLE `pengguna` ADD CONSTRAINT `pengguna_periodeId_fkey` FOREIGN KEY (`periodeId`) REFERENCES `periode_penilaian`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
