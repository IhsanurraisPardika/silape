const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log('--- DEBUG CALCULATION START ---');

        const period = await prisma.periodePenilaian.findFirst({ where: { statusAktif: true } });
        if (!period) return console.log("No active period");

        const kantorList = await prisma.kantor.findMany({ where: { statusAktif: true } });
        const selectedKantor = kantorList[0]; // Debug first office
        if (!selectedKantor) return console.log("No kantor found");

        console.log(`Checking calculations for Kantor: ${selectedKantor.nama}`);

        const config = await prisma.konfigurasiBobot.findFirst({
            where: { periodeId: period.id, statusAktif: true },
            include: { bobotKriteria: true }
        });

        // Fetch assessments
        const assessments = await prisma.penilaian.findMany({
            where: {
                periodeId: period.id,
                kantorId: selectedKantor.id,
                status: 'SUBMIT'
            },
            include: { detail: true }
        });

        // Group data
        const groupedData = { P1: [], P2: [], P3: [], P4: [], P5: [] };

        config.bobotKriteria.forEach(b => {
            const pKey = b.kategori;
            if (!groupedData[pKey]) groupedData[pKey] = [];

            const rowData = {
                kunci: b.kunciKriteria,
                bobotConfig: parseFloat(b.bobot),
                totalNilai: 0,
                jumlahPenilai: 0
            };

            assessments.forEach(p => {
                const detail = p.detail.find(d => d.kunciKriteria === b.kunciKriteria);
                if (detail) {
                    rowData.totalNilai += parseFloat(detail.nilai);
                    rowData.jumlahPenilai++;
                }
            });

            rowData.rataRata = rowData.jumlahPenilai > 0 ? (rowData.totalNilai / rowData.jumlahPenilai) : 0;
            rowData.bobot = rowData.rataRata * rowData.bobotConfig;

            groupedData[pKey].push(rowData);
        });

        // Calculate Totals
        let grandTotal = 0;
        Object.keys(groupedData).forEach(pKey => {
            const rows = groupedData[pKey];
            const sumBobot = rows.reduce((acc, row) => acc + row.bobot, 0);
            grandTotal += sumBobot;

            console.log(`${pKey} Total Bobot: ${sumBobot.toFixed(2)}`);
        });

        console.log(`\nGRAND TOTAL (NILAI AKHIR): ${grandTotal.toFixed(2)}`);
        console.log('--- DEBUG CALCULATION END ---');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
