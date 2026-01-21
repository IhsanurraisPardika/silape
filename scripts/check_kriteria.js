const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    console.log("Checking DB state...");

    // Check Periode
    const activePeriod = await prisma.periodePenilaian.findFirst({
        where: { statusAktif: true }
    });
    console.log("Active Period:", activePeriod);

    // Check Kriteria
    const kriteriaCount = await prisma.kriteriaPenilaian.count();
    console.log("Total Kriteria:", kriteriaCount);

    const sampleKriteria = await prisma.kriteriaPenilaian.findMany({ take: 5 });
    console.log("Sample Kriteria:", sampleKriteria);

    // Check User
    const user = await prisma.pengguna.findFirst();
    console.log("Sample User:", user);
}

check()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
