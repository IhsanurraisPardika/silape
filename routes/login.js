const express = require("express");
const router = express.Router();

const loginController = require("../controllers/loginController");
const { requireAuth, requireTimPenilai } = require("../middlewares/auth.middleware");

// tampil halaman login di dua url: / dan /login
router.get("/", loginController.getlogin);
router.get("/login", loginController.getlogin);

router.post("/login", loginController.postlogin);
router.get("/logout", loginController.logout);

// HOME (diproteksi middleware)
router.get("/home", requireAuth, requireTimPenilai, loginController.gethome);

module.exports = router;