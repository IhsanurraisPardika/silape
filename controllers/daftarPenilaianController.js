const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Jumlah detail yang dianggap lengkap untuk satu penilaian
// Hapus EXPECTED_DETAIL_COUNT konstan, kita akan hitung dinamis
// const EXPECTED_DETAIL_COUNT = 16;

exports.index = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect("/login");

    const anggotaAktif = req.session.anggotaAktif || null;
    const isKetua = !!(anggotaAktif && Number(anggotaAktif.urutan) === 1);

    const formatTanggal = (dateObj) => {
      if (!dateObj) return "-";
      const options = { day: "numeric", month: "long", year: "numeric" };
      return dateObj.toLocaleDateString("id-ID", options);
    };

    // 1. Ambil data user lengkap
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

    // Jika belum memilih anggota aktif, jangan anggap ketua
    // (tanpa ini, siapa pun yang login bisa dianggap ketua dari sisi UI)
    if (!anggotaAktif) {
      // Tetap render list, tapi tombol approve akan non-aktif
      // (status completeness tetap dihitung berdasarkan seluruh anggota aktif)
    }

    // Cek apakah ketua (urutan 1 di anggotaTim)
    // Note: anggotaTim is an array, but usually user has one active entry per team context?
    // Based on schema `anggotaTim AnggotaTim[]`, we assume current one matches the context.
    // For now check if ANY of their anggotaTim record has urutan 1 (assuming 1 active team participation)
    // A better way might be to filter by active status if it existed, schema has statusAktif on AnggotaTim.
    // Cek apakah ketua (urutan 1 di anggotaTim) - Logic dipindahkan ke bawah agar lebih strict
    // dan menggunakan logic currentUserAnggota.

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

    // 3. Ambil anggota tim (orang-orang) yang aktif untuk akun tim ini
    // Catatan: Anggota tim bukan Pengguna lain; mereka disimpan di tabel AnggotaTim.
    const anggotaTimAktif = (pengguna.anggotaTim || [])
      .filter((a) => a.statusAktif)
      .sort((a, b) => a.urutan - b.urutan);

    const anggotaIdsAktif = anggotaTimAktif.map((a) => a.id);
    const totalAnggotaTim = anggotaIdsAktif.length;

    // Cache expectedCount per periode agar konsisten dan efisien
    const expectedCountByPeriode = new Map();
    const getExpectedCount = async (periodeId) => {
      const key = Number(periodeId);
      if (expectedCountByPeriode.has(key)) return expectedCountByPeriode.get(key);

      const configBobot = await prisma.konfigurasiBobot.findFirst({
        where: { periodeId: key, statusAktif: true },
        include: { _count: { select: { bobotKriteria: true } } }
      });

      const expected = configBobot?._count?.bobotKriteria || 16;
      expectedCountByPeriode.set(key, expected);
      return expected;
    };

    const data = [];

    // 4. Loop setiap kantor yang ditugaskan -> Cek status tim
    for (const p of penugasan) {
      // Ambil semua penilaian untuk kantor & periode ini untuk seluruh anggota aktif
      const penilaianTim = await prisma.penilaian.findMany({
        where: {
          periodeId: p.periodeId,
          kantorId: p.kantorId,
          akunEmail: user.email,
          anggotaId: { in: anggotaIdsAktif }
        },
        select: {
          id: true,
          anggotaId: true,
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

      const expectedCount = await getExpectedCount(p.periodeId);

      const isPenilaianComplete = (penilaian) => {
        if (!penilaian) return false;
        if (!penilaian.detail || penilaian.detail.length < expectedCount) return false;
        return true;
      };

      const completedByAnggotaId = new Map();
      for (const anggotaId of anggotaIdsAktif) {
        const list = penilaianTim.filter((pTim) => Number(pTim.anggotaId) === Number(anggotaId));
        const completed = list.some(isPenilaianComplete);
        completedByAnggotaId.set(Number(anggotaId), completed);
      }

      const completedCount = Array.from(completedByAnggotaId.values()).filter(Boolean).length;
      const allComplete = totalAnggotaTim > 0 && completedCount >= totalAnggotaTim;

      const approvedAllRequired = anggotaIdsAktif.length > 0 && anggotaIdsAktif.every((anggotaId) => {
        const pRow = penilaianTim.find((x) => Number(x.anggotaId) === Number(anggotaId));
        return pRow && pRow.status === 'APPROVED';
      });

      const approvedAt = approvedAllRequired
        ? penilaianTim
            .filter((item) => item.status === 'APPROVED')
            .reduce((maxDate, item) => {
              const d = item.diubahPada || item.tanggalSubmit || item.tanggalMulaiInput || item.dibuatPada;
              if (!d) return maxDate;
              return !maxDate || d > maxDate ? d : maxDate;
            }, null)
        : null;

      let status;
      if (approvedAt) status = 'Approval';
      else if (allComplete) status = 'Selesai';
      else if (hasStarted) status = 'Process';
      else status = 'Belum Dinilai';

      // Hitung rata-rata tim hanya jika semua anggota selesai input nilai
      let rata = 0;
      let hasNilai = false;
      let completedAt = null;
      if (allComplete) {
        const completedPerAnggota = new Map();
        for (const anggotaId of anggotaIdsAktif) {
          const list = penilaianTim
            .filter((pTim) => Number(pTim.anggotaId) === Number(anggotaId))
            .filter(isPenilaianComplete)
            .sort((a, b) => {
              const da = a.diubahPada || a.tanggalSubmit || a.tanggalMulaiInput || a.dibuatPada || new Date(0);
              const db = b.diubahPada || b.tanggalSubmit || b.tanggalMulaiInput || b.dibuatPada || new Date(0);
              return db - da;
            });
          if (list.length > 0) completedPerAnggota.set(Number(anggotaId), list[0]);
        }

        const completedList = Array.from(completedPerAnggota.values());
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
        isApproved: !!approvedAt,
        canEdit: !approvedAt,
        detailUrl: `/formPenilaian?kantor=${p.kantorId}&periode=${p.periodeId}`, // Redirect ke form edit
        kantorId: p.kantorId,
        periodeId: p.periodeId
      });
    }

    res.render('daftarPenilaian', {
      data,
      isKetua // Ketua ditentukan dari anggota yang dipilih di session (urutan=1)
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

    const anggotaAktif = req.session.anggotaAktif || null;
    const isKetuaSession = !!(anggotaAktif && Number(anggotaAktif.urutan) === 1);

    const { kantorId, periodeId } = req.body || {};
    if (!kantorId || !periodeId) {
      return res.status(400).json({ success: false, message: "Parameter tidak lengkap" });
    }

    const pengguna = await prisma.pengguna.findUnique({
      where: { email: user.email },
      include: { anggotaTim: true }
    });

    // Approve hanya boleh oleh ketua yang sedang dipilih di session
    // (mencegah semua anggota bisa approve hanya karena data anggotaTim ada urutan 1)
    if (!pengguna || pengguna.peran !== 'TIMPENILAI' || !pengguna.timKode || !isKetuaSession) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    // Pastikan anggotaAktif benar-benar milik akun ini & masih aktif
    const anggotaAktifDb = (pengguna.anggotaTim || []).find(
      (a) => a.statusAktif && Number(a.id) === Number(anggotaAktif.id) && Number(a.urutan) === 1
    );
    if (!anggotaAktifDb) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    const anggotaIdsAktif = (pengguna.anggotaTim || [])
      .filter((a) => a.statusAktif)
      .map((a) => a.id);

    const penilaianTim = await prisma.penilaian.findMany({
      where: {
        periodeId: parseInt(periodeId),
        kantorId: parseInt(kantorId),
        akunEmail: user.email,
        anggotaId: { in: anggotaIdsAktif }
      },
      select: {
        anggotaId: true,
        detail: { select: { id: true } }
      }
    });

    // Get expected count
    const configBobot = await prisma.konfigurasiBobot.findFirst({
      where: { periodeId: parseInt(periodeId), statusAktif: true },
      include: { _count: { select: { bobotKriteria: true } } }
    });
    const expectedCount = configBobot?._count?.bobotKriteria || 16;

    const isPenilaianComplete = (penilaian) => {
      if (!penilaian) return false;
      if (!penilaian.detail || penilaian.detail.length < expectedCount) return false;
      return true;
    };

    const completedByAnggotaId = new Map();
    for (const anggotaId of anggotaIdsAktif) {
      const list = penilaianTim.filter((pTim) => Number(pTim.anggotaId) === Number(anggotaId));
      const completed = list.some(isPenilaianComplete);
      completedByAnggotaId.set(Number(anggotaId), completed);
    }

    const completedCount = Array.from(completedByAnggotaId.values()).filter(Boolean).length;
    const allComplete = anggotaIdsAktif.length > 0 && completedCount >= anggotaIdsAktif.length;

    if (!allComplete) {
      return res.status(400).json({ success: false, message: "Semua anggota tim harus menyelesaikan penilaian." });
    }

    await prisma.penilaian.updateMany({
      where: {
        periodeId: parseInt(periodeId),
        kantorId: parseInt(kantorId),
        akunEmail: user.email,
        anggotaId: { in: anggotaIdsAktif }
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