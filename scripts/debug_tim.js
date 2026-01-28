const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log('--- DEBUG TIM KODE ---');

        const assessments = await prisma.penilaian.findMany({
            take: 3,
            include: {
                akun: true
            }
        });

        assessments.forEach(a => {
            console.log(`Email: ${a.akunEmail}, TimKode: ${a.akun.timKode}, Nama (missing): ${a.akun.nama}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
