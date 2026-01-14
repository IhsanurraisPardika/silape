// middleware/auth.js

// Middleware untuk memastikan pengguna sudah login
exports.requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Middleware untuk memastikan pengguna adalah SUPERADMIN_TPM
exports.requireSuperAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  if (req.session.user.peran !== 'SUPERADMIN_TPM') {
    return res.status(403).render('error', {
      title: 'Akses Ditolak',
      message: 'Anda tidak memiliki izin untuk mengakses halaman ini.'
    });
  }
  next();
};

// Middleware untuk memastikan pengguna adalah ADMIN atau SUPERADMIN_TPM
exports.requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  const allowedRoles = ['SUPERADMIN_TPM', 'ADMIN'];
  if (!allowedRoles.includes(req.session.user.peran)) {
    return res.status(403).render('error', {
      title: 'Akses Ditolak',
      message: 'Anda tidak memiliki izin untuk mengakses halaman ini.'
    });
  }
  next();
};

// Middleware untuk memastikan pengguna adalah TIM_PENILAI
exports.requireTimPenilai = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  if (req.session.user.peran !== 'TIM_PENILAI') {
    return res.status(403).render('error', {
      title: 'Akses Ditolak',
      message: 'Hanya tim penilai yang dapat mengakses halaman ini.'
    });
  }
  next();
};