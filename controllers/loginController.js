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

// Konstanta jumlah detail yang dianggap lengkap (samakan dengan daftarPenilaianController)
const EXPECTED_DETAIL_COUNT = 16;

exports.gethome = async (req, res) => {
  if (!req.session?.user?.email) return res.redirect("/login");

  let totalAssessed = 0;
  let finalAverage = 0;

  try {
    const user = req.session.user;

    // 1. Ambil data user lengkap untuk tahu timKode
    const pengguna = await prisma.pengguna.findUnique({
      where: { email: user.email },
      include: { anggotaTim: true }
    });

    if (pengguna && pengguna.peran === 'TIMPENILAI' && pengguna.timKode) {
      // 2. Ambil Penugasan Kantor untuk User ini
      const penugasan = await prisma.penugasanKantorAkun.findMany({
        where: {
          akunEmail: user.email,
          statusAktif: true
        },
        include: {
          kantor: true
        }
      });

      // 3. Ambil anggota tim di tim yang sama
      const anggotaTim = await prisma.pengguna.findMany({
        where: {
          timKode: pengguna.timKode,
          statusAktif: true,
          peran: 'TIMPENILAI'
        },
        select: { email: true }
      });
      const teamEmails = anggotaTim.map((a) => a.email);
      const totalAnggotaTim = teamEmails.length;

      let sumRata = 0;
      let countRata = 0;

      // 4. Loop setiap kantor yang ditugaskan
      for (const p of penugasan) {
        // Ambil semua penilaian tim untuk kantor & periode ini
        const penilaianTim = await prisma.penilaian.findMany({
          where: {
            periodeId: p.periodeId,
            kantorId: p.kantorId,
            akunEmail: { in: teamEmails }
          },
          select: {
            akunEmail: true,
            status: true,
            tanggalMulaiInput: true,
            tanggalSubmit: true,
            dibuatPada: true,
            diubahPada: true,
            detail: {
              select: {
                nilai: true
              }
            }
          }
        });

        const hasStarted = penilaianTim.length > 0;
        if (hasStarted) {
          totalAssessed++;
        }

        // Logic Hitung Rata-rata (Mirip daftarPenilaianController)
        const isPenilaianComplete = (penilaian) => {
          if (!penilaian) return false;
          // Cek jumlah detail
          if (!penilaian.detail || penilaian.detail.length < EXPECTED_DETAIL_COUNT) return false;
          return true;
        };

        const completedByEmail = new Map();
        for (const email of teamEmails) {
          const list = penilaianTim.filter((pTim) => pTim.akunEmail === email);
          const completed = list.some(isPenilaianComplete);
          completedByEmail.set(email, completed);
        }

        const completedCount = Array.from(completedByEmail.values()).filter(Boolean).length;
        const allComplete = totalAnggotaTim > 0 && completedCount >= totalAnggotaTim;

        if (allComplete) {
          // Ambil penilaian "terbaru" (atau yang paling valid) dari tiap anggota
          const completedPerEmail = new Map();
          for (const email of teamEmails) {
            const list = penilaianTim
              .filter((pTim) => pTim.akunEmail === email)
              .filter(isPenilaianComplete)
              .sort((a, b) => {
                const da = a.diubahPada || a.tanggalSubmit || a.tanggalMulaiInput || a.dibuatPada || new Date(0);
                const db = b.diubahPada || b.tanggalSubmit || b.tanggalMulaiInput || b.dibuatPada || new Date(0);
                return db - da; // Descending
              });
            if (list.length > 0) completedPerEmail.set(email, list[0]);
          }

          const completedList = Array.from(completedPerEmail.values());
          const allDetails = completedList.flatMap((pTim) => pTim.detail || []);
          if (allDetails.length > 0) {
            const total = allDetails.reduce((sum, d) => sum + Number(d.nilai), 0);
            const rata = total / allDetails.length;
            sumRata += rata;
            countRata++;
          }
        }
      }

      // Hitung final average
      if (countRata > 0) {
        finalAverage = (sumRata / countRata).valueOf(); // Biarkan number dulu
      }
    }

  } catch (err) {
    console.error("Error calculating home stats:", err);
  }

  // Format ke string fixed 1 desimal jika perlu, atau kirim sebagai number
  // Di view nanti ditampilkan. Kalau 0 tetap 0.
  const formattedAverage = finalAverage % 1 === 0 ? finalAverage : finalAverage.toFixed(2);

  return res.render("home", {
    title: "Home",
    user: req.session.user,
    totalAssessed,
    finalAverage: formattedAverage
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
