// controllers/authController.js
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function redirectByRole(peran) {
  if (peran === "SUPERADMIN_TPM" || peran === "ADMIN") return "/dashboardAdmin";
  if (peran === "TIM_PENILAI") return "/home";
  return "/"; // fallback
}

exports.getlogin = (req, res) => {
  // kalau sudah login, langsung arahkan sesuai role
  if (req.session?.user?.email) {
    return res.redirect(redirectByRole(req.session.user.peran));
  }

  return res.render("login", {
    title: "Login - SILAPE",
    appName: "SILAPE",
    message: "",
    error: null,
    email: "",
  });
};

exports.postlogin = async (req, res) => {
  const { email, password } = req.body || {};

  try {
    // validasi input
    if (!email || !password) {
      return res.status(400).render("login", {
        title: "Login - SILAPE",
        appName: "SILAPE",
        message: "",
        error: "Email dan password harus diisi",
        email: email || "",
      });
    }

    const pengguna = await prisma.pengguna.findUnique({
      where: { email },
      include: { tim: true }, // supaya bisa ambil nama/kode tim untuk TIM_PENILAI
    });

    // user tidak ada
    if (!pengguna) {
      return res.status(401).render("login", {
        title: "Login - SILAPE",
        appName: "SILAPE",
        message: "",
        error: "Email atau password salah",
        email,
      });
    }

    // akun nonaktif
    if (!pengguna.statusAktif) {
      return res.status(403).render("login", {
        title: "Login - SILAPE",
        appName: "SILAPE",
        message: "",
        error: "Akun tidak aktif. Hubungi administrator.",
        email,
      });
    }

    // cek password
    const passwordValid = await bcrypt.compare(password, pengguna.kataSandiHash);
    if (!passwordValid) {
      return res.status(401).render("login", {
        title: "Login - SILAPE",
        appName: "SILAPE",
        message: "",
        error: "Email atau password salah",
        email,
      });
    }

    // simpan session minimal (yang sering dipakai)
    req.session.user = {
      id: pengguna.id,
      email: pengguna.email,
      nama: pengguna.nama,
      peran: pengguna.peran,
      timId: pengguna.timId ?? null,
      timKode: pengguna.tim?.kode ?? null,
      namaTim: pengguna.tim?.nama ?? null,
    };

    return res.redirect(redirectByRole(pengguna.peran));
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).render("login", {
      title: "Login - SILAPE",
      appName: "SILAPE",
      message: "",
      error: "Terjadi kesalahan server. Silakan coba lagi.",
      email: email || "",
    });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Logout error:", err);
    // kalau perlu: res.clearCookie("connect.sid");
    return res.redirect("/login"); // sesuaikan dengan route login kamu
  });
};

exports.gethome = (req, res) => {
  if (!req.session?.user?.email) return res.redirect("/login");

  return res.render("home", {
    title: "Home",
    user: req.session.user,
  });
};

// OPTIONAL: middleware biar lebih rapi dipakai di routes
exports.requireAuth = (req, res, next) => {
  if (!req.session?.user?.email) return res.redirect("/login");
  next();
};

exports.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.session?.user?.peran;
    if (!role) return res.redirect("/login");
    if (!allowedRoles.includes(role)) return res.status(403).send("Forbidden");
    next();
  };
};
