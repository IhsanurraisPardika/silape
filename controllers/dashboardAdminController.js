const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.rekapKantor = async (req, res) => {
    try {
        const { periodeId, kantorId } = req.query;

        // 1. Ambil Semua Periode (untuk filter)
        const periodes = await prisma.periodePenilaian.findMany({
            orderBy: [{ tahun: 'desc' }, { semester: 'desc' }]
        });

        // 2. Tentukan Periode Target
        let periodeAktif; // Bisa aktif atau histori
        if (periodeId) {
            periodeAktif = await prisma.periodePenilaian.findUnique({
                where: { id: parseInt(periodeId) }
            });
        } else {
            periodeAktif = await prisma.periodePenilaian.findFirst({
                where: { statusAktif: true },
            });
        }

        // 3. Ambil Daftar Kantor (untuk filter)
        const kantorList = await prisma.kantor.findMany({
            where: { statusAktif: true }, // Atau hapus filter active jika ingin lihat histori kantor lama? (Opsional, user minta filter kantor & semester)
            orderBy: { nama: 'asc' },
        });

        const selectedKantorId = kantorId ? parseInt(kantorId) : null;
        let selectedKantor = null;
        let rekapData = { groupedData: {}, pAverages: {} };
        let headerColumns = []; // Daftar penilai (nama anggota)

        if (selectedKantorId && periodeAktif) {
            selectedKantor = kantorList.find((k) => k.id === selectedKantorId);

            // 3. Ambil Konfigurasi Bobot untuk Periode ini
            const konfigurasi = await prisma.konfigurasiBobot.findFirst({
                where: { periodeId: periodeAktif.id, statusAktif: true },
                include: {
                    bobotKriteria: true,
                },
            });

            // 3b. Mencari Anggota Tim yg Ada di Penugasan Kantor
            // Kita cari akunEmail tim yang ditugaskan ke kantor ini pada periode ini
            const penugasan = await prisma.penugasanKantorAkun.findFirst({
                where: {
                    periodeId: periodeAktif.id,
                    kantorId: selectedKantorId
                }
            });

            const assignedAkunUsername = penugasan?.akunUsername || null;

            // Jika ada penugasan, ambil semua anggota dari akun tim tersebut
            if (assignedAkunUsername) {
                const anggotaTimList = await prisma.anggotaTim.findMany({
                    where: {
                        akunUsername: assignedAkunUsername,
                        statusAktif: true
                    },
                    orderBy: { urutan: 'asc' }
                });

                // Masukkan nama semua anggota ke headerColumns
                anggotaTimList.forEach(agt => {
                    headerColumns.push(agt.nama);
                });
            }

            if (konfigurasi) {
                // 4. Ambil Semua Penilaian untuk Kantor & Periode ini (APPROVED only)
                const penilaianList = await prisma.penilaian.findMany({
                    where: {
                        periodeId: periodeAktif.id,
                        kantorId: selectedKantorId,
                        status: 'APPROVED',
                        ...(assignedAkunUsername ? { akunUsername: assignedAkunUsername } : {})
                    },
                    include: {
                        detail: true,
                        anggota: true,
                        akun: true,
                    },
                });

                // Cek apakah ada data yang belum diapprove (status SUBMIT)
                const pendingCount = await prisma.penilaian.count({
                    where: {
                        periodeId: periodeAktif.id,
                        kantorId: selectedKantorId,
                        status: 'SUBMIT',
                        ...(assignedAkunUsername ? { akunUsername: assignedAkunUsername } : {})
                    }
                });

                const hasUnapprovedData = pendingCount > 0;

                // Mapping Penilaian: Map [Nama Anggota] -> Object Penilaian
                const mapPenilaianByNama = {};
                penilaianList.forEach((p) => {
                    const nama = p.anggota ? p.anggota.nama : p.akun.nama;
                    mapPenilaianByNama[nama] = p;
                });

                // Fallback: jika headerColumns kosong (mis. belum ada anggota tim), ambil dari penilaian yang ada.
                if (headerColumns.length === 0 && penilaianList.length > 0) {
                    headerColumns = Array.from(new Set(
                        penilaianList
                            .map((p) => (p.anggota ? p.anggota.nama : p.akun?.nama))
                            .filter(Boolean)
                    ));
                }

                console.log("DEBUG REKAP KANTOR:");
                console.log("Kantor ID:", selectedKantorId);
                console.log("Has Unapproved:", hasUnapprovedData);
                console.log("Approved Found:", penilaianList.length);

                // 6. Struktur Data untuk Tabel
                const groupedData = {
                    P1: [], P2: [], P3: [], P4: [], P5: []
                };

                // Helper untuk mapping P1..P5
                konfigurasi.bobotKriteria.forEach((b) => {
                    const pKey = b.kategori; // P1, P2...
                    if (!groupedData[pKey]) groupedData[pKey] = [];

                    const configWeight = parseFloat(b.bobot);

                    // Row Data Template
                    const rowData = {
                        kunci: b.kunciKriteria,
                        configWeight: configWeight,
                        nilaiPerPenilai: {},
                        catatanPerPenilai: {},
                        totalNilai: 0,
                        jumlahPenilai: 0,
                        cumulativeWeight: 0
                    };

                    // Loop setiap kolom (setiap anggota tim yang HARUSNYA menilai)
                    headerColumns.forEach(nama => {
                        const penilaian = mapPenilaianByNama[nama];
                        let val = 0; // Default 0 jika tidak mengisi

                        if (penilaian) {
                            const detail = penilaian.detail.find(d => d.kunciKriteria === b.kunciKriteria);
                            if (detail) {
                                val = parseFloat(detail.nilai);
                                // Hitung rata-rata HANYA dari yang mengisi (value > 0 atau ada record)
                                rowData.totalNilai += val;
                                rowData.jumlahPenilai++;

                                // Bobot Historis Logic
                                // Jika detail punya bobotSaatDinilai, pakai itu. Jika tidak, fallback ke config.
                                const weightUsed = detail.bobotSaatDinilai ? parseFloat(detail.bobotSaatDinilai) : configWeight;
                                rowData.cumulativeWeight += weightUsed;

                                // Ambil catatan
                                rowData.catatanPerPenilai[nama] = detail.catatan || '-';
                            }
                        }
                        // Simpan nilai untuk ditampilkan (0 atau n)
                        rowData.nilaiPerPenilai[nama] = val;
                        // Jika tidak ada catatan (karena detail null), set '-'
                        if (!rowData.catatanPerPenilai[nama]) {
                            rowData.catatanPerPenilai[nama] = '-';
                        }
                    });

                    // Hitung Rata-rata Baris
                    // Formula: Total Nilai / Jumlah Yang Mengisi
                    rowData.rataRata = rowData.jumlahPenilai > 0
                        ? (rowData.totalNilai / rowData.jumlahPenilai).toFixed(2)
                        : 0;

                    // Hitung Kolom Bobot = Rata-rata * Rata-rata Bobot (atau Bobot Konfigurasi jika detail konsisten)
                    // Untuk akurasi historis: Weighted Score = (Sum(Nilai_i * Bobot_i) / N) ??
                    // Atau (AvgScore * AvgWeight)? 
                    // Sesuai user request: "data yg telah di approve tidak berubah mengikuti bobot baru".
                    // Artinya Weight yang digunakan adalah weight SAAT ITU.
                    // Jika ada 2 penilai dengan bobot beda (jarang terjadi tapi mungkin), rata-ratanya harus memperhitungkan itu.
                    // Namun tampilan tabel hanya punya 1 kolom "Bobot".
                    // Kita akan pakai Rata-rata Bobot dari penilai yg ada.

                    const avgWeight = rowData.jumlahPenilai > 0 ? (rowData.cumulativeWeight / rowData.jumlahPenilai) : configWeight;
                    rowData.bobot = (parseFloat(rowData.rataRata) * avgWeight).toFixed(2);

                    groupedData[pKey].push(rowData);
                });

                // Hitung Rata-rata P (Agregat) & Total Bobot
                const pAverages = {};
                const pTotalBobot = {}; // Total Weighted Score per P
                let totalSkorAkhir = 0; // Grand Total

                Object.keys(groupedData).forEach(pKey => {
                    const rows = groupedData[pKey];
                    if (rows.length > 0) {
                        const sumRataRata = rows.reduce((acc, row) => acc + parseFloat(row.rataRata), 0);
                        const sumBobot = rows.reduce((acc, row) => acc + parseFloat(row.bobot), 0);

                        pAverages[pKey] = (sumRataRata / rows.length).toFixed(2);
                        pTotalBobot[pKey] = sumBobot.toFixed(2);

                        totalSkorAkhir += sumBobot;
                    } else {
                        pAverages[pKey] = 0;
                        pTotalBobot[pKey] = 0;
                    }
                });

                rekapData = {
                    groupedData,
                    pAverages,
                    pTotalBobot,
                    totalSkorAkhir: totalSkorAkhir.toFixed(2)
                };
            }
        }

        res.render('admin/rekapKantor', {
            user: req.session.user,
            title: 'Rekap Kantor',
            kantorList,
            periodeAktif,
            periodes,
            selectedKantorId,
            selectedKantor,
            headerColumns,
            rekapData,
            hasUnapprovedData: typeof hasUnapprovedData !== 'undefined' ? hasUnapprovedData : false
        });

    } catch (error) {
        console.error('Error rekapKantor:', error);
        res.status(500).render('error', { title: 'Error Rekap Kantor', message: error.message || 'Terjadi kesalahan sistem' });
    }
};

exports.rekapKriteria = async (req, res) => {
    try {
        const { periodeId } = req.query;

        // 1. Ambil Periode
        let periodeTarget;
        if (periodeId) {
            periodeTarget = await prisma.periodePenilaian.findUnique({
                where: { id: parseInt(periodeId) }
            });
        } else {
            periodeTarget = await prisma.periodePenilaian.findFirst({
                where: { statusAktif: true },
                orderBy: [{ tahun: 'desc' }, { semester: 'desc' }, { diubahPada: 'desc' }]
            });
        }

        const periodeAktif = periodeTarget; // Keep variable name for template compatibility

        // 2. Ambil Config untuk Header Tabel (Daftar Kriteria)
        let criteriaList = [];
        if (periodeAktif) {
            const config = await prisma.konfigurasiBobot.findFirst({
                where: { periodeId: periodeAktif.id },
                include: { bobotKriteria: true },
                orderBy: { statusAktif: 'desc' }
            });

            if (config && config.bobotKriteria) {
                // Sort kriteria
                criteriaList = config.bobotKriteria.sort((a, b) => {
                    return a.kunciKriteria.localeCompare(b.kunciKriteria, undefined, { numeric: true });
                });
            }
        }

        // 3. Ambil Semua Periode (untuk filter)
        const periodes = await prisma.periodePenilaian.findMany({
            orderBy: [{ tahun: 'desc' }, { semester: 'desc' }]
        });

        let rekapList = [];

        if (periodeAktif) {
            // 3. Ambil Semua Penilaian APPROVED
            const assessments = await prisma.penilaian.findMany({
                where: {
                    periodeId: periodeAktif.id,
                    status: 'APPROVED'
                },
                include: {
                    kantor: true,
                    akun: true, // Untuk nama Tim
                    detail: true
                }
            });

            // Cek data waiting approval global
            const pendingCount = await prisma.penilaian.count({
                where: {
                    periodeId: periodeAktif.id,
                    status: 'SUBMIT'
                }
            });
            var hasUnapprovedData = pendingCount > 0;

            // 4. Group by Kantor
            const groupedByKantor = {};
            assessments.forEach(ass => {
                const kId = ass.kantorId;
                if (!groupedByKantor[kId]) {
                    groupedByKantor[kId] = {
                        kantor: ass.kantor,
                        timNama: ass.akun.timKode || ass.akunEmail, // Fallback to email if no timKode
                        assessments: []
                    };
                }
                groupedByKantor[kId].assessments.push(ass);
            });

            // 5. Calculate Averages per Kantor
            rekapList = Object.values(groupedByKantor).map(group => {
                const values = {};

                // Initialize all criteria with 0
                criteriaList.forEach(c => values[c.kunciKriteria] = 0);

                // Iterate criteria columns
                criteriaList.forEach(c => {
                    const key = c.kunciKriteria;
                    let totalNilai = 0;
                    let count = 0;

                    group.assessments.forEach(ass => {
                        const scoreItem = ass.detail.find(d => d.kunciKriteria === key);
                        if (scoreItem) {
                            // Raw value (0-100) is displayed, so we keep summing raw values.
                            // Currently rekapKriteria only shows RAW average values (not weighted).
                            // If user wants weighted, we would change logic. 
                            // But rekapKriteria table shows Columns P1-1, P1-2 which are typically RAW scores.
                            // Wait, the previous logic was: values[key] = (totalNilai / count).
                            // This calculates the average RAW score.
                            // The weight (bobot) is usually applied at the END for P1, P2 score.
                            // BUT, the user requirement says "rekap penilaian ... tidak berubah".
                            // "Rekap Kriteria" just shows raw scores per criteria per office.
                            // Raw scores (0-100) are independent of weight.
                            // So actually, for Rekap Kriteria (Raw Scores), NO CHANGE is needed unless it shows weighted scores.
                            // Checking view: It shows values[c.kunciKriteria].
                            // Conclusion: Rekap Kriteria likely strictly raw scores, so weights don't affect it.
                            // I will keep it as is unless I see weighted calc here.

                            totalNilai += parseFloat(scoreItem.nilai);
                            count++;
                        }
                    });

                    // Average
                    values[key] = count > 0 ? (totalNilai / count).toFixed(2) : 0;
                });

                return {
                    kantor: group.kantor,
                    timNama: group.timNama,
                    values: values
                };
            }).sort((a, b) => a.kantor.nama.localeCompare(b.kantor.nama));
        }

        res.render('admin/rekapKriteria', {
            title: 'Rekap Kriteria',
            user: req.session.user || 'ADMIN',
            periodeAktif,
            periodes,
            criteriaList,
            rekapList,
            hasUnapprovedData: typeof hasUnapprovedData !== 'undefined' ? hasUnapprovedData : false
        });

    } catch (error) {
        console.error('Error rekapKriteria:', error);
        res.status(500).render('error', { title: 'Error', message: error.message });
    }
};

// --- REKAP PENILAIAN ---
exports.rekapPenilaian = async (req, res) => {
    try {
        const { periodeId } = req.query;

        // 1. Ambil Periode
        let periodeTarget;
        if (periodeId) {
            periodeTarget = await prisma.periodePenilaian.findUnique({
                where: { id: parseInt(periodeId) }
            });
        } else {
            periodeTarget = await prisma.periodePenilaian.findFirst({
                where: { statusAktif: true }
                , orderBy: [{ tahun: 'desc' }, { semester: 'desc' }, { diubahPada: 'desc' }]
            });
        }

        const periodeAktif = periodeTarget; // Keep variable name for template compatibility

        let rekapList = [];
        // Predicate Helper
        function getPredikat(score) {
            if (score >= 80) return { label: 'Sangat Baik', color: 'bg-green-500 text-white' };
            if (score >= 60) return { label: 'Baik', color: 'bg-blue-500 text-white' };
            if (score >= 40) return { label: 'Cukup', color: 'bg-yellow-400 text-white' };
            if (score >= 20) return { label: 'Buruk', color: 'bg-red-600 text-white' };
            return { label: 'Sangat Buruk', color: 'bg-black text-white' };
        }

        if (periodeAktif) {
            const konfigurasi = await prisma.konfigurasiBobot.findFirst({
                where: { periodeId: periodeAktif.id },
                include: { bobotKriteria: true },
                orderBy: { statusAktif: 'desc' }
            });

            if (konfigurasi) {
                const assessments = await prisma.penilaian.findMany({
                    where: {
                        periodeId: periodeAktif.id,
                        status: 'APPROVED'
                    },
                    include: {
                        kantor: true,
                        akun: true,     // Tim info (email/kode)
                        anggota: true,  // Individual assessor info
                        detail: true
                    }
                });

                // Cek data waiting approval global
                const pendingCount = await prisma.penilaian.count({
                    where: {
                        periodeId: periodeAktif.id,
                        status: 'SUBMIT'
                    }
                });
                var hasUnapprovedData = pendingCount > 0;

                // Group by Kantor
                const groupedByKantor = {};

                assessments.forEach(ass => {
                    const kId = ass.kantorId;
                    if (!groupedByKantor[kId]) {
                        groupedByKantor[kId] = {
                            kantor: ass.kantor,
                            timNama: ass.akun.timKode || ass.akunEmail,
                            tanggalSubmit: ass.tanggalSubmit,
                            details: [],
                            recommendations: []
                        };
                    }

                    groupedByKantor[kId].details.push(...ass.detail);

                    if (ass.catatanRekomendasi) {
                        groupedByKantor[kId].recommendations.push({
                            penilai: ass.anggota ? ass.anggota.nama : (ass.akun.timKode || 'Tim'),
                            text: ass.catatanRekomendasi
                        });
                    }

                    if (ass.tanggalSubmit > groupedByKantor[kId].tanggalSubmit) {
                        groupedByKantor[kId].tanggalSubmit = ass.tanggalSubmit;
                    }
                });

                // Calculate Scores
                rekapList = Object.values(groupedByKantor).map(group => {
                    const scores = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0 };

                    konfigurasi.bobotKriteria.forEach(b => {
                        const pKey = b.kategori;
                        const relevantDetails = group.details.filter(d => d.kunciKriteria === b.kunciKriteria);
                        if (relevantDetails.length > 0) {
                            // Logic: Sum(Nilai * BobotHistoris) / Count? 
                            // Or Average(Nilai) * Average(BobotHistoris)?
                            // Usually: For a category P1, score is (Avg(CriteriaScores) * CategoryWeight)? 
                            // No, typically: Sum(CriteriaScore * CriteriaWeight).
                            // Let's check previous logic:
                            // const sumVal = relevantDetails.reduce(...);
                            // const avgVal = sumVal / relevantDetails.length;
                            // const weighted = avgVal * parseFloat(b.bobot);
                            // scores[pKey] += weighted;

                            // NEW LOGIC: Calculate weighted score for EACH detail individually using its stored weight.
                            let totalWeightedForCriteria = 0;
                            relevantDetails.forEach(d => {
                                const val = parseFloat(d.nilai);
                                const weight = d.bobotSaatDinilai ? parseFloat(d.bobotSaatDinilai) : parseFloat(b.bobot);
                                // Contribution of this specific detail to the P-score
                                // If 3 people rated, does each contribute 1/3?
                                // "b.bobot" is the weight of `P1-1` contributing to `P1` (e.g. 5%).
                                // If 3 people rate P1-1, the average is used.
                                // So: Avg(Nilai) * Bobot.
                                // With historical weights:
                                // We should calculate the effective weight. 
                                totalWeightedForCriteria += (val * weight);
                            });

                            // The logic "avgVal * b.bobot" implies we average raw scores then apply weight.
                            // ( (v1+v2+v3)/3 ) * W
                            // = (v1*W + v2*W + v3*W) / 3
                            // So if W varies: (v1*W1 + v2*W2 + v3*W3) / 3

                            const weightedScore = totalWeightedForCriteria / relevantDetails.length;
                            scores[pKey] += weightedScore;
                        }
                    });

                    const nilaiAkhir = Object.values(scores).reduce((a, b) => a + b, 0);
                    const predikat = getPredikat(nilaiAkhir);

                    const dateObj = new Date(group.tanggalSubmit);
                    const dateStr = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

                    return {
                        kantor: group.kantor,
                        timNama: group.timNama,
                        waktu: dateStr,
                        scores: {
                            P1: scores.P1.toFixed(2),
                            P2: scores.P2.toFixed(2),
                            P3: scores.P3.toFixed(2),
                            P4: scores.P4.toFixed(2),
                            P5: scores.P5.toFixed(2)
                        },
                        nilaiAkhir: nilaiAkhir.toFixed(2),
                        predikat: predikat,
                        rekomendasi: group.recommendations
                    };
                }).sort((a, b) => a.kantor.nama.localeCompare(b.kantor.nama));
            }
        }

        // Ambil semua periode untuk filter
        const periodes = await prisma.periodePenilaian.findMany({
            orderBy: [{ tahun: 'desc' }, { semester: 'desc' }]
        });

        res.render('admin/rekapPenilaian', {
            title: 'Rekap Penilaian',
            user: req.session.user || 'ADMIN',
            periodeAktif,
            periodes,
            rekapList,
            hasUnapprovedData: typeof hasUnapprovedData !== 'undefined' ? hasUnapprovedData : false
        });

    } catch (error) {
        console.error('Error rekapPenilaian:', error);
        res.status(500).render('error', { title: 'Error', message: error.message });
    }
};

exports.unduhLaporan = async (req, res) => {
    try {
        const periodes = await prisma.periodePenilaian.findMany({
            orderBy: [{ tahun: 'desc' }, { semester: 'desc' }]
        });

        const teams = await prisma.pengguna.findMany({
            where: { peran: 'TIMPENILAI' },
            orderBy: { timKode: 'asc' }
        });

        res.render('admin/unduhLaporanAdmin', {
            title: 'Unduh Laporan',
            user: req.session.user,
            periodes,
            teams
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading download page.");
    }
};

// --- DOWNLOAD EXCEL HANDLERS ---
const ExcelJS = require('exceljs');

// Helper: ambil rekap data kantor (reused logic)
async function getRekapKantorData(kantorIdStr) {
    const periodeAktif = await prisma.periodePenilaian.findFirst({
        where: { statusAktif: true },
        orderBy: [{ tahun: 'desc' }, { semester: 'desc' }, { diubahPada: 'desc' }]
    });
    const kantorList = await prisma.kantor.findMany({
        where: { statusAktif: true },
        orderBy: { nama: 'asc' },
    });

    const selectedKantorId = kantorIdStr ? parseInt(kantorIdStr) : null;
    let selectedKantor = null;
    let rekapData = null;
    let headerColumns = [];

    if (selectedKantorId && periodeAktif) {
        selectedKantor = kantorList.find((k) => k.id === selectedKantorId);
        const konfigurasi = await prisma.konfigurasiBobot.findFirst({
            where: { periodeId: periodeAktif.id, statusAktif: true },
            include: { bobotKriteria: true },
        });

        const penugasan = await prisma.penugasanKantorAkun.findFirst({
            where: { periodeId: periodeAktif.id, kantorId: selectedKantorId }
        });

        const assignedAkunUsername = penugasan?.akunUsername || null;

        if (assignedAkunUsername) {
            const anggotaTimList = await prisma.anggotaTim.findMany({
                where: { akunUsername: assignedAkunUsername, statusAktif: true },
                orderBy: { urutan: 'asc' }
            });
            anggotaTimList.forEach(agt => headerColumns.push(agt.nama));
        }

        if (konfigurasi) {
            const penilaianList = await prisma.penilaian.findMany({
                where: {
                    periodeId: periodeAktif.id,
                    kantorId: selectedKantorId,
                    status: 'APPROVED',
                    ...(assignedAkunUsername ? { akunUsername: assignedAkunUsername } : {})
                },
                include: {
                    detail: true,
                    anggota: true,
                    akun: true,
                },
            });

            const mapPenilaianByNama = {};
            penilaianList.forEach((p) => {
                const nama = p.anggota ? p.anggota.nama : p.akun.nama;
                mapPenilaianByNama[nama] = p;
            });

            if (headerColumns.length === 0 && penilaianList.length > 0) {
                headerColumns = Array.from(new Set(
                    penilaianList
                        .map((p) => (p.anggota ? p.anggota.nama : p.akun?.nama))
                        .filter(Boolean)
                ));
            }

            const groupedData = { P1: [], P2: [], P3: [], P4: [], P5: [] };

            konfigurasi.bobotKriteria.forEach((b) => {
                const pKey = b.kategori;
                if (!groupedData[pKey]) groupedData[pKey] = [];
                const configWeight = parseFloat(b.bobot);

                const rowData = {
                    kunci: b.kunciKriteria,
                    configWeight: configWeight,
                    nilaiPerPenilai: {},
                    catatanPerPenilai: {},
                    totalNilai: 0,
                    jumlahPenilai: 0,
                    cumulativeWeight: 0
                };

                headerColumns.forEach(nama => {
                    const penilaian = mapPenilaianByNama[nama];
                    let val = 0;
                    if (penilaian) {
                        const detail = penilaian.detail.find(d => d.kunciKriteria === b.kunciKriteria);
                        if (detail) {
                            val = parseFloat(detail.nilai);
                            rowData.totalNilai += val;
                            rowData.jumlahPenilai++;

                            const weightUsed = detail.bobotSaatDinilai ? parseFloat(detail.bobotSaatDinilai) : configWeight;
                            rowData.cumulativeWeight += weightUsed;

                            rowData.catatanPerPenilai[nama] = detail.catatan || '-';
                        }
                    }
                    rowData.nilaiPerPenilai[nama] = val;
                    if (!rowData.catatanPerPenilai[nama]) {
                        rowData.catatanPerPenilai[nama] = '-';
                    }
                });

                rowData.rataRata = rowData.jumlahPenilai > 0
                    ? (rowData.totalNilai / rowData.jumlahPenilai).toFixed(2)
                    : 0;

                const avgWeight = rowData.jumlahPenilai > 0 ? (rowData.cumulativeWeight / rowData.jumlahPenilai) : configWeight;
                rowData.bobot = (parseFloat(rowData.rataRata) * avgWeight).toFixed(2);

                groupedData[pKey].push(rowData);
            });

            // Agregat
            const pAverages = {};
            let totalSkorAkhir = 0;
            const pTotalBobot = {};

            Object.keys(groupedData).forEach(pKey => {
                const rows = groupedData[pKey];
                if (rows.length > 0) {
                    const sumRataRata = rows.reduce((acc, row) => acc + parseFloat(row.rataRata), 0);
                    const sumBobot = rows.reduce((acc, row) => acc + parseFloat(row.bobot), 0);
                    pAverages[pKey] = (sumRataRata / rows.length).toFixed(2);
                    pTotalBobot[pKey] = sumBobot.toFixed(2);
                    totalSkorAkhir += sumBobot;
                } else {
                    pAverages[pKey] = 0;
                    pTotalBobot[pKey] = 0;
                }
            });

            rekapData = { groupedData, pAverages, pTotalBobot, totalSkorAkhir: totalSkorAkhir.toFixed(2) };
        }
    }

    return { periodeAktif, selectedKantor, headerColumns, rekapData };
}

exports.downloadRekapKantor = async (req, res) => {
    try {
        const kantorId = req.query.kantorId;
        if (!kantorId) return res.status(400).send("Kantor belum dipilih.");

        const data = await getRekapKantorData(kantorId);
        const { selectedKantor, headerColumns, rekapData } = data;

        if (!selectedKantor || !rekapData) return res.status(404).send("Data tidak ditemukan.");

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Rekap Kantor');

        // Header Info
        worksheet.addRow(['Rekap Penilaian 5P']);
        worksheet.addRow(['Kantor:', selectedKantor.nama]);
        worksheet.addRow([]);

        // Table Header
        const headers = ['Kriteria', '', ...headerColumns, 'Rata-rata', 'Bobot'];
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8102E' } };
            cell.alignment = { horizontal: 'center' };
        });

        // Rows
        Object.keys(rekapData.groupedData).forEach(pKey => {
            // Section Header (e.g., Penilaian P1)
            const sectionRow = worksheet.addRow([`Penilaian ${pKey}`]);
            sectionRow.font = { bold: true };

            const rows = rekapData.groupedData[pKey];
            rows.forEach(row => {
                const rowCells = [
                    row.kunci,
                    'Nilai',
                    ...headerColumns.map(nama => row.nilaiPerPenilai[nama] || 0),
                    parseFloat(row.rataRata),
                    parseFloat(row.bobot)
                ];
                const scoreRow = worksheet.addRow(rowCells);

                const noteCells = [
                    '',
                    'Catatan',
                    ...headerColumns.map(nama => row.catatanPerPenilai[nama] || '-'),
                    '',
                    ''
                ];
                const noteRow = worksheet.addRow(noteCells);
                noteRow.font = { italic: true, size: 9, color: { argb: 'FF666666' } };

                // Merge Kriteria column cells for Row 1 and Row 2
                const colLetter = 'A';
                worksheet.mergeCells(`${colLetter}${scoreRow.number}:${colLetter}${noteRow.number}`);
                // Also merge Rata-rata and Bobot columns if needed, but per-P footer handles them mostly.
                // However, for consistency with web view:
                const lastCol = String.fromCharCode(65 + headers.length - 1);
                const secondLastCol = String.fromCharCode(64 + headers.length - 1);
                worksheet.mergeCells(`${secondLastCol}${scoreRow.number}:${secondLastCol}${noteRow.number}`);
                worksheet.mergeCells(`${lastCol}${scoreRow.number}:${lastCol}${noteRow.number}`);
            });

            // Footer per P
            const footerRowData = [`Rata-rata ${pKey}`, '', ...headerColumns.map(() => ''), rekapData.pAverages[pKey], rekapData.pTotalBobot[pKey]];
            const footerRow = worksheet.addRow(footerRowData);
            footerRow.font = { bold: true, italic: true };
            // Adjusted index for Bobot column because of the new label column
            footerRow.getCell(headers.length).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } }; // Light Green for Bobot
            footerRow.getCell(headers.length - 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFFF' } }; // Light Cyan for Rata-rata

            worksheet.addRow([]); // Spacer
        });

        // Grand Total
        worksheet.addRow([]);
        const totalRow = worksheet.addRow(['Nilai Akhir (Total Bobot)', '', '', '', '', '', rekapData.totalSkorAkhir]);
        totalRow.font = { size: 14, bold: true };
        totalRow.getCell(1).alignment = { horizontal: 'right' };

        // Response
        const filename = `Rekap_Kantor_${selectedKantor.nama.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Download Error:', error);
        res.status(500).send("Gagal mengunduh excel.");
    }
};

exports.downloadRekapKriteria = async (req, res) => {
    try {
        // Reuse logic from rekapKriteria but extract data
        // For efficiency, we duplicate core fetching logic briefly or refactor. 
        // Let's copy-paste core logic for speed as refactoring `rekapKriteria` to pure data function might affect existing render flow if not careful, 
        // though refactoring is cleaner. Given context, I'll inline fetch here.

        const { periodeId } = req.query;

        // 1. Ambil Periode
        let periodeTarget;
        if (periodeId) {
            periodeTarget = await prisma.periodePenilaian.findUnique({
                where: { id: parseInt(periodeId) }
            });
        } else {
            periodeTarget = await prisma.periodePenilaian.findFirst({
                where: { statusAktif: true },
                orderBy: [{ tahun: 'desc' }, { semester: 'desc' }, { diubahPada: 'desc' }]
            });
        }

        if (!periodeTarget) return res.status(404).send("Periode tidak ditemukan.");

        const config = await prisma.konfigurasiBobot.findFirst({
            where: { periodeId: periodeTarget.id },
            include: { bobotKriteria: true },
            orderBy: { statusAktif: 'desc' }
        });

        const criteriaList = config ? config.bobotKriteria.sort((a, b) => a.kunciKriteria.localeCompare(b.kunciKriteria, undefined, { numeric: true })) : [];

        const assessments = await prisma.penilaian.findMany({
            where: { periodeId: periodeTarget.id, status: 'APPROVED' },
            include: { kantor: true, akun: true, detail: true }
        });

        // Grouping
        const groupedByKantor = {};
        assessments.forEach(ass => {
            const kId = ass.kantorId;
            if (!groupedByKantor[kId]) {
                groupedByKantor[kId] = {
                    kantor: ass.kantor,
                    timNama: ass.akun.timKode || ass.akunEmail,
                    assessments: []
                };
            }
            groupedByKantor[kId].assessments.push(ass);
        });

        const rekapList = Object.values(groupedByKantor).map(group => {
            const values = {};
            criteriaList.forEach(c => values[c.kunciKriteria] = 0);

            criteriaList.forEach(c => {
                const key = c.kunciKriteria;
                let totalNilai = 0, count = 0;
                group.assessments.forEach(ass => {
                    const item = ass.detail.find(d => d.kunciKriteria === key);
                    if (item) { totalNilai += parseFloat(item.nilai); count++; }
                });
                values[key] = count > 0 ? (totalNilai / count).toFixed(2) : 0;
            });
            return { kantor: group.kantor, timNama: group.timNama, values };
        }).sort((a, b) => a.kantor.nama.localeCompare(b.kantor.nama));

        // Excel Generation
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Rekap Kriteria');

        worksheet.addRow(['Rekap Kriteria Penilaian 5P']);
        worksheet.addRow(['Periode:', periodeTarget.namaPeriode]);
        worksheet.addRow([]);

        // Header
        const headers = ['No', 'Nama Unit', 'Tim', ...criteriaList.map(c => c.kunciKriteria)];
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8102E' } };
            cell.alignment = { horizontal: 'center' };
        });

        // Body
        rekapList.forEach((row, idx) => {
            const rowValues = [
                idx + 1,
                row.kantor.nama,
                row.timNama,
                ...criteriaList.map(c => parseFloat(row.values[c.kunciKriteria]))
            ];
            worksheet.addRow(rowValues);
        });

        const filename = `Rekap_Kriteria_${periodeTarget.namaPeriode.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Download Kriteria Error:', error);
        res.status(500).send("Gagal mengunduh excel.");
    }
};

exports.downloadRekapPenilaian = async (req, res) => {
    try {
        const { periodeId, timUsername } = req.query;

        // 1. Ambil Periode
        let periodeTarget;
        if (periodeId) {
            periodeTarget = await prisma.periodePenilaian.findUnique({
                where: { id: parseInt(periodeId) }
            });
        } else {
            periodeTarget = await prisma.periodePenilaian.findFirst({
                where: { statusAktif: true },
                orderBy: [{ tahun: 'desc' }, { semester: 'desc' }, { diubahPada: 'desc' }]
            });
        }

        if (!periodeTarget) return res.status(404).send("Periode tidak ditemukan.");

        // 2. Ambil Konfigurasi Bobot (Cari yang untuk periode ini, tidak harus statusAktif=true jika itu periode sejarah)
        const konfigurasi = await prisma.konfigurasiBobot.findFirst({
            where: { periodeId: periodeTarget.id },
            include: { bobotKriteria: true },
            orderBy: { statusAktif: 'desc' } // Prioritaskan yang aktif jika ada ganda
        });

        if (!konfigurasi) return res.status(404).send("Konfigurasi bobot tidak ditemukan untuk periode ini.");

        // 3. Build Query Penilaian
        const whereClause = {
            periodeId: periodeTarget.id,
            status: 'APPROVED'
        };
        if (timUsername && timUsername !== 'all') {
            whereClause.akunUsername = timUsername;
        }

        const assessments = await prisma.penilaian.findMany({
            where: whereClause,
            include: {
                kantor: true,
                akun: true,
                anggota: true,
                detail: true
            }
        });

        // Helper Predikat
        function getPredikat(score) {
            if (score >= 80) return 'Sangat Baik';
            if (score >= 60) return 'Baik';
            if (score >= 40) return 'Cukup';
            if (score >= 20) return 'Buruk';
            return 'Sangat Buruk';
        }

        // Processing (Similar to rekapPenilaian)
        const groupedByKantor = {};
        assessments.forEach(ass => {
            const kId = ass.kantorId;
            if (!groupedByKantor[kId]) {
                groupedByKantor[kId] = {
                    kantor: ass.kantor,
                    timNama: ass.akun.timKode || ass.akunEmail,
                    tanggalSubmit: ass.tanggalSubmit,
                    details: [],
                    recommendations: []
                };
            }
            groupedByKantor[kId].details.push(...ass.detail);
            if (ass.catatanRekomendasi) {
                // Cantumkan siapa yang memberikan rekomendasi
                const namaAssesor = ass.anggota ? ass.anggota.nama : (ass.akun.timKode || ass.akunEmail);
                groupedByKantor[kId].recommendations.push(`${namaAssesor.toUpperCase()}: ${ass.catatanRekomendasi}`);
            }
            if (ass.tanggalSubmit > groupedByKantor[kId].tanggalSubmit) {
                groupedByKantor[kId].tanggalSubmit = ass.tanggalSubmit;
            }
        });

        const rekapList = Object.values(groupedByKantor).map(group => {
            const scores = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0 };
            konfigurasi.bobotKriteria.forEach(b => {
                const pKey = b.kategori;
                const relevantDetails = group.details.filter(d => d.kunciKriteria === b.kunciKriteria);
                if (relevantDetails.length > 0) {
                    const avgVal = relevantDetails.reduce((acc, d) => acc + parseFloat(d.nilai), 0) / relevantDetails.length;
                    scores[pKey] += avgVal * parseFloat(b.bobot);
                }
            });

            const nilaiAkhir = Object.values(scores).reduce((a, b) => a + b, 0);
            const dateObj = new Date(group.tanggalSubmit);
            const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

            return {
                waktu: dateStr,
                unit: group.kantor.nama,
                tim: group.timNama,
                P1: scores.P1.toFixed(2),
                P2: scores.P2.toFixed(2),
                P3: scores.P3.toFixed(2),
                P4: scores.P4.toFixed(2),
                P5: scores.P5.toFixed(2),
                nilaiAkhir: nilaiAkhir.toFixed(2),
                predikat: getPredikat(nilaiAkhir),
                rekomendasi: group.recommendations.join('\n') // Pindah baris untuk tiap rekomendasi
            };
        }).sort((a, b) => a.unit.localeCompare(b.unit));

        // Create Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Rekap Penilaian');

        worksheet.addRow(['Rekap Penilaian 5P']);
        worksheet.addRow(['Periode:', periodeTarget.namaPeriode]);
        worksheet.addRow([]);

        const headers = ['Waktu', 'Nama Unit', 'Tim', 'P1', 'P2', 'P3', 'P4', 'P5', 'Nilai Akhir', 'Predikat', 'Catatan Rekomendasi'];
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8102E' } };
            cell.alignment = { horizontal: 'center' };
        });

        // Set Column Widths
        worksheet.columns = [
            { width: 20 }, // Waktu
            { width: 30 }, // Nama Unit
            { width: 10 }, // Tim
            { width: 10 }, // P1
            { width: 10 }, // P2
            { width: 10 }, // P3
            { width: 10 }, // P4
            { width: 10 }, // P5
            { width: 15 }, // Nilai Akhir
            { width: 20 }, // Predikat
            { width: 50 }, // Catatan Rekomendasi
        ];

        // Style Mapping for Predikat
        const colorMap = {
            'Sangat Baik': { bg: 'FF22C55E', fg: 'FFFFFFFF' }, // Green
            'Baik': { bg: 'FF3B82F6', fg: 'FFFFFFFF' },        // Blue
            'Cukup': { bg: 'FFFACC15', fg: 'FF000000' },       // Yellow
            'Buruk': { bg: 'FFDC2626', fg: 'FFFFFFFF' },       // Red
            'Sangat Buruk': { bg: 'FF000000', fg: 'FFFFFFFF' } // Black
        };

        rekapList.forEach(row => {
            const newRow = worksheet.addRow([
                row.waktu,
                row.unit,
                row.tim,
                parseFloat(row.P1),
                parseFloat(row.P2),
                parseFloat(row.P3),
                parseFloat(row.P4),
                parseFloat(row.P5),
                parseFloat(row.nilaiAkhir),
                row.predikat,
                row.rekomendasi
            ]);

            // Styling Predikat Cell (Index 10)
            const predCell = newRow.getCell(10);
            const style = colorMap[row.predikat];
            if (style) {
                predCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bg } };
                predCell.font = { color: { argb: style.fg }, bold: true };
            }
            predCell.alignment = { horizontal: 'center' };

            // Styling Rekomendasi Cell (Index 11)
            const recCell = newRow.getCell(11);
            recCell.alignment = { wrapText: true, vertical: 'top' };
        });

        let teamSuffix = "";
        if (timUsername && timUsername !== 'all' && rekapList.length > 0) {
            teamSuffix = `_${rekapList[0].tim.replace(/[^a-zA-Z0-9]/g, '_')}`;
        }

        const filename = `Rekap_Penilaian${teamSuffix}_${periodeTarget.namaPeriode.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Download Penilaian Error:', error);
        res.status(500).send("Gagal mengunduh excel.");
    }
};

