const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

exports.index = async (req, res) => {
    try {
        // 1. Ambil semua periode untuk dropdown filter
        const listPeriode = await prisma.periodePenilaian.findMany({
            orderBy: [
                { tahun: 'desc' },
                { semester: 'desc' }
            ]
        });

        // 2. Tentukan periode mana yang mau ditampilkan
        // Priority: req.query.periodeId -> Status Aktif -> Periode Pertama (fallback)
        let selectedPeriodeId = null;
        let selectedPeriode = null;

        if (req.query.periodeId) {
            selectedPeriodeId = parseInt(req.query.periodeId);
            selectedPeriode = listPeriode.find(p => p.id === selectedPeriodeId);
        }

        // Jika tidak ada di query atau tidak ketemu, cari yang aktif
        if (!selectedPeriode) {
            selectedPeriode = listPeriode.find(p => p.statusAktif);
        }

        // Jika masih null (misal semua non-aktif), ambil yang paling baru
        if (!selectedPeriode && listPeriode.length > 0) {
            selectedPeriode = listPeriode[0];
        }

        // Kalau database kosong melompong (belum ada periode sama sekali)
        if (!selectedPeriode) {
            return res.render("admin/kelolaFoto/index", {
                title: "Kelola Foto",
                data: {},
                periode: null,
                listPeriode: [], // Empty list
                user: req.session.user,
            });
        }

        selectedPeriodeId = selectedPeriode.id;

        // 3. Ambil data penilaian berdasarkan periode terpilih
        const listPenilaian = await prisma.penilaian.findMany({
            where: {
                periodeId: selectedPeriodeId,
            },
            include: {
                kantor: true,
                akun: true,
                detail: {
                    include: {
                        foto: true
                    }
                }
            },
        });

        // Grouping by Team
        // Struktur: { "TIM1": [ { kantorNama: "...", kantorId: 1, jumlahFoto: 5 } ] }
        const kelompokTim = {};

        listPenilaian.forEach((p) => {
            const timKode = p.akun.timKode || "LAINNYA";
            const kantorId = p.kantorId;
            const kantorNama = p.kantor.nama;

            // Hitung foto
            let jumlahFoto = 0;
            if (p.detail && p.detail.length > 0) {
                p.detail.forEach(d => {
                    if (d.foto) jumlahFoto += d.foto.length;
                });
            }

            if (jumlahFoto === 0) return;

            if (!kelompokTim[timKode]) {
                kelompokTim[timKode] = [];
            }

            // Merge logic
            const existingKantor = kelompokTim[timKode].find(k => k.id === kantorId);
            if (existingKantor) {
                existingKantor.jumlahFoto += jumlahFoto;
                existingKantor.penilai.push(p.akunEmail);
            } else {
                kelompokTim[timKode].push({
                    id: kantorId,
                    nama: kantorNama,
                    jumlahFoto: jumlahFoto,
                    penilai: [p.akunEmail]
                });
            }
        });

        // Sort tim keys
        const sortedKeys = Object.keys(kelompokTim).sort((a, b) => {
            const numA = parseInt(a.replace("TIM", "")) || 999;
            const numB = parseInt(b.replace("TIM", "")) || 999;
            return numA - numB;
        });

        const sortedData = {};
        sortedKeys.forEach(key => sortedData[key] = kelompokTim[key]);

        res.render("admin/kelolaFoto/index", {
            title: "Kelola Foto",
            data: sortedData,
            periode: selectedPeriode,
            listPeriode: listPeriode, // Pass list periode
            user: req.session.user,
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error Internal Server");
    }
};

exports.detail = async (req, res) => {
    try {
        const { kantorId } = req.params;

        // cek query param.
        let periodeId = req.query.periodeId ? parseInt(req.query.periodeId) : null;

        // Jika tidak ada di query, cari yang aktif
        if (!periodeId) {
            const periodeAktif = await prisma.periodePenilaian.findFirst({
                where: { statusAktif: true },
            });
            if (periodeAktif) periodeId = periodeAktif.id;
        }

        // Jika sampai sini masih null (misal semua nonaktif dan ga ada query), cannot proceed
        if (!periodeId) return res.redirect("/admin/kelola-foto");

        const kantor = await prisma.kantor.findUnique({
            where: { id: parseInt(kantorId) }
        });

        // Ambil detail penilaian + foto
        const penilaianList = await prisma.penilaian.findMany({
            where: {
                periodeId: periodeId,
                kantorId: parseInt(kantorId),
            },
            include: {
                akun: true, // Tim
                anggota: true, // Personal
                detail: {
                    include: {
                        foto: true
                    }
                }
            },
        });

        // Flatten data foto
        const listFoto = [];
        penilaianList.forEach(p => {
            const penilaiName = p.anggota ? p.anggota.nama : p.akun.timKode;
            p.detail.forEach(d => {
                if (d.foto && d.foto.length > 0) {
                    d.foto.forEach(f => {
                        listFoto.push({
                            id: f.id, // Penting untuk hapus
                            url: f.urlFile,
                            caption: d.kunciKriteria + (d.catatan ? ` - ${d.catatan}` : ""),
                            penilai: penilaiName,
                            tanggal: f.tanggalUnggah,
                            kategori: d.kategori
                        });
                    });
                }
            });
        });

        res.render("admin/kelolaFoto/detail", {
            title: `Foto - ${kantor.nama}`,
            kantor,
            listFoto,
            user: req.session.user,
            periodeId: periodeId // Kirim balik biar bisa maintain state kalau perlu
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error Internal Server");
    }
};

exports.hapusFoto = async (req, res) => {
    try {
        const { fotoId } = req.body;

        if (!fotoId) {
            return res.status(400).send("ID Foto diperlukan");
        }

        const id = parseInt(fotoId);
        if (isNaN(id)) {
            return res.status(400).send("ID Foto tidak valid");
        }

        // Cari foto beserta relasi untuk redirect
        // Gunakan model yang benar: fotoDetailPenilaian
        const foto = await prisma.fotoDetailPenilaian.findUnique({
            where: { id: id },
            include: {
                detail: {
                    include: {
                        penilaian: true
                    }
                }
            }
        });

        if (!foto) {
            return res.status(404).send("Foto tidak ditemukan");
        }

        // Simpan info untuk redirect
        const kantorId = foto.detail?.penilaian?.kantorId;
        const periodeId = foto.detail?.penilaian?.periodeId;

        // Hapus file fisik
        const relativePath = String(foto.urlFile || "").replace(/^[/\\]+/, "");
        const fullPath = path.join(process.cwd(), "public", relativePath);

        if (fs.existsSync(fullPath)) {
            try {
                fs.unlinkSync(fullPath);
            } catch (err) {
                console.error("Gagal hapus file fisik:", err);
            }
        }

        // Hapus record DB
        await prisma.fotoDetailPenilaian.delete({
            where: { id: id }
        });

        // Redirect explicitly if possible
        if (kantorId && periodeId) {
            return res.redirect(`/admin/kelola-foto/${kantorId}?periodeId=${periodeId}&success=Foto berhasil dihapus`);
        } else {
            return res.redirect('back');
        }

    } catch (error) {
        console.error("Error menghapus foto:", error);
        res.status(500).send("Gagal menghapus foto (Detail): " + error.message);
    }
};

exports.downloadPdf = async (req, res) => {
    try {
        const { kantorId } = req.params;
        const periodeAktif = await prisma.periodePenilaian.findFirst({
            where: { statusAktif: true },
        });

        if (!periodeAktif) return res.status(404).send("Periode tidak aktif");

        const kantor = await prisma.kantor.findUnique({
            where: { id: parseInt(kantorId) }
        });

        const penilaianList = await prisma.penilaian.findMany({
            where: {
                periodeId: periodeAktif.id,
                kantorId: parseInt(kantorId),
            },
            include: {
                akun: true,
                anggota: true,
                detail: {
                    include: {
                        foto: true
                    }
                }
            },
        });

        // Collect photos
        const photos = [];
        penilaianList.forEach(p => {
            const penilaiName = p.anggota ? p.anggota.nama : p.akun.timKode;
            p.detail.forEach(d => {
                if (d.foto && d.foto.length > 0) {
                    d.foto.forEach(f => {
                        const relativePath = String(f.urlFile || "");
                        const safeRelativePath = relativePath.replace(/^[/\\]+/, "");
                        const fullPath = path.join(process.cwd(), "public", safeRelativePath);

                        if (fs.existsSync(fullPath)) {
                            photos.push({
                                path: fullPath,
                                penilai: penilaiName,
                                kategori: d.kategori + " - " + d.kunciKriteria,
                                tanggal: f.tanggalUnggah
                            });
                        }
                    });
                }
            });
        });

        // Generate PDF
        const doc = new PDFDocument({ margin: 50 });

        const filename = `Foto_${kantor.nama.replace(/\s+/g, "_")}.pdf`;
        res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // Header
        doc.fontSize(20).text(`Laporan Foto Penilaian`, { align: 'center' });
        doc.fontSize(14).text(`Kantor: ${kantor.nama}`, { align: 'center' });
        doc.fontSize(12).text(`Periode: ${periodeAktif.namaPeriode}`, { align: 'center' });
        doc.moveDown(2);

        // Photos
        if (photos.length === 0) {
            doc.text("Tidak ada foto yang tersedia.");
        } else {
            photos.forEach((photo, index) => {
                const pageMargin = doc.page.margins.left;
                const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

                const padding = 10; // margin seragam di dalam blok foto
                const lineGap = 6;

                const metaLineHeight = 12; // approx for fontSize(10)
                const dateLineHeight = 10; // approx for fontSize(8)
                const blockBottomGap = 18;

                // Baca ukuran gambar untuk kalkulasi scaling agar margin kiri/kanan sama
                let imgW = 0;
                let imgH = 0;
                try {
                    const img = doc.openImage(photo.path);
                    imgW = img.width;
                    imgH = img.height;
                } catch (e) {
                    imgW = 0;
                    imgH = 0;
                }

                // Target area gambar: lebar mengikuti contentWidth dikurangi padding kiri/kanan
                const maxW = Math.max(1, contentWidth - padding * 2);
                const maxH = 320; // jaga agar timestamp selalu muat di bawah
                let drawW = maxW;
                let drawH = maxH;

                if (imgW > 0 && imgH > 0) {
                    const scale = Math.min(maxW / imgW, maxH / imgH);
                    drawW = Math.max(1, imgW * scale);
                    drawH = Math.max(1, imgH * scale);
                }

                // Hitung kebutuhan tinggi blok agar tidak menimpa gambar/teks
                const neededHeight =
                    padding +
                    metaLineHeight +
                    lineGap +
                    metaLineHeight +
                    padding +
                    drawH +
                    padding +
                    dateLineHeight +
                    blockBottomGap;

                const bottomLimit = doc.page.height - doc.page.margins.bottom;
                const currentY = doc.y;
                if (currentY + neededHeight > bottomLimit) {
                    doc.addPage();
                }

                // Meta informasi (2 baris agar aman dan tidak bertabrakan)
                doc.fontSize(10).text(`Penginput: ${photo.penilai}`, pageMargin, doc.y, {
                    width: contentWidth
                });
                doc.moveDown(0.2);
                doc.fontSize(10).text(`Kategori: ${photo.kategori}`, pageMargin, doc.y, {
                    width: contentWidth
                });

                // Gambar dengan margin seragam
                const imgX = pageMargin + padding + (maxW - drawW) / 2;
                const imgY = doc.y + padding;

                try {
                    doc.image(photo.path, imgX, imgY, {
                        width: drawW,
                        height: drawH
                    });
                } catch (err) {
                    doc.fontSize(10).text("[Gagal memuat gambar]", pageMargin, imgY, {
                        width: contentWidth,
                        align: 'center'
                    });
                }

                // Pastikan tanggal/waktu selalu di bawah foto dan tidak menimpa
                const dateY = imgY + drawH + padding;
                const tanggalStr = photo.tanggal ? new Date(photo.tanggal).toLocaleString('id-ID') : '-';
                doc.fontSize(8).text(`Tgl: ${tanggalStr}`, pageMargin, dateY, {
                    width: contentWidth,
                    align: 'center'
                });

                // Geser cursor ke bawah blok
                doc.y = dateY + dateLineHeight + blockBottomGap;
            });
        }

        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).send("Gagal generate PDF");
    }
};
