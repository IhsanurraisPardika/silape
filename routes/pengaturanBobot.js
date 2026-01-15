const express = require('express');
const router = express.Router();
const pengaturanBobotController = require('../controllers/pengaturanBobotController');
const { harusLogin } = require('../middlewares/auth.middleware');

// HARUS LOGIN
router.get('/', harusLogin, pengaturanBobotController.index);
router.post('/simpan', harusLogin, pengaturanBobotController.simpan);

// TAMPILKAN HALAMAN
router.get('/', pengaturanBobotController.index);

// SIMPAN DATA
router.post('/simpan', pengaturanBobotController.simpan);

module.exports = router;
