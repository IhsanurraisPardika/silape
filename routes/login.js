const express = require("express");
const router = express.Router();

const loginController = require("../controllers/loginController");
const { requireAuth, requireTimPenilai } = require("../middlewares/auth.middleware");

// tampil halaman login: /login
router.get("/login", loginController.getlogin);

router.post("/login", loginController.postlogin);
router.get("/logout", loginController.logout);

// HOME (diproteksi middleware)
router.get("/home", requireAuth, requireTimPenilai, loginController.gethome);

module.exports = router;