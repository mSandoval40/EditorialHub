# EditorialHub: Matriz de Pruebas de Lanzamiento

Ultima revision: 21 de marzo de 2026

## Uso

- Ejecutar esta matriz en preproduccion o en el entorno mas parecido posible a vivo
- Registrar resultado por caso: `OK`, `FALLO`, `BLOQUEADO`
- Si un caso falla, registrar evidencia minima: fecha, usuario, paso exacto y mensaje recibido
- Apoyarse en `EditorialHub_Registro_Ejecucion_Pruebas.md` y `EditorialHub_Hoja_Corrida_P0.md`

## Usuarios de prueba sugeridos

- Lector nuevo sin compras
- Socio colaborador con perfil completo
- Admin principal
- Obra publicada visible en catalogo
- Obra pendiente de revision

## Casos criticos P0

| ID | Flujo | Perfil | Pasos minimos | Resultado esperado |
|---|---|---|---|---|
| P0-01 | Registro | Publico | Registrar cuenta nueva con correo real | Cuenta creada y se solicita verificacion |
| P0-02 | Verificacion de correo | Publico | Capturar codigo o enlace de verificacion | Correo queda verificado y permite login |
| P0-03 | Login | Publico | Iniciar sesion con cuenta validada | Sesion iniciada y datos de usuario correctos |
| P0-04 | Recuperacion de contrasena | Publico | Solicitar codigo, resetear contrasena e iniciar sesion otra vez | Cambio exitoso y acceso restaurado |
| P0-05 | Catalogo publico | Publico | Abrir `Catalogo`, navegar secciones y abrir una ficha publica | Catalogo carga sin errores y la ficha abre correctamente |
| P0-06 | Compra | Lector | Comprar una obra publicada | Stripe procesa el pago y redirige a exito |
| P0-07 | Biblioteca | Lector | Abrir biblioteca despues de la compra | La obra comprada aparece en biblioteca |
| P0-08 | Descarga | Lector | Descargar manuscrito desde biblioteca | Descarga disponible y archivo corresponde a la obra comprada |
| P0-09 | Resena | Lector | Dejar resena desde biblioteca | Resena guardada y visible segun reglas actuales |
| P0-10 | Publicacion inicial | Socio | Crear obra, guardar borrador, subir archivos y enviar a revision | La obra entra a revision sin errores |
| P0-11 | Revision editorial | Admin | Ver obra pendiente y aprobarla | La obra cambia al estado correcto |
| P0-12 | Publicacion final | Admin | Publicar la obra aprobada | La obra se vuelve visible en catalogo |
| P0-13 | Regalias visibles | Socio | Abrir panel y revisar resumen de regalias | Los montos y tasas visibles cargan correctamente |
| P0-14 | Solicitud de pago | Socio | Solicitar pago de regalias | La solicitud queda registrada con trazabilidad |
| P0-15 | Gestion admin de regalias | Admin | Programar, marcar pagada o cancelar una solicitud | El cambio de estado queda reflejado y trazable |

## Casos importantes P1

| ID | Flujo | Perfil | Pasos minimos | Resultado esperado |
|---|---|---|---|---|
| P1-01 | Membresias | Publico | Abrir `Membresias` y revisar tabla de niveles | Rangos, puntos y explicacion coinciden con la logica actual |
| P1-02 | Perfil de socio completo | Socio | Completar nombre publico, datos fiscales y bancarios minimos | El sistema deja de mostrar bloqueos falsos |
| P1-03 | Bloqueo por perfil incompleto | Socio | Intentar publicar con perfil incompleto | El bloqueo aparece con mensaje claro |
| P1-04 | Catalogo ya autenticado | Admin/Socio | Entrar autenticado y abrir catalogo | El catalogo sigue siendo la portada principal |
| P1-05 | Ficha publica de autor | Publico | Abrir perfil publico de autor desde listado o desde obra | La informacion publica carga correctamente |
| P1-06 | Autores | Publico | Abrir `Autores`, navegar y filtrar si aplica | La vista carga sin errores ni rutas rotas |
| P1-07 | Panel del socio | Socio | Revisar panel, membresia, banco y publicaciones | No hay mensajes contradictorios ni datos vacios falsos |
| P1-08 | Admin general | Admin | Revisar listados de usuarios, autores y obras | La informacion principal carga y permite gestion |
| P1-09 | Terminos y legal | Publico | Abrir `Terminos` y revisar contenido visible | No aparecen textos de mock ni pendientes de lanzamiento |
| P1-10 | Cambio de ADMIN principal | Admin | Solicitar cambio y revisar entrega del correo o preview | El flujo responde segun SMTP o modo preview controlado |

## Casos de regresion P2

| ID | Flujo | Perfil | Pasos minimos | Resultado esperado |
|---|---|---|---|---|
| P2-01 | Logout y reingreso | Todos | Cerrar sesion y volver a iniciar | No se rompe persistencia de sesion |
| P2-02 | Usuario sin compras | Lector | Abrir biblioteca vacia | Mensaje vacio correcto |
| P2-03 | Usuario sin obras | Socio | Abrir panel/publicaciones sin obras | Mensaje vacio correcto |
| P2-04 | Cambio de contrasena autenticado | Socio/Admin | Cambiar contrasena desde sesion iniciada | Cambio exitoso y login posterior correcto |
| P2-05 | Favor socio / Diamante manual | Admin | Revisar usuario marcado manualmente | Se conserva el estado esperado |
| P2-06 | Membresia por puntos | Socio | Revisar usuario normal con actividad | Nivel y tasa coinciden con puntos actuales |
| P2-07 | Compra ya poseida | Lector | Intentar comprar una obra ya comprada | El sistema responde sin duplicidad incorrecta |
| P2-08 | Webhook diferido | Lector/Admin | Simular o revisar caso donde la compra tarda en reflejarse | Existe trazabilidad y reconciliacion operable |

## Evidencia minima por corrida

- Fecha y entorno probado
- URL frontend
- URL backend
- Responsable de la prueba
- Resultado por caso
- Lista corta de bloqueadores

## Criterio de salida

- Ningun caso `P0` en `FALLO`
- Ningun bloqueo falso en compra, publicacion o biblioteca
- Ninguna contradiccion visible entre membresias, regalias y panel
- Legal publico sin textos pendientes o provisionales
- Stripe, correo y base de datos probados en entorno real o preproductivo equivalente
