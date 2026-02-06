const express = require("express");
const router = express.Router();
const kelolaFotoController = require("../controllers/kelolaFotoController");
const { harusAdmin } = require("../middlewares/auth.middleware");

// Prefix later in app.js usually /admin
// So we use /kelola-foto here? Or just / if mounted at /admin/kelola-foto

router.get("/kelola-foto", harusAdmin, kelolaFotoController.index);
router.get("/kelola-foto/:kantorId", harusAdmin, kelolaFotoController.detail);
router.get("/kelola-foto/:kantorId/pdf", harusAdmin, kelolaFotoController.downloadPdf);
router.post("/kelola-foto/hapus", harusAdmin, kelolaFotoController.hapusFoto);

module.exports = router;
