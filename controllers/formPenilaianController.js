const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

function toInt(value) {
    const n = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(n) ? n : null;
}

function parseAssessmentsPayload(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim() !== '') {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function normalizeAssessmentItem(item) {
    if (!item || typeof item !== 'object') return null;

    const kriteriaId = toInt(item.kriteriaId);
    const pKodeRaw = typeof item.pKode === 'string' ? item.pKode.trim() : '';
    const kriteriaKeyRaw = typeof item.kriteriaKey === 'string' ? item.kriteriaKey.trim() : '';

    // Derive pKode/key if one of them is missing.
    const derivedPKode = (kriteriaKeyRaw.includes('-') ? kriteriaKeyRaw.split('-')[0] : '') || pKodeRaw;
    const derivedKey = kriteriaKeyRaw || (derivedPKode && kriteriaId ? `${derivedPKode}-${kriteriaId}` : '');

    // Normalize catatan/namaAnggota to strings/null
    const catatan = (typeof item.catatan === 'string') ? item.catatan : (item.catatan == null ? null : String(item.catatan));
    const namaAnggota = (typeof item.namaAnggota === 'string') ? item.namaAnggota : (item.namaAnggota == null ? null : String(item.namaAnggota));

    // Normalize nilai: allow numbers or numeric strings
    const nilaiNum = (typeof item.nilai === 'number') ? item.nilai : Number(item.nilai);

    return {
        kriteriaId: kriteriaId != null ? String(kriteriaId) : (typeof item.kriteriaId === 'string' ? item.kriteriaId : null),
        kriteriaKey: derivedKey,
        pKode: derivedPKode,
        nilaiNum,
        catatan,
        namaAnggota,
        namaKriteria: (typeof item.namaKriteria === 'string') ? item.namaKriteria : null,
    };
}

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
                        akunUsername: user.username, // Filter berdasarkan email tim yang login
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
        let catatanRekomendasi = "";

        if (periode) {
            // Gunakan ID anggota yang aktif agar data tidak tertimpa antar anggota tim
            const currentAnggotaId = anggotaAktif ? anggotaAktif.id : null;

            const existingPenilaian = await prisma.penilaian.findFirst({
                where: {
                    periodeId: periode.id,
                    kantorId: parseInt(kantorId),
                    akunUsername: user.username,
                    anggotaId: currentAnggotaId // Menggunakan ID anggota spesifik
                },
                include: {
                    detail: true
                }
            });
            if (existingPenilaian) {
                if (existingPenilaian.detail) {
                    existingDetails = existingPenilaian.detail;
                }
                catatanRekomendasi = existingPenilaian.catatanRekomendasi || "";
            }
        }

        res.render('formPenilaian', {
            title: 'Form Penilaian 5P',
            kantor: kantor,
            kantorList: kantorList, // Daftar kantor yang sudah difilter
            user,
            anggotaAktif,
            existingDetails,
            catatanRekomendasi // Pass recommendation to view
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
        const user = req.session.user;
        if (!user) return res.status(401).json({ success: false, message: "Sesi login berakhir. Silakan login ulang." });

        const kantorIdInt = toInt(kantor_id);
        const rawAssessments = parseAssessmentsPayload(req.body.assessments);

        // Normalize and drop invalid objects early.
        let assessments = rawAssessments
            .map(normalizeAssessmentItem)
            .filter(Boolean);

        // 1. Sort Assessments by ID (1-16) to ensure DB insertion order
        assessments.sort((a, b) => {
            const idA = toInt(a.kriteriaId) || 0;
            const idB = toInt(b.kriteriaId) || 0;
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
        if (!kantorIdInt) return res.status(400).json({ success: false, message: "Kantor ID wajib diisi" });


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
            const item = assessments[0]; // Expect single item in array OR empty if just saving recommendation
            const rekomendasi = req.body.rekomendasi;

            if (!item && typeof rekomendasi === 'undefined') {
                return res.status(400).json({ success: false, message: "Data item atau rekomendasi kosong" });
            }

            // Lookup logic: Try direct match first, then mapped match (Only if item exists)
            let bobot = new Prisma.Decimal(0);
            let keyToSave = "";
            if (item) {
                const originalKey = item.kriteriaKey; // e.g. P2-4
                if (!originalKey || typeof originalKey !== 'string') {
                    return res.status(422).json({ success: false, message: "Kriteria tidak valid (kunci kriteria kosong)." });
                }

                keyToSave = originalKey;
                if (criteriaMapping[originalKey]) {
                    keyToSave = criteriaMapping[originalKey];
                }

                // Validate nilai
                if (!Number.isFinite(item.nilaiNum)) {
                    return res.status(422).json({ success: false, message: `Nilai tidak valid untuk ${originalKey}.` });
                }

                const directKey = `${item.pKode}-${originalKey}`;
                const mappedKeySuffix = criteriaMapping[originalKey];
                const mappedKey = mappedKeySuffix ? `${item.pKode}-${mappedKeySuffix}` : null;

                if (weightMap.has(directKey)) {
                    bobot = weightMap.get(directKey);
                } else if (mappedKey && weightMap.has(mappedKey)) {
                    bobot = weightMap.get(mappedKey);
                }
            }

            await prisma.$transaction(async (tx) => {
                // Cari atau Buat Header Penilaian
                let penilaianHeader = await tx.penilaian.findFirst({
                    where: {
                        periodeId: periode.id,
                        kantorId: kantorIdInt, // Pastikan tersimpan sesuai kantor yang dipilih
                        akunUsername: user.username,
                        anggotaId: currentAnggotaId // Cek berdasarkan anggota spesifik
                    }
                });

                const headerData = {
                    tanggalMulaiInput: new Date(),
                    konfigurasiBobotId: konfigurasiBobot?.id
                };

                // Jika ada rekomendasi yang dikirim, update juga
                if (typeof rekomendasi !== 'undefined') {
                    headerData.catatanRekomendasi = rekomendasi;
                }

                if (penilaianHeader) {
                    await tx.penilaian.update({
                        where: { id: penilaianHeader.id },
                        data: headerData
                    });
                } else {
                    penilaianHeader = await tx.penilaian.create({
                        data: {
                            periodeId: periode.id,
                            kantorId: kantorIdInt,
                            akunUsername: user.username,
                            anggotaId: currentAnggotaId,
                            status: 'DRAFT',
                            ...headerData
                        }
                    });
                }

                // Upsert Detail (Simpan Nilai) - Hanya jika ada item
                if (item) {
                    // Determine effective author for this item
                    const effectiveAuthor = item.namaAnggota || anggotaAktif?.nama || user.nama || user.username;

                    const kategoriEnum = item.pKode;
                    if (!kategoriEnum || !['P1', 'P2', 'P3', 'P4', 'P5'].includes(kategoriEnum)) {
                        throw new Error(`Kategori tidak valid: ${String(kategoriEnum)}`);
                    }

                    await tx.detailPenilaian.upsert({
                        where: {
                            penilaianId_kategori_kunciKriteria: {
                                penilaianId: penilaianHeader.id,
                                kategori: kategoriEnum,
                                kunciKriteria: keyToSave
                            }
                        },
                        update: {
                            nilai: item.nilaiNum,
                            catatan: item.catatan ? String(item.catatan) : null,
                            bobotSaatDinilai: bobot,
                            namaAnggota: effectiveAuthor
                        },
                        create: {
                            penilaianId: penilaianHeader.id,
                            kategori: kategoriEnum,
                            kunciKriteria: keyToSave,
                            nilai: item.nilaiNum,
                            catatan: item.catatan ? String(item.catatan) : null,
                            bobotSaatDinilai: bobot,
                            namaAnggota: effectiveAuthor
                        },
                        select: { id: true }
                    });
                }
            });

            return res.json({ success: true, message: "Tersimpan otomatis" });
        }

        // Logic "submit" (Simpan semua & Finalisasi)
        await prisma.$transaction(async (tx) => {
            // A. Create/Update Header Penilaian
            let penilaianHeader = await tx.penilaian.findFirst({
                where: {
                    periodeId: periode.id,
                    kantorId: kantorIdInt,
                    akunUsername: user.username,
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
                        kantorId: kantorIdInt,
                        akunUsername: user.username,
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
            const namaPenginput = anggotaAktif ? anggotaAktif.nama : (user.nama || user.username);

            for (const item of assessments) {
                if (!item.kriteriaKey || typeof item.kriteriaKey !== 'string') {
                    throw new Error('Kriteria tidak valid (kunci kriteria kosong).');
                }

                if (!item.pKode || !['P1', 'P2', 'P3', 'P4', 'P5'].includes(item.pKode)) {
                    throw new Error(`Kategori tidak valid: ${String(item.pKode)}`);
                }

                if (!Number.isFinite(item.nilaiNum)) {
                    throw new Error(`Nilai tidak valid untuk ${item.kriteriaKey}.`);
                }

                // Lookup logic: Try direct match first, then mapped match
                let bobot = new Prisma.Decimal(0);
                const originalKey = item.kriteriaKey;
                let keyToSave = originalKey;
                if (criteriaMapping[originalKey]) {
                    keyToSave = criteriaMapping[originalKey];
                }

                const directKey = `${item.pKode}-${originalKey}`;
                const mappedKeySuffix = criteriaMapping[originalKey];
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
                            kunciKriteria: keyToSave
                        }
                    },
                    update: {
                        nilai: item.nilaiNum,
                        catatan: item.catatan ? String(item.catatan) : null,
                        bobotSaatDinilai: bobot,
                        namaAnggota: effectiveAuthor
                    },
                    create: {
                        penilaianId: penilaianHeader.id,
                        kategori: item.pKode,
                        kunciKriteria: keyToSave,
                        nilai: item.nilaiNum,
                        catatan: item.catatan ? String(item.catatan) : null,
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