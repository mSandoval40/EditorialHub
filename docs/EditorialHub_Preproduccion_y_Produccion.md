# EditorialHub: Preparacion de Preproduccion y Produccion

Ultima revision: 21 de marzo de 2026

## Objetivo

Dejar una guia corta y ejecutable para preparar los dos entornos que faltan antes del lanzamiento:

- `preprod`: ensayo general serio
- `prod`: salida real al publico

## Infraestructura objetivo ya definida

- dominio principal: `editorialhub.com.mx`
- DNS y dominio: Cloudflare
- frontend: Vercel
- backend: Railway
- base de datos: PostgreSQL en Railway

## Archivos plantilla disponibles

### Frontend

- [.env.example](/c:/proyectos/editorialhub/.env.example)
- [.env.preprod.example](/c:/proyectos/editorialhub/.env.preprod.example)
- [.env.production.example](/c:/proyectos/editorialhub/.env.production.example)

### Backend

- [backend/.env.example](/c:/proyectos/editorialhub/backend/.env.example)
- [backend/.env.preprod.example](/c:/proyectos/editorialhub/backend/.env.preprod.example)
- [backend/.env.production.example](/c:/proyectos/editorialhub/backend/.env.production.example)

## Reglas de uso

- No versionar `.env` reales
- Copiar desde la plantilla adecuada y llenar valores finales en cada entorno
- No reutilizar secretos entre `preprod` y `prod`
- Confirmar que frontend y backend apunten al mismo entorno

## Preproduccion

### Objetivo

- validar una corrida casi real sin exponer todavia el entorno publico final

### Debe tener

- dominio o subdominio propio
- backend accesible publicamente
- base de datos separada de desarrollo
- Stripe del entorno de prueba controlado
- SMTP funcional

### Checklist rapido

- [ ] definir `https://preprod.editorialhub.com.mx`
- [ ] definir `https://api-preprod.editorialhub.com.mx`
- [ ] cargar `.env.preprod`
- [ ] cargar `backend/.env.preprod`
- [ ] desplegar frontend
- [ ] desplegar backend
- [ ] ejecutar `P0` completo de la matriz de lanzamiento
- [ ] corregir bloqueadores antes de pasar a produccion

## Produccion

### Objetivo

- operar el lanzamiento real sin depender de defaults locales o secretos de prueba

### Debe tener

- dominio publico final
- backend publico final
- base de datos productiva
- Stripe live
- SMTP real
- responsables definidos para monitoreo inicial

### Checklist rapido

- [ ] definir `https://editorialhub.com.mx`
- [ ] definir `https://api.editorialhub.com.mx`
- [ ] cargar `.env.production`
- [ ] cargar `backend/.env.production`
- [ ] validar base de datos productiva
- [ ] validar webhook live de Stripe
- [ ] validar SMTP real
- [ ] ejecutar corrida final `P0`
- [ ] monitorear primeras compras y primeras publicaciones

## Diferencias recomendadas entre entornos

| Tema | Preprod | Prod |
|---|---|---|
| Dominio | subdominio de ensayo | dominio final |
| Base de datos | separada de dev y de prod | solo productiva |
| Stripe | prueba controlada | live |
| SMTP | real o staging realista | real |
| Regalías | `SIMULATED` recomendado | definir segun operacion real |

## Confirmaciones previas a salir a vivo

- `NEXT_PUBLIC_API_BASE_URL` apunta al backend correcto
- `FRONTEND_PUBLIC_BASE_URL` y `BACKEND_PUBLIC_BASE_URL` son publicos y coherentes
- `JWT_SECRET` no es de desarrollo
- `DATABASE_URL` no apunta a localhost
- `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` son del entorno correcto
- `SMTP_*` ya no esta vacio
- el modo de regalias esta definido a conciencia

## Nota operativa importante

Hoy el codigo ya esta bastante saneado. Lo que separa a EditorialHub de un lanzamiento real ya no es tanto construir nuevas piezas, sino cargar bien estos entornos y ejecutar la matriz de pruebas con disciplina.
