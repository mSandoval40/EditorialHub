# EditorialHub

Plataforma editorial con frontend en Next.js y backend en NestJS para:

- registro e inicio de sesion
- perfil de socio colaborador
- captura y publicacion de obras
- catalogo y compra con Stripe Checkout
- biblioteca de obras adquiridas y publicadas
- resenas
- regalias y solicitudes de pago

## Estructura

- `app/`: frontend Next.js
- `components/`: componentes compartidos del frontend
- `lib/`: clientes API y utilidades de frontend
- `backend/`: API NestJS + Prisma + PostgreSQL
- `docs/`: documentos de operacion, auditoria y lanzamiento

## Requisitos

- Node.js 20+
- PostgreSQL
- npm

## Variables de entorno

Frontend:

- copiar [`.env.example`](./.env.example) a `.env.local`

Backend:

- copiar [`backend/.env.example`](./backend/.env.example) a `backend/.env`

## Desarrollo local

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed:roles
npm run start:dev
```

## Compilacion

Frontend:

```bash
npm run build
```

Backend:

```bash
cd backend
npm run build
```

## Verificacion de salida

Secuencia recomendada de calidad:

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

Validacion de entorno:

```bash
npm run validate:env -- --target preprod --frontend .env.preprod --backend backend/.env.preprod
```

```bash
npm run validate:env -- --target production --frontend .env.production --backend backend/.env.production
```

## Flujos principales ya soportados

- registro de cuenta y verificacion de correo
- login con JWT
- perfil de colaborador con datos fiscales y bancarios
- publicacion de obras con validaciones de colaborador
- revision y gestion admin
- compra de obras con Stripe Checkout
- reconciliacion de compras pendientes
- biblioteca con obras adquiridas y publicadas
- resenas desde biblioteca
- calculo de regalias
- solicitud, programacion, pago, cancelacion, fallo y reintento de solicitudes de regalias

## Estado actual hacia lanzamiento

La ruta y la auditoria de lanzamiento viven en:

- [`docs/EditorialHub_Ruta_Hacia_Lanzamiento.md`](./docs/EditorialHub_Ruta_Hacia_Lanzamiento.md)
- [`docs/EditorialHub_Auditoria_Brechas_Lanzamiento.md`](./docs/EditorialHub_Auditoria_Brechas_Lanzamiento.md)
- [`docs/EditorialHub_Checklist_Produccion.md`](./docs/EditorialHub_Checklist_Produccion.md)
- [`docs/EditorialHub_Matriz_Pruebas_Lanzamiento.md`](./docs/EditorialHub_Matriz_Pruebas_Lanzamiento.md)
- [`docs/EditorialHub_Backlog_Cierre_Lanzamiento.md`](./docs/EditorialHub_Backlog_Cierre_Lanzamiento.md)
- [`docs/EditorialHub_Despliegue_Operativo.md`](./docs/EditorialHub_Despliegue_Operativo.md)
- [`docs/EditorialHub_Runbook_Incidentes.md`](./docs/EditorialHub_Runbook_Incidentes.md)
- [`docs/EditorialHub_Registro_Ejecucion_Pruebas.md`](./docs/EditorialHub_Registro_Ejecucion_Pruebas.md)
- [`docs/EditorialHub_Preproduccion_y_Produccion.md`](./docs/EditorialHub_Preproduccion_y_Produccion.md)
- [`docs/EditorialHub_Objetivo_Infraestructura_Deploy.md`](./docs/EditorialHub_Objetivo_Infraestructura_Deploy.md)

## Notas importantes

- La compra con Stripe ya funciona, pero el listener de webhooks debe estar correctamente configurado en cada entorno.
- Las regalias ya estan operativamente modeladas, pero la dispersion bancaria real sigue pendiente de integracion externa.
- Si SMTP no esta configurado, algunas notificaciones siguen funcionando en modo de vista previa de desarrollo.

## Pendientes de salida a vivo

- completar configuracion real de variables de entorno y servicios
- definir despliegue de frontend, backend y base de datos
- ejecutar matriz de pruebas de lanzamiento
- dejar monitoreo, respaldos y operacion minima documentada
