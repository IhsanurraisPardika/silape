const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

router.get('/', loginController.getlogin);
router.post('/login', loginController.postlogin);
router.get('/home', loginController.gethome);

module.exports = router;
