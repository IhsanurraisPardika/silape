require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// ===== ROUTES IMPORT =====
const loginRoutes = require("./routes/login");
const adminRoutes = require("./routes/admin");

const formPenilaianRoutes = require("./routes/formPenilaian");
const penilaianRoutes = require("./routes/penilaian");
const kelolaKantorRoutes = require("./routes/kelolaKantor");
const daftarPenilaianRoutes = require("./routes/daftarPenilaian");
const dashboardAdminRoutes = require("./routes/dashboardAdmin");
const pengaturanBobotRoutes = require("./routes/pengaturanBobot");
const kelolaTimRoutes = require("./routes/kelolaTim");

// middleware
const { harusSuperadmin } = require("./middlewares/auth.middleware");

// ===== VIEW ENGINE =====
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ===== STATIC FILES =====
app.use(express.static(path.join(__dirname, "public")));

// ===== BODY PARSER =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== SESSION (PASANG SEKALI SAJA) =====
app.use(
  session({
    secret: process.env.SESSION_SECRET || "silape-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // true hanya kalau https
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 jam
    },
  })
);

// ===== GLOBAL DATA KE VIEW (PASANG SEBELUM ROUTES) =====
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ===== ROUTES =====
// Login router (berisi: /, /login, /logout, /home jika kamu pakai versi router yang aku rapikan)
app.use("/", loginRoutes);

// Form Penilaian
app.use("/", formPenilaianRoutes);

// Feature routes
app.use("/penilaian", penilaianRoutes);
app.use("/kelolaKantor", kelolaKantorRoutes);
app.use("/daftarPenilaian", daftarPenilaianRoutes);
app.use("/dashboardAdmin", dashboardAdminRoutes);
app.use("/pengaturanBobot", pengaturanBobotRoutes);

// ✅ kalau route kelolaTim memang bikin endpoint seperti: /admin/pengguna/tambah
// lebih rapi kalau kamu mount ke /admin (lihat catatan di bawah)
app.use("/", kelolaTimRoutes);

// contoh route dashboard superadmin (lebih baik taruh sebelum adminRoutes agar tidak ketiban)
app.get("/admin/dashboard", harusSuperadmin, (req, res) => {
  res.send(`Halo ${req.session.user?.nama || "User"}, ini dashboard superadmin`);
});

// Admin routes
app.use("/admin", adminRoutes);

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).render("error", {
    title: "404 - Not Found",
    message: "Halaman tidak ditemukan.",
  });
});

// ===== ERROR HANDLER (PALING BAWAH) =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    title: "500 - Error Server",
    message: "Terjadi kesalahan pada server.",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// ===== START SERVER =====
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
