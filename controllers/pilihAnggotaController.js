const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getPilihAnggota = (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    // Jika bukan tim penilai, langsung ke dashboard sesuai role
    if (req.session.user.peran !== "TIMPENILAI") {
        // Basic redirect logic (bisa disesuaikan jika ada logic redirect terpusat)
        if (req.session.user.peran === "ADMIN" || req.session.user.peran === "SUPERADMINTPM") {
            return res.redirect("/dashboardAdmin");
        }
        return res.redirect("/home");
    }

    // Ambil data anggota dari session (diset saat login) 
    // atau query ulang jika perlu robustness
    const anggotaList = req.session.anggotaTim || [];

    res.render("pilih-anggota", {
        title: "Pilih Anggota Penilai",
        user: req.session.user,
        anggotaList: anggotaList,
        error: null
    });
};

exports.postPilihAnggota = (req, res) => {
    const { anggotaId } = req.body;

    if (!anggotaId) {
        return res.render("pilih-anggota", {
            title: "Pilih Anggota Penilai",
            user: req.session.user,
            anggotaList: req.session.anggotaTim || [],
            error: "Silakan pilih anggota terlebih dahulu"
        });
    }

    // Cari anggota di session untuk validasi
    const selected = (req.session.anggotaTim || []).find(a => String(a.id) === String(anggotaId));

    if (!selected) {
        return res.render("pilih-anggota", {
            title: "Pilih Anggota Penilai",
            user: req.session.user,
            anggotaList: req.session.anggotaTim || [],
            error: "Anggota tidak valid"
        });
    }

    // Simpan anggota aktif di session
    req.session.anggotaAktif = selected;

    // Lanjut ke halaman home/dashboard
    return res.redirect("/home");
};
