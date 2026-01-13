const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');
const { requireAuth, requireTimPenilai } = require('../middleware/auth');

router.get('/', loginController.getlogin);
router.post('/login', loginController.postlogin);
router.get('/logout', loginController.logout);

module.exports = router;

// Buat router untuk /home (di luar module login)
const homeRouter = express.Router();
homeRouter.get('/', requireAuth, requireTimPenilai, loginController.gethome);

module.exports.homeRouter = homeRouter;