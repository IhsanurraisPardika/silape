const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

exports.getlogin = (req, res) => {
  res.render('login', {
    title: 'Login - SILAPE',
    message: '',
    appName: 'SILAPE',
    error: null
  });
};

exports.postlogin = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Validasi input
    if (!email || !password) {
      return res.render('login', {
        title: 'Login',
        error: 'Email dan password harus diisi',
        email: email || ''
      });
    }

    // Cari pengguna di database
    const pengguna = await prisma.pengguna.findUnique({
      where: { email },
      include: {
        tim: true // Include tim jika ada
      }
    });

    // Validasi pengguna
    if (!pengguna) {
      return res.render('login', {
        title: 'Login',
        error: 'Email atau password salah',
        email
      });
    }

    // Cek status aktif
    if (!pengguna.statusAktif) {
      return res.render('login', {
        title: 'Login',
        error: 'Akun tidak aktif. Hubungi administrator.',
        email
      });
    }

    // Verifikasi password (asumsi menggunakan bcrypt)
    const passwordValid = await bcrypt.compare(password, pengguna.kataSandiHash);
    if (!passwordValid) {
      return res.render('login', {
        title: 'Login',
        error: 'Email atau password salah',
        email
      });
    }

    // Set session
    req.session.user = {
      email: pengguna.email,
      nama: pengguna.nama,
      peran: pengguna.peran,
      timId: pengguna.timId,
      timKode: pengguna.tim?.kode || null,
      timNama: pengguna.tim?.nama || null
    };

    // Redirect berdasarkan peran
    switch (pengguna.peran) {
      case 'SUPERADMIN_TPM':
        res.redirect('/admin/dashboard');
        break;
      case 'ADMIN':
        res.redirect('/admin/dashboard');
        break;
      case 'TIM_PENILAI':
        res.redirect('/home');
        break;
      default:
        res.redirect('/home');
    }

  } catch (error) {
    console.error('Login error:', error);
    res.render('login', {
      title: 'Login',
      error: 'Terjadi kesalahan server. Silakan coba lagi.',
      email
    });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
};

exports.gethome = (req, res) => {
  // Middleware akan memastikan user sudah login
  res.render('home', {
    title: 'Home',
    user: req.session.user
  });
};