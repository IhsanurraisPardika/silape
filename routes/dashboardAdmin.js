// routes/dashboardAdmin.js
const express = require("express");
const router = express.Router();
const { harusAdmin } = require("../middlewares/auth.middleware");

// Halaman Dashboard Admin
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/", harusAdmin, async (req, res) => {
  try {
    // 1. Ambil Periode Aktif
    const periodeAktif = await prisma.periodePenilaian.findFirst({
      where: { statusAktif: true },
    });

    // 2. Total Kantor (Aktif)
    const totalKantor = await prisma.kantor.count({
      where: { statusAktif: true },
    });

    let sudahDinilai = 0;
    let riwayatPenilaian = [];

    if (periodeAktif) {
      // 3. Ambil Konfigurasi Bobot untuk periode ini (untuk tahu jumlah kriteria)
      const konfigurasi = await prisma.konfigurasiBobot.findFirst({
        where: { periodeId: periodeAktif.id, statusAktif: true },
        include: { _count: { select: { bobotKriteria: true } } }
      });
      const totalKriteriaDiharapkan = konfigurasi ? konfigurasi._count.bobotKriteria : 16;

      // 4. Hitung Kontor yang "Selesai" untuk ringkasan (Summary Cards)
      // Kita ambil semua penilaian SUBMIT di periode ini untuk dianalisis
      const semuaPenilaian = await prisma.penilaian.findMany({
        where: { periodeId: periodeAktif.id, status: "SUBMIT" },
        include: { detail: true }
      });

      const kantorSelesaiSet = new Set();
      semuaPenilaian.forEach(p => {
        const isLengkap = p.detail.length >= totalKriteriaDiharapkan;
        const adaRekomendasi = p.catatanRekomendasi && p.catatanRekomendasi.trim() !== "";
        // Hanya hitung yang benar-benar Selesai (Submit + Lengkap + Rekomendasi)
        if (p.status === "SUBMIT" && isLengkap && adaRekomendasi) {
          kantorSelesaiSet.add(p.kantorId);
        }
      });
      sudahDinilai = kantorSelesaiSet.size;

      // 5. Ambil 10 aktivitas terbaru untuk "Riwayat Penilaian"
      const dataRiwayat = await prisma.penilaian.findMany({
        where: {
          periodeId: periodeAktif.id,
        },
        include: {
          kantor: true,
          akun: true,
          anggota: true,
          detail: true,
        },
        orderBy: {
          diubahPada: "desc",
        },
        take: 10,
      });

      // 6. Map riwayat dengan status computed isSelesai
      riwayatPenilaian = dataRiwayat.map(item => {
        const isLengkap = item.detail.length >= totalKriteriaDiharapkan;
        const adaRekomendasi = item.catatanRekomendasi && item.catatanRekomendasi.trim() !== "";
        const isSubmitted = item.status === "SUBMIT";

        return {
          ...item,
          isSelesai: isSubmitted && isLengkap && adaRekomendasi
        };
      });
    }

    const belumDiinput = Math.max(0, totalKantor - sudahDinilai);

    res.render("admin/DashboardAdmin", {
      title: "Dashboard Admin",
      user: req.session.user,
      totalKantor,
      sudahDinilai,
      belumDiinput,
      riwayatPenilaian,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).send("Gagal memuat dashboard");
  }
});

// Halaman Rekap Kantor Admin
const dashboardAdminController = require("../controllers/dashboardAdminController");
router.get("/rekapKantorAdmin", harusAdmin, dashboardAdminController.rekapKantor);

// Halaman Rekap Penilaian Admin
router.get("/rekapPenilaianAdmin", harusAdmin, dashboardAdminController.rekapPenilaian);

// Halaman Rekap Kriteria Admin
router.get("/rekapKriteriaAdmin", harusAdmin, dashboardAdminController.rekapKriteria);

// Halaman Download Rekap
router.get("/downloadRekapKantor", harusAdmin, dashboardAdminController.downloadRekapKantor);
router.get("/downloadRekapKriteria", harusAdmin, dashboardAdminController.downloadRekapKriteria);
router.get("/downloadRekapPenilaian", harusAdmin, dashboardAdminController.downloadRekapPenilaian);

// Halaman Kelola Tim
router.get("/kelolaTim", harusAdmin, (req, res) => {
  res.render("KelolaTim");
});

// Halaman Unduh Laporan Admin
router.get("/unduhLaporan", harusAdmin, dashboardAdminController.unduhLaporan);

module.exports = router;
