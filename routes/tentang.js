const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('tentang', {
        title: 'Tentang Sistem',
        user: req.session.user || null
    });
});

module.exports = router;
