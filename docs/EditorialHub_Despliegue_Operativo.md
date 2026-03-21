# EditorialHub: Guia Operativa de Despliegue

## Objetivo

Tener una secuencia clara y repetible para preparar y levantar EditorialHub en un entorno de produccion o preproduccion.

## Documentos de apoyo

- revisar `EditorialHub_Checklist_Produccion.md`
- revisar `EditorialHub_Matriz_Pruebas_Lanzamiento.md`
- revisar `EditorialHub_Preproduccion_y_Produccion.md`

## 1. Preparacion previa

- definir dominio frontend
- definir dominio backend
- definir base de datos del entorno
- contar con credenciales de Stripe del entorno correcto
- contar con SMTP real

## 2. Frontend

### Variables minimas

- `NEXT_PUBLIC_API_BASE_URL`

### Pasos

1. instalar dependencias
2. cargar `.env.local` del entorno
3. ejecutar `npm run build`
4. levantar con `npm run start`

## 3. Backend

### Variables minimas

- `NODE_ENV=production`
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

### Pasos

1. instalar dependencias en `backend`
2. cargar `backend/.env`
3. ejecutar `npx prisma generate`
4. ejecutar `npx prisma db push`
5. ejecutar `npm run db:seed:roles` si es un entorno nuevo
6. ejecutar `npm run build`
7. levantar con `npm run start`

## 4. Verificacion inmediata post-despliegue

- abrir frontend
- comprobar login
- comprobar acceso admin
- comprobar health informal desde panel de mantenimiento
- comprobar compra de prueba controlada
- comprobar reflejo en biblioteca

## 5. Verificacion de Stripe

- confirmar que el webhook del entorno apunta al backend correcto
- confirmar que el secreto del webhook corresponde al entorno actual
- ejecutar una compra de prueba controlada
- confirmar que la compra aparece en biblioteca

## 6. Verificacion de correo

- enviar verificacion de correo
- probar recuperacion de contrasena
- probar correo administrativo si aplica

## 7. Cierre de despliegue

- registrar fecha y hora del despliegue
- registrar version o commit desplegado
- registrar responsable
- registrar incidencias encontradas
