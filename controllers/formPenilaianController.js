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
        let assessments = JSON.parse(req.body.assessments || "[]");
        const user = req.session.user;

        // 1. Sort Assessments by ID (1-16) to ensure DB insertion order
        assessments.sort((a, b) => {
            const idA = parseInt(a.kriteriaId) || 0;
            const idB = parseInt(b.kriteriaId) || 0;
            return idA - idB;
        });

        // 2. Mapping from Frontend Absolute Keys to Backend ID Keys (Relative per Category)
        const criteriaMapping = {
            "P1-1": "P1-1", "P1-2": "P1-2", "P1-3": "P1-3",
            "P2-4": "P2-1", "P2-5": "P2-2", "P2-6": "P2-3", "P2-7": "P2-4",
            "P3-8": "P3-1", "P3-9": "P3-2", "P3-10": "P3-3",
            "P4-11": "P4-1", "P4-12": "P4-2", "P4-13": "P4-3",
            "P5-14": "P5-1", "P5-15": "P5-2", "P5-16": "P5-3"
        };

        // Cari periode aktif
        const periode = await prisma.periodePenilaian.findFirst({
            where: { statusAktif: true },
            orderBy: { dibuatPada: 'desc' }
        });

        if (!periode) return res.status(400).json({ success: false, message: "Periode aktif tidak ditemukan" });
        if (!kantor_id) return res.status(400).json({ success: false, message: "Kantor ID wajib diisi" });

        // Fetch Active Weights Configuration
        const konfigurasiBobot = await prisma.konfigurasiBobot.findFirst({
            where: {
                periodeId: periode.id,
                statusAktif: true
            },
            include: {
                bobotKriteria: true
            }
        });

        const weightMap = new Map();
        if (konfigurasiBobot && konfigurasiBobot.bobotKriteria) {
            konfigurasiBobot.bobotKriteria.forEach(b => {
                // Key format: CATEGORY-KEY (e.g., P1-P1-1)
                weightMap.set(`${b.kategori}-${b.kunciKriteria}`, b.bobot);
            });
        }

        // Logic "save-item" (Single Save)
        if (action === 'save-item') {
            const item = assessments[0]; // Expect single item in array
            if (!item) return res.status(400).json({ success: false, message: "Data item kosong" });

            // Lookup logic: Try direct match first, then mapped match
            let bobot = 0;
            const directKey = `${item.pKode}-${item.kriteriaKey}`;
            const mappedKeySuffix = criteriaMapping[item.kriteriaKey]; // e.g. "P2-1"
            const mappedKey = mappedKeySuffix ? `${item.pKode}-${mappedKeySuffix}` : null;

            if (weightMap.has(directKey)) {
                bobot = weightMap.get(directKey);
            } else if (mappedKey && weightMap.has(mappedKey)) {
                bobot = weightMap.get(mappedKey);
            }

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
                        data: {
                            tanggalMulaiInput: new Date(),
                            // Update link to config bobot if not set? Optional but good practice
                            konfigurasiBobotId: konfigurasiBobot?.id
                        }
                    });
                } else {
                    penilaianHeader = await tx.penilaian.create({
                        data: {
                            periodeId: periode.id,
                            kantorId: parseInt(kantor_id),
                            akunEmail: user.email,
                            anggotaId: null,
                            status: 'DRAFT',
                            konfigurasiBobotId: konfigurasiBobot?.id
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
                        namaAnggota: anggotaAktif ? anggotaAktif.nama : user.nama,
                        bobotSaatDinilai: bobot // Update bobot too if it changes? Or keep original? Usually update to current active.
                    },
                    create: {
                        penilaianId: penilaianHeader.id,
                        kategori: item.pKode,
                        kunciKriteria: item.kriteriaKey,
                        nilai: parseFloat(item.nilai),
                        catatan: item.catatan || null,
                        bobotSaatDinilai: bobot,
                        namaAnggota: anggotaAktif ? anggotaAktif.nama : user.nama
                    }
                });
            });

            return res.json({ success: true, message: "Tersimpan" });
        }

        // Logic "submit" (Full Submit)
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
                tanggalMulaiInput: new Date(), // Update timestamp aktivitas terakhir,
                konfigurasiBobotId: konfigurasiBobot?.id
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
                        konfigurasiBobotId: konfigurasiBobot?.id
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

                // Lookup logic: Try direct match first, then mapped match
                let bobot = 0;
                const directKey = `${item.pKode}-${item.kriteriaKey}`;
                const mappedKeySuffix = criteriaMapping[item.kriteriaKey]; // e.g. "P2-1"
                const mappedKey = mappedKeySuffix ? `${item.pKode}-${mappedKeySuffix}` : null;

                if (weightMap.has(directKey)) {
                    bobot = weightMap.get(directKey);
                } else if (mappedKey && weightMap.has(mappedKey)) {
                    bobot = weightMap.get(mappedKey);
                }

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
                        bobotSaatDinilai: bobot,
                        namaAnggota: req.session.anggotaAktif ? req.session.anggotaAktif.nama : user.nama
                    },
                    create: {
                        penilaianId: penilaianHeader.id,
                        kategori: item.pKode,
                        kunciKriteria: item.kriteriaKey,
                        nilai: parseFloat(item.nilai),
                        catatan: item.catatan,
                        bobotSaatDinilai: bobot,
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