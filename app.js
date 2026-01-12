require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Set template engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Static files
app.use(express.static(__dirname + '/public'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Start server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
