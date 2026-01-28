const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log('--- DEBUG REKAP PENILAIAN ---');

        const periodeAktif = await prisma.periodePenilaian.findFirst({ where: { statusAktif: true } });
        if (!periodeAktif) return console.log("No period");

        const config = await prisma.konfigurasiBobot.findFirst({
            where: { periodeId: periodeAktif.id, statusAktif: true },
            include: { bobotKriteria: true }
        });

        // 1. Fetch
        const assessments = await prisma.penilaian.findMany({
            where: { periodeId: periodeAktif.id, status: 'SUBMIT' },
            include: { kantor: true, detail: true, akun: true }
        });

        // 2. Group
        const grouped = {};
        assessments.forEach(ass => {
            const kId = ass.kantorId;
            if (!grouped[kId]) grouped[kId] = { name: ass.kantor.name, details: [] };
            grouped[kId].details.push(...ass.detail);
        });

        // 3. Calc
        Object.values(grouped).forEach(g => {
            console.log(`\nKantor ID: ${g.name}`);
            let totalWeighted = 0;
            config.bobotKriteria.forEach(b => {
                const rel = g.details.filter(d => d.kunciKriteria === b.kunciKriteria);
                if (rel.length > 0) {
                    const sum = rel.reduce((a, r) => a + parseFloat(r.nilai), 0);
                    const avg = sum / rel.length;
                    const weighted = avg * parseFloat(b.bobot);
                    totalWeighted += weighted;
                }
            });
            console.log(`Nilai Akhir: ${totalWeighted.toFixed(2)}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
