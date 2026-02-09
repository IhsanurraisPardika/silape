-- AlterTable
ALTER TABLE `detail_penilaian` ADD COLUMN `namaAnggota` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `penilaian` MODIFY `anggotaId` INTEGER NULL,
    MODIFY `status` ENUM('DRAFT', 'SUBMIT', 'APPROVED') NOT NULL DEFAULT 'DRAFT';
