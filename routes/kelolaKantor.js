const express = require('express');
const router = express.Router();
const kelolaKantorController = require('../controllers/kelolaKantorController');
const { harusLogin } = require('../middlewares/auth.middleware');

// Halaman utama Kelola Kantor Tim (WAJIB LOGIN)
router.get('/', harusLogin, kelolaKantorController.index);

module.exports = router;
