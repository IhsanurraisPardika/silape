exports.getlogin = (req, res) => {
  res.render('login', {
    title: 'Login - SILAPE',
    message: 'Hello World!',
    appName: 'SILAPE'
  });
};

exports.postlogin = (req, res) => {
  const { email, password } = req.body;
  
  // TODO: Validasi email dan password dengan database
  // Untuk sekarang, arahkan langsung ke home
  if (email && password) {
    // Dalam implementasi real, validasi dengan database Prisma
    res.redirect('/home');
  } else {
    res.render('login', {
      title: 'Login - SILAPE',
      error: 'Email dan password harus diisi'
    });
  }
};

exports.gethome = (req, res) => {
  res.render('home', {
    title: 'Home - SILAPE',
    user: {
      name: 'IHSANURRAIS PARDIKA',
      team: 'TIM 1'
    }
  });
};
