const express = require('express');
const router = express.Router();

const pengaturanBobotController = require('../controllers/pengaturanBobotController');
const { harusLogin } = require('../middlewares/auth.middleware');

router.get('/', harusLogin, pengaturanBobotController.index);
router.post('/simpan', harusLogin, pengaturanBobotController.simpan);

module.exports = router;
