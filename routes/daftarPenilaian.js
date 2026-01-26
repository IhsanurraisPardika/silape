const express = require('express');
const router = express.Router();

const daftarPenilaianController = require('../controllers/daftarPenilaianController');

router.get('/', daftarPenilaianController.index);

module.exports = router;