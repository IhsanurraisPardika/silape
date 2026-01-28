const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const period = await prisma.periodePenilaian.findFirst({
            where: { statusAktif: true }
        });

        if (!period) {
            console.log('No active period');
            return;
        }

        console.log('Active Period:', period.id, period.namaPeriode);

        const config = await prisma.konfigurasiBobot.findFirst({
            where: { periodeId: period.id, statusAktif: true },
            include: { _count: { select: { bobotKriteria: true } } }
        });

        console.log('Config:', JSON.stringify(config, null, 2));

        const assessments = await prisma.penilaian.findMany({
            where: { periodeId: period.id },
            include: { detail: true, anggota: true }
        });

        console.log('Assessments:', JSON.stringify(assessments.map(p => ({
            id: p.id,
            email: p.akunEmail,
            anggota: p.anggota ? p.anggota.nama : 'N/A',
            details_count: p.detail.length,
            has_recommendation: !!(p.catatanRekomendasi && p.catatanRekomendasi.trim()),
            status_db: p.status
        })), null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
