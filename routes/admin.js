const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { harusAdmin, harusSuperadmin } = require("../middlewares/auth.middleware");

// Dashboard admin (untuk ADMIN dan SUPERADMIN)
router.get("/dashboard", harusAdmin, adminController.getDashboard);

// Tambah admin (hanya SUPERADMIN)
router.get("/tambah-admin", harusSuperadmin, adminController.getTambahAdmin);
router.post("/tambah-admin", harusSuperadmin, adminController.postTambahAdmin);

// Tambah user (untuk ADMIN dan SUPERADMIN)
router.get("/tambah-user", harusAdmin, adminController.getTambahUser);
router.post("/tambah-user", harusAdmin, adminController.postTambahUser);

// Daftar pengguna (untuk ADMIN dan SUPERADMIN)
router.get("/daftar-pengguna", harusAdmin, adminController.getDaftarPengguna);

module.exports = router;
