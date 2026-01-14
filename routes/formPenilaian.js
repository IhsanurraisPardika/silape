const express = require('express');
const router = express.Router();
const formPenilaianController = require('../controllers/formPenilaianController');

// GET - Tampilkan form penilaian
router.get('/formPenilaian', formPenilaianController.getFormPenilaian);

// POST - Simpan data penilaian
router.post('/formPenilaian', formPenilaianController.postFormPenilaian);

module.exports = router;