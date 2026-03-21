# EditorialHub: Checklist de Produccion

Ultima revision: 21 de marzo de 2026

## Estado actual

- Frontend: compila correctamente
- Backend: compila correctamente
- Lint: limpio, sin errores ni warnings
- Frontend local: responde `200` en `/catalogo`, `/membresias` y `/terminos`
- Backend local: responde `200` en `/api` y `/api/works/public`
- Autenticacion backend: responde `401` en `/api/auth/me` sin sesion, comportamiento esperado
- Entorno actual: sigue configurado como local/desarrollo

## 1. Entorno

- [ ] Definir dominio frontend de produccion
- [ ] Definir dominio backend de produccion
- [ ] Definir base de datos de produccion
- [ ] Asegurar acceso administrativo seguro a servidores y servicios

Estado actual:
- El repo sigue apuntando a `localhost`
- No existe archivo de entorno propio del frontend en la raiz

## 2. Variables de entorno

### Frontend

- [ ] `NEXT_PUBLIC_API_BASE_URL`

Estado actual:
- El frontend cae por defecto a `http://localhost:3001/api` en multiples vistas si no existe `NEXT_PUBLIC_API_BASE_URL`

### Backend

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`
- [ ] `JWT_ACCESS_TOKEN_EXPIRES_IN`
- [ ] `EMAIL_VERIFICATION_CODE_TTL_MINUTES`
- [ ] `PASSWORD_RESET_CODE_TTL_MINUTES`
- [ ] `PRIMARY_ADMIN_CHANGE_TTL_MINUTES`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `FRONTEND_PUBLIC_BASE_URL`
- [ ] `BACKEND_PUBLIC_BASE_URL`
- [ ] `SMTP_HOST`
- [ ] `SMTP_PORT`
- [ ] `SMTP_USER`
- [ ] `SMTP_PASS`
- [ ] `SMTP_FROM`
- [ ] `ROYALTIES_PAYOUT_PROVIDER_MODE`

Estado actual detectado en `backend/.env`:
- `DATABASE_URL` apunta a Postgres local
- `JWT_SECRET` sigue siendo de desarrollo
- `STRIPE_SECRET_KEY` es de prueba
- `STRIPE_WEBHOOK_SECRET` es de prueba
- `FRONTEND_PUBLIC_BASE_URL` apunta a `http://localhost:3000`
- `BACKEND_PUBLIC_BASE_URL` apunta a `http://localhost:3001`
- No se observan variables `SMTP_*`
- No se observa `ROYALTIES_PAYOUT_PROVIDER_MODE`

## 3. Base de datos

- [ ] Crear respaldo antes de salida
- [ ] Ejecutar `prisma generate`
- [ ] Ejecutar `prisma db push` o la estrategia final elegida para produccion
- [ ] Correr seed de roles si aplica
- [ ] Verificar usuarios admin iniciales

Estado actual:
- La base local responde y el backend arranca correctamente con ella
- Falta definir el procedimiento exacto de paso a base de datos productiva

## 4. Stripe

- [ ] Activar credenciales live
- [ ] Configurar webhook live
- [ ] Validar `success_url` y `cancel_url`
- [ ] Ejecutar compra real de prueba

Estado actual:
- La integracion existe, pero hoy esta configurada con claves de prueba

## 5. Correo

- [ ] Configurar SMTP real
- [ ] Validar correo de verificacion
- [ ] Validar recuperacion de contrasena
- [ ] Validar correos administrativos

Estado actual:
- El backend tiene cableado de correo, pero faltan las variables SMTP reales

## 6. Operacion admin

- [ ] Validar acceso admin
- [ ] Validar revision de obras
- [ ] Validar compra reflejada en biblioteca
- [ ] Validar calculo de regalias
- [ ] Validar solicitud de pago de regalias

Estado actual:
- La base de codigo ya esta mas coherente y libre de residuos criticos
- Sigue pendiente la validacion manual completa de punta a punta con usuarios reales de prueba

## 7. Seguridad minima

- [ ] Cambiar secretos de desarrollo
- [ ] Revisar usuarios admin
- [ ] Revisar CORS y URLs publicas
- [ ] Revisar acceso a paneles sensibles

Estado actual:
- Persisten secretos y URLs de desarrollo
- Ya se limpiaron rutas mock visibles y mensajes rotos criticos

## 8. Pagos de regalias

- [ ] Definir modo real de dispersion o procedimiento manual controlado
- [ ] Confirmar politica operativa para solicitudes de pago
- [ ] Verificar que el modo productivo no quede en simulacion por error

Estado actual:
- Si no se define `ROYALTIES_PAYOUT_PROVIDER_MODE`, el sistema cae a `SIMULATED`

## 9. Observabilidad

- [ ] Definir donde se revisan logs
- [ ] Definir como se detecta caida de backend
- [ ] Definir como se detecta fallo de webhook Stripe
- [ ] Definir procedimiento de incidente

Estado actual:
- No hay evidencia en este repo de monitoreo productivo ya definido

## 10. Salida controlada

- [ ] Ejecutar matriz de pruebas
- [ ] Corregir bloqueadores
- [ ] Levantar entorno live
- [ ] Monitorear primeras compras y primeras publicaciones

Estado actual:
- Codigo y compilacion: listos para una recta final seria
- Operacion y despliegue: todavia requieren configuracion y validacion final

## Bloqueadores reales antes de lanzar

- Definir y cargar variables de entorno de produccion
- Preparar base de datos productiva
- Configurar SMTP real
- Cambiar Stripe a modo live y probar webhook
- Definir el modo real para pagos de regalias
- Ejecutar pruebas end-to-end reales con recorrido completo
