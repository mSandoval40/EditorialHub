# EditorialHub
## Documento de Continuidad 003

Fecha de emision: 2026-03-20

## 1. Proposito de este documento

Este documento fue preparado como punto de reentrada integral para futuras sesiones de trabajo sobre EditorialHub. Su objetivo es evitar perdida de contexto al reiniciar la computadora, cerrar la necesidad de volver a explicar decisiones ya tomadas y dejar asentado, con suficiente detalle, el estado real del proyecto al cierre de esta jornada.

No es solo un resumen historico. Tambien funciona como memoria operativa, fotografia ejecutiva del producto, registro de decisiones vigentes y guia concreta de continuidad. La intencion es que, al volver a abrir el proyecto, exista una referencia clara sobre que se hizo, que quedo estable, que no debe tocarse sin razon, que sigue pendiente y cual es el siguiente bloque de trabajo recomendado.

## 2. Estado general actual del proyecto

EditorialHub ya no esta en etapa de maqueta. El sistema tiene backend en NestJS, frontend en Next.js, modelo de datos en Prisma y una base funcional suficientemente seria para seguir evolucionando por bloques concretos de producto y operacion.

Actualmente el proyecto ya cuenta con:

- autenticacion, registro, recuperacion y verificacion de correo;
- panel de usuario;
- flujo de solicitud, aprobacion y rechazo de autor;
- creacion, edicion y envio de obras a revision;
- moderacion administrativa de obras;
- catalogo publico y ficha publica de obra;
- biblioteca del comprador;
- compras con Stripe a nivel de codigo;
- webhook de Stripe para confirmacion real;
- descarga protegida de manuscritos;
- modulo de regalías y solicitudes de pago ya presente en forma operativa;
- sistema base de fidelidad ya implementado;
- paneles internos para autores, socios y administracion.

El proyecto sigue en desarrollo activo, pero ya no esta peleando por sobrevivir tecnicamente. La base funcional existe. Lo que sigue es consolidar diferenciadores, pulir criterios de negocio y reforzar la capa economica y editorial para autores.

## 3. Relacion con los documentos previos

Durante esta jornada se retomaron y revisaron varios documentos existentes dentro de la carpeta `docs`, especialmente:

- `EditorialHub_Guia_Pendientes_Comparativo_EFP_vs_Actual.docx`;
- `editorialhub_analisis_ejecutivo_comparativo.md`;
- `EditorialHub_Continuidad_001-2026-03-19.docx`;
- `EditorialHub_Continuidad_002-2026-03-20.docx`;
- `EditorialHub_Continuidad_Trabajos_Resumen_Ejecutivo.docx`.

La conclusion importante es que algunos de esos documentos ya no reflejaban totalmente el estado real del codigo. En particular, el bloque de fidelidad estaba descrito como si siguiera sin implementarse, cuando en realidad ya existe una base funcional real. Por esa razon, tambien se actualizo `editorialhub_analisis_ejecutivo_comparativo.md` para que deje de tratar la fidelidad como vacio total y la pase a estado de consolidacion.

Este documento 003 toma ese punto como base y deja una fotografia mas fiel al estado actual.

## 4. Trabajo realizado y decisiones vigentes de esta etapa

### 4.1 Arranque tecnico y estabilizacion local

Se corrigieron problemas de levantamiento local que estaban bloqueando la continuidad del trabajo.

Se detecto que el frontend no levantaba por procesos viejos de `next dev`, puertos ocupados y lock activo en `.next/dev/lock`. Eso se limpio y se dejo claro que, si vuelve a aparecer el problema, la causa no es funcional sino de instancia vieja de desarrollo.

Tambien se detecto una falla real de backend en Prisma: faltaba en base de datos la columna `AuthorProfile.loyaltyManualLevel`. Se aplico la migracion correspondiente:

- `backend/prisma/migrations/20260320123000_add_author_loyalty_levels`

Despues de eso el backend dejo de tronar con error `42703 ColumnNotFound`.

### 4.2 Visibilidad de membresia en administracion y panel del usuario

Se trabajo sobre la visibilidad de la membresia o categoria de fidelidad del autor.

En la vista de `Autores` para ADMIN se dejaron visibles:

- badge de membresia en el listado;
- stat de membresia en el detalle;
- bloque explicito con categoria actual, tasa vigente, puntos y estado de Diamante.

En `Mi panel` del usuario tambien se agrego una tarjeta lateral de membresia visible, con:

- nivel actual;
- porcentaje asociado;
- puntos acumulados;
- puntos faltantes para el siguiente nivel;
- enlace a un detalle interno de membresia;
- colores por nivel para lectura rapida.

Con esto la membresia ya no depende de inferirse solo por la tasa de regalias.

### 4.3 Revisión del sistema de fidelidad

Se reviso el codigo real para contrastarlo contra la guia de pendientes. La conclusion fue clara: la fidelidad ya tiene implementacion funcional de base.

Hoy existe:

- calculo automatico de puntos;
- niveles Bronce, Plata, Oro y Platino;
- Diamante por asignacion manual administrativa;
- sincronizacion de la comision o tasa vigente con el nivel;
- exposicion del snapshot de fidelidad en backend;
- visibilidad en panel de usuario, autores y socios.

La logica actual de puntos considera:

- obras publicadas;
- ventas confirmadas;
- perfil publico completo.

Lo que no debe asumirse es que esta capa ya esta totalmente terminada. Sigue pendiente consolidar:

- recalculo programado o politica periodica formal;
- mayor presencia publica en catalogo y perfiles publicos;
- lectura mas pedagogica del beneficio economico por nivel;
- ampliaciones futuras de bonificaciones o aceleradores.

### 4.4 Revisión y correccion del flujo de validacion bancaria

Se realizo una revision funcional profunda del bloque bancario y de publicacion para autores.

Primero se comprobo que el backend si trae armado el cableado para validacion bancaria:

- solicitud del autor;
- revision administrativa;
- inicio de microdeposito;
- confirmacion por parte del autor;
- aprobacion o rechazo.

Tambien se verifico funcionalmente que ese flujo puede operar.

Sin embargo, durante la sesion se recordo y se restablecio una decision de negocio vigente:

La validacion bancaria real no debe bloquear al autor en esta etapa del proyecto.

La decision correcta y vigente hoy es esta:

- el sistema conserva todo el cableado de validacion bancaria para futuro;
- por ahora no es obligatoria para vender o publicar;
- si el usuario ya proporciono los datos bancarios completos, el estado visible se resuelve como `VALIDATED`;
- el autor ya puede continuar sin esperar revision administrativa real.

Eso significa que se corrigio una desviacion momentanea en la que el sistema estaba exigiendo validacion real para publicar. Esa exigencia fue retirada para volver al modo ligero definido por negocio.

### 4.5 Reinicio limpio de servicios y coherencia entre procesos

Durante la validacion del usuario `gsa.msandoval@gmail.com` se detecto una diferencia entre lo que se esperaba por negocio y lo que mostraba pantalla. La causa no fue de modelo de datos, sino de procesos viejos corriendo con logica anterior.

Se hizo reinicio limpio de backend y frontend, y despues de eso la lectura servida por API quedo alineada con la regla vigente:

- `bankValidationStatus: VALIDATED` visible cuando los datos bancarios estan completos.

El aprendizaje operativo aqui es importante: en este proyecto, cuando un cambio de regla parece no reflejarse, primero debe sospecharse de procesos viejos o cache local antes de asumir un error de negocio.

### 4.6 Ajustes de texto, criterio visual y consistencia entre admin y socio

Tambien se trabajaron varias piezas de criterio visual y continuidad funcional ya tratadas en documentos anteriores:

- mejora del panel de autores para ADMIN;
- unificacion de criterio de membresia visible;
- uso mas claro de etiquetas, tarjetas laterales y resúmenes;
- continuidad del trabajo previo de UX que ya venia de `Continuidad 002`.

## 5. Estado real del sistema de fidelidad

Este bloque merece dejarse separado porque fue uno de los puntos mas importantes de aclaracion.

Segun la revision del codigo actual, la fidelidad ya no debe tratarse como pendiente total. El estado real hoy es este:

- backend con reglas y snapshot funcional en `backend/src/authors/author-loyalty.util.ts`;
- exposicion en servicios de autores y usuarios;
- sincronizacion de `royaltyRatePercent` con el nivel vigente;
- gestion manual de Diamante desde administracion;
- lectura visible en vistas internas del sistema.

Por tanto, la clasificacion correcta no es:

- "fidelidad no implementada"

sino:

- "fidelidad implementada en base y pendiente de consolidacion"

Ese cambio de clasificacion ya quedo reflejado en `editorialhub_analisis_ejecutivo_comparativo.md`.

## 6. Estado real del bloque bancario y fiscal

El sistema ya tiene:

- captura de datos fiscales;
- captura de datos bancarios;
- cableado de validacion bancaria;
- control de estado bancario;
- reglas de cumplimiento para habilitar operacion.

Pero la regla vigente de negocio, al cierre de esta jornada, es la siguiente:

- no exigir validacion bancaria real en esta etapa;
- usar el flujo completo solo como preparacion para futuro;
- permitir operar al autor una vez capturados los datos necesarios;
- resolver visualmente el estado como `VALIDATED` cuando la informacion bancaria esta completa.

Esto debe respetarse hasta que se tome una decision expresa de endurecer la operacion.

## 7. Estado actual de administracion de autores, socios y panel

En esta jornada quedaron mas claros tres frentes:

### 7.1 Autores para ADMIN

La seccion de autores ya permite una lectura administrativa bastante mejor que antes:

- listado de autores;
- detalle dentro de la misma pagina;
- lectura visible de membresia;
- tasa vigente;
- puntos acumulados;
- mejor capacidad de identificar rapidamente el estado del autor.

### 7.2 Socios para ADMIN

La seccion de socios sigue siendo una de las referencias mas completas para leer fidelidad y estatus del colaborador. Ahí tambien se puede gestionar Diamante manual.

### 7.3 Mi panel para usuario

El panel del usuario ya muestra:

- membresia visible;
- porcentaje asociado;
- puntos;
- progreso al siguiente nivel;
- detalle interno de membresia.

Esto mejora la experiencia del autor y la hace mas coherente con la propuesta de valor del proyecto.

## 8. Verificaciones realizadas

Durante esta etapa se hicieron verificaciones tecnicas y funcionales concretas:

- migracion Prisma aplicada correctamente;
- backend recuperado despues del error de columna faltante;
- frontend levantando despues de resolver locks de `next dev`;
- verificacion de API en backend para estados de usuario y autor;
- confirmacion de que el usuario con datos bancarios completos queda visible como `VALIDATED` en el modo ligero vigente;
- compilacion del frontend con `next build` en varios bloques de cambios;
- compilacion del backend con `npm run build` en los bloques de servicio afectados.

Tambien se hizo verificacion funcional del flujo bancario completo como prueba de que el cableado existe, aunque hoy no se use como requisito obligatorio.

## 9. Lo que ya no debe volver a discutirse desde cero

Para evitar retrocesos de contexto en sesiones futuras, estas decisiones deben tomarse como vigentes salvo nueva instruccion expresa:

- la validacion bancaria completa existe, pero por ahora no es requisito obligatorio para operar;
- cuando la informacion bancaria esta completa, el estado visible puede resolverse como `VALIDATED`;
- la fidelidad ya existe en base funcional;
- la membresia debe verse claramente tanto para ADMIN como para el propio usuario;
- los documentos comparativos deben leerse con criterio de estado actual del codigo, no como verdad absoluta si ya quedaron desactualizados;
- si un comportamiento parece no reflejar cambios recientes, primero se debe revisar si siguen corriendo procesos viejos.

## 10. Lo que sigue pendiente de verdad

Al cierre de esta jornada, lo pendiente no es rehacer la base. Lo pendiente real se concentra en capas de consolidacion y diferenciacion.

Los bloques pendientes mas importantes son:

- economia visible del autor;
- consolidacion publica y periodica de fidelidad;
- identidad publica fuerte de obra y autor;
- ID publico de obra;
- proteccion avanzada con marca de agua por comprador;
- trazabilidad mas forense de descarga;
- generador promocional con IA;
- compras como invitado y postventa automatizada, mas adelante;
- expansiones institucionales y de marca, despues.

## 11. Que sigue segun la ruta actual

Despues de revisar el archivo de guia de pendientes y contrastarlo con el estado real del codigo, la lectura mas correcta del siguiente paso es esta:

### 11.1 Siguiente bloque principal recomendado

El siguiente bloque fuerte de trabajo es:

- reforzar la economia visible del autor

Eso incluye revisar y fortalecer:

- desglose por venta;
- comision de plataforma;
- costo del procesador;
- neto autor;
- saldo acumulado;
- saldo disponible;
- historial de solicitudes de pago;
- lectura administrativa de liquidaciones.

La razon para poner esto como siguiente paso es que la fidelidad ya tiene una base funcional, mientras que la capa economica sigue necesitando mas claridad operativa y mas fuerza narrativa para el autor.

### 11.2 Siguiente bloque despues de ese

Despues de reforzar la economia visible del autor, lo siguiente natural es:

- consolidar publicamente la fidelidad ya implementada

Es decir:

- badges mas visibles en catalogo y ficha de autor;
- lectura mas fuerte del beneficio por subir de nivel;
- posible recalculo programado;
- mayor consistencia publica del sistema.

### 11.3 Bloques posteriores

Despues de esos dos frentes:

- ID publico de obra;
- presencia publica mas fuerte del autor;
- marca de agua y trazabilidad reforzada;
- generador de promocion asistida con IA.

## 12. Riesgos o puntos de cuidado para la siguiente sesion

Hay varios riesgos de contexto que conviene dejar expresos:

- no asumir que un documento viejo sigue reflejando el estado actual del codigo;
- no endurecer el flujo bancario sin recordar la decision actual de negocio;
- no reabrir como debate base algo que ya esta implementado, como la fidelidad funcional;
- no confundir problemas de instancia local con problemas de logica de producto;
- no perder tiempo en capas vistosas si antes no se consolida economia visible del autor.

## 13. Recomendacion operativa para retomar

Cuando se vuelva a abrir la computadora y se retome el proyecto, el orden recomendado es este:

1. confirmar que backend y frontend levanten limpio;
2. tomar este documento como punto de reentrada;
3. asumir como vigentes las decisiones de banca y fidelidad asentadas aqui;
4. abrir el frente de economia visible del autor;
5. revisar, a partir de codigo real, que ya existe en regalías, ventas y solicitudes de pago;
6. definir el cierre visual y operativo de esa capa antes de moverse a IA o expansiones.

## 14. Conclusión ejecutiva

EditorialHub se encuentra en una etapa mucho mas madura que la descrita por los documentos de continuidad iniciales. La plataforma ya tiene base operativa real, fidelidad funcional, paneles internos mas consistentes y un criterio de negocio bancario ya aclarado para no frenar el avance.

La fotografia correcta al cierre de esta jornada no es la de un sistema incompleto en lo esencial, sino la de una plataforma ya funcional que necesita consolidar mejor sus ventajas competitivas.

La prioridad ya no es construir desde cero. La prioridad es ordenar y cerrar con mas fuerza los bloques que convierten a EditorialHub en una propuesta editorial realmente diferenciada.

La siguiente gran tarea, por tanto, es dejar mucho mas clara la economia del autor dentro de la plataforma. Una vez resuelto eso, la continuidad natural sera reforzar publicamente la fidelidad ya existente y seguir avanzando hacia identidad editorial, proteccion avanzada e IA promocional.
