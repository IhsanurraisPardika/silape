const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET - Tampilkan form penilaian
exports.getFormPenilaian = async (req, res) => {
  try {
    const kantorId = req.query.kantor;
    
    // Ambil data kantor spesifik jika ada
    let kantorSelected = null;
    if (kantorId) {
      kantorSelected = await prisma.kantor.findUnique({
        where: { id: parseInt(kantorId) }
      });
    }

    // Ambil daftar kantor untuk dropdown (opsional)
    const kantorList = await prisma.kantor.findMany({
      where: { statusAktif: true }
    });

    res.render('formPenilaian', {
      title: 'Form Penilaian 5P',
      kantorList: kantorList || [],
      kantorSelected: kantorSelected,
      kantorId: kantorId ? parseInt(kantorId) : null,
      user: req.session.user,
      error: null,
      message: null
    });
  } catch (error) {
    console.error('Error di getFormPenilaian:', error);
    res.status(500).render('error', {
      title: '500 - Error Server',
      message: 'Terjadi kesalahan saat memuat form penilaian'
    });
  }
};

// POST - Simpan data penilaian
exports.postFormPenilaian = async (req, res) => {
  try {
    const formData = req.body;
    
    console.log('Data form diterima:', formData);

    // Validasi data (basic)
    if (!formData.kantor_id) {
      return res.status(400).json({
        success: false,
        message: 'Kantor harus dipilih'
      });
    }

    // Simpan draft atau submit ke database (tergantung action)
    const action = formData.action || 'draft';

    if (action === 'submit') {
      // Logic untuk submit final penilaian
      console.log('Penilaian di-submit');
      return res.status(200).json({
        success: true,
        message: 'Penilaian berhasil disimpan',
        redirect: '/penilaian/daftar?success=Penilaian%20berhasil%20disimpan'
      });
    } else if (action === 'draft') {
      // Logic untuk simpan draft
      console.log('Penilaian disimpan sebagai draft');
      return res.status(200).json({
        success: true,
        message: 'Draft penilaian berhasil disimpan',
        redirect: '/penilaian?success=Draft%20berhasil%20disimpan'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Action tidak valid'
      });
    }

  } catch (error) {
    console.error('Error di postFormPenilaian:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server: ' + error.message
    });
  }
};
