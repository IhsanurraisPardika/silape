const express = require("express");
const router = express.Router();
const pilihAnggotaController = require("../controllers/pilihAnggotaController");

router.get("/pilih-anggota", pilihAnggotaController.getPilihAnggota);
router.post("/pilih-anggota", pilihAnggotaController.postPilihAnggota);

module.exports = router;
