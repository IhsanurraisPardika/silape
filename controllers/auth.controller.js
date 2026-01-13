const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getLogin = (req, res) => {
  // kalau sudah login, arahkan ke dashboard
  if (req.session?.user) return res.redirect("/admin/dashboard");
  res.render("login", { error: null });
};

exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const pengguna = await prisma.pengguna.findUnique({
      where: { email },
    });

    if (!pengguna || !pengguna.statusAktif) {
      return res.status(401).render("login", { error: "Email tidak terdaftar / akun nonaktif." });
    }

    const valid = await bcrypt.compare(password, pengguna.kataSandiHash);
    if (!valid) {
      return res.status(401).render("login", { error: "Password salah." });
    }

    // simpan session minimal
    req.session.user = {
      email: pengguna.email,
      nama: pengguna.nama,
      peran: pengguna.peran,
    };

    // khusus superadmin dulu:
    if (pengguna.peran !== "SUPERADMIN_TPM") {
      return res.status(403).render("login", { error: "Akun ini bukan SUPERADMIN." });
    }

    return res.redirect("/admin/dashboard");
  } catch (err) {
    console.error(err);
    return res.status(500).render("login", { error: "Terjadi kesalahan server." });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};
