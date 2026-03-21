import { hash } from "bcryptjs";
import { RoleName, UserStatus } from "@prisma/client";
import {
  closePrisma,
  createPrisma,
  ensureConfirmation,
  parseArgs,
} from "./shared.mjs";

const CONFIRMATION_PHRASE = "editorialhub-bootstrap-admins";

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function buildAdminTargets(args) {
  const targets = [];

  if (args["admin-email"] && args["admin-password"]) {
    targets.push({
      label: "ADMIN",
      email: normalizeEmail(args["admin-email"]),
      password: args["admin-password"],
      roles: [RoleName.BUYER, RoleName.ADMIN],
      profile: {
        firstName: args["admin-first-name"]?.trim() || "Admin",
        lastName: args["admin-last-name"]?.trim() || "EditorialHub",
      },
    });
  }

  if (args["admin2-email"] && args["admin2-password"]) {
    targets.push({
      label: "ADMIN_02",
      email: normalizeEmail(args["admin2-email"]),
      password: args["admin2-password"],
      roles: [RoleName.BUYER, RoleName.ADMIN_02],
      profile: {
        firstName: args["admin2-first-name"]?.trim() || "Admin",
        lastName: args["admin2-last-name"]?.trim() || "Dos",
      },
    });
  }

  if (targets.length === 0) {
    throw new Error(
      "Debes indicar al menos un admin con --admin-email/--admin-password o --admin2-email/--admin2-password.",
    );
  }

  return targets;
}

async function ensureRoles(prisma, roleNames) {
  const roles = await prisma.role.findMany({
    where: {
      name: {
        in: roleNames,
      },
    },
  });

  const byName = new Map(roles.map((role) => [role.name, role]));

  for (const roleName of roleNames) {
    if (!byName.has(roleName)) {
      throw new Error(`Falta el rol ${roleName} en la base de datos. Ejecuta primero db:factory-reset o db:seed:roles.`);
    }
  }

  return byName;
}

async function upsertAdmin(prisma, target, rolesByName) {
  const passwordHash = await hash(target.password, 10);
  const now = new Date();

  const user = await prisma.user.upsert({
    where: {
      email: target.email,
    },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: now,
    },
    create: {
      email: target.email,
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: now,
    },
  });

  await prisma.userProfile.upsert({
    where: {
      userId: user.id,
    },
    update: {
      firstName: target.profile.firstName,
      lastName: target.profile.lastName,
    },
    create: {
      userId: user.id,
      firstName: target.profile.firstName,
      lastName: target.profile.lastName,
    },
  });

  for (const roleName of target.roles) {
    const role = rolesByName.get(roleName);

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
  }

  return {
    email: user.email,
    userId: user.id,
    roles: target.roles,
    label: target.label,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  ensureConfirmation(args, CONFIRMATION_PHRASE);

  const targets = buildAdminTargets(args);
  const requiredRoles = Array.from(new Set(targets.flatMap((target) => target.roles)));
  const { prisma, pool } = createPrisma();

  try {
    await prisma.$connect();
    const rolesByName = await ensureRoles(prisma, requiredRoles);
    const results = [];

    for (const target of targets) {
      results.push(await upsertAdmin(prisma, target, rolesByName));
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          message: "Bootstrap de administradores completado.",
          admins: results,
        },
        null,
        2,
      ),
    );
  } finally {
    await closePrisma(prisma, pool);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
