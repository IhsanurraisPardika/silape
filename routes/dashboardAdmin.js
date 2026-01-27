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
const dashboardAdminController = require("../controllers/dashboardAdminController");
router.get("/rekapKantorAdmin", harusAdmin, dashboardAdminController.rekapKantor);

// Halaman Rekap Penilaian Admin
router.get("/rekapPenilaianAdmin", harusAdmin, dashboardAdminController.rekapPenilaian);

// Halaman Rekap Kriteria Admin
router.get("/rekapKriteriaAdmin", harusAdmin, dashboardAdminController.rekapKriteria);

// Halaman Download Rekap
router.get("/downloadRekapKantor", harusAdmin, dashboardAdminController.downloadRekapKantor);
router.get("/downloadRekapKriteria", harusAdmin, dashboardAdminController.downloadRekapKriteria);

// Halaman Kelola Tim
router.get("/kelolaTim", harusAdmin, (req, res) => {
  res.render("KelolaTim");
});

// Halaman Unduh Laporan Admin
router.get("/unduhLaporan", harusAdmin, (req, res) => {
  res.render("admin/unduhLaporanAdmin");
});

module.exports = router;
