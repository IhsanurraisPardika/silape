const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const formPenilaianController = require("../controllers/formPenilaianController");
const { harusTimPenilai } = require("../middlewares/auth.middleware"); // Pastikan user TIM_PENILAI

const uploadDir = path.join(process.cwd(), "public", "uploads", "penilaian");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeOriginal = (file.originalname || "file")
      .replace(/[^\w.\-() ]+/g, "_")
      .slice(0, 80);
    const ext = path.extname(safeOriginal) || path.extname(file.originalname || "");
    const base = path.basename(safeOriginal, ext) || "file";
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

function handleUploadAny(req, res, next) {
  upload.any()(req, res, (err) => {
    if (!err) return next();

    // Multer error (size limit, invalid field, etc.)
    if (err instanceof multer.MulterError) {
      let message = "Upload gagal.";
      if (err.code === "LIMIT_FILE_SIZE") {
        message = "Ukuran file terlalu besar. Maksimal 8MB per file.";
      } else if (err.message) {
        message = err.message;
      }
      return res.status(400).json({ success: false, message });
    }

    // Generic error
    return res.status(400).json({
      success: false,
      message: err?.message || "Upload gagal diproses.",
    });
  });
}

// GET - Tampilkan form penilaian berdasarkan kantor yang dipilih
router.get("/formPenilaian", harusTimPenilai, formPenilaianController.getFormPenilaian);

// POST - Simpan data penilaian (Nilai, Catatan, Foto)
router.post(
  "/formPenilaian",
  harusTimPenilai,
  handleUploadAny,
  formPenilaianController.postFormPenilaian
);

module.exports = router;