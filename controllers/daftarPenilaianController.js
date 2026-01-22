const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.index = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect("/login");

    // Ambil data penilaian yang sudah di-SUBMIT
    // Jika user adalah ADMIN, lihat semua?
    // Jika user adalah TIMPENILAI, lihat miliknya?
    // Request: "di daftar penilaian akan muncul riwayat tim yang telah selesai menilai"

    let whereClause = {
      status: 'SUBMIT'
    };

    if (user.peran === 'TIMPENILAI' || user.role === 'TIMPENILAI') {
      whereClause.akunEmail = user.email;
    }

    const penilaians = await prisma.penilaian.findMany({
      where: whereClause,
      include: {
        kantor: true,
        detail: true // Untuk hitung rata-rata
      },
      orderBy: {
        tanggalSubmit: 'desc'
      }
    });

    const data = penilaians.map(p => {
      // Hitung rata-rata
      let rata = 0;
      if (p.detail && p.detail.length > 0) {
        const total = p.detail.reduce((sum, d) => sum + Number(d.nilai), 0);
        rata = total / p.detail.length;
      }

      // Format tanggal
      const date = p.tanggalSubmit ? new Date(p.tanggalSubmit) : new Date();
      const options = { day: 'numeric', month: 'long', year: 'numeric' };
      const tanggalStr = date.toLocaleDateString('id-ID', options);

      return {
        tanggal: tanggalStr,
        kantor: p.kantor.nama,
        rata: rata.toFixed(1), // 1 desimal
        status: 'Approval', // Default status text for now, or use p.status logic
        detailUrl: `/formPenilaian?kantor=${p.kantorId}` // Link ke form untuk edit
      };
    });

    res.render('daftarPenilaian', { data });
  } catch (error) {
    console.error("Error loading daftar penilaian:", error);
    res.render('daftarPenilaian', { data: [] });
  }
};