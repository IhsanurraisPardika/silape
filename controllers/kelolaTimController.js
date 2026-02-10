const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// List Tim Static (sesuai denga Enum TimKode di schema)
const TIM_LIST = [
  { id: "TIM1", nama: "TIM 1" },
  { id: "TIM2", nama: "TIM 2" },
  { id: "TIM3", nama: "TIM 3" },
  { id: "TIM4", nama: "TIM 4" },
  { id: "TIM5", nama: "TIM 5" },
  { id: "TIM6", nama: "TIM 6" },
  { id: "TIM7", nama: "TIM 7" },
  { id: "TIM8", nama: "TIM 8" },
  { id: "TIM9", nama: "TIM 9" },
  { id: "TIM10", nama: "TIM 10" },
];

// Helper redirect
const HALAMAN_KELOLA = "/kelola-tim-penilai";
function go(res, type, msg) {
  return res.redirect(`${HALAMAN_KELOLA}?${type}=${encodeURIComponent(msg)}`);
}

exports.index = async (req, res) => {
  try {
    // Ambil filter role dari query, default 'TIM_PENILAI' (tapi mapper ke DB value)
    const roleFilter = req.query.role || "TIM_PENILAI";

    // Mapping UI Value -> DB Value
    let dbRole = "TIMPENILAI"; // Default
    if (roleFilter === "ADMIN") dbRole = "ADMIN";
    // Jika ada role lain, tambahkan di sini

    const users = await prisma.pengguna.findMany({
      where: {
        dihapusPada: null,
        peran: dbRole,
      },
      include: {
        anggotaTim: {
          orderBy: { urutan: "asc" },
        },
      },
      orderBy: { dibuatPada: "desc" },
    });

    // Mapping data untuk view
    const mapped = users.map((u) => {
      // Cari nama tim berdasarkan enum
      const timDef = TIM_LIST.find((t) => t.id === u.timKode);

      // Ambil nama anggota pertama sebagai 'Ketua' (display nama utama)
      let displayName = "Tanpa Nama";

      if (u.peran === "TIMPENILAI") {
        const ketua = u.anggotaTim.find(a => a.urutan === 1);
        if (ketua) displayName = ketua.nama;
      } else {
        // Untuk Admin, pakai field nama dari table Pengguna (jika ada) atau username
        displayName = u.nama || u.username;
      }

      return {
        username: u.username,
        nama: displayName,
        timKode: u.timKode,
        timNama: timDef ? timDef.nama : "-",
        statusAktif: u.statusAktif,
        peran: u.peran,
        anggota: u.anggotaTim, // array obj
      };
    });

    return res.render("admin/kelola-tim-penilai", {
      users: mapped,
      timList: TIM_LIST, // Kirim list static ke view
      title: "Kelola Tim Penilai",
      currentRole: roleFilter, // Kirim state filter ke view
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Gagal memuat data kelola tim.");
  }
};

exports.tambahPengguna = async (req, res) => {
  try {
    // req.body: nama, username, password, peran, timId (sebagai timKode)
    // Plus: anggota1..5 (dari modal UI custom)
    const {
      username, password, peran, timId,
      anggota1, anggota2, anggota3, anggota4, anggota5
    } = req.body;

    // START: Normalize Role (Input UI: TIM_PENILAI -> DB: TIMPENILAI)
    let dbRole = peran;
    if (peran === "TIM_PENILAI") dbRole = "TIMPENILAI";
    if (peran === "SUPERADMIN_TPM") dbRole = "SUPERADMINTPM";
    // ADMIN tetap ADMIN

    const pembuat = req.session.user;

    if (!username || !password || !peran) {
      return go(res, "error", "Username, Password, dan Role wajib diisi");
    }

    // Cek duplikat username
    const exists = await prisma.pengguna.findUnique({ where: { username } });
    if (exists) {
      return go(res, "error", "Username sudah digunakan");
    }

    const hash = await bcrypt.hash(password, 10);

    // Siapkan data create
    let timKodeVal = null;

    // Logika validasi role pakai string UI (peran) atau dbRole?
    // Konsistenkan logic:
    if (dbRole === "TIMPENILAI") {
      if (!timId) return go(res, "error", "Pilih Tim untuk Tim Penilai");
      timKodeVal = timId;

      // VALIDASI: Cek apakah Tim sudah diambil user lain yang aktif
      const existingTim = await prisma.pengguna.findFirst({
        where: {
          timKode: timKodeVal,
          dihapusPada: null
        }
      });

      if (existingTim) {
        return go(res, "error", `Tim ${timId} sudah memiliki akun aktif.`);
      }

      // Validasi anggota 1 wajib (sebagai ketua)
      if (!anggota1) return go(res, "error", "Nama Ketua (Anggota 1) wajib diisi");
    }

    // Transaction: buat user -> buat anggota
    await prisma.$transaction(async (tx) => {
      // 1. Buat User
      await tx.pengguna.create({
        data: {
          username,
          kataSandiHash: hash,
          peran: dbRole, // pakai normalized role
          timKode: timKodeVal,
          statusAktif: true,
          // dibuatOlehUsername: pembuat.username, // REMOVED: Not in schema or optional
        }
      });

      // 2. Buat Anggota Tim (Jika TIM_PENILAI)
      if (dbRole === "TIMPENILAI") {
        const listAnggota = [];
        if (anggota1) listAnggota.push({ nama: anggota1, urutan: 1 });
        if (anggota2) listAnggota.push({ nama: anggota2, urutan: 2 });
        if (anggota3) listAnggota.push({ nama: anggota3, urutan: 3 });
        if (anggota4) listAnggota.push({ nama: anggota4, urutan: 4 });
        if (anggota5) listAnggota.push({ nama: anggota5, urutan: 5 });

        for (const ang of listAnggota) {
          await tx.anggotaTim.create({
            data: {
              akunUsername: username,
              urutan: ang.urutan,
              nama: ang.nama,
              statusAktif: true
            }
          });
        }
      }
    });

    return go(res, "success", "Pengguna berhasil ditambahkan");
  } catch (err) {
    console.error(err);
    return go(res, "error", "Gagal menambahkan pengguna silakan cek log");
  }
};

exports.editPengguna = async (req, res) => {
  // IMPLEMENTASI EDIT (update nama, tim, password, dan anggota)
  // Untuk simplifikasi awal, kita support ganti password & tim dulu
  // Idealnya edit anggota juga.
  try {
    const { username, password, timId, anggota1, anggota2, anggota3, anggota4, anggota5 } = req.body;
    // Note: username jadi key lookup, biasanya hidden input

    if (!username) return go(res, "error", "Username tidak valid");

    const pengguna = await prisma.pengguna.findUnique({ where: { username } });
    if (!pengguna || pengguna.dihapusPada) {
      return go(res, "error", "Pengguna tidak ditemukan");
    }

    const dataUpdate = {};
    if (timId && pengguna.peran === 'TIMPENILAI') {
      dataUpdate.timKode = timId;
    }

    // Ganti password jika diisi
    if (password && password.trim() !== "") {
      dataUpdate.kataSandiHash = await bcrypt.hash(password, 10);
    }

    await prisma.$transaction(async (tx) => {
      // Update user
      if (Object.keys(dataUpdate).length > 0) {
        await tx.pengguna.update({
          where: { username },
          data: dataUpdate
        });
      }

      // Update anggota
      // Strategi Upsert/Update satu2:
      if (pengguna.peran === "TIMPENILAI") {
        const inputs = [
          { urutan: 1, nama: anggota1 },
          { urutan: 2, nama: anggota2 },
          { urutan: 3, nama: anggota3 },
          { urutan: 4, nama: anggota4 },
          { urutan: 5, nama: anggota5 },
        ];

        for (const item of inputs) {
          if (!item.nama) {
            continue;
          }

          // Cek existing
          const existing = await tx.anggotaTim.findUnique({
            where: { akunUsername_urutan: { akunUsername: username, urutan: item.urutan } }
          });

          if (existing) {
            // Update nama
            if (existing.nama !== item.nama) {
              await tx.anggotaTim.update({
                where: { id: existing.id },
                data: { nama: item.nama }
              });
            }
          } else {
            // Create baru
            await tx.anggotaTim.create({
              data: {
                akunUsername: username,
                urutan: item.urutan,
                nama: item.nama,
                statusAktif: true
              }
            });
          }
        }
      }
    });

    return go(res, "success", "Pengguna berhasil diubah");
  } catch (err) {
    console.error(err);
    return go(res, "error", "Gagal mengubah pengguna");
  }
};

exports.hapusPengguna = async (req, res) => {
  try {
    const { username } = req.body;
    const pembuat = req.session.user;

    if (!username) return go(res, "error", "Username tidak valid");
    if (username === pembuat.username) return go(res, "error", "Tidak bisa menghapus akun sendiri");

    const pengguna = await prisma.pengguna.findUnique({ where: { username } });
    if (!pengguna) return go(res, "error", "Pengguna tidak ditemukan");

    // Soft delete
    await prisma.pengguna.update({
      where: { username },
      data: {
        statusAktif: false,
        dihapusPada: new Date(),
      },
      // Cascade delete atau manual soft delete child?
      // Schema: AnggotaTim -> onDelete Cascade (di DB level biasanya hard delete). 
      // Tapi karena soft delete user, anggota mungkin tetap ada tapi status ikut user?
      // Bisa manual update statusAktif anggota.
    });

    return go(res, "success", "Pengguna berhasil dihapus");
  } catch (err) {
    console.error(err);
    return go(res, "error", "Gagal menghapus pengguna");
  }
};
