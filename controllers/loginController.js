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

// Fallback jika konfigurasi bobot belum ada/terbaca
const DEFAULT_EXPECTED_DETAIL_COUNT = 16;

exports.gethome = async (req, res) => {
  if (!req.session?.user?.email) return res.redirect("/login");

  let totalAssessed = 0;
  let finalAverage = 0;
  let kantorAverages = [];

  try {
    const user = req.session.user;

    // Selalu gunakan periode aktif terbaru (agar saat admin mengganti periode, home ikut menyesuaikan)
    const activePeriode = await prisma.periodePenilaian.findFirst({
      where: { statusAktif: true },
      orderBy: [{ tahun: 'desc' }, { semester: 'desc' }, { diubahPada: 'desc' }]
    });

    // 1. Ambil data user lengkap untuk tahu timKode
    const pengguna = await prisma.pengguna.findUnique({
      where: { email: user.email },
      include: { anggotaTim: true }
    });

    if (pengguna && pengguna.peran === 'TIMPENILAI' && pengguna.timKode && activePeriode) {
      // 2. Ambil Penugasan Kantor untuk User ini
      const penugasan = await prisma.penugasanKantorAkun.findMany({
        where: {
          akunEmail: user.email,
          periodeId: activePeriode.id,
          statusAktif: true
        },
        include: {
          kantor: true
        }
      });

      // Expected count detail dinamis mengikuti konfigurasi periode aktif
      const configBobot = await prisma.konfigurasiBobot.findFirst({
        where: { periodeId: activePeriode.id, statusAktif: true },
        include: { _count: { select: { bobotKriteria: true } }, bobotKriteria: true }
      });
      const expectedCount = configBobot?._count?.bobotKriteria || DEFAULT_EXPECTED_DETAIL_COUNT;

      const bobotKriteria = Array.isArray(configBobot?.bobotKriteria) ? configBobot.bobotKriteria : [];

      // 3. Ambil anggota tim (orang) yang aktif untuk akun tim ini
      const anggotaTimAktif = (pengguna.anggotaTim || [])
        .filter((a) => a.statusAktif)
        .sort((a, b) => a.urutan - b.urutan);

      const anggotaIdsAktif = anggotaTimAktif.map((a) => a.id);
      const totalAnggotaTim = anggotaIdsAktif.length;

      let sumRata = 0;
      let countRata = 0;
      const kantorAveragesLocal = [];

      // 4. Loop setiap kantor yang ditugaskan
      for (const p of penugasan) {
        // Ambil semua penilaian tim untuk kantor & periode ini
        const penilaianTim = await prisma.penilaian.findMany({
          where: {
            periodeId: p.periodeId,
            kantorId: p.kantorId,
            akunEmail: user.email,
            anggotaId: { in: anggotaIdsAktif }
          },
          select: {
            anggotaId: true,
            status: true,
            tanggalMulaiInput: true,
            tanggalSubmit: true,
            dibuatPada: true,
            diubahPada: true,
            detail: {
              select: {
                nilai: true,
                kunciKriteria: true
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
          if (!penilaian.detail || penilaian.detail.length < expectedCount) return false;
          return true;
        };

        const completedByAnggotaId = new Map();
        for (const anggotaId of anggotaIdsAktif) {
          const list = penilaianTim.filter((pTim) => Number(pTim.anggotaId) === Number(anggotaId));
          const completed = list.some(isPenilaianComplete);
          completedByAnggotaId.set(Number(anggotaId), completed);
        }

        const completedCount = Array.from(completedByAnggotaId.values()).filter(Boolean).length;
        const allComplete = totalAnggotaTim > 0 && completedCount >= totalAnggotaTim;

        if (allComplete) {
          // Ambil penilaian "terbaru" (atau yang paling valid) dari tiap anggota
          const completedPerAnggota = new Map();
          for (const anggotaId of anggotaIdsAktif) {
            const list = penilaianTim
              .filter((pTim) => Number(pTim.anggotaId) === Number(anggotaId))
              .filter(isPenilaianComplete)
              .sort((a, b) => {
                const da = a.diubahPada || a.tanggalSubmit || a.tanggalMulaiInput || a.dibuatPada || new Date(0);
                const db = b.diubahPada || b.tanggalSubmit || b.tanggalMulaiInput || b.dibuatPada || new Date(0);
                return db - da; // Descending
              });
            if (list.length > 0) completedPerAnggota.set(Number(anggotaId), list[0]);
          }

          const completedList = Array.from(completedPerAnggota.values());
          const allDetails = completedList.flatMap((pTim) => pTim.detail || []);

          if (bobotKriteria.length > 0 && allDetails.length > 0) {
            const valuesByKey = new Map();
            for (const d of allDetails) {
              const key = d?.kunciKriteria;
              if (!key) continue;
              const n = Number(d.nilai);
              if (!Number.isFinite(n)) continue;
              const list = valuesByKey.get(key) || [];
              list.push(n);
              valuesByKey.set(key, list);
            }

            let totalSkorAkhir = 0;
            for (const b of bobotKriteria) {
              const key = b.kunciKriteria;
              const list = valuesByKey.get(key) || [];
              if (list.length === 0) continue;
              const sum = list.reduce((acc, v) => acc + v, 0);
              const avg = sum / list.length;
              const weight = Number.parseFloat(String(b.bobot));
              if (!Number.isFinite(weight)) continue;
              totalSkorAkhir += avg * weight;
            }

            const nilaiAkhir = Number(totalSkorAkhir.toFixed(2));
            kantorAveragesLocal.push({ kantor: p.kantor?.nama || `Kantor ${p.kantorId}`, nilai: nilaiAkhir });
            sumRata += totalSkorAkhir;
            countRata++;
          }
        }
      }

      // Hitung final average
      if (countRata > 0) {
        finalAverage = (sumRata / countRata).valueOf(); // Biarkan number dulu
      }

      kantorAverages = kantorAveragesLocal.sort((a, b) => String(a.kantor).localeCompare(String(b.kantor)));
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
    finalAverage: formattedAverage,
    kantorAverages
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
