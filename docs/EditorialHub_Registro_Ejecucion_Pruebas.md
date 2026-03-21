# EditorialHub: Registro de Ejecucion de Pruebas

Ultima revision: 21 de marzo de 2026

## Instrucciones de uso

- Usar este archivo como bitacora de la corrida formal
- Tomar como fuente principal `EditorialHub_Matriz_Pruebas_Lanzamiento.md`
- Registrar cada caso con uno de estos estados: `OK`, `FALLO`, `BLOQUEADO`
- Si un caso falla, capturar al menos el paso exacto y el mensaje recibido

## Datos de corrida

- fecha:
- entorno:
- url frontend:
- url backend:
- responsable:
- commit o version:
- base de datos usada:
- notas previas:

## Usuarios y datos base

- lector de prueba:
- socio de prueba:
- admin de prueba:
- obra publicada usada para compra:
- obra pendiente usada para revision:

## Corrida P0

| ID | Caso | Estado | Evidencia minima | Observaciones |
|---|---|---|---|---|
| P0-01 | Registro de cuenta nueva |  |  |  |
| P0-02 | Verificacion de correo |  |  |  |
| P0-03 | Login |  |  |  |
| P0-04 | Recuperacion de contrasena |  |  |  |
| P0-05 | Catalogo publico |  |  |  |
| P0-06 | Compra de obra publicada |  |  |  |
| P0-07 | Reflejo en biblioteca |  |  |  |
| P0-08 | Descarga de manuscrito |  |  |  |
| P0-09 | Resena desde biblioteca |  |  |  |
| P0-10 | Creacion y envio de obra a revision |  |  |  |
| P0-11 | Revision editorial admin |  |  |  |
| P0-12 | Publicacion final de obra |  |  |  |
| P0-13 | Visualizacion de regalias |  |  |  |
| P0-14 | Solicitud de pago de regalias |  |  |  |
| P0-15 | Gestion admin de solicitud de pago |  |  |  |

## Incidencias detectadas

| Folio | Severidad | Caso relacionado | Descripcion | Responsable | Estatus |
|---|---|---|---|---|---|
| INC-001 |  |  |  |  |  |
| INC-002 |  |  |  |  |  |
| INC-003 |  |  |  |  |  |

## Resumen por bloque

### Publico

- estado general:
- observaciones:

### Socio

- estado general:
- observaciones:

### Admin

- estado general:
- observaciones:

## Decision final de la corrida

- apto para pasar al siguiente entorno:
- bloqueadores encontrados:
- riesgos abiertos:
- acciones inmediatas:

## Criterio sugerido de decision

- si existe algun `P0` en `FALLO`, no pasar a produccion
- si existe algun `P0` en `BLOQUEADO`, resolver o justificar formalmente antes de seguir
- si todos los `P0` estan en `OK`, continuar con `P1` y checklist final
