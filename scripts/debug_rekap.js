const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log('--- DEBUG START ---');

        // 1. Check Active Period
        const period = await prisma.periodePenilaian.findFirst({
            where: { statusAktif: true }
        });
        console.log('Active Period:', period);

        if (!period) {
            console.log('NO ACTIVE PERIOD!');
            return;
        }

        // 2. Check Configuration
        const config = await prisma.konfigurasiBobot.findFirst({
            where: { periodeId: period.id, statusAktif: true }
        });
        console.log('Active Config:', config);

        if (!config) {
            console.log('NO ACTIVE CONFIGURATION for this period!');
        }

        // 3. Check Assessments (All Status)
        const assessments = await prisma.penilaian.findMany({
            where: { periodeId: period.id },
            include: {
                kantor: true,
                anggota: true
            }
        });

        console.log(`Found ${assessments.length} assessments in this period.`);
        assessments.forEach(a => {
            console.log(`- ID: ${a.id}, Kantor: ${a.kantor.nama}, Status: ${a.status}, Anggota: ${a.anggota ? a.anggota.nama : 'N/A'}`);
        });

        console.log('--- DEBUG END ---');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
