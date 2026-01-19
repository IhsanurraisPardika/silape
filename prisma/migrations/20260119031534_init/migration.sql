CREATE TABLE `pengguna` (
    `email` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `kataSandiHash` VARCHAR(191) NOT NULL,
    `peran` ENUM('SUPERADMIN_TPM', 'ADMIN', 'TIM_PENILAI') NOT NULL,
    `timId` INTEGER NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuatOlehEmail` VARCHAR(191) NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,
    `dihapusPada` DATETIME(3) NULL,

    INDEX `pengguna_timId_idx`(`timId`),
    INDEX `pengguna_peran_idx`(`peran`),
    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tim` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(50) NOT NULL,
    `nama` VARCHAR(100) NOT NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,
    `dihapusPada` DATETIME(3) NULL,

    UNIQUE INDEX `tim_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kantor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(50) NULL,
    `nama` VARCHAR(191) NOT NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuatOlehEmail` VARCHAR(191) NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,
    `dihapusPada` DATETIME(3) NULL,

    INDEX `kantor_nama_idx`(`nama`),
    INDEX `kantor_dibuatOlehEmail_idx`(`dibuatOlehEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `penugasan_kantor_tim` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timId` INTEGER NOT NULL,
    `kantorId` INTEGER NOT NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,
    `tanggalMulai` DATETIME(3) NULL,
    `tanggalSelesai` DATETIME(3) NULL,
    `dibuatOlehEmail` VARCHAR(191) NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dihapusPada` DATETIME(3) NULL,

    INDEX `idx_penugasan_kantor`(`kantorId`),
    INDEX `idx_penugasan_dibuat_oleh`(`dibuatOlehEmail`),
    UNIQUE INDEX `uq_penugasan_tim_kantor`(`timId`, `kantorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `periode_penilaian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tahun` INTEGER NOT NULL,
    `semester` INTEGER NOT NULL,
    `bulan` INTEGER NULL,
    `namaPeriode` VARCHAR(100) NOT NULL,
    `tanggalMulai` DATETIME(3) NULL,
    `tanggalSelesai` DATETIME(3) NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    INDEX `periode_penilaian_tahun_semester_idx`(`tahun`, `semester`),
    INDEX `periode_penilaian_tahun_semester_bulan_idx`(`tahun`, `semester`, `bulan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `konfigurasi_bobot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `periodeId` INTEGER NULL,
    `berlakuMulai` DATETIME(3) NULL,
    `berlakuSampai` DATETIME(3) NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuatOlehEmail` VARCHAR(191) NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    INDEX `konfigurasi_bobot_periodeId_idx`(`periodeId`),
    INDEX `konfigurasi_bobot_dibuatOlehEmail_idx`(`dibuatOlehEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bobot_kriteria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `konfigurasiId` INTEGER NOT NULL,
    `pKode` ENUM('P1', 'P2', 'P3', 'P4', 'P5') NOT NULL,
    `kriteriaKey` VARCHAR(100) NOT NULL,
    `namaKriteria` VARCHAR(191) NULL,
    `bobotKriteria` DECIMAL(10, 2) NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    INDEX `bobot_kriteria_pKode_idx`(`pKode`),
    UNIQUE INDEX `bobot_kriteria_konfigurasiId_kriteriaKey_key`(`konfigurasiId`, `kriteriaKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `penilaian_individu` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodeId` INTEGER NOT NULL,
    `kantorId` INTEGER NOT NULL,
    `timId` INTEGER NOT NULL,
    `penilaiEmail` VARCHAR(191) NOT NULL,
    `konfigurasiBobotId` INTEGER NULL,
    `tanggalMulaiInput` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tanggalSubmit` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'SUBMIT') NOT NULL DEFAULT 'DRAFT',
    `catatanRekomendasi` TEXT NULL,
    `dataSudahBenar` BOOLEAN NOT NULL DEFAULT false,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,
    `dihapusPada` DATETIME(3) NULL,

    INDEX `penilaian_individu_timId_kantorId_idx`(`timId`, `kantorId`),
    INDEX `penilaian_individu_status_idx`(`status`),
    INDEX `penilaian_individu_penilaiEmail_idx`(`penilaiEmail`),
    UNIQUE INDEX `penilaian_individu_periodeId_kantorId_timId_penilaiEmail_key`(`periodeId`, `kantorId`, `timId`, `penilaiEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `detail_penilaian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penilaianId` INTEGER NOT NULL,
    `pKode` ENUM('P1', 'P2', 'P3', 'P4', 'P5') NOT NULL,
    `kriteriaKey` VARCHAR(100) NOT NULL,
    `namaKriteria` VARCHAR(191) NULL,
    `nilai` DECIMAL(5, 2) NOT NULL,
    `catatan` TEXT NULL,
    `bobotSaatDinilai` DECIMAL(10, 2) NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    INDEX `detail_penilaian_pKode_idx`(`pKode`),
    INDEX `detail_penilaian_penilaianId_pKode_idx`(`penilaianId`, `pKode`),
    UNIQUE INDEX `detail_penilaian_penilaianId_kriteriaKey_key`(`penilaianId`, `kriteriaKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `foto_detail_penilaian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `detailId` INTEGER NOT NULL,
    `urlFile` VARCHAR(500) NOT NULL,
    `namaFile` VARCHAR(191) NULL,
    `tipeFile` VARCHAR(50) NULL,
    `ukuranFile` INTEGER NULL,
    `keterangan` TEXT NULL,
    `diunggahOlehEmail` VARCHAR(191) NULL,
    `tanggalUnggah` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dihapusPada` DATETIME(3) NULL,

    INDEX `foto_detail_penilaian_detailId_idx`(`detailId`),
    INDEX `foto_detail_penilaian_diunggahOlehEmail_idx`(`diunggahOlehEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pengguna` ADD CONSTRAINT `pengguna_timId_fkey` FOREIGN KEY (`timId`) REFERENCES `tim`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengguna` ADD CONSTRAINT `pengguna_dibuatOlehEmail_fkey` FOREIGN KEY (`dibuatOlehEmail`) REFERENCES `pengguna`(`email`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kantor` ADD CONSTRAINT `kantor_dibuatOlehEmail_fkey` FOREIGN KEY (`dibuatOlehEmail`) REFERENCES `pengguna`(`email`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penugasan_kantor_tim` ADD CONSTRAINT `fk_penugasan_tim` FOREIGN KEY (`timId`) REFERENCES `tim`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penugasan_kantor_tim` ADD CONSTRAINT `fk_penugasan_kantor` FOREIGN KEY (`kantorId`) REFERENCES `kantor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penugasan_kantor_tim` ADD CONSTRAINT `fk_penugasan_dibuat_oleh` FOREIGN KEY (`dibuatOlehEmail`) REFERENCES `pengguna`(`email`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `konfigurasi_bobot` ADD CONSTRAINT `konfigurasi_bobot_periodeId_fkey` FOREIGN KEY (`periodeId`) REFERENCES `periode_penilaian`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `konfigurasi_bobot` ADD CONSTRAINT `konfigurasi_bobot_dibuatOlehEmail_fkey` FOREIGN KEY (`dibuatOlehEmail`) REFERENCES `pengguna`(`email`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bobot_kriteria` ADD CONSTRAINT `bobot_kriteria_konfigurasiId_fkey` FOREIGN KEY (`konfigurasiId`) REFERENCES `konfigurasi_bobot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penilaian_individu` ADD CONSTRAINT `penilaian_individu_periodeId_fkey` FOREIGN KEY (`periodeId`) REFERENCES `periode_penilaian`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penilaian_individu` ADD CONSTRAINT `penilaian_individu_kantorId_fkey` FOREIGN KEY (`kantorId`) REFERENCES `kantor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penilaian_individu` ADD CONSTRAINT `penilaian_individu_timId_fkey` FOREIGN KEY (`timId`) REFERENCES `tim`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penilaian_individu` ADD CONSTRAINT `penilaian_individu_penilaiEmail_fkey` FOREIGN KEY (`penilaiEmail`) REFERENCES `pengguna`(`email`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penilaian_individu` ADD CONSTRAINT `penilaian_individu_konfigurasiBobotId_fkey` FOREIGN KEY (`konfigurasiBobotId`) REFERENCES `konfigurasi_bobot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detail_penilaian` ADD CONSTRAINT `detail_penilaian_penilaianId_fkey` FOREIGN KEY (`penilaianId`) REFERENCES `penilaian_individu`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `foto_detail_penilaian` ADD CONSTRAINT `foto_detail_penilaian_detailId_fkey` FOREIGN KEY (`detailId`) REFERENCES `detail_penilaian`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `foto_detail_penilaian` ADD CONSTRAINT `foto_detail_penilaian_diunggahOlehEmail_fkey` FOREIGN KEY (`diunggahOlehEmail`) REFERENCES `pengguna`(`email`) ON DELETE SET NULL ON UPDATE CASCADE;
