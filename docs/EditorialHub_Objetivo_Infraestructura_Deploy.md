# EditorialHub: Objetivo de Infraestructura y Deploy

Ultima revision: 21 de marzo de 2026

## Arquitectura objetivo

- Dominio principal: `editorialhub.com.mx`
- DNS y administracion de dominio: Cloudflare
- Frontend: Vercel
- Backend: Railway
- Base de datos: PostgreSQL en Railway

## Dominios recomendados

### Produccion

- frontend: `https://editorialhub.com.mx`
- API: `https://api.editorialhub.com.mx`

### Preproduccion

- frontend: `https://preprod.editorialhub.com.mx`
- API: `https://api-preprod.editorialhub.com.mx`

## Flujo objetivo de despliegue

1. Subir a GitHub el estado correcto del repositorio
2. Desplegar frontend en Vercel desde la rama o referencia aprobada
3. Desplegar backend en Railway desde la misma referencia aprobada
4. Conectar dominio y subdominios en Cloudflare
5. Cargar variables reales por entorno
6. Ejecutar la corrida `P0`

## Variables que deben quedar alineadas

### Frontend

- `NEXT_PUBLIC_API_BASE_URL`

### Backend

- `DATABASE_URL`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `FRONTEND_PUBLIC_BASE_URL`
- `BACKEND_PUBLIC_BASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `ROYALTIES_PAYOUT_PROVIDER_MODE`

## Riesgos a evitar

- desplegar desde una version vieja del repositorio
- mezclar URLs de `preprod` con secretos de `prod`
- dejar Stripe en test por error en produccion
- dejar SMTP vacio y depender de preview en un entorno publico
- dejar la API apuntando a `localhost`

## Definicion operativa pendiente

- estrategia concreta de correo con dominio `editorialhub.com.mx`
- modo real para pagos de regalias
- responsable del monitoreo inicial post-lanzamiento

## Conclusión

La arquitectura ya esta definida y es suficiente para lanzar. Lo importante ya no es decidir plataforma, sino ejecutar con orden la conexion entre GitHub, Vercel, Railway y Cloudflare usando la version correcta del sistema.
