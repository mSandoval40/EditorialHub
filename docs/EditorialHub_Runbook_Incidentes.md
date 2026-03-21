# EditorialHub: Runbook de Incidentes

## Objetivo

Responder con rapidez y criterio cuando algo critico falle en vivo.

## Incidente 1. Compra pagada no reflejada en biblioteca

### Revisar

- estado de la compra en base de datos
- estado del intento de pago
- webhook de Stripe
- logs del backend de compras

### Accion inicial

- verificar si la compra quedo en `PENDING`
- intentar reconciliacion desde flujo ya existente
- validar si el webhook estaba caido o mal configurado

## Incidente 2. Stripe webhook sin llegar

### Revisar

- URL configurada en Stripe
- `STRIPE_WEBHOOK_SECRET`
- accesibilidad del backend publico
- logs del endpoint webhook

### Accion inicial

- corregir URL o secreto
- repetir evento de prueba desde Stripe
- confirmar procesamiento correcto

## Incidente 3. Correo no sale

### Revisar

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- logs del backend

### Accion inicial

- confirmar si el sistema cayo en modo preview
- corregir SMTP
- reenviar prueba

## Incidente 4. Usuario no puede publicar

### Revisar

- perfil de socio colaborador
- CURP
- fecha de nacimiento
- nombre o razon social
- datos bancarios minimos

### Accion inicial

- revisar mensaje mostrado en `Mi panel`
- confirmar bloqueo correcto en `Publicar`

## Incidente 5. Solicitud de regalías atascada

### Revisar

- estado de solicitud
- `scheduledFor`
- `providerReference`
- logs de regalías
- modo `ROYALTIES_PAYOUT_PROVIDER_MODE`

### Accion inicial

- confirmar si esta en modo simulado
- reintentar o cancelar segun estado
- registrar nota administrativa

## Regla general

- no improvisar cambios directos sin registro
- registrar fecha, responsable y accion tomada
- documentar causa raiz despues de estabilizar
