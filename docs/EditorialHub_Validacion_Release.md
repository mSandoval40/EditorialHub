# EditorialHub: Validacion Automatizada de Release

Ultima revision: 21 de marzo de 2026

## Objetivo

Reducir errores humanos antes de pasar a `preprod` o `prod`.

## Comandos disponibles

### Calidad general

```bash
npm run lint
```

```bash
npx next build --webpack
```

```bash
cd backend
npm run build
```

Valida:

- lint del frontend
- build del frontend
- build del backend

### Validacion de entorno

```bash
npm run validate:env -- --target preprod --frontend .env.preprod --backend backend/.env.preprod
```

```bash
npm run validate:env -- --target production --frontend .env.production --backend backend/.env.production
```

## Que revisa el validador de entorno

- variables obligatorias presentes
- URLs no apuntando a `localhost`
- ausencia de placeholders evidentes
- `NODE_ENV=production`
- `JWT_SECRET` no de desarrollo
- coherencia de `FRONTEND_PUBLIC_BASE_URL` y `BACKEND_PUBLIC_BASE_URL`
- Stripe no en test para production
- advertencia si regalias siguen en `SIMULATED`

## Uso recomendado

1. llenar los archivos `.env` reales del entorno
2. correr `npm run validate:env`
3. corregir fallos
4. correr `npm run check:quality`
5. ejecutar matriz `P0`

## Nota

El validador no reemplaza la corrida funcional real, pero si evita errores muy comunes de configuracion antes del deploy.
