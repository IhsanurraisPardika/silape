const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Menampilkan Form Penilaian
exports.getFormPenilaian = async (req, res) => {
    try {
        const kantorId = req.query.kantor;
        if (!kantorId) return res.redirect('/penilaian');
        const user = req.session.user;

        // Ambil data kantor dan daftar kantor untuk dropdown ganti kantor
        const [kantor, kantorList] = await Promise.all([
            prisma.kantor.findUnique({ where: { id: parseInt(kantorId) } }),
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
            kantorList: Array.isArray(kantorList)
              ? (user?.timId
                  ? kantorList.map((p) => ({ id: p.kantor.id, nama: p.kantor.nama }))
                  : kantorList.map((k) => ({ id: k.id, nama: k.nama })))
              : [],
            user
        });
    } catch (error) {
        console.error("Error loading form:", error);
        res.status(500).send("Gagal memuat form penilaian.");
    }
};

// Menyimpan Inputan ke Database
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
        if (!kantor_id) return res.status(400).json({ success: false, message: "Kantor ID wajib diisi" });

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

            // B. Simpan Detail (DetailPenilaian)
            const files = Array.isArray(req.files) ? req.files : [];
            const fileByField = new Map(files.map((f) => [f.fieldname, f]));

            for (const item of assessments) {
                const detail = await tx.detailPenilaian.upsert({
                    where: {
                        penilaianId_kriteriaKey: {
                            penilaianId: penilaianHeader.id,
                            kriteriaKey: item.kriteriaKey // Sesuai schema: "P1-01"
                        }
                    },
                    update: {
                        nilai: parseFloat(item.nilai),
                        catatan: item.catatan,
                        pKode: item.pKode, // Enum P1, P2, dll
                        namaKriteria: item.namaKriteria,
                        bobotSaatDinilai: 0 
                    },
                    create: {
                        penilaianId: penilaianHeader.id,
                        kriteriaKey: item.kriteriaKey,
                        pKode: item.pKode,
                        namaKriteria: item.namaKriteria,
                        nilai: parseFloat(item.nilai),
                        catatan: item.catatan,
                        bobotSaatDinilai: 0
                    }
                });

                // C. Simpan Foto jika ada
                const file = fileByField.get(`foto_${item.kriteriaId}`);
                if (file) {
                    await tx.fotoDetailPenilaian.create({
                        data: {
                            detailId: detail.id,
                            urlFile: `/uploads/penilaian/${file.filename}`,
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

        res.json({ success: true, message: "Penilaian berhasil disimpan!", redirect: '/penilaian' });
    } catch (error) {
        console.error("Save Error:", error);
        res.status(500).json({ success: false, message: "Gagal menyimpan data ke database." });
    }
};