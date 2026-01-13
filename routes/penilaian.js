const express = require('express')
const router = express.Router()
const penilaianController = require('../controllers/penilaianController')

router.get('/', penilaianController.index)
router.get('/daftar', penilaianController.daftar)

module.exports = router
