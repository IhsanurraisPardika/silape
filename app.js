require("dotenv").config();
const express = require("express");
const session = require("express-session");
const app = express();
const port = process.env.PORT || 3000;
const { harusSuperadmin } = require("./middlewares/auth.middleware");

// Set template engine
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

// Static files
app.use(express.static(__dirname + "/public"));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

// ===== ROUTES =====
app.use("/", require("./routes/login"));
app.use("/penilaian", require("./routes/penilaian"));
app.use("/kelolaKantor", require("./routes/kelolaKantor"));

// ✅ ini yang bikin /admin/pengguna/tambah ketemu
app.use("/", require("./routes/kelolaTim"));

// contoh route dashboard superadmin
app.get("/admin/dashboard", harusSuperadmin, (req, res) => {
  res.send(`Halo ${req.session.user.nama}, ini dashboard superadmin`);
});

// ===== ERROR HANDLING (PALING BAWAH) =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
