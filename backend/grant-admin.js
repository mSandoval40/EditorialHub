require('dotenv').config({ path: 'C:\\proyectos\\editorialhub\\backend\\.env' });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || typeof databaseUrl !== 'string') {
  throw new Error('DATABASE_URL no está definida correctamente en C:\\proyectos\\editorialhub\\backend\\.env');
}

const pool = new Pool({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  const email = 'prueba2@editorialhub.com';

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const role = await prisma.role.findUnique({
    where: { name: 'ADMIN' },
  });

  if (!role) {
    throw new Error('Rol ADMIN no encontrado');
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        assignedRole: 'ADMIN',
        userId: user.id,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });