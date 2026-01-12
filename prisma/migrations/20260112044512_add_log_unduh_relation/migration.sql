/*
  Warnings:

  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `user`;

-- CreateTable
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

    INDEX `penugasan_kantor_tim_kantorId_idx`(`kantorId`),
    INDEX `penugasan_kantor_tim_dibuatOlehEmail_idx`(`dibuatOlehEmail`),
    UNIQUE INDEX `penugasan_kantor_tim_timId_kantorId_key`(`timId`, `kantorId`),
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
CREATE TABLE `kategori_5p` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(10) NOT NULL,
    `nama` VARCHAR(50) NOT NULL,
    `urutan` INTEGER NOT NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `kategori_5p_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kriteria_penilaian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kategoriId` INTEGER NOT NULL,
    `kode` VARCHAR(20) NULL,
    `nomor` INTEGER NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `nilaiMin` INTEGER NOT NULL DEFAULT 0,
    `nilaiMaks` INTEGER NOT NULL DEFAULT 100,
    `bobotDefault` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    INDEX `kriteria_penilaian_kategoriId_idx`(`kategoriId`),
    UNIQUE INDEX `kriteria_penilaian_kategoriId_nomor_key`(`kategoriId`, `nomor`),
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
CREATE TABLE `detail_konfigurasi_bobot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `konfigurasiId` INTEGER NOT NULL,
    `kriteriaId` INTEGER NOT NULL,
    `bobotKriteria` DECIMAL(10, 2) NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    INDEX `detail_konfigurasi_bobot_kriteriaId_idx`(`kriteriaId`),
    UNIQUE INDEX `detail_konfigurasi_bobot_konfigurasiId_kriteriaId_key`(`konfigurasiId`, `kriteriaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `predikat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(50) NOT NULL,
    `nilaiMin` DECIMAL(5, 2) NOT NULL,
    `nilaiMaks` DECIMAL(5, 2) NOT NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `predikat_nama_key`(`nama`),
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
    `nilaiTotal` DECIMAL(5, 2) NULL,
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
    `kriteriaId` INTEGER NOT NULL,
    `nilai` DECIMAL(5, 2) NOT NULL,
    `catatan` TEXT NULL,
    `bobotSaatDinilai` DECIMAL(10, 2) NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahPada` DATETIME(3) NOT NULL,

    INDEX `detail_penilaian_kriteriaId_idx`(`kriteriaId`),
    UNIQUE INDEX `detail_penilaian_penilaianId_kriteriaId_key`(`penilaianId`, `kriteriaId`),
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

-- CreateTable
CREATE TABLE `rekap_penilaian_tim_kantor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodeId` INTEGER NOT NULL,
    `timId` INTEGER NOT NULL,
    `kantorId` INTEGER NOT NULL,
    `status` ENUM('PROSES', 'SELESAI') NOT NULL DEFAULT 'PROSES',
    `nilaiP1` DECIMAL(5, 2) NULL,
    `nilaiP2` DECIMAL(5, 2) NULL,
    `nilaiP3` DECIMAL(5, 2) NULL,
    `nilaiP4` DECIMAL(5, 2) NULL,
    `nilaiP5` DECIMAL(5, 2) NULL,
    `nilaiAkhir` DECIMAL(5, 2) NULL,
    `predikatId` INTEGER NULL,
    `terakhirDihitungPada` DATETIME(3) NULL,

    INDEX `rekap_penilaian_tim_kantor_periodeId_timId_idx`(`periodeId`, `timId`),
    UNIQUE INDEX `rekap_penilaian_tim_kantor_periodeId_timId_kantorId_key`(`periodeId`, `timId`, `kantorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rekap_kriteria_tim_kantor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodeId` INTEGER NOT NULL,
    `timId` INTEGER NOT NULL,
    `kantorId` INTEGER NOT NULL,
    `kriteriaId` INTEGER NOT NULL,
    `nilaiRataRata` DECIMAL(5, 2) NOT NULL,
    `bobotKriteria` DECIMAL(10, 2) NOT NULL,
    `terakhirDihitungPada` DATETIME(3) NULL,

    INDEX `rekap_kriteria_tim_kantor_periodeId_timId_kantorId_idx`(`periodeId`, `timId`, `kantorId`),
    UNIQUE INDEX `rekap_kriteria_tim_kantor_periodeId_timId_kantorId_kriteriaI_key`(`periodeId`, `timId`, `kantorId`, `kriteriaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `log_unduh_laporan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penggunaEmail` VARCHAR(191) NOT NULL,
    `periodeId` INTEGER NOT NULL,
    `timId` INTEGER NULL,
    `jenis` ENUM('REKAP_KANTOR', 'REKAP_PENILAIAN', 'REKAP_KRITERIA') NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `log_unduh_laporan_periodeId_timId_idx`(`periodeId`, `timId`),
    INDEX `log_unduh_laporan_penggunaEmail_idx`(`penggunaEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pengguna` ADD CONSTRAINT `pengguna_timId_fkey` FOREIGN KEY (`timId`) REFERENCES `tim`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengguna` ADD CONSTRAINT `pengguna_dibuatOlehEmail_fkey` FOREIGN KEY (`dibuatOlehEmail`) REFERENCES `pengguna`(`email`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kantor` ADD CONSTRAINT `kantor_dibuatOlehEmail_fkey` FOREIGN KEY (`dibuatOlehEmail`) REFERENCES `pengguna`(`email`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penugasan_kantor_tim` ADD CONSTRAINT `penugasan_kantor_tim_timId_fkey` FOREIGN KEY (`timId`) REFERENCES `tim`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penugasan_kantor_tim` ADD CONSTRAINT `penugasan_kantor_tim_kantorId_fkey` FOREIGN KEY (`kantorId`) REFERENCES `kantor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penugasan_kantor_tim` ADD CONSTRAINT `penugasan_kantor_tim_dibuatOlehEmail_fkey` FOREIGN KEY (`dibuatOlehEmail`) REFERENCES `pengguna`(`email`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kriteria_penilaian` ADD CONSTRAINT `kriteria_penilaian_kategoriId_fkey` FOREIGN KEY (`kategoriId`) REFERENCES `kategori_5p`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `konfigurasi_bobot` ADD CONSTRAINT `konfigurasi_bobot_periodeId_fkey` FOREIGN KEY (`periodeId`) REFERENCES `periode_penilaian`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `konfigurasi_bobot` ADD CONSTRAINT `konfigurasi_bobot_dibuatOlehEmail_fkey` FOREIGN KEY (`dibuatOlehEmail`) REFERENCES `pengguna`(`email`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detail_konfigurasi_bobot` ADD CONSTRAINT `detail_konfigurasi_bobot_konfigurasiId_fkey` FOREIGN KEY (`konfigurasiId`) REFERENCES `konfigurasi_bobot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detail_konfigurasi_bobot` ADD CONSTRAINT `detail_konfigurasi_bobot_kriteriaId_fkey` FOREIGN KEY (`kriteriaId`) REFERENCES `kriteria_penilaian`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE `detail_penilaian` ADD CONSTRAINT `detail_penilaian_kriteriaId_fkey` FOREIGN KEY (`kriteriaId`) REFERENCES `kriteria_penilaian`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `foto_detail_penilaian` ADD CONSTRAINT `foto_detail_penilaian_detailId_fkey` FOREIGN KEY (`detailId`) REFERENCES `detail_penilaian`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `foto_detail_penilaian` ADD CONSTRAINT `foto_detail_penilaian_diunggahOlehEmail_fkey` FOREIGN KEY (`diunggahOlehEmail`) REFERENCES `pengguna`(`email`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rekap_penilaian_tim_kantor` ADD CONSTRAINT `rekap_penilaian_tim_kantor_periodeId_fkey` FOREIGN KEY (`periodeId`) REFERENCES `periode_penilaian`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rekap_penilaian_tim_kantor` ADD CONSTRAINT `rekap_penilaian_tim_kantor_timId_fkey` FOREIGN KEY (`timId`) REFERENCES `tim`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rekap_penilaian_tim_kantor` ADD CONSTRAINT `rekap_penilaian_tim_kantor_kantorId_fkey` FOREIGN KEY (`kantorId`) REFERENCES `kantor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rekap_penilaian_tim_kantor` ADD CONSTRAINT `rekap_penilaian_tim_kantor_predikatId_fkey` FOREIGN KEY (`predikatId`) REFERENCES `predikat`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rekap_kriteria_tim_kantor` ADD CONSTRAINT `rekap_kriteria_tim_kantor_periodeId_fkey` FOREIGN KEY (`periodeId`) REFERENCES `periode_penilaian`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rekap_kriteria_tim_kantor` ADD CONSTRAINT `rekap_kriteria_tim_kantor_timId_fkey` FOREIGN KEY (`timId`) REFERENCES `tim`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rekap_kriteria_tim_kantor` ADD CONSTRAINT `rekap_kriteria_tim_kantor_kantorId_fkey` FOREIGN KEY (`kantorId`) REFERENCES `kantor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rekap_kriteria_tim_kantor` ADD CONSTRAINT `rekap_kriteria_tim_kantor_kriteriaId_fkey` FOREIGN KEY (`kriteriaId`) REFERENCES `kriteria_penilaian`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `log_unduh_laporan` ADD CONSTRAINT `log_unduh_laporan_penggunaEmail_fkey` FOREIGN KEY (`penggunaEmail`) REFERENCES `pengguna`(`email`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `log_unduh_laporan` ADD CONSTRAINT `log_unduh_laporan_periodeId_fkey` FOREIGN KEY (`periodeId`) REFERENCES `periode_penilaian`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `log_unduh_laporan` ADD CONSTRAINT `log_unduh_laporan_timId_fkey` FOREIGN KEY (`timId`) REFERENCES `tim`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
