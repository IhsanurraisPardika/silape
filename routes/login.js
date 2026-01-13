const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');
const { requireAuth, requireTimPenilai } = require('../middleware/auth');

router.get('/', loginController.getlogin);
router.post('/login', loginController.postlogin);
router.get('/logout', loginController.logout);

// Hanya TIM_PENILAI yang bisa akses home
router.get('/home', requireAuth, requireTimPenilai, loginController.gethome);

module.exports = router;