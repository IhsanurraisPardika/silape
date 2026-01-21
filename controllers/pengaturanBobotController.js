const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * TAMPIL HALAMAN
 */
exports.index = async (req, res) => {
  try {
    res.render('admin/pengaturanBobot', { success: false });
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal memuat halaman');
  }
};

/**
 * SIMPAN PENGATURAN BOBOT
 */
exports.simpan = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user?.email) {
      return res.status(401).send('User belum login');
    }

    /* =========================
       1b. CEK PERIODE AKTIF (REQUIRED)
    ========================== */
    const activePeriod = await prisma.periodePenilaian.findFirst({
      where: { statusAktif: true }
    });

    if (!activePeriod) {
      return res.status(400).send('Tidak ada Periode Aktif. Silakan aktifkan periode terlebih dahulu.');
    }

    /* =========================
       1. NONAKTIFKAN KONFIGURASI LAMA DI PERIODE INI
    ========================== */
    await prisma.konfigurasiBobot.updateMany({
      where: {
        statusAktif: true,
        periodeId: activePeriod.id // Scope ke periode aktif
      },
      data: { statusAktif: false }
    });

    /* =========================
       2. BUAT KONFIGURASI BARU
    ========================== */
    const konfigurasi = await prisma.konfigurasiBobot.create({
      data: {
        nama: `Konfigurasi ${new Date().toLocaleString('id-ID')}`,
        statusAktif: true,
        dibuatOleh: {
          connect: { email: user.email }
        },
        periode: {
          connect: { id: activePeriod.id }
        }
      }
    });

    /* =========================
       3. OLAH INPUT FORM
    ========================== */
    const bobotData = [];

    for (const key in req.body) {
      const nilai = req.body[key];
      if (nilai === '' || isNaN(nilai)) continue;

      // Key format: p1_k1, p5_k3
      const match = key.match(/p(\d+)_k(\d+)/i);
      if (!match) continue;

      // match[1] = "1" (Kategori P1), match[2] = "1" (Kriteria 1)
      const katNum = match[1];
      const kritNum = match[2];

      const kodeKategori = `P${katNum}`; // "P1"
      const kunciKriteria = `P${katNum}-${kritNum}`; // "P1-1"
      const bobot = parseFloat(nilai);

      if (isNaN(bobot)) continue;

      // Push to array untuk createMany
      bobotData.push({
        konfigurasiId: konfigurasi.id,
        kategori: kodeKategori, // Enum P1..P5
        kunciKriteria: kunciKriteria,
        bobot: bobot
      });
    }

    if (!bobotData.length) {
      return res.status(400).send('Tidak ada bobot valid yang dikirim.');
    }

    /* =========================
      5. SIMPAN KE TABEL BobotKriteria
    ========================== */
    await prisma.bobotKriteria.createMany({
      data: bobotData
    });

    return res.render('admin/pengaturanBobot', { success: true });

  } catch (error) {
    console.error('ERROR SIMPAN BOBOT:', error);
    res.status(500).send('Terjadi kesalahan saat menyimpan pengaturan bobot: ' + error.message);
  }
};
