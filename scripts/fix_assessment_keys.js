const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const criteriaMapping = {
    "P1-1": "P1-1", "P1-2": "P1-2", "P1-3": "P1-3",
    "P2-4": "P2-1", "P2-5": "P2-2", "P2-6": "P2-3", "P2-7": "P2-4",
    "P3-8": "P3-1", "P3-9": "P3-2", "P3-10": "P3-3",
    "P4-11": "P4-1", "P4-12": "P4-2", "P4-13": "P4-3",
    "P5-14": "P5-1", "P5-15": "P5-2", "P5-16": "P5-3"
};

async function migrate() {
    try {
        console.log('--- MIGRATION START ---');

        // Get all detail penilaian
        const details = await prisma.detailPenilaian.findMany();
        console.log(`Found ${details.length} details to check.`);

        let updatedCount = 0;

        for (const detail of details) {
            // Check if current key is in mapping keys (meaning it's an "absolute" key)
            // We want to convert it to the "relative" key (value in mapping)
            const currentKey = detail.kunciKriteria;

            // Construct the full key for mapping check if needed, but here mapping uses just suffix?
            // Wait, mapping in controller was: "P2-4": "P2-1". 
            // In DB, kunciKriteria is stored as "P2-4" currently (incorrectly).
            // So we check if currentKey matches any key in criteriaMapping.

            // Note: The mapping keys are capable of matching the current wrong keys.
            // E.g. "P2-4" -> "P2-1"

            if (criteriaMapping[currentKey] && criteriaMapping[currentKey] !== currentKey) {
                const newKey = criteriaMapping[currentKey];

                console.log(`Migrating ID ${detail.id}: ${currentKey} -> ${newKey}`);

                // Update
                try {
                    await prisma.detailPenilaian.update({
                        where: { id: detail.id },
                        data: { kunciKriteria: newKey }
                    });
                    updatedCount++;
                } catch (err) {
                    console.error(`Failed to update ID ${detail.id}: ${err.message}`);
                    // It might fail if the new key already exists for this penilaianId (duplicate constraint)
                    // In that case, we might want to delete the old one or merge? 
                    // For now, let's assume no duplicates or just log error.
                }
            }
        }

        console.log(`--- MIGRATION END ---`);
        console.log(`Updated ${updatedCount} records.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
