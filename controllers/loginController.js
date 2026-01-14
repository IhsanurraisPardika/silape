const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function redirectByRole(peran) {
  // silakan sesuaikan url sesuai route halamanmu
  if (peran === "SUPERADMIN_TPM" || peran === "ADMIN") return "/admin/dashboard";
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
    error: null,
    appName: "SILAPE",
  });
};

exports.postlogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // validasi sederhana
    if (!email || !password) {
      return res.status(400).render("login", {
        title: "Login - SILAPE",
        error: "Email dan password harus diisi",
        appName: "SILAPE",
      });
    }

    const pengguna = await prisma.pengguna.findUnique({
      where: { email },
      include: { tim: true }, // supaya bisa ambil nama tim untuk TIM_PENILAI
    });

    if (!pengguna || !pengguna.statusAktif) {
      return res.status(401).render("login", {
        title: "Login - SILAPE",
        error: "Email tidak terdaftar / akun nonaktif.",
        appName: "SILAPE",
      });
    }

    const valid = await bcrypt.compare(password, pengguna.kataSandiHash);
    if (!valid) {
      return res.status(401).render("login", {
        title: "Login - SILAPE",
        error: "Password salah.",
        appName: "SILAPE",
      });
    }

    // simpan session minimal
    req.session.user = {
      email: pengguna.email,
      nama: pengguna.nama,
      peran: pengguna.peran,
      timId: pengguna.timId || null,
      namaTim: pengguna.tim?.nama || null,
    };

    return res.redirect(redirectByRole(pengguna.peran));
  } catch (err) {
    console.error(err);
    return res.status(500).render("login", {
      title: "Login - SILAPE",
      error: "Terjadi kesalahan server.",
      appName: "SILAPE",
    });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};

// HOME untuk TIM_PENILAI (contoh)
// nanti bisa kamu proteksi dengan middleware (harus login)
exports.gethome = (req, res) => {
  if (!req.session?.user?.email) return res.redirect("/");

  return res.render("home", {
    title: "Home",
    user: {
      name: req.session.user.nama,
      team: req.session.user.namaTim || "—",
    },
  });
};
