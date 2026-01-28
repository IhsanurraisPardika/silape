const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const mapping = {
        'P1-1': 'P1-1', 'P1-2': 'P1-2', 'P1-3': 'P1-3',
        'P2-4': 'P2-1', 'P2-5': 'P2-2', 'P2-6': 'P2-3', 'P2-7': 'P2-4',
        'P3-8': 'P3-1', 'P3-9': 'P3-2', 'P3-10': 'P3-3',
        'P4-11': 'P4-1', 'P4-12': 'P4-2', 'P4-13': 'P4-3',
        'P5-14': 'P5-1', 'P5-15': 'P5-2', 'P5-16': 'P5-3'
    };

    console.log('Fetching details...');
    const details = await prisma.detailPenilaian.findMany();
    console.log(`Found ${details.length} records.`);

    let updatedCount = 0;
    let skipCount = 0;

    for (const d of details) {
        const newKey = mapping[d.kunciKriteria];
        if (newKey && newKey !== d.kunciKriteria) {
            try {
                await prisma.detailPenilaian.update({
                    where: { id: d.id },
                    data: { kunciKriteria: newKey }
                });
                updatedCount++;
            } catch (error) {
                // If update fails (e.g. duplicate key constraint if user had duplicate input), skip it
                if (error.code === 'P2002') {
                    console.warn(`Skipping duplicate for ID ${d.id}: ${d.kunciKriteria} -> ${newKey}`);
                    skipCount++;
                } else {
                    console.error(`Error updating ID ${d.id}:`, error.message);
                }
            }
        }
    }

    console.log(`Migration completed.`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skipCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
