const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// Dashboard Admin
exports.getDashboard = async (req, res) => {
  try {
    // Hitung statistik
    const totalPengguna = await prisma.pengguna.count({
      where: { statusAktif: true }
    });
    
    const totalTim = await prisma.tim.count({
      where: { statusAktif: true }
    });
    
    const totalKantor = await prisma.kantor.count({
      where: { statusAktif: true }
    });

    res.render('admin/dashboard', {
      title: 'Dashboard Admin',
      user: req.session.user,
      totalPengguna,
      totalTim,
      totalKantor
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('error', {
      title: 'Error',
      message: 'Gagal memuat dashboard'
    });
  }
};

// Form Tambah Admin (hanya SUPERADMIN_TPM)
exports.getTambahAdmin = async (req, res) => {
  try {
    res.render('admin/tambah-admin', {
      title: 'Tambah Admin',
      user: req.session.user,
      error: null,
      formData: {}
    });
  } catch (error) {
    console.error('Get tambah admin error:', error);
    res.render('error', { title: 'Error', message: 'Gagal memuat form' });
  }
};

// Proses Tambah Admin
exports.postTambahAdmin = async (req, res) => {
  const { email, nama, password, konfirmasiPassword } = req.body;
  
  try {
    // Validasi
    if (!email || !nama || !password || !konfirmasiPassword) {
      return res.render('admin/tambah-admin', {
        title: 'Tambah Admin',
        user: req.session.user,
        error: 'Semua field harus diisi',
        formData: req.body
      });
    }

    if (password !== konfirmasiPassword) {
      return res.render('admin/tambah-admin', {
        title: 'Tambah Admin',
        user: req.session.user,
        error: 'Password dan konfirmasi password tidak cocok',
        formData: req.body
      });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await prisma.pengguna.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.render('admin/tambah-admin', {
        title: 'Tambah Admin',
        user: req.session.user,
        error: 'Email sudah terdaftar',
        formData: req.body
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Buat admin baru
    await prisma.pengguna.create({
      data: {
        email,
        nama,
        kataSandiHash: hashedPassword,
        peran: 'ADMIN',
        dibuatOlehEmail: req.session.user.email
      }
    });

    res.redirect('/admin/dashboard?success=Admin berhasil ditambahkan');
    
  } catch (error) {
    console.error('Post tambah admin error:', error);
    res.render('admin/tambah-admin', {
      title: 'Tambah Admin',
      user: req.session.user,
      error: 'Gagal menambahkan admin. Silakan coba lagi.',
      formData: req.body
    });
  }
};

// Form Tambah User (dapat diakses ADMIN dan SUPERADMIN_TPM)
exports.getTambahUser = async (req, res) => {
  try {
    const timList = await prisma.tim.findMany({
      where: { statusAktif: true },
      orderBy: { kode: 'asc' }
    });

    res.render('admin/tambah-user', {
      title: 'Tambah User',
      user: req.session.user,
      timList,
      error: null,
      formData: {}
    });
  } catch (error) {
    console.error('Get tambah user error:', error);
    res.render('error', { title: 'Error', message: 'Gagal memuat form' });
  }
};

// Proses Tambah User
exports.postTambahUser = async (req, res) => {
  const { email, nama, password, konfirmasiPassword, peran, timId } = req.body;
  
  try {
    // Validasi
    if (!email || !nama || !password || !konfirmasiPassword || !peran) {
      return res.render('admin/tambah-user', {
        title: 'Tambah User',
        user: req.session.user,
        error: 'Semua field harus diisi',
        formData: req.body,
        timList: await prisma.tim.findMany({ where: { statusAktif: true } })
      });
    }

    if (password !== konfirmasiPassword) {
      return res.render('admin/tambah-user', {
        title: 'Tambah User',
        user: req.session.user,
        error: 'Password dan konfirmasi password tidak cocok',
        formData: req.body,
        timList: await prisma.tim.findMany({ where: { statusAktif: true } })
      });
    }

    // Validasi khusus TIM_PENILAI
    if (peran === 'TIM_PENILAI' && !timId) {
      return res.render('admin/tambah-user', {
        title: 'Tambah User',
        user: req.session.user,
        error: 'Tim harus dipilih untuk TIM_PENILAI',
        formData: req.body,
        timList: await prisma.tim.findMany({ where: { statusAktif: true } })
      });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await prisma.pengguna.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.render('admin/tambah-user', {
        title: 'Tambah User',
        user: req.session.user,
        error: 'Email sudah terdaftar',
        formData: req.body,
        timList: await prisma.tim.findMany({ where: { statusAktif: true } })
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Data untuk user baru
    const userData = {
      email,
      nama,
      kataSandiHash: hashedPassword,
      peran,
      dibuatOlehEmail: req.session.user.email
    };

    // Tambah timId jika peran adalah TIM_PENILAI
    if (peran === 'TIM_PENILAI') {
      userData.timId = parseInt(timId);
    }

    // Buat user baru
    await prisma.pengguna.create({
      data: userData
    });

    res.redirect('/admin/dashboard?success=User berhasil ditambahkan');
    
  } catch (error) {
    console.error('Post tambah user error:', error);
    res.render('admin/tambah-user', {
      title: 'Tambah User',
      user: req.session.user,
      error: 'Gagal menambahkan user. Silakan coba lagi.',
      formData: req.body,
      timList: await prisma.tim.findMany({ where: { statusAktif: true } })
    });
  }
};

// Daftar Pengguna
exports.getDaftarPengguna = async (req, res) => {
  try {
    const penggunaList = await prisma.pengguna.findMany({
      where: { statusAktif: true },
      include: {
        tim: true,
        dibuatOleh: {
          select: { nama: true, email: true }
        }
      },
      orderBy: { dibuatPada: 'desc' }
    });

    res.render('admin/daftar-pengguna', {
      title: 'Daftar Pengguna',
      user: req.session.user,
      penggunaList
    });
  } catch (error) {
    console.error('Get daftar pengguna error:', error);
    res.render('error', { title: 'Error', message: 'Gagal memuat daftar pengguna' });
  }
};