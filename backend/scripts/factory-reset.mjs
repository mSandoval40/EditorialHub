import fs from "fs";
import path from "path";
import {
  backendRoot,
  closePrisma,
  createPrisma,
  ensureConfirmation,
  ensureSafeEnvironmentForReset,
  parseArgs,
} from "./shared.mjs";

const CONFIRMATION_PHRASE = "editorialhub-dev-reset";
const APP_TABLES = [
  '"AuditLog"',
  '"PayoutRequest"',
  '"DownloadAttempt"',
  '"DownloadKey"',
  '"PaymentAttempt"',
  '"PurchaseItem"',
  '"Purchase"',
  '"WorkEdition"',
  '"Work"',
  '"AuthorProfile"',
  '"PasswordResetCode"',
  '"EmailVerificationCode"',
  '"UserProfile"',
  '"UserRole"',
  '"User"',
  '"Role"',
  '"FileAsset"',
];
const ROLE_NAMES = ["BUYER", "AUTHOR", "ADMIN", "ADMIN_02"];

function cleanDirectoryContents(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  const removed = [];

  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.rmSync(fullPath, { force: true });
    }

    removed.push(fullPath);
  }

  return removed;
}

async function reseedRoles(prisma) {
  for (const roleName of ROLE_NAMES) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  ensureSafeEnvironmentForReset();
  ensureConfirmation(args, CONFIRMATION_PHRASE);

  const preserveUploads = args["preserve-uploads"] === "true";
  const uploadsRoot = path.join(backendRoot, "uploads");
  const { prisma, pool } = createPrisma();

  try {
    await prisma.$connect();

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `TRUNCATE TABLE ${APP_TABLES.join(", ")} RESTART IDENTITY CASCADE;`,
      );
    });

    await reseedRoles(prisma);

    const removedUploadEntries = preserveUploads ? [] : cleanDirectoryContents(uploadsRoot);

    console.log(
      JSON.stringify(
        {
          ok: true,
          message: "Factory reset completado.",
          rolesSeeded: ROLE_NAMES,
          uploadsPreserved: preserveUploads,
          removedUploadEntries: removedUploadEntries.length,
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
