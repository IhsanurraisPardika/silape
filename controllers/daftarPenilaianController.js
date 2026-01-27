const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Jumlah detail yang dianggap lengkap untuk satu penilaian
const EXPECTED_DETAIL_COUNT = 16;

exports.index = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect("/login");

    const formatTanggal = (dateObj) => {
      if (!dateObj) return "-";
      const options = { day: "numeric", month: "long", year: "numeric" };
      return dateObj.toLocaleDateString("id-ID", options);
    };

    // 1. Ambil data user lengkap untuk tahu timKode dan posisi (Ketua/Anggota)
    const pengguna = await prisma.pengguna.findUnique({
      where: { email: user.email },
      include: {
        anggotaTim: true // Untuk cek urutan (ketua = 1)
      }
    });

    if (!pengguna || pengguna.peran !== 'TIMPENILAI' || !pengguna.timKode) {
      // Jika bukan tim penilai, tampilkan kosong atau handle sesuai kebutuhan
      return res.render('daftarPenilaian', { data: [], isKetua: false });
    }

    // Cek apakah ketua (urutan 1 di anggotaTim)
    // Note: anggotaTim is an array, but usually user has one active entry per team context?
    // Based on schema `anggotaTim AnggotaTim[]`, we assume current one matches the context.
    // For now check if ANY of their anggotaTim record has urutan 1 (assuming 1 active team participation)
    // A better way might be to filter by active status if it existed, schema has statusAktif on AnggotaTim.
    const anggotaLink = pengguna.anggotaTim.find(a => a.statusAktif && a.urutan === 1);
    const isKetua = !!anggotaLink;

    // 2. Ambil Penugasan Kantor untuk User ini
    // Kita asumsikan menampilkan untuk Periode Aktif (atau semua? Request tidak spesifik, kita ambil semua yang ditugaskan)
    const penugasan = await prisma.penugasanKantorAkun.findMany({
      where: {
        akunEmail: user.email,
        statusAktif: true
      },
      include: {
        kantor: true,
        periode: true // Opsional, untuk info
      }
    });

    // 3. Ambil anggota tim di tim yang sama
    const anggotaTim = await prisma.pengguna.findMany({
      where: {
        timKode: pengguna.timKode,
        statusAktif: true,
        peran: 'TIMPENILAI'
      },
      select: { email: true }
    });
    const teamEmails = anggotaTim.map((a) => a.email);
    const totalAnggotaTim = teamEmails.length;
    // Note: This counts User Accounts in the team. 
    // Alternatively, count AnggotaTim records related to users with that timKode?
    // Let's rely on Pengguna.timKode as the grouper.

    const data = [];

    // 4. Loop setiap kantor yang ditugaskan -> Cek status tim
    for (const p of penugasan) {
      // Ambil semua penilaian tim untuk kantor & periode ini
      const penilaianTim = await prisma.penilaian.findMany({
        where: {
          periodeId: p.periodeId,
          kantorId: p.kantorId,
          akunEmail: { in: teamEmails }
        },
        select: {
          id: true,
          akunEmail: true,
          status: true,
          tanggalMulaiInput: true,
          tanggalSubmit: true,
          dibuatPada: true,
          diubahPada: true,
          detail: {
            select: {
              id: true,
              nilai: true
            }
          }
        }
      });

      const hasStarted = penilaianTim.length > 0;

      const startedAt = penilaianTim.reduce((minDate, item) => {
        const d = item.tanggalMulaiInput || item.dibuatPada;
        if (!d) return minDate;
        return !minDate || d < minDate ? d : minDate;
      }, null);

      const approvedAt = penilaianTim
        .filter((item) => item.status === 'APPROVED')
        .reduce((maxDate, item) => {
          const d = item.diubahPada || item.tanggalSubmit || item.tanggalMulaiInput || item.dibuatPada;
          if (!d) return maxDate;
          return !maxDate || d > maxDate ? d : maxDate;
        }, null);

      const isPenilaianComplete = (penilaian) => {
        if (!penilaian) return false;
        if (!penilaian.detail || penilaian.detail.length < EXPECTED_DETAIL_COUNT) return false;
        return true;
      };

      const completedByEmail = new Map();
      for (const email of teamEmails) {
        const list = penilaianTim.filter((pTim) => pTim.akunEmail === email);
        const completed = list.some(isPenilaianComplete);
        completedByEmail.set(email, completed);
      }

      const completedCount = Array.from(completedByEmail.values()).filter(Boolean).length;
      const allComplete = totalAnggotaTim > 0 && completedCount >= totalAnggotaTim;

      let status;
      if (approvedAt) status = 'Approval';
      else if (!hasStarted) status = 'Belum Dinilai';
      else if (allComplete) status = 'Selesai';
      else status = 'Process';

      // Hitung rata-rata tim hanya jika semua anggota selesai input nilai
      let rata = 0;
      let hasNilai = false;
      let completedAt = null;
      if (allComplete) {
        const completedPerEmail = new Map();
        for (const email of teamEmails) {
          const list = penilaianTim
            .filter((pTim) => pTim.akunEmail === email)
            .filter(isPenilaianComplete)
            .sort((a, b) => {
              const da = a.diubahPada || a.tanggalSubmit || a.tanggalMulaiInput || a.dibuatPada || new Date(0);
              const db = b.diubahPada || b.tanggalSubmit || b.tanggalMulaiInput || b.dibuatPada || new Date(0);
              return db - da;
            });
          if (list.length > 0) completedPerEmail.set(email, list[0]);
        }

        const completedList = Array.from(completedPerEmail.values());
        const allDetails = completedList.flatMap((pTim) => pTim.detail || []);
        if (allDetails.length > 0) {
          const total = allDetails.reduce((sum, d) => sum + Number(d.nilai), 0);
          rata = total / allDetails.length;
          hasNilai = true;
        }

        completedAt = completedList.reduce((maxDate, item) => {
          const d = item.diubahPada || item.tanggalSubmit || item.tanggalMulaiInput || item.dibuatPada;
          if (!d) return maxDate;
          return !maxDate || d > maxDate ? d : maxDate;
        }, null);
      }

      // Format tanggal (Tanggal selesai atau approval)
      const dateObj = approvedAt || completedAt || null;
      const tanggalStr = formatTanggal(dateObj);

      data.push({
        tanggal: tanggalStr,
        kantor: p.kantor.nama,
        rata: hasNilai ? rata.toFixed(1) : '-',
        status: status, // Belum Dinilai / Process / Selesai / Approval
        isSelesai: allComplete && !approvedAt, // Button approve hanya saat semua selesai
        detailUrl: `/formPenilaian?kantor=${p.kantorId}&periode=${p.periodeId}`, // Redirect ke form edit
        kantorId: p.kantorId,
        periodeId: p.periodeId
      });
    }

    res.render('daftarPenilaian', {
      data,
      isKetua // Kirim status ketua ke view
    });

  } catch (error) {
    console.error("Error loading daftar penilaian:", error);
    res.render('daftarPenilaian', { data: [], isKetua: false });
  }
};

exports.approve = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { kantorId, periodeId } = req.body || {};
    if (!kantorId || !periodeId) {
      return res.status(400).json({ success: false, message: "Parameter tidak lengkap" });
    }

    const pengguna = await prisma.pengguna.findUnique({
      where: { email: user.email },
      include: { anggotaTim: true }
    });

    const isKetua = pengguna && pengguna.anggotaTim.some(a => a.statusAktif && a.urutan === 1);
    if (!pengguna || pengguna.peran !== 'TIMPENILAI' || !pengguna.timKode || !isKetua) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    const anggotaTim = await prisma.pengguna.findMany({
      where: {
        timKode: pengguna.timKode,
        statusAktif: true,
        peran: 'TIMPENILAI'
      },
      select: { email: true }
    });
    const teamEmails = anggotaTim.map((a) => a.email);

    const penilaianTim = await prisma.penilaian.findMany({
      where: {
        periodeId: parseInt(periodeId),
        kantorId: parseInt(kantorId),
        akunEmail: { in: teamEmails }
      },
      select: {
        akunEmail: true,
        detail: { select: { id: true } }
      }
    });

    const isPenilaianComplete = (penilaian) => {
      if (!penilaian) return false;
      if (!penilaian.detail || penilaian.detail.length < EXPECTED_DETAIL_COUNT) return false;
      return true;
    };

    const completedByEmail = new Map();
    for (const email of teamEmails) {
      const list = penilaianTim.filter((pTim) => pTim.akunEmail === email);
      const completed = list.some(isPenilaianComplete);
      completedByEmail.set(email, completed);
    }

    const completedCount = Array.from(completedByEmail.values()).filter(Boolean).length;
    const allComplete = teamEmails.length > 0 && completedCount >= teamEmails.length;

    if (!allComplete) {
      return res.status(400).json({ success: false, message: "Semua anggota tim harus menyelesaikan penilaian." });
    }

    await prisma.penilaian.updateMany({
      where: {
        periodeId: parseInt(periodeId),
        kantorId: parseInt(kantorId),
        akunEmail: { in: teamEmails }
      },
      data: {
        status: 'APPROVED',
        tanggalSubmit: new Date()
      }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Error approve penilaian:", error);
    return res.status(500).json({ success: false, message: "Gagal melakukan approval, anggota tim belum menyelesaikan seluruh penilaian." });
  }
};