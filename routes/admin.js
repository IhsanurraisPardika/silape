const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin, requireSuperAdmin } = require('../middleware/auth');

// Dashboard admin (untuk ADMIN dan SUPERADMIN_TPM)
router.get('/dashboard', requireAdmin, adminController.getDashboard);

// Tambah admin (hanya SUPERADMIN_TPM)
router.get('/tambah-admin', requireSuperAdmin, adminController.getTambahAdmin);
router.post('/tambah-admin', requireSuperAdmin, adminController.postTambahAdmin);

// Tambah user (untuk ADMIN dan SUPERADMIN_TPM)
router.get('/tambah-user', requireAdmin, adminController.getTambahUser);
router.post('/tambah-user', requireAdmin, adminController.postTambahUser);

// Daftar pengguna
router.get('/daftar-pengguna', requireAdmin, adminController.getDaftarPengguna);

module.exports = router;