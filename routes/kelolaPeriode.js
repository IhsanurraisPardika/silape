const express = require('express');
const router = express.Router();
const kelolaPeriodeController = require('../controllers/kelolaPeriodeController');
const { harusAdmin } = require('../middlewares/auth.middleware');

router.get('/', harusAdmin, kelolaPeriodeController.index);
router.post('/tambah', harusAdmin, kelolaPeriodeController.tambah);
router.post('/aktifkan/:id', harusAdmin, kelolaPeriodeController.aktifkan);
router.delete('/hapus/:id', harusAdmin, kelolaPeriodeController.hapus);

module.exports = router;
