const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.index = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect("/login");

    // Ambil daftar kantor yang ditugaskan ke tim user (atau semua kantor jika timId kosong)
    let kantor = [];

    if (user.timId) {
      const penugasan = await prisma.penugasanKantorTim.findMany({
        where: {
          timId: user.timId,
          statusAktif: true,
          kantor: { statusAktif: true },
        },
        include: { kantor: true, tim: true },
        orderBy: { kantorId: "asc" },
      });

      kantor = penugasan.map((p) => ({
        id: p.kantor.id,
        nama: p.kantor.nama,
        timNama: p.tim?.nama || null,
      }));
    } else {
      const kantor = await prisma.kantor.findMany({
        where: { statusAktif: true },
        orderBy: { nama: "asc" },
      });
      kantor = kantor.map((k) => ({ id: k.id, nama: k.nama, timNama: null }));
    }

    res.render("penilaian", {
      title: "Input Penilaian 5P",
      user,
      kantor,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading penilaian page");
  }
};

// (opsional) jika /penilaian/daftar masih dipakai, sementara arahkan ke halaman yang sama
exports.daftar = (req, res) => res.redirect("/penilaian");
