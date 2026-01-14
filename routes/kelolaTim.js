const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/kelolaTimController");
const { harusAdmin } = require("../middlewares/auth.middleware");

// page
router.get("/kelola-tim-penilai", harusAdmin, ctrl.index);

// actions
router.post("/pengguna/tambah", harusAdmin, ctrl.tambahPengguna);
router.post("/pengguna/edit", harusAdmin, ctrl.editPengguna);
router.post("/pengguna/hapus", harusAdmin, ctrl.hapusPengguna);

module.exports = router;
