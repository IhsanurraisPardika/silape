require('dotenv').config();
const express = require('express');
const session = require("express-session");
const app = express();
const port = process.env.PORT || 3000;
const authRoutes = require("./routes/auth.routes");
const { harusSuperadmin } = require("./middlewares/auth.middleware");

// Set template engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Static files
app.use(express.static(__dirname + '/public'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== ROUTES LAMA (JANGAN DIHAPUS) =====
app.use('/', require('./routes/login'));

// ===== ROUTE BARU (DITAMBAHKAN) =====
app.use('/penilaian', require('./routes/penilaian'));

// ===== ERROR HANDLING (TETAP) =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
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
