const express = require('express');
const router = express.Router();

router.get('/kriteriapenilaian', (req, res) => {
    res.render('kriteriapenilaian');
});

module.exports = router;