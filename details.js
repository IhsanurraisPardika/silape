const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const data = await prisma.penilaian.findMany({
        include: { detail: true, anggota: true }
    });
    console.log(JSON.stringify(data.map(p => ({
        id: p.id,
        anggota: p.anggota ? p.anggota.nama : 'N/A',
        details: p.detail.length,
        rec: p.catatanRekomendasi
    })), null, 2));
    process.exit(0);
}
run();
