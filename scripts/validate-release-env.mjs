import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

function readArg(flag, fallback = null) {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return fallback;
  }

  return args[index + 1];
}

function hasFlag(flag) {
  return args.includes(flag);
}

const cwd = process.cwd();
const target = (readArg('--target', 'production') || 'production').toLowerCase();
const frontendPath = path.resolve(cwd, readArg('--frontend', '.env.local') || '.env.local');
const backendPath = path.resolve(cwd, readArg('--backend', 'backend/.env') || 'backend/.env');
const allowLocalhost = hasFlag('--allow-localhost');
const allowTestStripe = hasFlag('--allow-test-stripe');
const allowSimulatedRoyalties = hasFlag('--allow-simulated-royalties');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No existe el archivo: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function isBlank(value) {
  return typeof value !== 'string' || value.trim() === '';
}

function looksPlaceholder(value) {
  if (isBlank(value)) {
    return true;
  }

  const lowered = value.toLowerCase();
  return (
    lowered.includes('replace_me') ||
    lowered.includes('replace_with') ||
    lowered.includes('tu-dominio') ||
    lowered.includes('usuario:password') ||
    lowered.includes('password_smtp') ||
    lowered.includes('usuario_smtp') ||
    lowered.includes('host-prod') ||
    lowered.includes('host-preprod')
  );
}

function fail(message, failures) {
  failures.push(message);
}

function warn(message, warnings) {
  warnings.push(message);
}

function validateFrontendEnv(env, failures, warnings) {
  const apiBaseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (isBlank(apiBaseUrl)) {
    fail('Frontend: falta NEXT_PUBLIC_API_BASE_URL.', failures);
    return;
  }

  if (looksPlaceholder(apiBaseUrl)) {
    fail('Frontend: NEXT_PUBLIC_API_BASE_URL sigue con placeholder.', failures);
  }

  if (!allowLocalhost && apiBaseUrl.includes('localhost')) {
    fail('Frontend: NEXT_PUBLIC_API_BASE_URL apunta a localhost.', failures);
  }

  if (!apiBaseUrl.startsWith('http://') && !apiBaseUrl.startsWith('https://')) {
    fail('Frontend: NEXT_PUBLIC_API_BASE_URL debe ser una URL absoluta.', failures);
  }

  if (target === 'production' && apiBaseUrl.includes('preprod.')) {
    fail('Frontend: NEXT_PUBLIC_API_BASE_URL apunta a preproduccion en un objetivo production.', failures);
  }

  if (target === 'preprod' && apiBaseUrl.includes('api.editorialhub.com.mx/api') && !apiBaseUrl.includes('api-preprod.')) {
    warn('Frontend: NEXT_PUBLIC_API_BASE_URL parece de produccion; confirma que realmente quieres validar preprod.', warnings);
  }
}

function validateBackendEnv(env, failures, warnings) {
  const requiredKeys = [
    'NODE_ENV',
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_ACCESS_TOKEN_EXPIRES_IN',
    'EMAIL_VERIFICATION_CODE_TTL_MINUTES',
    'PASSWORD_RESET_CODE_TTL_MINUTES',
    'PRIMARY_ADMIN_CHANGE_TTL_MINUTES',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'FRONTEND_PUBLIC_BASE_URL',
    'BACKEND_PUBLIC_BASE_URL',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'ROYALTIES_PAYOUT_PROVIDER_MODE',
  ];

  for (const key of requiredKeys) {
    if (isBlank(env[key])) {
      fail(`Backend: falta ${key}.`, failures);
    }
  }

  if ((env.NODE_ENV || '').toLowerCase() !== 'production') {
    fail('Backend: NODE_ENV debe ser production en preprod/prod.', failures);
  }

  if (looksPlaceholder(env.DATABASE_URL || '')) {
    fail('Backend: DATABASE_URL sigue con placeholder.', failures);
  }

  if (!allowLocalhost && (env.DATABASE_URL || '').includes('localhost')) {
    fail('Backend: DATABASE_URL apunta a localhost.', failures);
  }

  if ((env.JWT_SECRET || '').includes('editorialhub_backend_dev_secret_change_this')) {
    fail('Backend: JWT_SECRET sigue con valor de desarrollo.', failures);
  }

  if (looksPlaceholder(env.JWT_SECRET || '')) {
    fail('Backend: JWT_SECRET sigue con placeholder.', failures);
  }

  const stripeSecret = env.STRIPE_SECRET_KEY || '';
  const stripeWebhookSecret = env.STRIPE_WEBHOOK_SECRET || '';

  if (looksPlaceholder(stripeSecret)) {
    fail('Backend: STRIPE_SECRET_KEY sigue con placeholder.', failures);
  }

  if (looksPlaceholder(stripeWebhookSecret)) {
    fail('Backend: STRIPE_WEBHOOK_SECRET sigue con placeholder.', failures);
  }

  if (!allowTestStripe && target === 'production' && stripeSecret.startsWith('sk_test_')) {
    fail('Backend: STRIPE_SECRET_KEY sigue en modo test para production.', failures);
  }

  if (!allowTestStripe && target === 'production' && stripeWebhookSecret.includes('replace')) {
    fail('Backend: STRIPE_WEBHOOK_SECRET no parece listo para production.', failures);
  }

  if (target === 'production' && (env.FRONTEND_PUBLIC_BASE_URL || '').includes('preprod.')) {
    fail('Backend: FRONTEND_PUBLIC_BASE_URL apunta a preprod en un objetivo production.', failures);
  }

  if (target === 'production' && (env.BACKEND_PUBLIC_BASE_URL || '').includes('preprod.')) {
    fail('Backend: BACKEND_PUBLIC_BASE_URL apunta a preprod en un objetivo production.', failures);
  }

  if (!allowLocalhost && (env.FRONTEND_PUBLIC_BASE_URL || '').includes('localhost')) {
    fail('Backend: FRONTEND_PUBLIC_BASE_URL apunta a localhost.', failures);
  }

  if (!allowLocalhost && (env.BACKEND_PUBLIC_BASE_URL || '').includes('localhost')) {
    fail('Backend: BACKEND_PUBLIC_BASE_URL apunta a localhost.', failures);
  }

  const royaltiesMode = (env.ROYALTIES_PAYOUT_PROVIDER_MODE || '').trim().toUpperCase();
  if (!allowSimulatedRoyalties && target === 'production' && royaltiesMode === 'SIMULATED') {
    warn(
      'Backend: ROYALTIES_PAYOUT_PROVIDER_MODE sigue en SIMULATED. Confirma que esto sea intencional para produccion.',
      warnings,
    );
  }
}

function main() {
  const failures = [];
  const warnings = [];

  const frontendEnv = parseEnvFile(frontendPath);
  const backendEnv = parseEnvFile(backendPath);

  validateFrontendEnv(frontendEnv, failures, warnings);
  validateBackendEnv(backendEnv, failures, warnings);

  console.log(`Validacion de entorno EditorialHub (${target})`);
  console.log(`- frontend: ${frontendPath}`);
  console.log(`- backend: ${backendPath}`);

  if (warnings.length > 0) {
    console.log('');
    console.log('Warnings:');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (failures.length > 0) {
    console.log('');
    console.log('Fallos:');
    for (const failure of failures) {
      console.log(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('');
  console.log('OK: el entorno paso la validacion base.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
