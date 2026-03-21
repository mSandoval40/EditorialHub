require('dotenv').config({ path: 'C:\\proyectos\\editorialhub\\backend\\.env' });

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || typeof databaseUrl !== 'string') {
  throw new Error('DATABASE_URL no esta definida correctamente en backend/.env');
}

const pool = new Pool({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const knownPasswords = {
  'mini_wits@hotmail.com': 'AccesAdmin',
  'ing.sandoval@live.com.mx': 'AccesHub',
  'codex_test_1773616078@editorialhub.com': 'password123',
};

function writeFileWithFallback(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return {
      path: filePath,
      fallbackUsed: false,
    };
  } catch (error) {
    if (error && error.code === 'EBUSY') {
      const parsed = path.parse(filePath);
      const fallbackPath = path.join(
        parsed.dir,
        `${parsed.name}.latest${parsed.ext}`,
      );

      fs.writeFileSync(fallbackPath, content, 'utf8');
      return {
        path: fallbackPath,
        fallbackUsed: true,
      };
    }

    throw error;
  }
}

function csvValue(value) {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function buildCredentialsText(users) {
  const lines = [
    'EditorialHub - Credenciales de Desarrollo',
    `Actualizado: ${new Date().toISOString()}`,
    '',
    'Importante:',
    'Este archivo es solo para entorno local de diseno/desarrollo/pruebas.',
    'Las contrasenas reales no se pueden recuperar desde la base de datos una vez guardadas.',
    'Solo se listan en texto claro las que conocemos porque fueron definidas durante las pruebas.',
    '',
    'Cuentas registradas actualmente',
    '',
  ];

  users.forEach((user, index) => {
    lines.push(`${index + 1}. ${user.email}`);
    lines.push(`Correo: ${user.email}`);
    lines.push(
      `Contrasena: ${knownPasswords[user.email] || 'no registrada automaticamente en texto claro'}`,
    );
    lines.push(`Roles actuales: ${user.roles.join(', ') || 'sin roles'}`);
    lines.push(`Estado: ${user.status}`);
    lines.push(
      `Correo verificado: ${user.emailVerifiedAt ? 'si' : 'no'}`,
    );

    if (user.authorProfileStatus) {
      lines.push(`AuthorProfile status: ${user.authorProfileStatus}`);
    }

    if (user.authorProfileType) {
      lines.push(`AuthorProfile type: ${user.authorProfileType}`);
    }

    if (user.authorPublicName) {
      lines.push(`Nombre publico: ${user.authorPublicName}`);
    }

    lines.push('');
  });

  lines.push('Referencia tecnica');
  lines.push('El inventario completo con ids, roles, estatus, authorProfile y passwordHash esta en:');
  lines.push('usuarios_desarrollo.csv');

  return lines.join('\n');
}

async function main() {
  const users = await prisma.user.findMany({
    include: {
      roles: {
        include: {
          role: true,
        },
      },
      authorProfile: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const normalizedUsers = users.map((user) => ({
    id: user.id,
    email: user.email,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString?.() ?? '',
    createdAt: user.createdAt?.toISOString?.() ?? '',
    updatedAt: user.updatedAt?.toISOString?.() ?? '',
    roles: user.roles.map((item) => item.role.name),
    authorProfileStatus: user.authorProfile?.applicationStatus ?? '',
    authorProfileType: user.authorProfile?.authorProfileType ?? '',
    authorPublicName: user.authorProfile?.publicName ?? '',
    passwordHash: user.passwordHash,
  }));

  const csvLines = [
    'id,email,status,email_verified_at,created_at,updated_at,roles,author_profile_status,author_profile_type,author_public_name,password_hash',
    ...normalizedUsers.map((user) =>
      [
        user.id,
        user.email,
        user.status,
        user.emailVerifiedAt,
        user.createdAt,
        user.updatedAt,
        user.roles.join('|'),
        user.authorProfileStatus,
        user.authorProfileType,
        user.authorPublicName,
        user.passwordHash,
      ]
        .map(csvValue)
        .join(','),
    ),
  ];

  const rootDir = path.resolve(__dirname, '..');
  const csvPath = path.join(rootDir, 'usuarios_desarrollo.csv');
  const txtPath = path.join(rootDir, 'credenciales_desarrollo.txt');
  const csvWriteResult = writeFileWithFallback(csvPath, `${csvLines.join('\n')}\n`);
  const txtWriteResult = writeFileWithFallback(
    txtPath,
    `${buildCredentialsText(normalizedUsers)}\n`,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        exportedUsers: normalizedUsers.length,
        csvPath: csvWriteResult.path,
        txtPath: txtWriteResult.path,
        csvFallbackUsed: csvWriteResult.fallbackUsed,
        txtFallbackUsed: txtWriteResult.fallbackUsed,
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
