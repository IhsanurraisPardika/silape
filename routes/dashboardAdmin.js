const express = require('express');
const router = express.Router();
const { harusSuperadmin } = require('../middlewares/auth.middleware');  // Import middleware

// Halaman Dashboard Admin
router.get('/', harusSuperadmin, (req, res) => {
  res.render('admin/DashboardAdmin', { title: "Dashboard Admin", user: req.session.user });
});

// Halaman Rekap Kantor Admin
router.get('/rekapKantorAdmin', harusSuperadmin, (req, res) => {
  res.render('admin/rekapKantor');
});

// Halaman Rekap Penilaian Admin
router.get('/rekapPenilaianAdmin', harusSuperadmin, (req, res) => {
  res.render('admin/rekapPenilaian');
});

// Halaman Rekap Kriteria Admin
router.get('/rekapKriteriaAdmin', harusSuperadmin, (req, res) => {
  res.render('admin/rekapKriteria');
});

// Halaman Kelola Tim
router.get('/kelolaTim', harusSuperadmin, (req, res) => {
  res.render('KelolaTim');
});

// Halaman Unduh Laporan Admin
router.get('/unduhLaporan', harusSuperadmin, (req, res) => {
  res.render('admin/unduhLaporanAdmin');
});

module.exports = router;
