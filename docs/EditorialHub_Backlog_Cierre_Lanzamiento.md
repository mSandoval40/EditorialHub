# EditorialHub: Backlog de Cierre Hacia Lanzamiento

Ultima revision: 21 de marzo de 2026

## Estado tecnico actual

- frontend build: OK
- backend build: OK
- lint general: OK
- residuos criticos mock: resueltos
- membresias y fidelidad: actualizadas

## Bloqueadores principales de salida a vivo

### 1. Configuracion real de produccion

Problema:

- el proyecto ya esta estable, pero sigue apuntando a entorno local/test

Meta:

- dejar listos frontend, backend y base de datos con variables reales

## Tareas

- definir dominios reales frontend y backend
- preparar `.env` de frontend y backend para produccion
- validar `DATABASE_URL`
- validar `JWT_SECRET`
- validar `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` live
- validar `SMTP_*`
- definir `ROYALTIES_PAYOUT_PROVIDER_MODE`

### 2. Operacion real de Stripe

Problema:

- la integracion existe, pero falta validacion de salida real

Meta:

- asegurar compras reales sin depender de entorno local

## Tareas

- verificar webhook live
- ejecutar compra real controlada
- confirmar reflejo en biblioteca
- confirmar trazabilidad de compra

### 3. Correo real y recuperacion

Problema:

- sin SMTP real, algunos flujos quedan en modo preview o simulacion controlada

Meta:

- dejar correos reales operando en verificacion y recuperacion

## Tareas

- configurar SMTP
- probar verificacion de correo
- probar recuperacion de contrasena
- probar correos administrativos

### 4. Matriz de pruebas de lanzamiento

Problema:

- no existe suite automatizada y la confianza final depende de prueba manual disciplinada

Meta:

- ejecutar una ronda completa de humo y regresion antes de salir

## Tareas

- correr todos los casos de `EditorialHub_Matriz_Pruebas_Lanzamiento.md`
- registrar resultado por caso
- corregir bloqueadores encontrados

### 5. Operacion admin y monitoreo

Problema:

- la base ya funciona, pero falta piso operativo de vivo

Meta:

- dejar respuesta minima ante caidas, correos y pagos

## Tareas

- definir donde se revisan logs
- definir como se detectan fallos de backend
- definir como se detectan fallos de webhook
- definir procedimiento de respaldo y restauracion
- definir responsable de guardia en lanzamiento

## Orden recomendado

### Bloque inmediato

- cerrar variables de produccion
- validar SMTP y Stripe live
- preparar base de datos productiva

### Bloque siguiente

- ejecutar matriz completa de pruebas
- corregir regresiones
- cerrar checklist de produccion

### Bloque final

- ensayo general de lanzamiento
- salida controlada
- monitoreo de primeras compras y primeras publicaciones

## Conclusion

EditorialHub ya esta en una fase donde el principal trabajo restante es operativo. La recta final depende menos de construir funciones nuevas y mas de configurar, probar y lanzar con control.
