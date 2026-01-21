const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.index = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect("/login");

    // Ambil daftar kantor yang ditugaskan ke tim user sesuai schema Prisma
    let kantor = [];

    if (user.timId) {
      // Jika user memiliki timId, ambil kantor melalui PenugasanKantorTim
      const penugasan = await prisma.penugasanKantorTim.findMany({
        where: {
          timId: user.timId,
          statusAktif: true,
          kantor: { 
            statusAktif: true 
          },
        },
        include: { 
          kantor: true, 
          tim: true 
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
        kode: p.kantor.kode || null,
        timNama: p.tim?.nama || null,
      }));
    } else {
      // Jika user tidak memiliki timId, ambil semua kantor aktif
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
        kode: k.kode || null,
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
