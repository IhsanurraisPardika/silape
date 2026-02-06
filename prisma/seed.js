const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const username =
    process.env.SUPERADMIN_USERNAME || "superadmin";
  const password =
    process.env.SUPERADMIN_PASSWORD || "Admin@12345";

  const hash = await bcrypt.hash(password, 10);

  // Menggunakan username sebagai patokan
  await prisma.pengguna.upsert({
    where: { username },
    update: {
      kataSandiHash: hash,
      peran: "SUPERADMINTPM",
      statusAktif: true,
      timKode: null,       // superadmin bukan tim
      dihapusPada: null,   // pastikan aktif
    },
    create: {
      username,
      // nama field does not exist in Pengguna model
      kataSandiHash: hash,
      peran: "SUPERADMINTPM",
      statusAktif: true,
      timKode: null,
    },
  });

  // Opsional: nonaktifkan superadmin lain jika ada (selain yang baru diseseed)
  // Note: Hati-hati jika ada banyak admin yang valid
  /*
  await prisma.pengguna.updateMany({
    where: {
      peran: "SUPERADMINTPM",
      username: { not: username },
    },
    data: { statusAktif: false },
  });
  */

  console.log("Seed SUPERADMIN selesai:", username);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
