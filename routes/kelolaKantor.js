const express = require('express');
const router = express.Router();
const kelolaKantorController = require('../controllers/kelolaKantorController');

// Halaman utama Kelola Kantor Tim
router.get('/', kelolaKantorController.index);
module.exports = router;
