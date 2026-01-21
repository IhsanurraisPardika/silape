const express = require('express');
const router = express.Router();
const kelolaKantorController = require('../controllers/kelolaKantorController');

router.get('/', kelolaKantorController.index);
router.post('/tambah', kelolaKantorController.tambahKantor);
router.post('/hapus', kelolaKantorController.hapusKantor);

module.exports = router;
