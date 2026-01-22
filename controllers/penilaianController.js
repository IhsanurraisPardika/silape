const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.index = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect("/login");

    let kantor = [];

    // Jika user adalah TIMPENILAI, ambil kantor yang ditugaskan ke akunnya
    if (user.peran === 'TIMPENILAI' || user.role === 'TIMPENILAI') {
      // Cek peran dari session, sesuaikan dengan nama field di session
      const penugasan = await prisma.penugasanKantorAkun.findMany({
        where: {
          akunEmail: user.email,
          statusAktif: true,
          kantor: {
            statusAktif: true
          },
          periode: {
            statusAktif: true
          }
        },
        include: {
          kantor: true
        },
        orderBy: {
          kantor: {
            nama: "asc"
          }
        },
      });

      kantor = penugasan.map((p) => ({
        id: p.kantor.id,
        nama: p.kantor.nama,
        kode: null, // Schema Kantor tidak punya kode, sesuaikan
        timNama: user.nama || user.email, // Tampilkan siapa yang login
      }));
    } else {
      // Jika ADMIN/SUPERADMIN, mungkin bisa lihat semua? atau kosongkan
      // Sesuai request "jika tim 1 maka hanya muncul data kantor untuk tim 1 saja"
      // Asumsi default behavior
      const kantorList = await prisma.kantor.findMany({
        where: {
          statusAktif: true
        },
        orderBy: {
          nama: "asc"
        },
      });
      kantor = kantorList.map((k) => ({
        id: k.id,
        nama: k.nama,
        kode: null,
        timNama: null
      }));
    }

    res.render("penilaian", {
      title: "Input Penilaian 5P",
      user,
      kantor,
    });
  } catch (err) {
    console.error("Error loading penilaian page:", err);
    res.status(500).send("Error loading penilaian page");
  }
};

// (opsional) jika /penilaian/daftar masih dipakai, sementara arahkan ke halaman yang sama
exports.daftar = (req, res) => res.redirect("/penilaian");
