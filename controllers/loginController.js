// controllers/authController.js
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function redirectByRole(peran) {
  if (peran === "SUPERADMINTPM" || peran === "ADMIN") return "/dashboardAdmin";
  if (peran === "TIMPENILAI") return "/home";
  return "/";
}

function timLabel(timKode) {
  // TimKode enum: TIM1..TIM10 -> "TIM 1".."TIM 10"
  if (!timKode) return null;
  const m = String(timKode).match(/^TIM(\d+)$/);
  return m ? `TIM ${m[1]}` : String(timKode);
}

exports.getlogin = (req, res) => {
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
    if (!email || !password) {
      return res.status(400).render("login", {
        title: "Login - SILAPE",
        appName: "SILAPE",
        message: "",
        error: "Email dan password harus diisi",
        email: email || "",
      });
    }

    // Ambil user. Jangan include "tim" karena sudah tidak ada.
    // Ambil anggotaTim hanya kalau role-nya TIMPENILAI (opsional dilakukan setelah cek password juga).
    const pengguna = await prisma.pengguna.findUnique({
      where: { email },
      include: {
        anggotaTim: true, // aman; untuk admin/superadmin akan kosong
      },
    });

    if (!pengguna) {
      return res.status(401).render("login", {
        title: "Login - SILAPE",
        appName: "SILAPE",
        message: "",
        error: "Email atau password salah",
        email,
      });
    }

    if (!pengguna.statusAktif) {
      return res.status(403).render("login", {
        title: "Login - SILAPE",
        appName: "SILAPE",
        message: "",
        error: "Akun tidak aktif. Hubungi administrator.",
        email,
      });
    }

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

    // Validasi khusus akun tim penilai:
    // - harus punya timKode
    // - harus punya minimal Anggota 1 (urutan=1) aktif
    if (pengguna.peran === "TIMPENILAI") {
      if (!pengguna.timKode) {
        return res.status(403).render("login", {
          title: "Login - SILAPE",
          appName: "SILAPE",
          message: "",
          error: "Akun tim belum memiliki TimKode. Hubungi administrator.",
          email,
        });
      }

      const anggotaAktif = (pengguna.anggotaTim || [])
        .filter((a) => a.statusAktif)
        .sort((a, b) => a.urutan - b.urutan);

      const ketua = anggotaAktif.find((a) => a.urutan === 1);

      if (!ketua) {
        return res.status(403).render("login", {
          title: "Login - SILAPE",
          appName: "SILAPE",
          message: "",
          error: "Akun tim belum memiliki Anggota 1 (ketua). Hubungi administrator.",
          email,
        });
      }

      // Simpan list anggota untuk dropdown "menilai sebagai siapa" (opsional).
      // Kalau kamu tidak mau simpan list di session, simpan flag saja dan query ulang di halaman pilih anggota.
      req.session.anggotaTim = anggotaAktif.map((a) => ({
        id: a.id,
        urutan: a.urutan,
        nama: a.nama,
      }));
    } else {
      // Pastikan session anggota tidak nyangkut dari login sebelumnya
      req.session.anggotaTim = null;
      req.session.anggotaAktif = null;
    }

    // Session user: schema terbaru tidak punya id & (mungkin) tidak punya nama.
    req.session.user = {
      email: pengguna.email,
      peran: pengguna.peran,
      timKode: pengguna.timKode ?? null,
      timLabel: timLabel(pengguna.timKode),
    };

    // Kalau role tim penilai, biasanya kamu ingin redirect ke halaman pilih anggota dulu.
    // Kalau kamu belum punya halaman itu, kamu bisa tetap ke /home.
    if (pengguna.peran === "TIMPENILAI") {
      return res.redirect("/pilih-anggota");
    }

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
    return res.redirect("/login");
  });
};

exports.gethome = (req, res) => {
  if (!req.session?.user?.email) return res.redirect("/login");

  return res.render("home", {
    title: "Home",
    user: req.session.user,
  });
};

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
