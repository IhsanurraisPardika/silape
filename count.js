const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const c = await prisma.bobotKriteria.count({
        where: { konfigurasi: { statusAktif: true, periode: { statusAktif: true } } }
    });
    console.log('Criteria Count:', c);
    process.exit(0);
}
run();
