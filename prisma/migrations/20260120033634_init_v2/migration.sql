CREATE TABLE `pengguna` (
    `email` VARCHAR(191) NOT NULL,
    `kataSandiHash` VARCHAR(191) NOT NULL,
    `peran` ENUM('SUPERADMINTPM', 'ADMIN', 'TIMPENILAI') NOT NULL,
    `timKode` ENUM('TIM1', 'TIM2', 'TIM3', 'TIM4', 'TIM5', 'TIM6', 'TIM7', 'TIM8', 'TIM9', 'TIM10') NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,
    `dihapusPada` DATETIME(3) NULL,

    UNIQUE INDEX `pengguna_timKode_key`(`timKode`),
    INDEX `pengguna_peran_idx`(`peran`),
    INDEX `pengguna_statusAktif_idx`(`statusAktif`),
    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `anggota_tim` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `akunEmail` VARCHAR(191) NOT NULL,
    `urutan` INTEGER NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,

    INDEX `anggota_tim_akunEmail_idx`(`akunEmail`),
    UNIQUE INDEX `anggota_tim_akunEmail_urutan_key`(`akunEmail`, `urutan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `periode_penilaian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tahun` INTEGER NOT NULL,
    `semester` INTEGER NOT NULL,
    `namaPeriode` VARCHAR(100) NOT NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuatOlehEmail` VARCHAR(191) NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    INDEX `periode_penilaian_statusAktif_idx`(`statusAktif`),
    UNIQUE INDEX `periode_penilaian_tahun_semester_key`(`tahun`, `semester`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kantor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,
    `dihapusPada` DATETIME(3) NULL,

    INDEX `kantor_nama_idx`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `penugasan_kantor_akun` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodeId` INTEGER NOT NULL,
    `kantorId` INTEGER NOT NULL,
    `akunEmail` VARCHAR(191) NOT NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,
    `tanggalMulai` DATETIME(3) NULL,
    `tanggalSelesai` DATETIME(3) NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,
    `dihapusPada` DATETIME(3) NULL,

    INDEX `penugasan_kantor_akun_akunEmail_idx`(`akunEmail`),
    INDEX `penugasan_kantor_akun_periodeId_idx`(`periodeId`),
    UNIQUE INDEX `penugasan_kantor_akun_periodeId_kantorId_key`(`periodeId`, `kantorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `konfigurasi_bobot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodeId` INTEGER NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuatOlehEmail` VARCHAR(191) NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    INDEX `konfigurasi_bobot_periodeId_idx`(`periodeId`),
    INDEX `konfigurasi_bobot_statusAktif_idx`(`statusAktif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bobot_kriteria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `konfigurasiId` INTEGER NOT NULL,
    `kategori` ENUM('P1', 'P2', 'P3', 'P4', 'P5') NOT NULL,
    `kunciKriteria` VARCHAR(50) NOT NULL,
    `bobot` DECIMAL(10, 2) NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    INDEX `bobot_kriteria_konfigurasiId_idx`(`konfigurasiId`),
    UNIQUE INDEX `bobot_kriteria_konfigurasiId_kategori_kunciKriteria_key`(`konfigurasiId`, `kategori`, `kunciKriteria`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `penilaian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodeId` INTEGER NOT NULL,
    `kantorId` INTEGER NOT NULL,
    `akunEmail` VARCHAR(191) NOT NULL,
    `anggotaId` INTEGER NOT NULL,
    `konfigurasiBobotId` INTEGER NULL,
    `tanggalMulaiInput` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tanggalSubmit` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'SUBMIT') NOT NULL DEFAULT 'DRAFT',
    `catatanRekomendasi` TEXT NULL,
    `nilaiTotal` DECIMAL(6, 2) NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,
    `dihapusPada` DATETIME(3) NULL,

    INDEX `penilaian_akunEmail_idx`(`akunEmail`),
    INDEX `penilaian_periodeId_kantorId_idx`(`periodeId`, `kantorId`),
    INDEX `penilaian_status_idx`(`status`),
    UNIQUE INDEX `penilaian_periodeId_kantorId_akunEmail_anggotaId_key`(`periodeId`, `kantorId`, `akunEmail`, `anggotaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `detail_penilaian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penilaianId` INTEGER NOT NULL,
    `kategori` ENUM('P1', 'P2', 'P3', 'P4', 'P5') NOT NULL,
    `kunciKriteria` VARCHAR(50) NOT NULL,
    `nilai` DECIMAL(6, 2) NOT NULL,
    `catatan` TEXT NULL,
    `bobotSaatDinilai` DECIMAL(10, 2) NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    INDEX `detail_penilaian_penilaianId_idx`(`penilaianId`),
    UNIQUE INDEX `detail_penilaian_penilaianId_kategori_kunciKriteria_key`(`penilaianId`, `kategori`, `kunciKriteria`),
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
    `tanggalUnggah` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dihapusPada` DATETIME(3) NULL,

    INDEX `foto_detail_penilaian_detailId_idx`(`detailId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `anggota_tim` ADD CONSTRAINT `anggota_tim_akunEmail_fkey` FOREIGN KEY (`akunEmail`) REFERENCES `pengguna`(`email`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `periode_penilaian` ADD CONSTRAINT `periode_penilaian_dibuatOlehEmail_fkey` FOREIGN KEY (`dibuatOlehEmail`) REFERENCES `pengguna`(`email`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penugasan_kantor_akun` ADD CONSTRAINT `penugasan_kantor_akun_periodeId_fkey` FOREIGN KEY (`periodeId`) REFERENCES `periode_penilaian`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penugasan_kantor_akun` ADD CONSTRAINT `penugasan_kantor_akun_kantorId_fkey` FOREIGN KEY (`kantorId`) REFERENCES `kantor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penugasan_kantor_akun` ADD CONSTRAINT `penugasan_kantor_akun_akunEmail_fkey` FOREIGN KEY (`akunEmail`) REFERENCES `pengguna`(`email`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `konfigurasi_bobot` ADD CONSTRAINT `konfigurasi_bobot_periodeId_fkey` FOREIGN KEY (`periodeId`) REFERENCES `periode_penilaian`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `konfigurasi_bobot` ADD CONSTRAINT `konfigurasi_bobot_dibuatOlehEmail_fkey` FOREIGN KEY (`dibuatOlehEmail`) REFERENCES `pengguna`(`email`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bobot_kriteria` ADD CONSTRAINT `bobot_kriteria_konfigurasiId_fkey` FOREIGN KEY (`konfigurasiId`) REFERENCES `konfigurasi_bobot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penilaian` ADD CONSTRAINT `penilaian_periodeId_fkey` FOREIGN KEY (`periodeId`) REFERENCES `periode_penilaian`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penilaian` ADD CONSTRAINT `penilaian_kantorId_fkey` FOREIGN KEY (`kantorId`) REFERENCES `kantor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penilaian` ADD CONSTRAINT `penilaian_akunEmail_fkey` FOREIGN KEY (`akunEmail`) REFERENCES `pengguna`(`email`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penilaian` ADD CONSTRAINT `penilaian_anggotaId_fkey` FOREIGN KEY (`anggotaId`) REFERENCES `anggota_tim`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penilaian` ADD CONSTRAINT `penilaian_konfigurasiBobotId_fkey` FOREIGN KEY (`konfigurasiBobotId`) REFERENCES `konfigurasi_bobot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detail_penilaian` ADD CONSTRAINT `detail_penilaian_penilaianId_fkey` FOREIGN KEY (`penilaianId`) REFERENCES `penilaian`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `foto_detail_penilaian` ADD CONSTRAINT `foto_detail_penilaian_detailId_fkey` FOREIGN KEY (`detailId`) REFERENCES `detail_penilaian`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
