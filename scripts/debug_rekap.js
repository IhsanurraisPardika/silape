const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log('--- DEBUG START ---');

        // 1. Check Active Period
        const period = await prisma.periodePenilaian.findFirst({
            where: { statusAktif: true }
        });
        console.log('Active Period:', period ? period.id : 'NONE');

        if (!period) return;

        // 2. Check Configuration & Criteria keys
        const config = await prisma.konfigurasiBobot.findFirst({
            where: { periodeId: period.id, statusAktif: true },
            include: { bobotKriteria: true }
        });

        if (config) {
            console.log(`Config Found. Criteria Keys:`);
            console.log(config.bobotKriteria.map(b => `${b.kategori}: ${b.kunciKriteria}`).join(', '));
        } else {
            console.log('NO ACTIVE CONFIG!');
        }

        // 3. Check Assessments details
        const assessments = await prisma.penilaian.findMany({
            where: { periodeId: period.id, status: 'SUBMIT' },
            include: {
                kantor: true,
                anggota: true,
                detail: true
            },
            take: 3 // Just check a few
        });

        console.log(`Found ${assessments.length} SUBMITTED assessments.`);
        assessments.forEach(a => {
            console.log(`\nAssessment ID: ${a.id}, Kantor: ${a.kantor.nama}, Penilai: ${a.anggota ? a.anggota.nama : 'N/A'}`);
            console.log('Details (kunciKriteria -> nilai):');
            a.detail.forEach(d => {
                console.log(` - "${d.kunciKriteria}": ${d.nilai}`);
            });
        });

        console.log('--- DEBUG END ---');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
