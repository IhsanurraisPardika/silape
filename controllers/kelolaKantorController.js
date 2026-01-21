const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.index = async (req, res) => {
  try {
    const timList = await prisma.tim.findMany({
      where: {
        statusAktif: true
      },
      include: {
        penugasanKantor: {
          where: {
            statusAktif: true
          },
          include: {
            kantor: true   // ✅ TANPA where
          }
        }
      }
    });

    const dataTim = timList.map(tim => ({
      nama: tim.nama,
      jumlah: tim.penugasanKantor.length,
      kantor: tim.penugasanKantor
        .filter(p => p.kantor) // jaga-jaga null
        .map(p => p.kantor.nama)
    }));

    res.render('admin/kelolaKantor', {
      title: 'Kelola Kantor Tim',
      user: 'ADMIN TPM',
      dataTim,
      activeTab: 'kantor'
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Gagal memuat halaman');
  }
};
