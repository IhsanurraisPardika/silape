const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const email =
    process.env.SUPERADMIN_EMAIL || "superadmin@semenpadang.co.id";
  const password =
    process.env.SUPERADMIN_PASSWORD || "Admin@12345";

  const hash = await bcrypt.hash(password, 10);

  await prisma.pengguna.upsert({
    where: { email },
    update: {
      kataSandiHash: hash,
      peran: "SUPERADMINTPM",
      statusAktif: true,
      timKode: null,       // superadmin bukan tim
      dihapusPada: null,   // pastikan aktif
    },
    create: {
      email,
      kataSandiHash: hash,
      peran: "SUPERADMINTPM",
      statusAktif: true,
      timKode: null,
    },
  });

  // Opsional tapi bagus: kalau ada superadmin lain, nonaktifkan
  await prisma.pengguna.updateMany({
    where: {
      peran: "SUPERADMINTPM",
      email: { not: email },
    },
    data: { statusAktif: false },
  });

  console.log("Seed SUPERADMIN selesai:", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
