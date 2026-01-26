const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.rekapKantor = async (req, res) => {
    try {
        // 1. Ambil Periode Aktif
        // Asumsi: Hanya ada 1 periode aktif
        const periodeAktif = await prisma.periodePenilaian.findFirst({
            where: { statusAktif: true },
        });

        // 2. Ambil Daftar Kantor (untuk filter)
        const kantorList = await prisma.kantor.findMany({
            where: { statusAktif: true },
            orderBy: { nama: 'asc' },
        });

        const selectedKantorId = req.query.kantorId ? parseInt(req.query.kantorId) : null;
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

            // Jika ada penugasan, ambil semua anggota dari akun tim tersebut
            if (penugasan) {
                const anggotaTimList = await prisma.anggotaTim.findMany({
                    where: {
                        akunEmail: penugasan.akunEmail,
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
                // 4. Ambil Semua Penilaian untuk Kantor & Periode ini
                const penilaianList = await prisma.penilaian.findMany({
                    where: {
                        periodeId: periodeAktif.id,
                        kantorId: selectedKantorId,
                        status: 'SUBMIT', // Hanya yang sudah submit
                    },
                    include: {
                        detail: true,
                        anggota: true, // Untuk ambil nama anggota
                        akun: true,    // Fallback jika anggota null (akun tim)
                    },
                });

                // Mapping Penilaian: Map [Nama Anggota] -> Object Penilaian
                // Gunanya agar saat loop kolom (anggota), kita bisa cek "anggota ini punya nilai gk?"
                const mapPenilaianByNama = {};
                penilaianList.forEach((p) => {
                    // Ambil nama penilai. Prioritas: nama anggota > nama akun (fallback)
                    const nama = p.anggota ? p.anggota.nama : p.akun.nama;
                    mapPenilaianByNama[nama] = p;
                });

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
                        totalNilai: 0,
                        jumlahPenilai: 0,
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
                            }
                        }
                        // Simpan nilai untuk ditampilkan (0 atau n)
                        rowData.nilaiPerPenilai[nama] = val;
                    });

                    // Hitung Rata-rata Baris
                    // Formula: Total Nilai / Jumlah Yang Mengisi
                    rowData.rataRata = rowData.jumlahPenilai > 0
                        ? (rowData.totalNilai / rowData.jumlahPenilai).toFixed(2)
                        : 0;

                    // Hitung Kolom Bobot = Rata-rata * BobotKonfigurasi
                    // Asumsi: perkalian langsung sesuai request
                    rowData.bobot = (parseFloat(rowData.rataRata) * configWeight).toFixed(2);

                    groupedData[pKey].push(rowData);
                });

                // Hitung Rata-rata P (Agregat)
                const pAverages = {};
                Object.keys(groupedData).forEach(pKey => {
                    const rows = groupedData[pKey];
                    if (rows.length > 0) {
                        const sumRataRata = rows.reduce((acc, row) => acc + parseFloat(row.rataRata), 0);
                        pAverages[pKey] = (sumRataRata / rows.length).toFixed(2);
                    } else {
                        pAverages[pKey] = 0;
                    }
                });

                rekapData = {
                    groupedData,
                    pAverages
                };
            }
        }

        res.render('admin/rekapKantor', {
            user: req.session.user,
            title: 'Rekap Kantor',
            kantorList,
            periodeAktif,
            selectedKantorId,
            selectedKantor,
            headerColumns,
            rekapData
        });

    } catch (error) {
        console.error('Error rekapKantor:', error);
        res.status(500).render('error', { title: 'Error Rekap Kantor', message: error.message || 'Terjadi kesalahan sistem' });
    }
};
