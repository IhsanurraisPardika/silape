const express = require('express');
const router = express.Router();

const daftarPenilaianController = require('../controllers/daftarPenilaianController');

router.get('/', daftarPenilaianController.index);
router.post('/approve', daftarPenilaianController.approve);
router.get('/bukti-approval', daftarPenilaianController.downloadBuktiApproval);

module.exports = router;