const express = require("express");
const router = express.Router();
const penilaianController = require("../controllers/penilaianController");
const { harusTimPenilai } = require("../middlewares/auth.middleware");

router.get("/", harusTimPenilai, penilaianController.index);
router.get("/daftar", harusTimPenilai, penilaianController.daftar);

module.exports = router;
