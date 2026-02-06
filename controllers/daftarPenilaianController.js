const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const PDFDocument = require("pdfkit");

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

    // Selalu gunakan periode aktif terbaru (agar jika admin mengganti periode, list ikut menyesuaikan)
    const activePeriode = await prisma.periodePenilaian.findFirst({
      where: { statusAktif: true },
      orderBy: [{ tahun: 'desc' }, { semester: 'desc' }, { diubahPada: 'desc' }]
    });

    if (!activePeriode) {
      return res.render('daftarPenilaian', { data: [], isKetua: false, activePeriode: null });
    }

    // 1. Ambil data user lengkap
    const pengguna = await prisma.pengguna.findUnique({
      where: { username: user.username },
      include: {
        anggotaTim: true // Untuk cek urutan (ketua = 1)
      }
    });

    if (!pengguna || pengguna.peran !== 'TIMPENILAI' || !pengguna.timKode) {
      // Jika bukan tim penilai, tampilkan kosong atau handle sesuai kebutuhan
      return res.render('daftarPenilaian', { data: [], isKetua: false, activePeriode });
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
        akunUsername: user.username,
        periodeId: activePeriode.id,
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

    // Cache bobot kriteria per periode untuk menghitung Nilai Akhir (Total Bobot)
    const bobotKriteriaByPeriode = new Map();
    const getBobotKriteria = async (periodeId) => {
      const key = Number(periodeId);
      if (bobotKriteriaByPeriode.has(key)) return bobotKriteriaByPeriode.get(key);

      const configBobot = await prisma.konfigurasiBobot.findFirst({
        where: { periodeId: key, statusAktif: true },
        include: { bobotKriteria: true }
      });

      const list = Array.isArray(configBobot?.bobotKriteria) ? configBobot.bobotKriteria : [];
      bobotKriteriaByPeriode.set(key, list);
      return list;
    };

    const data = [];

    // 4. Loop setiap kantor yang ditugaskan -> Cek status tim
    for (const p of penugasan) {
      // Ambil semua penilaian untuk kantor & periode ini untuk seluruh anggota aktif
      const penilaianTim = await prisma.penilaian.findMany({
        where: {
          periodeId: p.periodeId,
          kantorId: p.kantorId,
          akunUsername: user.username,
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
              nilai: true,
              kunciKriteria: true
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
      if (approvedAt) status = 'Approve';
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
        const bobotKriteria = await getBobotKriteria(p.periodeId);
        const allDetails = completedList.flatMap((pTim) => pTim.detail || []);

        // Samakan dengan rekap kantor admin: Nilai Akhir = sum( avgNilaiPerKriteria * bobotKriteria )
        if (bobotKriteria.length > 0 && allDetails.length > 0) {
          const valuesByKey = new Map();
          for (const d of allDetails) {
            const key = d?.kunciKriteria;
            if (!key) continue;
            const n = Number(d.nilai);
            if (!Number.isFinite(n)) continue;
            const list = valuesByKey.get(key) || [];
            list.push(n);
            valuesByKey.set(key, list);
          }

          let totalSkorAkhir = 0;
          for (const b of bobotKriteria) {
            const key = b.kunciKriteria;
            const list = valuesByKey.get(key) || [];
            if (list.length === 0) continue;
            const sum = list.reduce((acc, v) => acc + v, 0);
            const avg = sum / list.length;
            const weight = Number.parseFloat(String(b.bobot));
            if (!Number.isFinite(weight)) continue;
            totalSkorAkhir += avg * weight;
          }

          rata = totalSkorAkhir;
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
        rata: hasNilai ? rata.toFixed(2) : '-',
        status: status, // Belum Dinilai / Process / Selesai / Approve
        isSelesai: allComplete && !approvedAt, // Button approve hanya saat semua selesai
        isApproved: !!approvedAt,
        canEdit: !approvedAt,
        detailUrl: `/formPenilaian?kantor=${p.kantorId}&periode=${p.periodeId}`, // Redirect ke form edit
        buktiUrl: approvedAt ? `/daftarPenilaian/bukti-approval?kantorId=${p.kantorId}&periodeId=${p.periodeId}` : null,
        kantorId: p.kantorId,
        periodeId: p.periodeId
      });
    }

    res.render('daftarPenilaian', {
      data,
      isKetua, // Ketua ditentukan dari anggota yang dipilih di session (urutan=1)
      activePeriode
    });

  } catch (error) {
    console.error("Error loading daftar penilaian:", error);
    res.render('daftarPenilaian', { data: [], isKetua: false, activePeriode: null });
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

    // Pastikan hanya periode aktif yang bisa di-approve (mencegah approve periode lama saat admin sudah ganti periode)
    const activePeriode = await prisma.periodePenilaian.findFirst({
      where: { statusAktif: true },
      orderBy: [{ tahun: 'desc' }, { semester: 'desc' }, { diubahPada: 'desc' }]
    });
    if (!activePeriode || Number(periodeId) !== Number(activePeriode.id)) {
      return res.status(400).json({ success: false, message: "Periode penilaian tidak aktif." });
    }

    const pengguna = await prisma.pengguna.findUnique({
      where: { username: user.username },
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
        akunUsername: user.username,
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
        akunUsername: user.username,
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

exports.downloadBuktiApproval = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).send("Unauthorized");

    const anggotaAktif = req.session.anggotaAktif || null;
    const isKetuaSession = !!(anggotaAktif && Number(anggotaAktif.urutan) === 1);
    if (!isKetuaSession) return res.status(403).send("Akses ditolak");

    const kantorId = req.query?.kantorId;
    const periodeId = req.query?.periodeId;
    if (!kantorId || !periodeId) {
      return res.status(400).send("Parameter tidak lengkap");
    }

    const pengguna = await prisma.pengguna.findUnique({
      where: { username: user.username },
      include: { anggotaTim: true }
    });

    if (!pengguna || pengguna.peran !== 'TIMPENILAI' || !pengguna.timKode) {
      return res.status(403).send("Akses ditolak");
    }

    const anggotaAktifDb = (pengguna.anggotaTim || []).find(
      (a) => a.statusAktif && Number(a.id) === Number(anggotaAktif?.id) && Number(a.urutan) === 1
    );
    if (!anggotaAktifDb) {
      return res.status(403).send("Akses ditolak");
    }

    const penugasan = await prisma.penugasanKantorAkun.findFirst({
      where: {
        akunUsername: user.username,
        kantorId: parseInt(kantorId),
        periodeId: parseInt(periodeId),
        statusAktif: true
      },
      include: { kantor: true, periode: true }
    });

    if (!penugasan) {
      return res.status(404).send("Data penugasan tidak ditemukan");
    }

    const anggotaIdsAktif = (pengguna.anggotaTim || [])
      .filter((a) => a.statusAktif)
      .map((a) => a.id);

    const penilaianTim = await prisma.penilaian.findMany({
      where: {
        periodeId: parseInt(periodeId),
        kantorId: parseInt(kantorId),
        akunUsername: user.username,
        anggotaId: { in: anggotaIdsAktif }
      },
      select: {
        anggotaId: true,
        status: true,
        tanggalSubmit: true,
        tanggalMulaiInput: true,
        dibuatPada: true,
        diubahPada: true
      }
    });

    const approvedAllRequired = anggotaIdsAktif.length > 0 && anggotaIdsAktif.every((anggotaId) => {
      const pRow = penilaianTim.find((x) => Number(x.anggotaId) === Number(anggotaId));
      return pRow && pRow.status === 'APPROVED';
    });

    if (!approvedAllRequired) {
      return res.status(400).send("Penilaian belum di-approve");
    }

    const approvedAt = penilaianTim
      .filter((item) => item.status === 'APPROVED')
      .reduce((maxDate, item) => {
        const d = item.diubahPada || item.tanggalSubmit || item.tanggalMulaiInput || item.dibuatPada;
        if (!d) return maxDate;
        return !maxDate || d > maxDate ? d : maxDate;
      }, null);

    const formatTanggal = (dateObj) => {
      if (!dateObj) return "-";
      const options = { day: "numeric", month: "long", year: "numeric" };
      return dateObj.toLocaleDateString("id-ID", options);
    };

    const safeFilePart = (value) => {
      return String(value || '')
        .replace(/[^a-z0-9-_]+/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
    };

    const kantorNama = penugasan.kantor?.nama || `Kantor_${kantorId}`;
    const periodeNama = penugasan.periode?.namaPeriode || `Periode_${periodeId}`;
    const fileName = `Bukti-Approve-${safeFilePart(kantorNama)}-${safeFilePart(periodeNama)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    doc.fontSize(16).text('BUKTI APPROVE PENILAIAN', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#6b7280').text('Dokumen ini dibuat secara otomatis oleh sistem SILAPE.', { align: 'center' });
    doc.moveDown(1.5);

    doc.fillColor('#111827');
    doc.fontSize(12);
    doc.text(`Periode: ${periodeNama}`);
    doc.text(`Kantor: ${kantorNama}`);
    doc.text(`Tim: ${String(pengguna.timKode)}`);
    doc.text(`Ketua Tim: ${anggotaAktifDb.nama}`);
    doc.text(`Tanggal Approve: ${formatTanggal(approvedAt)}`);
    doc.moveDown(1);

    doc.fontSize(11).fillColor('#374151');
    doc.text('Catatan:', { underline: true });
    doc.moveDown(0.25);
    doc.text('- Unduhan ini hanya tersedia untuk Ketua Tim (urutan 1).');
    doc.text('- Data approve valid jika seluruh anggota tim berstatus APPROVED.');

    doc.end();
  } catch (error) {
    console.error("Error download bukti approval:", error);
    return res.status(500).send("Gagal membuat bukti approval");
  }
};