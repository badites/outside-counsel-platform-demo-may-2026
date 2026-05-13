import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed users
  await prisma.user.upsert({
    where: { email: "sarah.scales@example.com" },
    update: {},
    create: {
      email: "sarah.scales@example.com",
      name: "Sarah Scales",
      role: "LAWYER",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      role: "ADMIN",
    },
  });

  console.log("Seed complete: 2 users created");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
