const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.index = async (req, res) => {
    try {
        const periodes = await prisma.periodePenilaian.findMany({
            orderBy: [
                { tahun: 'desc' },
                { semester: 'desc' }
            ]
        });

        res.render('admin/kelolaPeriode', {
            title: 'Kelola Periode Penilaian',
            user: req.session.user || 'ADMIN',
            periodes
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading page: ' + error.message);
    }
};

exports.tambah = async (req, res) => {
    try {
        const { tahun, semester } = req.body;

        // Validasi sederhana
        if (!tahun || !semester) {
            return res.status(400).json({ message: 'Tahun dan Semester harus diisi!' });
        }

        const t = parseInt(tahun);
        const s = parseInt(semester);
        const nama = `${t} Semester ${s}`;

        // Cek duplikat
        const exist = await prisma.periodePenilaian.findUnique({
            where: {
                tahun_semester: { tahun: t, semester: s }
            }
        });

        if (exist) {
            return res.status(400).json({ message: 'Periode tersebut sudah ada!' });
        }

        await prisma.periodePenilaian.create({
            data: {
                tahun: t,
                semester: s,
                namaPeriode: nama,
                statusAktif: false, // Default tidak aktif
                dibuatOlehEmail: req.session.user?.email
            }
        });

        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

exports.aktifkan = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Nonaktifkan semua periode
        await prisma.periodePenilaian.updateMany({
            where: { statusAktif: true },
            data: { statusAktif: false }
        });

        // 2. Aktifkan yang dipilih
        await prisma.periodePenilaian.update({
            where: { id: parseInt(id) },
            data: { statusAktif: true }
        });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

exports.hapus = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.periodePenilaian.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal menghapus (mungkin ada data terkait)." });
    }
};
