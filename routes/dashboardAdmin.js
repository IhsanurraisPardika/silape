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
    let sedangProses = 0;
    let riwayatPenilaian = [];
    let chartDataTim = [];
    let totalKriteriaDiharapkan = 16; // Fallback

    if (periodeAktif) {
      // 3. Ambil Konfigurasi Bobot (untuk tahu target kriteria)
      const konfigurasi = await prisma.konfigurasiBobot.findFirst({
        where: { periodeId: periodeAktif.id, statusAktif: true },
        include: { _count: { select: { bobotKriteria: true } } }
      });
      if (konfigurasi && konfigurasi._count) {
        totalKriteriaDiharapkan = konfigurasi._count.bobotKriteria;
      }

      // 4. Ambil Data Penugasan & Anggota Tim per Akun
      const penugasanList = await prisma.penugasanKantorAkun.findMany({
        where: { periodeId: periodeAktif.id, statusAktif: true },
        include: {
          akun: {
            include: {
              anggotaTim: { where: { statusAktif: true } }
            }
          }
        }
      });

      // 5. Ambil Semua Penilaian untuk periode ini
      const semuaPenilaian = await prisma.penilaian.findMany({
        where: { periodeId: periodeAktif.id },
        include: { detail: true, akun: true }
      });

      const perTim = {};

      // Analisis status per Penugasan (Per Kantor & Per Akun Tim)
      penugasanList.forEach(tug => {
        const totalAnggota = tug.akun.anggotaTim.length;
        const timKey = tug.akun.timKode || 'TIM';
        if (!perTim[timKey]) {
          perTim[timKey] = { selesai: 0, totalNilai: 0, countNilai: 0 };
        }

        // Cari penilaian untuk kantor ini dari akun ini
        const penilaianKantorIni = semuaPenilaian.filter(p =>
          p.kantorId === tug.kantorId && p.akunEmail === tug.akunEmail
        );

        let anggotaSelesaiCount = 0;
        let adaAktivitas = penilaianKantorIni.length > 0;

        penilaianKantorIni.forEach(p => {
          const isLengkap = p.detail ? p.detail.length >= totalKriteriaDiharapkan : false;
          const adaRekomendasi = p.catatanRekomendasi && p.catatanRekomendasi.trim() !== "";
          const isSelesai = p.status === "SUBMIT" && isLengkap && adaRekomendasi;

          if (isSelesai) {
            anggotaSelesaiCount++;
            // Hitung kontribusi kantor selesai pro-rata terhadap jumlah anggota tim
            perTim[timKey].selesai += (1 / Math.max(1, totalAnggota));
          }

          if (p.nilaiTotal) {
            perTim[timKey].totalNilai += Number(p.nilaiTotal);
            perTim[timKey].countNilai += 1;
          }
        });

        if (totalAnggota > 0 && anggotaSelesaiCount === totalAnggota) {
          sudahDinilai++;
        } else if (adaAktivitas) {
          sedangProses++;
        }
      });

      // Bulatkan jumlah selesai per tim
      Object.keys(perTim).forEach(key => {
        perTim[key].selesai = Math.floor(perTim[key].selesai + 0.001);
      });

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

      riwayatPenilaian = dataRiwayat.map(item => {
        const isLengkap = item.detail ? item.detail.length >= totalKriteriaDiharapkan : false;
        const adaRekomendasi = item.catatanRekomendasi && item.catatanRekomendasi.trim() !== "";
        const isSubmitted = item.status === "SUBMIT";

        return {
          ...item,
          isSelesai: isSubmitted && isLengkap && adaRekomendasi
        };
      });

      // 7. Format data tim untuk chart
      chartDataTim = Object.keys(perTim).map(key => ({
        tim: key,
        selesai: perTim[key].selesai,
        rataRata: perTim[key].countNilai > 0 ? (perTim[key].totalNilai / perTim[key].countNilai).toFixed(2) : 0
      }));
    }

    const belumDiinput = Math.max(0, totalKantor - sudahDinilai - sedangProses);

    res.render("admin/DashboardAdmin", {
      title: "Dashboard Admin",
      user: req.session.user,
      totalKantor,
      sudahDinilai,
      sedangProses,
      belumDiinput,
      riwayatPenilaian,
      chartData: {
        totalKantor,
        sudahDinilai,
        sedangProses,
        belumDiinput,
        dataTim: chartDataTim
      }
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
