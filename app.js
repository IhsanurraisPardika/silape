require('dotenv').config();
const express = require('express');
const session = require("express-session");
const app = express();
const port = process.env.PORT || 3000;
const session = require('express-session');
const path = require('path');

const authRoutes = require("./routes/auth.routes");
const { harusSuperadmin } = require("./middlewares/auth.middleware");

// Set template engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Static files
app.use(express.static(__dirname + '/public'));

// Middleware
app.use(express.json());

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: 'silape-secret-key-2024', // Ganti dengan secret key yang kuat
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 jam
  }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));


// ===== ROUTES LAMA =====
app.use('/', require('./routes/login'));

app.use('/admin', adminRoutes); // Tambah ini

// ===== Penilaian =====
app.use('/penilaian', require('./routes/penilaian'));

// ===== Kelola Kantor =====
app.use('/kelolaKantor', require('./routes/kelolaKantor'));

// Middleware untuk set user data ke semua views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Error handling
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: '404 - Halaman Tidak Ditemukan',
    message: 'Halaman yang Anda cari tidak ditemukan.'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: '500 - Error Server',
    message: 'Terjadi kesalahan pada server.'
  });
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

// routes
app.use(authRoutes);

// contoh route dashboard superadmin
app.get("/admin/dashboard", harusSuperadmin, (req, res) => {
  res.send(`Halo ${req.session.user.nama}, ini dashboard superadmin`);
});

module.exports = app;

// Start server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
