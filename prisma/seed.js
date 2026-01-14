const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPERADMIN_EMAIL || "superadmin@semenpadang.co.id";
  const password = process.env.SUPERADMIN_PASSWORD || "Admin@12345";

  const hash = await bcrypt.hash(password, 10);

  await prisma.pengguna.upsert({
    where: { email },
    update: {
      nama: "SUPERADMIN TPM",
      kataSandiHash: hash,
      peran: "SUPERADMIN_TPM",
      statusAktif: true,
    },
    create: {
      email,
      nama: "SUPERADMIN TPM",
      kataSandiHash: hash,
      peran: "SUPERADMIN_TPM",
      statusAktif: true,
    },
  });

  console.log("✅ Seed SUPERADMIN selesai:", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
