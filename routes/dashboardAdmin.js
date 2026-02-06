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

    // 2. Total Kantor (Aktif) - Init 0 (akan diupdate berdasarkan penugasan periode aktif)
    let totalKantor = 0;

    let sudahDinilai = 0;
    let sedangProses = 0;
    let riwayatPenilaian = [];
    let chartDataTim = [];
    let totalKriteriaDiharapkan = 16; // Fallback

    if (periodeAktif) {
      // 3. Ambil Konfigurasi Bobot (untuk tahu target kriteria dan bobot)
      const konfigurasi = await prisma.konfigurasiBobot.findFirst({
        where: { periodeId: periodeAktif.id, statusAktif: true },
        include: { bobotKriteria: true } // Include full objects, not just count
      });
      if (konfigurasi && konfigurasi.bobotKriteria) {
        totalKriteriaDiharapkan = konfigurasi.bobotKriteria.length;
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

      // Update Total Kantor sesuai jumlah penugasan di periode ini
      totalKantor = penugasanList.length;

      // 5. Ambil Semua Penilaian untuk periode ini
      const semuaPenilaian = await prisma.penilaian.findMany({
        where: { periodeId: periodeAktif.id },
        include: { detail: true, akun: true, kantor: true }
      });

      const perTim = {};
      const chartDataKantorRef = {};

      // Analisis status per Penugasan (Per Kantor & Per Akun Tim)
      penugasanList.forEach(tug => {
        // ... (Logic Lama untuk Summary Card tetap sama) ...
        const totalAnggota = tug.akun.anggotaTim.length;
        const timKey = tug.akun.timKode || 'TIM';
        if (!perTim[timKey]) {
          perTim[timKey] = { selesai: 0, totalNilai: 0, countNilai: 0, totalTugas: 0 };
        }
        perTim[timKey].totalTugas += 1;

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
            perTim[timKey].selesai += (1 / Math.max(1, totalAnggota));
          }
        });

        if (totalAnggota > 0 && anggotaSelesaiCount === totalAnggota) {
          sudahDinilai++;
        } else if (adaAktivitas) {
          sedangProses++;
        }
      });

      // 7. Format data kantor untuk Top 5 List (LOGIC BARU)
      if (konfigurasi && konfigurasi.bobotKriteria) {
        const groupedByKantor = {};

        // Group details by Kantor (Hanya yang APPROVED)
        semuaPenilaian.forEach(ass => {
          if (ass.status !== 'APPROVED') return; // Filter Approved
          const kId = ass.kantorId;
          if (!kId) return;
          if (!groupedByKantor[kId]) {
            groupedByKantor[kId] = {
              nama: ass.kantor ? ass.kantor.nama : 'Kantor #' + kId,
              details: []
            };
          }
          groupedByKantor[kId].details.push(...ass.detail);
        });

        chartDataTim = Object.values(groupedByKantor).map(group => {
          let totalScore = 0;

          // Calculate Score based on Weighted Criteria (like Rekap Kantor)
          konfigurasi.bobotKriteria.forEach(b => {
            const relevant = group.details.filter(d => d.kunciKriteria === b.kunciKriteria);
            if (relevant.length > 0) {
              const avg = relevant.reduce((a, r) => a + Number(r.nilai), 0) / relevant.length;
              totalScore += (avg * Number(b.bobot));
            }
          });

          return {
            kantor: group.nama,
            rataRata: Number(totalScore.toFixed(2))
          };
        })
          .sort((a, b) => b.rataRata - a.rataRata)
          .slice(0, 5);
      } else {
        chartDataTim = [];
      }

      // 5. Riwayat Approve Kantor (Hanya yang APPROVED)
      // Ambil lebih banyak data dulu untuk di-deduplicate (karena 1 kantor bisa punya banyak record penilaian dari anggota tim)
      const rawRiwayat = await prisma.penilaian.findMany({
        where: {
          periodeId: periodeAktif.id,
          status: 'APPROVED'
        },
        include: {
          kantor: true,
          akun: true,
          anggota: true,
        },
        orderBy: {
          diubahPada: "desc", // Waktu approval (update terakhir)
        },
        take: 50, // Ambil cukup banyak untuk antisipasi duplikat
      });

      // Deduplikasi by KantorId (Ambil yang paling baru aja)
      const uniqueRiwayat = [];
      const seenKantorIds = new Set();

      for (const item of rawRiwayat) {
        if (!seenKantorIds.has(item.kantorId)) {
          seenKantorIds.add(item.kantorId);
          uniqueRiwayat.push(item);
        }
        if (uniqueRiwayat.length >= 10) break; // Cukup 10 unique
      }

      riwayatPenilaian = uniqueRiwayat.map(item => {
        // Format tanggal approval
        const dateObj = new Date(item.diubahPada);
        const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        return {
          ...item,
          tanggalApprove: dateStr,
          approvedBy: 'Ketua Tim' // Asumsi approval oleh ketua
        };
      });
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
