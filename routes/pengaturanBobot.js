const express = require('express');
const router = express.Router();
const pengaturanBobotController = require('../controllers/pengaturanBobotController');

// TAMPILKAN HALAMAN
router.get('/', pengaturanBobotController.index);

// SIMPAN DATA
router.post('/simpan', pengaturanBobotController.simpan);

module.exports = router;
