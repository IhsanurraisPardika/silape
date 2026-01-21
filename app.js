require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// ===== ROUTES =====
const loginRoutes = require("./routes/login");
const adminRoutes = require("./routes/admin");
const formPenilaianRoutes = require("./routes/formPenilaian");
const penilaianRoutes = require("./routes/penilaian");
const kelolaKantorRoutes = require("./routes/kelolaKantor");
const daftarPenilaianRoutes = require("./routes/daftarPenilaian");
const dashboardAdminRoutes = require("./routes/dashboardAdmin");
const pengaturanBobotRoutes = require("./routes/pengaturanBobot");
const kelolaTimRoutes = require("./routes/kelolaTim");
const kriteriapenilaianRoutes = require("./routes/kriteriapenilaian");
const tentangRoutes = require("./routes/tentang");
app.use("/", kriteriapenilaianRoutes);


// middleware auth
const { harusSuperadmin } = require("./middlewares/auth.middleware");

// ===== VIEW ENGINE =====
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ===== STATIC FILES =====
app.use(express.static(path.join(__dirname, "public")));

// ===== BODY PARSER =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== SESSION (HARUS SEBELUM ROUTES) =====
app.use(
  session({
    secret: process.env.SESSION_SECRET || "silape-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// ===== GLOBAL DATA KE VIEW =====
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ===== ROUTES =====
app.use("/", loginRoutes);
app.use("/", formPenilaianRoutes);

app.use("/", kriteriapenilaianRoutes);

// Feature routes
app.use("/penilaian", penilaianRoutes);
app.use("/kelolaKantor", kelolaKantorRoutes);
app.use("/daftarPenilaian", daftarPenilaianRoutes);
app.use("/dashboardAdmin", dashboardAdminRoutes);
app.use("/pengaturanBobot", pengaturanBobotRoutes);
app.use("/pengaturanBobot", pengaturanBobotRoutes);
app.use("/", kelolaTimRoutes);
app.use("/tentang", tentangRoutes);

// contoh proteksi superadmin
app.get("/admin/dashboard", harusSuperadmin, (req, res) => {
  res.send(`Halo ${req.session.user?.nama || "User"}`);
});

// admin
app.use("/admin", adminRoutes);


// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    title: "500 - Error Server",
    message: "Terjadi kesalahan pada server.",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// ===== START =====
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
