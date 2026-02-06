const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    const periodeId = 1;
    const kantorId = 1;

    console.log("=== DEBUG START ===");

    // 1. Penugasan
    const penugasan = await prisma.penugasanKantorAkun.findFirst({
        where: { kantorId, periodeId, statusAktif: true }
    });
    console.log("Penugasan Found:", !!penugasan);

    if (penugasan) {
        const anggota = await prisma.anggotaTim.findMany({
            where: { akunEmail: penugasan.akunEmail, statusAktif: true }
        });
        console.log("Anggota Tim (Headers):", JSON.stringify(anggota.map(a => a.nama)));
    }

    // 2. Penilaian (ALL STATUS)
    const penilaian = await prisma.penilaian.findMany({
        where: { kantorId, periodeId },
        include: { anggota: true }
    });
    console.log("Total Penilaian Found (All Status):", penilaian.length);

    penilaian.forEach((p, i) => {
        console.log(`[${i}] Status: ${p.status}, Anggota: ${p.anggota ? p.anggota.nama : 'NULL'}`);
    });

    console.log("=== DEBUG END ===");
}

debug()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
