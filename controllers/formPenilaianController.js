const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Data Kriteria 5P Statis sesuai Enum PKode di Schema [cite: 1]
const KATEGORI_5P_DATA = [
    {
        nama: "P1 - Pemilahan",
        kode: "P1",
        kriteria: [
            { key: "P1-01", nama: "Memisahkan barang yang diperlukan dan tidak diperlukan", nomor: 1 },
            { key: "P1-02", nama: "Menyingkirkan barang yang tidak diperlukan", nomor: 2 }
        ]
    },
    {
        nama: "P2 - Penataan",
        kode: "P2",
        kriteria: [
            { key: "P2-01", nama: "Setiap barang memiliki tempat yang jelas", nomor: 1 },
            { key: "P2-02", nama: "Penyimpanan barang mudah ditemukan dan diambil", nomor: 2 }
        ]
    },
    {
        nama: "P3 - Pembersihan",
        kode: "P3",
        kriteria: [
            { key: "P3-01", nama: "Membersihkan tempat kerja dari debu dan kotoran", nomor: 1 }
        ]
    },
    {
        nama: "P4 - Pemantapan",
        kode: "P4",
        kriteria: [
            { key: "P4-01", nama: "Mempertahankan kondisi 3P sebelumnya", nomor: 1 }
        ]
    },
    {
        nama: "P5 - Pembiasaan",
        kode: "P5",
        kriteria: [
            { key: "P5-01", nama: "Disiplin terhadap standar yang ditetapkan", nomor: 1 }
        ]
    }
];

exports.getFormPenilaian = async (req, res) => {
    try {
        const kantorId = req.query.kantor;
        if (!kantorId) return res.redirect('/penilaian');
        const user = req.session.user;

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
            kategori5P: KATEGORI_5P_DATA, // Menggunakan data statis
            kantorList: Array.isArray(kantorList)
              ? (user?.timId
                  ? kantorList.map((p) => ({ id: p.kantor.id, nama: p.kantor.nama }))
                  : kantorList.map((k) => ({ id: k.id, nama: k.nama })))
              : [],
            user
        });
    } catch (error) {
        console.error("Error getFormPenilaian:", error);
        res.status(500).send("Error loading form");
    }
};

exports.postFormPenilaian = async (req, res) => {
    try {
        const { kantor_id, action } = req.body;
        const assessments = JSON.parse(req.body.assessments || "[]");
        const user = req.session.user;

        const periode = await prisma.periodePenilaian.findFirst({
            where: { statusAktif: true },
            orderBy: { dibuatPada: 'desc' }
        });

        if (!periode) return res.status(400).json({ success: false, message: "Periode aktif tidak ditemukan" });

        await prisma.$transaction(async (tx) => {
            // Upsert Header [cite: 20, 21]
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

            const files = Array.isArray(req.files) ? req.files : [];
            const fileByField = new Map(files.map((f) => [f.fieldname, f]));

            for (const item of assessments) {
                // Upsert Detail sesuai Unique Constraint [penilaianId, kriteriaKey] 
                const detail = await tx.detailPenilaian.upsert({
                    where: {
                        penilaianId_kriteriaKey: {
                            penilaianId: penilaianHeader.id,
                            kriteriaKey: item.kriteriaKey
                        }
                    },
                    update: {
                        pKode: item.pKode,
                        nilai: parseFloat(item.nilai || 0),
                        catatan: item.catatan,
                        bobotSaatDinilai: 0
                    },
                    create: {
                        penilaianId: penilaianHeader.id,
                        pKode: item.pKode,
                        kriteriaKey: item.kriteriaKey,
                        namaKriteria: item.namaKriteria,
                        nilai: parseFloat(item.nilai || 0),
                        catatan: item.catatan,
                        bobotSaatDinilai: 0
                    }
                });

                const file = fileByField.get(`foto_${item.kriteriaKey}`);
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
        });

        res.json({ success: true, message: "Data berhasil disimpan", redirect: '/penilaian' });
    } catch (error) {
        console.error("Error postFormPenilaian:", error);
        res.status(500).json({ success: false, message: "Gagal menyimpan data" });
    }
};