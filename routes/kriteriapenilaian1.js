const express = require('express');
const router = express.Router();

router.get('/kriteriapenilaian1', (req, res) => {
    res.render('kriteriapenilaian1');
});

module.exports = router;