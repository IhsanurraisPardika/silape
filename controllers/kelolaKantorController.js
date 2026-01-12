exports.index = async (req, res) => {
  try {
    // ==========================
    // DATA SEMENTARA (NANTI PRISMA)
    // ==========================
    const dataTim = [
      {
        nama: 'TIM 1',
        jumlah: 2,
        kantor: [
          'KANTOR SALES AREA SUMBAR LT.2 KP',
          'KANTOR SALES AREA SUMBAR LT.2 KP'
        ]
      },
      {
        nama: 'TIM 2',
        jumlah: 2,
        kantor: [
          'KANTOR BPPS GEDUNG BARAYAKAYA',
          'KANTOR BINS GEDUNG REKAYASA'
        ]
      }
    ];

    res.render('kelolaKantor', {
      title: 'Kelola Kantor Tim',
      user: 'ADMIN TPM',
      dataTim
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Gagal memuat halaman');
  }
};
