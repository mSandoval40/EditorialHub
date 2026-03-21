import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const backendRoot = path.resolve(__dirname, "..");
const envPath = path.join(backendRoot, ".env");

dotenv.config({ path: envPath });

export function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current.startsWith("--")) {
      continue;
    }

    const [rawKey, inlineValue] = current.slice(2).split("=", 2);

    if (inlineValue !== undefined) {
      parsed[rawKey] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[rawKey] = "true";
      continue;
    }

    parsed[rawKey] = next;
    index += 1;
  }

  return parsed;
}

export function ensureSafeEnvironmentForReset() {
  const nodeEnv = (process.env.NODE_ENV || "development").toLowerCase();

  if (nodeEnv === "production") {
    throw new Error(
      "El factory reset esta bloqueado en produccion. Ejecuta este script solo en desarrollo o staging controlado.",
    );
  }
}

export function ensureConfirmation(args, expectedPhrase) {
  if (args.confirm !== expectedPhrase) {
    throw new Error(
      `Confirmacion invalida. Vuelve a ejecutar con --confirm ${expectedPhrase}`,
    );
  }
}

export function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL no esta definida en backend/.env");
  }

  return databaseUrl;
}

export function createPrisma() {
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  });

  return {
    prisma,
    pool,
  };
}

export async function closePrisma(prisma, pool) {
  await prisma.$disconnect();
  await pool.end();
}
