const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Menampilkan Form Penilaian
exports.getFormPenilaian = async (req, res) => {
    try {
        const kantorId = req.query.kantor;
        if (!kantorId) return res.redirect('/penilaian');
        const user = req.session.user;

        // 1. Ambil data kantor dan kriteria 5P lengkap
        const [kantor, kategori5P, kantorList] = await Promise.all([
            prisma.kantor.findUnique({ where: { id: parseInt(kantorId) } }),
            prisma.kategori5P.findMany({
                include: { kriteria: { where: { statusAktif: true }, orderBy: { nomor: 'asc' } } },
                orderBy: { urutan: 'asc' }
            }),
            user?.timId
              ? prisma.penugasanKantorTim.findMany({
                  where: {
                    timId: user.timId,
                    statusAktif: true,
                    kantor: { statusAktif: true },
                  },
                  include: { kantor: true },
                  orderBy: { kantorId: "asc" },
                })
              : prisma.kantor.findMany({ where: { statusAktif: true }, orderBy: { nama: "asc" } })
        ]);

        res.render('formPenilaian', {
            title: 'Form Penilaian 5P',
            kantor: kantor,
            kategori5P: kategori5P,
            kantorList: Array.isArray(kantorList)
              ? (user?.timId
                  ? kantorList.map((p) => ({ id: p.kantor.id, nama: p.kantor.nama }))
                  : kantorList.map((k) => ({ id: k.id, nama: k.nama })))
              : [],
            user
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading form");
    }
};

// Menyimpan Inputan (Nilai, Catatan, Foto) ke Database
exports.postFormPenilaian = async (req, res) => {
    try {
        const { kantor_id, action } = req.body;
        const assessments = JSON.parse(req.body.assessments || "[]");
        const user = req.session.user;

        // Cari periode aktif
        const periode = await prisma.periodePenilaian.findFirst({
            where: { statusAktif: true },
            orderBy: { dibuatPada: 'desc' }
        });

        if (!periode) return res.status(400).json({ success: false, message: "Periode aktif tidak ditemukan" });
        if (!kantor_id) return res.status(400).json({ success: false, message: "kantor_id wajib" });
        if (!Array.isArray(assessments)) return res.status(400).json({ success: false, message: "assessments tidak valid" });

        // Gunakan Transaction untuk menyimpan Header dan Detail secara atomik
        const hasil = await prisma.$transaction(async (tx) => {
            // A. Create/Update Header PenilaianIndividu
            const penilaianHeader = await tx.penilaianIndividu.upsert({
                where: {
                    periodeId_kantorId_timId_penilaiEmail: {
                        periodeId: periode.id,
                        kantorId: parseInt(kantor_id),
                        timId: user.timId,
                        penilaiEmail: user.email
                    }
                },
                update: {
                    status: action === 'submit' ? 'SUBMIT' : 'DRAFT',
                    tanggalSubmit: action === 'submit' ? new Date() : null
                },
                create: {
                    periodeId: periode.id,
                    kantorId: parseInt(kantor_id),
                    timId: user.timId,
                    penilaiEmail: user.email,
                    status: action === 'submit' ? 'SUBMIT' : 'DRAFT'
                }
            });

            // B. Simpan Detail Nilai, Catatan, dan Foto per Kriteria
            const files = Array.isArray(req.files) ? req.files : [];
            const fileByField = new Map(files.map((f) => [f.fieldname, f]));

            for (const item of assessments) {
                const detail = await tx.detailPenilaian.upsert({
                    where: {
                        penilaianId_kriteriaId: {
                            penilaianId: penilaianHeader.id,
                            kriteriaId: parseInt(item.kriteriaId)
                        }
                    },
                    update: {
                        nilai: parseFloat(item.nilai),
                        catatan: item.catatan,
                        bobotSaatDinilai: 0 // Logika bobot bisa ditambahkan di sini
                    },
                    create: {
                        penilaianId: penilaianHeader.id,
                        kriteriaId: parseInt(item.kriteriaId),
                        nilai: parseFloat(item.nilai),
                        catatan: item.catatan,
                        bobotSaatDinilai: 0
                    }
                });

                // C. Simpan Foto jika ada file upload untuk kriteria ini
                const file = fileByField.get(`foto_${item.kriteriaId}`);
                if (file) {
                    const urlFile = `/uploads/penilaian/${file.filename}`;
                    await tx.fotoDetailPenilaian.create({
                        data: {
                            detailId: detail.id,
                            urlFile,
                            namaFile: file.originalname,
                            tipeFile: file.mimetype,
                            ukuranFile: file.size,
                            diunggahOlehEmail: user.email
                        }
                    });
                }
            }
            return penilaianHeader;
        });

        res.json({ success: true, message: "Data berhasil disimpan", redirect: '/penilaian' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Gagal menyimpan data" });
    }
};