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
       1. NONAKTIFKAN KONFIGURASI LAMA
    ========================== */
    await prisma.konfigurasiBobot.updateMany({
      where: { statusAktif: true },
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
        }
      }
    });

    /* =========================
       3. OLAH INPUT FORM
    ========================== */
    const detailData = [];

    for (const key in req.body) {
      const nilai = req.body[key];
      if (nilai === '' || isNaN(nilai)) continue;

      // 🔥 parsing aman (TANPA ubah logika)
      const match = key.match(/p(\d+)_k(\d+)/i);
      if (!match) continue;

      const kodeKategori = `P${match[1]}`; // P1..P5
      const nomor = parseInt(match[2], 10);
      const bobot = Number(nilai);

      if (isNaN(nomor) || isNaN(bobot)) continue;

      /* =========================
         4. AMBIL KRITERIA
      ========================== */
      const kriteria = await prisma.kriteriaPenilaian.findFirst({
        where: {
          nomor,
          kategori: {
            kode: kodeKategori
          }
        }
      });

      if (!kriteria) continue;

      detailData.push({
        konfigurasiId: konfigurasi.id,
        kriteriaId: kriteria.id,
        bobotKriteria: bobot
      });
    }

    if (!detailData.length) {
      return res.status(400).send('Tidak ada bobot valid');
    }

    /* =========================
      5. SIMPAN DETAIL
    ========================== */
    await prisma.detailKonfigurasiBobot.createMany({
      data: detailData
    });

    return res.render('admin/pengaturanBobot', { success: true });

  } catch (error) {
    console.error('ERROR SIMPAN BOBOT:', error);
    return res.status(500).send('Terjadi kesalahan saat menyimpan pengaturan bobot');
  }
};
