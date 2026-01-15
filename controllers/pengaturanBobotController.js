exports.index = (req, res) => {
  res.render('admin/pengaturanBobot', {
    success: false
  });
};

exports.simpan = (req, res) => {
  try {
    const data = req.body;

    console.log('DATA BOBOT MASUK:', data);

    /*
      CONTOH DATA YANG DITERIMA:
      {
        p1_k1, p1_k2, p1_k3,
        p2_k1, p2_k2, p2_k3, p2_k4,
        p3_k1, p3_k2, p3_k3,
        p4_k1, p4_k2, p4_k3,
        p5_k1, p5_k2, p5_k3
      }
    */

    // TODO:
    // Simpan ke database di sini
    // await Model.create(data)

    // KEMBALI KE HALAMAN + NOTIFIKASI BERHASIL
    res.render('admin/pengaturanBobot', {
      success: true
    });

  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      message: 'Gagal menyimpan pengaturan bobot',
      error
    });
  }
};
