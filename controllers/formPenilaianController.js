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
        const assessments = JSON.parse(req.body.assessments || "[]");
        const user = req.session.user;

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

        // Logic "save-item" (Simpan per item/draft)
        if (action === 'save-item') {
            const item = assessments[0]; // Expect single item in array
            if (!item) return res.status(400).json({ success: false, message: "Data item kosong" });

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
                        data: { tanggalMulaiInput: new Date() } // Touch timestamp
                    });
                } else {
                    penilaianHeader = await tx.penilaian.create({
                        data: {
                            periodeId: periode.id,
                            kantorId: parseInt(kantor_id),
                            akunEmail: user.email,
                            anggotaId: currentAnggotaId, // Simpan ID anggota
                            status: 'DRAFT'
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
                tanggalMulaiInput: new Date()
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
                    }
                });
            }

            // B. Simpan Detail (DetailPenilaian)
            const files = Array.isArray(req.files) ? req.files : [];
            const fileByField = new Map(files.map((f) => [f.fieldname, f]));

            for (const item of assessments) {
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
                        bobotSaatDinilai: 0,
                        namaAnggota: anggotaAktif ? anggotaAktif.nama : user.nama
                    },
                    create: {
                        penilaianId: penilaianHeader.id,
                        kategori: item.pKode,
                        kunciKriteria: item.kriteriaKey,
                        nilai: parseFloat(item.nilai),
                        catatan: item.catatan,
                        bobotSaatDinilai: 0,
                        namaAnggota: anggotaAktif ? anggotaAktif.nama : user.nama
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