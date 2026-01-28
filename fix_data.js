const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const res = await prisma.detailPenilaian.deleteMany({
        where: {
            nilai: 0,
            penilaian: { periode: { statusAktif: true } }
        }
    });
    console.log('Deleted placeholder records:', res.count);
    process.exit(0);
}
run();
