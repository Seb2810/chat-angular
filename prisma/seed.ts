//import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs';

// eslint-disable-next-line @typescript-eslint/no-require-imports
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {


  await prisma.user.deleteMany();
}

async function main() {
  await cleanDatabase();

  const hashedPassword = await bcrypt.hash('1234Seb*', 10);


  // =========================
  // 👤 USER (Alice)
  // =========================

  const alice = await prisma.user.upsert({
    where: { email: 'alice@prisma.io' },
    update: {},
    create: {
      email: 'alice@prisma.io',
      name: 'Alice',
      password: hashedPassword,
      role: 'USER', // ⭐ IMPORTANT

    },
  });

  // =========================
  // 👤 USER (Bob)
  // =========================

  const bob = await prisma.user.upsert({
    where: { email: 'bob@prisma.io' },
    update: {},
    create: {
      email: 'bob@prisma.io',
      name: 'Bob',
      password: hashedPassword,
      role: 'USER', // ⭐ IMPORTANT

    },
  });

  // =========================
  // 👤 USER (Sebastian)
  // =========================

  const sebastien = await prisma.user.upsert({
    where: { email: 'sebastien@prisma.io' },
    update: {},
    create: {
      email: 'sebastien@prisma.io',
      name: 'Sebastien',
      password: hashedPassword,
      role: 'USER', // ⭐ IMPORTANT

    },
  });

  // =========================
  // 👤 USER (Victor)
  // =========================

  const victor = await prisma.user.upsert({
    where: { email: 'victor@prisma.io' },
    update: {},
    create: {
      email: 'victor@prisma.io',
      name: 'Victor',
      password: hashedPassword,
      role: 'USER', // ⭐ IMPORTANT

    },
  });

  // =========================
  //  🔥 ADMIN
  // =========================

  const admin = await prisma.user.upsert({
    where: { email: 'admin@prisma.io' },
    update: {},
    create: {
      email: 'admin@prisma.io',
      name: 'Admin',
      password: hashedPassword,
      role: 'ADMIN', // ⭐ ADMIN ICI

    },
  });

  console.log({ admin, alice, bob, sebastien, victor});
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
