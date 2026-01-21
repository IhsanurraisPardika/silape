// routes/dashboardAdmin.js
const express = require("express");
const router = express.Router();
const { harusAdmin } = require("../middlewares/auth.middleware");

// Halaman Dashboard Admin
router.get("/", harusAdmin, (req, res) => {
  res.render("admin/DashboardAdmin", {
    title: "Dashboard Admin",
    user: req.session.user,
  });
});

// Halaman Rekap Kantor Admin
router.get("/rekapKantorAdmin", harusAdmin, (req, res) => {
  res.render("admin/rekapKantor");
});

// Halaman Rekap Penilaian Admin
router.get("/rekapPenilaianAdmin", harusAdmin, (req, res) => {
  res.render("admin/rekapPenilaian");
});

// Halaman Rekap Kriteria Admin
router.get("/rekapKriteriaAdmin", harusAdmin, (req, res) => {
  res.render("admin/rekapKriteria");
});

// Halaman Kelola Tim
router.get("/kelolaTim", harusAdmin, (req, res) => {
  res.render("KelolaTim");
});

// Halaman Unduh Laporan Admin
router.get("/unduhLaporan", harusAdmin, (req, res) => {
  res.render("admin/unduhLaporanAdmin");
});

module.exports = router;
