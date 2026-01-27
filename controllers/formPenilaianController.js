const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Menampilkan Form Penilaian
exports.getFormPenilaian = async (req, res) => {
    try {
        const kantorId = req.query.kantor;
        // Jika tidak ada parameter kantor, redirect ke halaman list penilaian atau dashboard
        if (!kantorId) return res.redirect('/penilaian');

        const user = req.session.user;
        if (!user) return res.redirect('/login');

        // Ambil anggota yang sedang aktif (Login as member context)
        const anggotaAktif = req.session.anggotaAktif;

        // Tentukan apakah user yang login adalah TIM PENILAI
        // Sesuai schema: enum PeranPengguna { SUPERADMINTPM, ADMIN, TIMPENILAI }
        const isTimPenilai = user.peran === 'TIMPENILAI';

        // Ambil data kantor yang sedang dipilih & daftar kantor untuk dropdown "Ganti Kantor"
        const [kantor, rawKantorList] = await Promise.all([
            // 1. Ambil detail kantor yang sedang dipilih
            prisma.kantor.findUnique({ where: { id: parseInt(kantorId) } }),

            // 2. Ambil daftar kantor untuk dropdown
            isTimPenilai
                ? prisma.penugasanKantorAkun.findMany({ // Jika TIMPENILAI, ambil dari penugasan
                    where: {
                        akunEmail: user.email, // Filter berdasarkan email tim yang login
                        statusAktif: true,
                        kantor: { statusAktif: true },
                        periode: { statusAktif: true }
                    },
                    include: { kantor: true },
                    orderBy: { kantor: { nama: "asc" } },
                })
                : prisma.kantor.findMany({ // Jika ADMIN, ambil semua kantor
                    where: { statusAktif: true },
                    orderBy: { nama: "asc" }
                })
        ]);

        // Mapping hasil query agar formatnya seragam (id, nama) untuk frontend
        const kantorList = Array.isArray(rawKantorList)
            ? (isTimPenilai
                ? rawKantorList.map((p) => ({ id: p.kantor.id, nama: p.kantor.nama }))
                : rawKantorList.map((k) => ({ id: k.id, nama: k.nama })))
            : [];

        // Ambil Existing Data (Nilai yang sudah diisi)
        // Jika ada query param periode, gunakan itu. Jika tidak, cari yang aktif.
        let periodeId = req.query.periode ? parseInt(req.query.periode) : null;
        let periode;

        if (periodeId) {
            periode = await prisma.periodePenilaian.findUnique({
                where: { id: periodeId }
            });
        }

        // Fallback jika belum ketemu atau tidak ada param
        if (!periode) {
            periode = await prisma.periodePenilaian.findFirst({
                where: { statusAktif: true },
                orderBy: { dibuatPada: 'desc' }
            });
        }

        let existingDetails = [];
        if (periode) {
            // Gunakan ID anggota yang aktif agar data tidak tertimpa antar anggota tim
            const currentAnggotaId = anggotaAktif ? anggotaAktif.id : null;

            const existingPenilaian = await prisma.penilaian.findFirst({
                where: {
                    periodeId: periode.id,
                    kantorId: parseInt(kantorId),
                    akunEmail: user.email,
                    anggotaId: currentAnggotaId // Menggunakan ID anggota spesifik
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
            kantorList: kantorList, // Daftar kantor yang sudah difilter
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

        // Ambil anggota yang sedang aktif untuk disimpan ID-nya
        const anggotaAktif = req.session.anggotaAktif;
        const currentAnggotaId = anggotaAktif ? anggotaAktif.id : null;


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

        // Logic "save-item" (Simpan per item/draft)
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
                // Cari atau Buat Header Penilaian
                let penilaianHeader = await tx.penilaian.findFirst({
                    where: {
                        periodeId: periode.id,
                        kantorId: parseInt(kantor_id), // Pastikan tersimpan sesuai kantor yang dipilih
                        akunEmail: user.email,
                        anggotaId: currentAnggotaId // Cek berdasarkan anggota spesifik
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
                            konfigurasiBobotId: konfigurasiBobot?.id,
                        }
                    });
                }

                // Upsert Detail (Simpan Nilai)
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
                        bobotSaatDinilai: bobot
                    },
                    create: {
                        penilaianId: penilaianHeader.id,
                        kategori: item.pKode,
                        kunciKriteria: item.kriteriaKey,
                        nilai: parseFloat(item.nilai),
                        catatan: item.catatan || null,
                        bobotSaatDinilai: bobot
                    },
                    select: { id: true }
                });
            });

            return res.json({ success: true, message: "Tersimpan" });
        }

        // Logic "submit" (Simpan semua & Finalisasi)
        await prisma.$transaction(async (tx) => {
            // A. Create/Update Header Penilaian
            let penilaianHeader = await tx.penilaian.findFirst({
                where: {
                    periodeId: periode.id,
                    kantorId: parseInt(kantor_id),
                    akunEmail: user.email,
                    anggotaId: currentAnggotaId
                }
            });

            const dataHeader = {
                status: action === 'submit' ? 'SUBMIT' : 'DRAFT',
                tanggalSubmit: action === 'submit' ? new Date() : null,
                catatanRekomendasi: req.body.rekomendasi || null, // Simpan rekomendasi

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
                        anggotaId: currentAnggotaId,
                        status: action === 'submit' ? 'SUBMIT' : 'DRAFT',
                        tanggalSubmit: action === 'submit' ? new Date() : null,
                        catatanRekomendasi: req.body.rekomendasi || null, // Simpan rekomendasi saat create juga
                        konfigurasiBobotId: konfigurasiBobot?.id
                    }
                });
            }

            // B. Simpan Detail (DetailPenilaian)
            const files = Array.isArray(req.files) ? req.files : [];
            const filesByField = files.reduce((map, f) => {
                const list = map.get(f.fieldname) || [];
                list.push(f);
                map.set(f.fieldname, list);
                return map;
            }, new Map());


            // Define default author (fallback)
            const namaPenginput = anggotaAktif ? anggotaAktif.nama : (user.nama || user.email);

            for (const item of assessments) {

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

                // Determine effective author for this item
                // Use explicit author from frontend if available, otherwise use current submitter
                const effectiveAuthor = item.namaAnggota || namaPenginput;

                const detail = await tx.detailPenilaian.upsert({
                    where: {
                        penilaianId_kategori_kunciKriteria: {
                            penilaianId: penilaianHeader.id,
                            kategori: item.pKode,
                            kunciKriteria: item.kriteriaKey
                        }
                    },
                    update: {
                        nilai: parseFloat(item.nilai),
                        catatan: item.catatan,
                        bobotSaatDinilai: bobot,
                        namaAnggota: effectiveAuthor
                    },
                    create: {
                        penilaianId: penilaianHeader.id,
                        kategori: item.pKode,
                        kunciKriteria: item.kriteriaKey,
                        nilai: parseFloat(item.nilai),
                        catatan: item.catatan,
                        bobotSaatDinilai: bobot,
                        namaAnggota: effectiveAuthor
                    },
                    select: { id: true }
                });

                // C. Simpan Foto jika ada
                const filesForItem = filesByField.get(`foto_${item.kriteriaId}`) || [];
                for (const file of filesForItem) {
                    await tx.fotoDetailPenilaian.create({
                        data: {
                            detailId: detail.id,
                            urlFile: `/uploads/penilaian/${file.filename}`,
                            namaFile: file.originalname,
                            tipeFile: file.mimetype,
                            ukuranFile: file.size,
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