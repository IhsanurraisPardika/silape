const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log('--- DEBUG REKAP KRITERIA ---');

        const periodeAktif = await prisma.periodePenilaian.findFirst({ where: { statusAktif: true } });
        if (!periodeAktif) return console.log("No period");

        const config = await prisma.konfigurasiBobot.findFirst({
            where: { periodeId: periodeAktif.id, statusAktif: true },
            include: { bobotKriteria: true }
        });

        // Sorted Criteria
        const criteriaList = config.bobotKriteria.sort((a, b) => a.kunciKriteria.localeCompare(b.kunciKriteria, undefined, { numeric: true }));

        console.log("Criteria Columns:", criteriaList.map(c => c.kunciKriteria).join(', '));

        const assessments = await prisma.penilaian.findMany({
            where: { periodeId: periodeAktif.id, status: 'SUBMIT' },
            include: { kantor: true, detail: true }
        });

        // Group by Kantor
        const grouped = {};
        assessments.forEach(ass => {
            if (!grouped[ass.kantorId]) grouped[ass.kantorId] = { name: ass.kantor.nama, details: [] };
            grouped[ass.kantorId].details.push(ass.detail);
        });

        Object.values(grouped).forEach(g => {
            console.log(`\nKantor: ${g.name}`);
            const rowValues = [];

            criteriaList.forEach(c => {
                let sum = 0; let count = 0;
                g.details.forEach(detArray => {
                    const item = detArray.find(d => d.kunciKriteria === c.kunciKriteria);
                    if (item) {
                        sum += parseFloat(item.nilai);
                        count++;
                    }
                });
                const avg = count > 0 ? (sum / count).toFixed(2) : 0;
                rowValues.push(`${c.kunciKriteria}=${avg}`);
            });
            console.log(rowValues.join(', '));
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
