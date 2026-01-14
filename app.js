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

// ===== ROUTES LAMA =====
app.use('/', require('./routes/login'));

// ===== Penilaian =====
app.use('/penilaian', require('./routes/penilaian'));

// ===== Kelola Kantor =====
app.use('/kelolaKantor', require('./routes/kelolaKantor'));

// ===== Daftar Penilaian =====
app.use('/daftarPenilaian', require('./routes/daftarPenilaian'));

// ===== Admin =====
app.use('/dashboardAdmin', require('./routes/dashboardAdmin'));

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).send(err.message)
})


// Start server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
