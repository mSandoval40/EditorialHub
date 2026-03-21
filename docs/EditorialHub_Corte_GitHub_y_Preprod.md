# EditorialHub: Corte Hacia GitHub y Preproduccion

Ultima revision: 21 de marzo de 2026

## Objetivo

Preparar un primer corte serio del repositorio para subir a GitHub y usarlo como base del deploy en `preprod`.

## Estado observado del repo

- rama actual: `master`
- remoto configurado: `origin`
- el arbol de trabajo contiene una mezcla de:
  - cambios funcionales reales de frontend y backend
  - documentacion de lanzamiento y operacion
  - archivos temporales y logs locales

## Regla principal

No conviene empujar todo el arbol sin criterio. El corte debe separar lo que si representa producto de lo que solo es residuo local.

## Debe entrar al corte

- frontend funcional en `app/`, `components/` y `lib/`
- backend funcional en `backend/src/`, `backend/prisma/` y scripts utiles
- documentos operativos y de lanzamiento en `docs/`
- plantillas de entorno `.env*.example`
- ajustes de higiene como `.gitignore` y `README.md`

## No debe entrar al corte

- `.env` reales
- logs locales `*.out.log`, `*.err.log`
- zips y carpetas temporales de extraccion
- archivos de prueba locales no necesarios para operacion
- cualquier residuo de ejecuciones temporales

## Orden recomendado para el corte

1. Revisar `git status`
2. Confirmar que no haya archivos temporales fuera de `.gitignore`
3. Agrupar cambios en tres bloques logicos:
   - producto
   - backend e infraestructura de codigo
   - documentacion de lanzamiento
4. Ejecutar build final de frontend y backend
5. Crear commit de corte estable
6. Subir a GitHub
7. Usar ese corte para `preprod`

## Bloques sugeridos de revision antes del push

### Producto

- `app/`
- `components/`
- `lib/`

### Backend

- `backend/src/`
- `backend/prisma/`
- `backend/scripts/`
- `backend/package.json`

### Documentacion

- `docs/`
- `README.md`
- `.env*.example`
- `.gitignore`

## Riesgos si se empuja sin limpiar

- subir residuos locales
- mezclar trabajo estable con artefactos de prueba
- complicar el primer deploy en Vercel y Railway
- dificultar trazabilidad del corte que se use para `preprod`

## Definicion de exito

Un corte bueno es aquel donde:

- el repo compila en frontend y backend
- la documentacion de lanzamiento acompana al codigo real
- los temporales no viajan a GitHub
- el commit puede usarse como base directa para `preprod`
