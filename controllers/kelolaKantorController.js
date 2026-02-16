const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.index = async (req, res) => {
  try {
    // 1. Cari Periode Aktif
    const activePeriod = await prisma.periodePenilaian.findFirst({
      where: { statusAktif: true }
    });

    // Jika tidak ada periode aktif diset, handling error atau tampilkan kosong
    if (!activePeriod) {
      // Bisa render dengan data kosong, atau tampilkan pesan
      return res.render('admin/kelolaKantor', {
        title: 'Kelola Kantor Tim',
        user: req.session.user || 'ADMIN',
        dataTim: [],
        activeTab: 'kantor',
        message: 'Belum ada Periode Penilaian yang aktif.'
      });
    }

    // 2. Ambil Akun Tim (Pengguna dengan Role TIM/TimKode)
    // Asumsi: Tim didefinisikan oleh field timKode (TIM1..TIM10) atau peran TIMPENILAI
    // Kita filter yg punya timKode
    const timList = await prisma.pengguna.findMany({
      where: {
        timKode: { not: null },
        statusAktif: true
      },
      include: {
        penugasanKantor: {
          where: {
            periodeId: activePeriod.id,
            statusAktif: true
          },
          include: {
            kantor: true
          }
        }
      },
      orderBy: {
        timKode: 'asc'
      }
    });

    // 3. Mapping data untuk View
    const dataTim = timList.map(tim => ({
      // timKode misal "TIM1", "TIM2"
      // Kita bisa format jadi "TIM 1" dengan spasi jika perlu, atau biarkan raw
      nama: formatTimName(tim.timKode),
      kode: tim.timKode,
      username: tim.username,
      jumlah: tim.penugasanKantor.length,
      kantor: tim.penugasanKantor
        .filter(p => p.kantor)
        .map(p => ({
          id: p.kantor.id, // butuh ID untuk delete nanti
          nama: p.kantor.nama
        }))
    }));

    res.render('admin/kelolaKantor', {
      title: 'Kelola Kantor Tim',
      user: req.session.user || 'ADMIN',
      dataTim,
      activeTab: 'kantor'
    });

  } catch (error) {
    console.error('ERROR kelolaKantorController:', error);
    res.status(500).send('Gagal memuat halaman: ' + error.message);
  }
};

exports.tambahKantor = async (req, res) => {
  try {
    // timNama misal "TIM 1"
    const { timNama, namaKantor } = req.body;

    // 1. Cek Periode Aktif
    const activePeriod = await prisma.periodePenilaian.findFirst({
      where: { statusAktif: true }
    });
    if (!activePeriod) {
      return res.status(400).json({ message: 'Tidak ada periode aktif.' });
    }

    // 2. Cari Tim (Pengguna)
    // Convert "TIM 1" -> "TIM1" (sesuaikan enum)
    const timKodeInput = timNama.replace(/\s/g, '');

    const tim = await prisma.pengguna.findFirst({
      where: { timKode: timKodeInput }
    });

    if (!tim) {
      return res.status(404).json({ message: 'Tim tidak ditemukan' });
    }

    // 3. Create Kantor Baru
    // (Atau bisa cari dulu kalau mau reuse, tapi requirement 'create')
    const kantor = await prisma.kantor.create({
      data: {
        nama: namaKantor,
        statusAktif: true
      }
    });

    // 4. Create Penugasan (Link ke Akun & Periode)
    await prisma.penugasanKantorAkun.create({
      data: {
        statusAktif: true,
        periode: { connect: { id: activePeriod.id } },
        kantor: { connect: { id: kantor.id } },
        akun: { connect: { username: tim.username } }
      }
    });

    res.json({ success: true });

  } catch (error) {
    console.error('ERROR tambahKantor:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper untuk format display
function formatTimName(kode) {
  // TIM1 -> TIM 1
  // TIM10 -> TIM 10
  if (!kode) return "";
  return kode.replace("TIM", "TIM ");
}

exports.hapusKantor = async (req, res) => {
  try {
    const { kantorId, namaKantor } = req.body || {};

    // Utamakan hapus berdasarkan ID (lebih aman daripada nama)
    let kantor = null;
    if (kantorId !== undefined && kantorId !== null && String(kantorId).trim() !== '') {
      const id = Number.parseInt(String(kantorId), 10);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ success: false, message: 'kantorId tidak valid' });
      }
      kantor = await prisma.kantor.findUnique({ where: { id } });
    } else if (namaKantor) {
      // Fallback kompatibilitas lama
      kantor = await prisma.kantor.findFirst({ where: { nama: namaKantor } });
    }

    if (!kantor) {
      return res.status(404).json({ success: false, message: 'Kantor tidak ditemukan' });
    }

    // Hard delete (hapus permanen) + hapus dependensi agar tidak kena FK constraint
    const kantorIdNum = Number(kantor.id);

    const penilaianRows = await prisma.penilaian.findMany({
      where: { kantorId: kantorIdNum },
      select: { id: true }
    });
    const penilaianIds = penilaianRows.map((p) => p.id);

    const detailRows = penilaianIds.length
      ? await prisma.detailPenilaian.findMany({
        where: { penilaianId: { in: penilaianIds } },
        select: { id: true }
      })
      : [];
    const detailIds = detailRows.map((d) => d.id);

    await prisma.$transaction(async (tx) => {
      if (detailIds.length) {
        await tx.fotoDetailPenilaian.deleteMany({ where: { detailId: { in: detailIds } } });
      }

      if (penilaianIds.length) {
        await tx.detailPenilaian.deleteMany({ where: { penilaianId: { in: penilaianIds } } });
        await tx.penilaian.deleteMany({ where: { id: { in: penilaianIds } } });
      }

      await tx.penugasanKantorAkun.deleteMany({ where: { kantorId: kantorIdNum } });
      await tx.kantor.delete({ where: { id: kantorIdNum } });
    });

    return res.json({ success: true });

  } catch (error) {
    console.error('ERROR hapusKantor:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
