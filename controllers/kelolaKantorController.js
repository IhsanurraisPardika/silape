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
      email: tim.email,
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
        periodeId: activePeriod.id,
        kantorId: kantor.id,
        akunEmail: tim.email, // Link ke email pengguna
        statusAktif: true
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
    const { namaKantor } = req.body;

    // 1. Cari kantor berdasarkan nama
    // Note: Idealnya hapus by ID, tapi UI kirim nama for now
    const kantor = await prisma.kantor.findFirst({
      where: { nama: namaKantor }
    });

    if (!kantor) {
      return res.status(404).json({ message: 'Kantor tidak ditemukan' });
    }

    // 2. Hapus (Soft Delete / Hapus Relasi)
    // Kita set statusAktif=false dan dihapusPada=now
    const now = new Date();
    await prisma.$transaction([
      prisma.kantor.updateMany({
        where: { id: kantor.id },
        data: {
          statusAktif: false,
          dihapusPada: now
        }
      }),
      prisma.penugasanKantorAkun.updateMany({
        where: { kantorId: kantor.id },
        data: {
          statusAktif: false,
          dihapusPada: now
        }
      })
    ]);

    res.json({ success: true });

  } catch (error) {
    console.error('ERROR hapusKantor:', error);
    res.status(500).json({ message: error.message });
  }
};
