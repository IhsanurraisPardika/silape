const express = require("express");
const router = express.Router();
const loginController = require("../controllers/loginController");

// tampil halaman login di dua url: / dan /login
router.get("/", loginController.getlogin);
router.get("/login", loginController.getlogin);

router.post("/login", loginController.postlogin);
router.get("/logout", loginController.logout);

router.get("/home", loginController.gethome);

module.exports = router;
