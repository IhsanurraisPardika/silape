const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.index = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect("/login");

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
    const anggotaLink = pengguna.anggotaTim.find(a => a.statusAktif);
    const isKetua = anggotaLink && anggotaLink.urutan === 1;

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

    // 3. Ambil total anggota tim di tim yang sama
    const totalAnggotaTim = await prisma.pengguna.count({
      where: {
        timKode: pengguna.timKode,
        statusAktif: true,
        peran: 'TIMPENILAI'
      }
    });
    // Note: This counts User Accounts in the team. 
    // Alternatively, count AnggotaTim records related to users with that timKode?
    // Let's rely on Pengguna.timKode as the grouper.

    const data = [];

    // 4. Loop setiap kantor yang ditugaskan -> Cek status tim
    for (const p of penugasan) {
      // Hitung berapa anggota tim (dari timKode yang sama) yang sudah SUBMIT untuk (kantor, periode) ini
      const submittedCount = await prisma.penilaian.count({
        where: {
          periodeId: p.periodeId,
          kantorId: p.kantorId,
          status: 'SUBMIT',
          akun: {
            timKode: pengguna.timKode
          }
        }
      });

      // Status logic: Process vs Selesai
      const isSelesai = submittedCount >= totalAnggotaTim && totalAnggotaTim > 0;
      const status = isSelesai ? 'Selesai' : 'Process';

      // Ambil detail penilaian milik USER SENDIRI untuk hitung rata-rata pribadinya (atau rata-rata tim?)
      // Request says "jika anggota melakukan edit maka anggota dapat kembali..." -> implies user sees THEIR entry.
      // Table shows "Rata-rata". Usually lists imply the row represents the context.
      // Let's show USER's own average score.
      const penilaianSaya = await prisma.penilaian.findFirst({
        where: {
          periodeId: p.periodeId,
          kantorId: p.kantorId,
          akunEmail: user.email
        },
        include: { detail: true }
      });

      let rata = 0;
      let hasNilai = false;
      if (penilaianSaya && penilaianSaya.detail && penilaianSaya.detail.length > 0) {
        const total = penilaianSaya.detail.reduce((sum, d) => sum + Number(d.nilai), 0);
        rata = total / penilaianSaya.detail.length;
        hasNilai = true;
      }

      // Format tanggal (Gunakan tanggal submit user, atau tanggal penugasan jika belum)
      const dateObj = penilaianSaya?.tanggalSubmit || p.dibuatPada;
      const options = { day: 'numeric', month: 'long', year: 'numeric' };
      const tanggalStr = dateObj.toLocaleDateString('id-ID', options);

      data.push({
        tanggal: tanggalStr,
        kantor: p.kantor.nama,
        rata: hasNilai ? rata.toFixed(1) : '-',
        status: status, // Process / Selesai
        isSelesai: isSelesai, // Untuk logic button approve
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