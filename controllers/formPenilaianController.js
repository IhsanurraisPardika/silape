const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Menampilkan Form Penilaian
exports.getFormPenilaian = async (req, res) => {
    try {
        const kantorId = req.query.kantor;
        if (!kantorId) return res.redirect('/penilaian');
        const user = req.session.user;
        if (!user) return res.redirect('/login');

        // Ambil anggota yang sedang aktif (Login as member context)
        const anggotaAktif = req.session.anggotaAktif;

        // Ambil data kantor dan daftar kantor untuk dropdown ganti kantor
        const [kantor, rawKantorList] = await Promise.all([
            prisma.kantor.findUnique({ where: { id: parseInt(kantorId) } }),
            user?.timId
                ? prisma.penugasanKantorAkun.findMany({
                    where: {
                        akunEmail: user.email,
                        statusAktif: true,
                        kantor: { statusAktif: true },
                        periode: { statusAktif: true }
                    },
                    include: { kantor: true },
                    orderBy: { kantor: { nama: "asc" } },
                })
                : prisma.kantor.findMany({ where: { statusAktif: true }, orderBy: { nama: "asc" } })
        ]);

        // Ambil Existing Data (Nilai yang sudah diisi)
        const periode = await prisma.periodePenilaian.findFirst({
            where: { statusAktif: true },
            orderBy: { dibuatPada: 'desc' }
        });

        let existingDetails = [];
        if (periode) {
            const existingPenilaian = await prisma.penilaian.findFirst({
                where: {
                    periodeId: periode.id,
                    kantorId: parseInt(kantorId),
                    akunEmail: user.email,
                    anggotaId: null
                },
                include: {
                    detail: true
                }
            });
            if (existingPenilaian && existingPenilaian.detail) {
                existingDetails = existingPenilaian.detail;
            }
        }

        res.render('formPenilaian', {
            title: 'Form Penilaian 5P',
            kantor: kantor,
            kantorList: Array.isArray(rawKantorList)
                ? (user?.timId
                    ? rawKantorList.map((p) => ({ id: p.kantor.id, nama: p.kantor.nama }))
                    : rawKantorList.map((k) => ({ id: k.id, nama: k.nama })))
                : [],
            user,
            anggotaAktif,
            existingDetails
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

        // Logic "save-item" (Single Save)
        if (action === 'save-item') {
            const item = assessments[0]; // Expect single item in array
            if (!item) return res.status(400).json({ success: false, message: "Data item kosong" });

            await prisma.$transaction(async (tx) => {
                // Upsert Header (as Draft)
                let penilaianHeader = await tx.penilaian.findFirst({
                    where: {
                        periodeId: periode.id,
                        kantorId: parseInt(kantor_id),
                        akunEmail: user.email,
                        anggotaId: null
                    }
                });

                if (penilaianHeader) {
                    await tx.penilaian.update({
                        where: { id: penilaianHeader.id },
                        data: { tanggalMulaiInput: new Date() } // Touch timestamp
                    });
                } else {
                    penilaianHeader = await tx.penilaian.create({
                        data: {
                            periodeId: periode.id,
                            kantorId: parseInt(kantor_id),
                            akunEmail: user.email,
                            anggotaId: null,
                            status: 'DRAFT'
                        }
                    });
                }

                // Upsert Detail
                await tx.detailPenilaian.upsert({
                    where: {
                        penilaianId_kategori_kunciKriteria: {
                            penilaianId: penilaianHeader.id,
                            kategori: item.pKode,
                            kunciKriteria: item.kriteriaKey
                        }
                    },
                    update: {
                        nilai: parseFloat(item.nilai),
                        catatan: item.catatan || null,
                        namaAnggota: anggotaAktif ? anggotaAktif.nama : user.nama
                    },
                    create: {
                        penilaianId: penilaianHeader.id,
                        kategori: item.pKode,
                        kunciKriteria: item.kriteriaKey,
                        nilai: parseFloat(item.nilai),
                        catatan: item.catatan || null,
                        bobotSaatDinilai: 0,
                        namaAnggota: anggotaAktif ? anggotaAktif.nama : user.nama
                    }
                });
            });

            return res.json({ success: true, message: "Tersimpan" });
        }

        // Logic "submit" (Full Submit) / Old logic starts here
        await prisma.$transaction(async (tx) => {
            // A. Create/Update Header Penilaian
            // Cari dulu
            let penilaianHeader = await tx.penilaian.findFirst({
                where: {
                    periodeId: periode.id,
                    kantorId: parseInt(kantor_id),
                    akunEmail: user.email,
                    anggotaId: null
                }
            });

            const dataHeader = {
                status: action === 'submit' ? 'SUBMIT' : 'DRAFT',
                tanggalSubmit: action === 'submit' ? new Date() : null,
                tanggalMulaiInput: new Date() // Update timestamp aktivitas terakhir
            };

            if (penilaianHeader) {
                // Update
                penilaianHeader = await tx.penilaian.update({
                    where: { id: penilaianHeader.id },
                    data: dataHeader
                });
            } else {
                // Create
                penilaianHeader = await tx.penilaian.create({
                    data: {
                        periodeId: periode.id,
                        kantorId: parseInt(kantor_id),
                        akunEmail: user.email,
                        anggotaId: null, // Penting: Null
                        status: action === 'submit' ? 'SUBMIT' : 'DRAFT',
                        tanggalSubmit: action === 'submit' ? new Date() : null,
                    }
                });
            }

            // B. Simpan Detail (DetailPenilaian)
            const files = Array.isArray(req.files) ? req.files : [];
            const fileByField = new Map(files.map((f) => [f.fieldname, f]));

            // Pre-fetch konfigurasi bobot (opsional, jika ada logic)
            // Di sini kita update/create detail satu per satu
            for (const item of assessments) {
                // item.kriteriaKey = "P1-1" misalnya.
                // Kita perlu parse pKode dan id dari string jika diperlukan, tapi schema pakai String kriteriaKey?
                // Cek schema DetailPenilaian: kunciKriteria String @db.VarChar(50)
                // Jadi kita simpan "P1-1" langsung.

                const detail = await tx.detailPenilaian.upsert({
                    where: {
                        penilaianId_kategori_kunciKriteria: { // Map unique constraint
                            penilaianId: penilaianHeader.id,
                            kategori: item.pKode, // Enum KategoriPenilaian (P1, P2...)
                            kunciKriteria: item.kriteriaKey
                        }
                    },
                    update: {
                        nilai: parseFloat(item.nilai),
                        catatan: item.catatan,
                        bobotSaatDinilai: 0, // Placeholder jika belum ada tabel bobot aktif
                        namaAnggota: req.session.anggotaAktif ? req.session.anggotaAktif.nama : user.nama
                    },
                    create: {
                        penilaianId: penilaianHeader.id,
                        kategori: item.pKode,
                        kunciKriteria: item.kriteriaKey,
                        nilai: parseFloat(item.nilai),
                        catatan: item.catatan,
                        bobotSaatDinilai: 0,
                        namaAnggota: req.session.anggotaAktif ? req.session.anggotaAktif.nama : user.nama
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
                            // dihapus field diunggahOlehEmail karena tidak ada di schema FotoDetailPenilaian yang saya baca di step 19?
                            // Cek schema step 19: model FotoDetailPenilaian { ... tidak ada diunggahOlehEmail ... }
                            // Jadi hapus field itu.
                        }
                    });
                }
            }
        });

        res.json({ success: true, message: "Penilaian berhasil disimpan!", redirect: '/penilaian' });
    } catch (error) {
        console.error("Save Error:", error);
        res.status(500).json({ success: false, message: "Gagal menyimpan data ke database. " + error.message });
    }
};