const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// helper parse timId
function parseTimId(val) {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

// ✅ halaman tujuan redirect (tanpa /admin)
const HALAMAN_KELOLA = "/kelola-tim-penilai";

// ✅ helper redirect biar rapi & aman untuk spasi
function go(res, type, msg) {
  return res.redirect(`${HALAMAN_KELOLA}?${type}=${encodeURIComponent(msg)}`);
}

exports.index = async (req, res) => {
  try {
    const timList = await prisma.tim.findMany({
      where: { statusAktif: true, dihapusPada: null },
      orderBy: { id: "asc" },
      select: { id: true, nama: true },
    });

    const users = await prisma.pengguna.findMany({
      where: {
        dihapusPada: null,
        peran: "TIM_PENILAI",
      },
      include: { tim: true },
      orderBy: { dibuatPada: "desc" },
    });

    const mapped = users.map((u) => ({
      email: u.email,
      nama: u.nama,
      timId: u.timId,
      timNama: u.tim ? u.tim.nama : "-",
      statusAktif: u.statusAktif,
      peran: u.peran,
    }));

    const formTambah = {
        nama: req.query.nama || "",
        email: req.query.email || "",
        peran: req.query.peran || "",
        timId: req.query.timId || "",
        };

        const emailError = req.query.emailError || null;
        const openTambah = req.query.openTambah === "1";

    return res.render("admin/kelola-tim-penilai", {
      users: mapped,
      timList,
      title: "Kelola Tim Penilai",
      error: req.query.error || null,
      success: req.query.success || null,

      formTambah,
      emailError,
      openTambah,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Gagal memuat data kelola tim.");
  }
};

exports.tambahPengguna = async (req, res) => {
  try {
    const { nama, email, password, peran, timId } = req.body;
    const pembuat = req.session.user;

    if (!nama || !email || !password || !peran) {
      return go(res, "error", "Data wajib belum lengkap");
    }

    // aturan role:
    if (pembuat.peran === "ADMIN" && peran !== "TIM_PENILAI") {
      return go(res, "error", "Admin hanya boleh membuat akun TIM_PENILAI");
    }

    const timIdParsed = parseTimId(timId);
    if (peran === "TIM_PENILAI" && !timIdParsed) {
      return go(res, "error", "TIM_PENILAI wajib memilih tim");
    }

    const exists = await prisma.pengguna.findUnique({ where: { email } });
    if (exists) {
    const q = new URLSearchParams({
        openTambah: "1",
        emailError: "Email sudah digunakan",
        nama,
        email,
        peran,
        timId: timId || "",
    });
    return res.redirect(`/kelola-tim-penilai?${q.toString()}`);
    }

    const hash = await bcrypt.hash(password, 10);

    await prisma.pengguna.create({
      data: {
        email,
        nama,
        kataSandiHash: hash,
        peran,
        timId: peran === "TIM_PENILAI" ? timIdParsed : null,
        statusAktif: true,
        dibuatOlehEmail: pembuat.email,
      },
    });

    return go(res, "success", "Pengguna berhasil ditambahkan");
  } catch (err) {
    console.error(err);
    return go(res, "error", "Gagal menambahkan pengguna");
  }
};

exports.editPengguna = async (req, res) => {
  try {
    const { email, nama, password, timId } = req.body;
    const pembuat = req.session.user;

    if (!email || !nama) {
      return go(res, "error", "Email dan nama wajib diisi");
    }

    const pengguna = await prisma.pengguna.findUnique({ where: { email } });
    if (!pengguna || pengguna.dihapusPada) {
      return go(res, "error", "Pengguna tidak ditemukan");
    }

    if (pembuat.peran === "ADMIN" && pengguna.peran === "SUPERADMIN_TPM") {
      return go(res, "error", "Admin tidak boleh mengubah akun superadmin");
    }

    const timIdParsed = parseTimId(timId);
    const nextTimId = pengguna.peran === "TIM_PENILAI" ? timIdParsed : null;

    const dataUpdate = { nama, timId: nextTimId };

    if (password && password.trim() !== "") {
      dataUpdate.kataSandiHash = await bcrypt.hash(password, 10);
    }

    await prisma.pengguna.update({
      where: { email },
      data: dataUpdate,
    });

    return go(res, "success", "Pengguna berhasil diubah");
  } catch (err) {
    console.error(err);
    return go(res, "error", "Gagal mengubah pengguna");
  }
};

exports.hapusPengguna = async (req, res) => {
  try {
    const { email } = req.body;
    const pembuat = req.session.user;

    if (!email) {
      return go(res, "error", "Email tidak valid");
    }

    const pengguna = await prisma.pengguna.findUnique({ where: { email } });
    if (!pengguna || pengguna.dihapusPada) {
      return go(res, "error", "Pengguna tidak ditemukan");
    }

    if (email === pembuat.email) {
      return go(res, "error", "Tidak bisa menghapus akun sendiri");
    }

    if (pembuat.peran === "ADMIN" && pengguna.peran === "SUPERADMIN_TPM") {
      return go(res, "error", "Admin tidak boleh menghapus akun superadmin");
    }

    await prisma.pengguna.update({
      where: { email },
      data: {
        statusAktif: false,
        dihapusPada: new Date(),
      },
    });

    return go(res, "success", "Pengguna berhasil dihapus");
  } catch (err) {
    console.error(err);
    return go(res, "error", "Gagal menghapus pengguna");
  }
};
