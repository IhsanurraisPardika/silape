const express = require('express')
const router = express.Router()
const penilaianController = require('../controllers/penilaianController')

router.get('/', penilaianController.index)
module.exports = router
