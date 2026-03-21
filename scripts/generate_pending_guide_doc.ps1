$ErrorActionPreference = "Stop"

function E([string]$t) {
  if ($null -eq $t) { return "" }
  return [System.Security.SecurityElement]::Escape($t)
}

function P([string]$t, [string]$s = "") {
  $x = E $t
  if ([string]::IsNullOrWhiteSpace($s)) {
    return "<w:p><w:r><w:t xml:space='preserve'>$x</w:t></w:r></w:p>"
  }

  return "<w:p><w:pPr><w:pStyle w:val='$s'/></w:pPr><w:r><w:t xml:space='preserve'>$x</w:t></w:r></w:p>"
}

$root = "c:\proyectos\editorialhub"
$docs = Join-Path $root "docs"
$template = Join-Path $docs "EditorialHub_Manual_Mantenimiento.docx"
$out = Join-Path $docs "EditorialHub_Guia_Pendientes_Comparativo_EFP_vs_Actual.docx"
$issued = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$title = "EditorialHub - Guia de Pendientes Prioritarios"

$lines = @(
  @{ t = $title; s = "Title" },
  @{ t = "Comparativo explicado entre el EFP historico, las continuidades recientes y el estado actual del sistema"; s = "Subtitle" },
  @{ t = "Version del documento: 1.0"; s = "" },
  @{ t = "Fecha de emision: $issued"; s = "" },

  @{ t = "1. Proposito del documento"; s = "Heading1" },
  @{ t = "Este documento sirve como guia de trabajo para no perder el rumbo entre lo que EditorialHub ya construyo y lo que el documento fundacional todavia planteaba como parte importante del producto. No es una lista ciega de deseos: es una seleccion razonada de pendientes con valor real para continuidad."; s = "" },
  @{ t = "La idea central es distinguir que falta porque todavia no existe, que falta porque solo esta parcial y que conviene priorizar para acercar la plataforma a su propuesta de valor original sin romper la base funcional ya consolidada."; s = "" },

  @{ t = "2. Punto de partida actual"; s = "Heading1" },
  @{ t = "EditorialHub ya cuenta con una base funcional seria. Hoy existen autenticacion, registro, verificacion de correo, catalogo, panel, biblioteca, publicacion de obras, revision administrativa, compras con Stripe, webhook, descarga protegida, reseñas basicas, expediente de colaborador, validacion bancaria inicial y un modulo operativo de regalias con solicitud y gestion administrativa de pagos."; s = "" },
  @{ t = "Eso significa que el proyecto ya no esta en fase de idea ni de maqueta. El trabajo pendiente ya no consiste en inventar la plataforma desde cero, sino en activar sus diferenciadores mas fuertes y cerrar las capas que todavia no expresan completa la vision del EFP."; s = "" },

  @{ t = "3. Criterio de priorizacion"; s = "Heading1" },
  @{ t = "Los pendientes se ordenan aqui segun cuatro criterios: impacto en la propuesta de valor, cercania con el estado actual del sistema, utilidad para el autor y capacidad de servir como base para etapas posteriores. En otras palabras, primero va lo que vuelve mas fuerte a EditorialHub como producto real, no solo como lista de funciones."; s = "" },

  @{ t = "4. Pendientes prioritarios de primer nivel"; s = "Heading1" },

  @{ t = "4.1 Sistema de fidelidad real y visible"; s = "Heading2" },
  @{ t = "Este es el pendiente mas importante respecto al EFP. El documento fundacional presenta la fidelidad no como un adorno gamificado, sino como el principal diferenciador comercial para atraer y retener autores. Hoy todavia no existe el motor operativo completo."; s = "" },
  @{ t = "Que falta concretamente: calculo real de puntos, niveles Bronce/Plata/Oro/Platino/Diamante, recalcado o recorte mensual segun la regla final, badges visibles, progreso hacia el siguiente nivel, tratamiento especial de Diamante y reflejo de la comision real vigente por autor."; s = "" },
  @{ t = "Por que importa: sin esto, la plataforma ya vende y publica, pero no expresa la ventaja economica que la haria mas atractiva frente a opciones masivas. EditorialHub funciona, pero todavia no comunica ni materializa su promesa de permanencia recompensada."; s = "" },
  @{ t = "Recomendacion operativa: construir primero el modelo de datos y el calculo interno, luego exponerlo en panel y finalmente volverlo visible en autores y catalogo mediante badges o senales controladas."; s = "" },

  @{ t = "4.2 Economia del autor mas clara y mas potente"; s = "Heading2" },
  @{ t = "El sistema ya tiene regalias y solicitudes de pago, lo cual es un avance importante. Sin embargo, todavia falta convertir esa base operativa en una experiencia economica realmente clara para el autor."; s = "" },
  @{ t = "Que falta concretamente: desglose mas comprensible por venta, visualizacion mas fuerte de cuanto vende el autor, cuanto retiene la plataforma, cuanto queda al autor, cuanto esta reservado, cuanto esta disponible y como cambiaria ese resultado si sube de nivel de fidelidad."; s = "" },
  @{ t = "Por que importa: la transparencia economica era uno de los compromisos centrales del EFP. Si el autor no entiende su negocio dentro de EditorialHub con rapidez, la plataforma sigue siendo funcional, pero no termina de verse como un sistema comercial serio y diferenciado."; s = "" },
  @{ t = "Recomendacion operativa: aprovechar el modulo actual de regalias como base y reforzar la capa de presentacion en panel, admin y detalle por venta antes de abrir funciones mas complejas."; s = "" },

  @{ t = "4.3 Identidad publica fuerte de obra y autor"; s = "Heading2" },
  @{ t = "El EFP insistia en que la plataforma no debia tratar al autor como un proveedor anonimo de archivos, sino como una figura editorial visible. Parte de eso ya existe con perfiles, biografia e imagen publica, pero todavia falta consolidar mejor la identidad publica de autores y obras."; s = "" },
  @{ t = "Que falta concretamente: sistema real de badges ligados a estado o nivel, mayor peso publico del perfil del autor, mejor presentacion de trayectoria editorial y, sobre todo, el ID publico de obra como sello permanente de EditorialHub."; s = "" },
  @{ t = "Por que importa: esta capa ayuda a que la plataforma deje de sentirse solo como una tienda de ebooks y se perciba mas claramente como una editorial digital con criterio propio."; s = "" },
  @{ t = "Recomendacion operativa: priorizar primero el ID publico de obra y la presencia visible del autor en catalogo y detalle. Los adornos secundarios pueden venir despues."; s = "" },

  @{ t = "4.4 Herramienta promocional asistida con IA"; s = "Heading2" },
  @{ t = "El EFP planteaba una herramienta para generar flyers, copies y, a futuro, piezas de video. Esa parte todavia no existe operativamente en el sistema actual."; s = "" },
  @{ t = "Que falta concretamente: un flujo donde el autor pueda seleccionar obra, tono o formato y generar piezas promocionales utiles desde su panel, al menos en una primera version simple de texto y grafica estatica."; s = "" },
  @{ t = "Por que importa: este no es un capricho cosmetico. Es una de las piezas que mejor sostienen la promesa de que EditorialHub no solo deja publicar y vender, sino tambien promocionar."; s = "" },
  @{ t = "Recomendacion operativa: empezar por copies y flyers basicos antes de pensar en video. Lo importante es que exista un primer motor real y util."; s = "" },

  @{ t = "4.5 Proteccion avanzada del archivo y marca de agua"; s = "Heading2" },
  @{ t = "Ya hay descarga protegida, claves de descarga, expiracion e intentos, lo cual resuelve parte del problema. Aun asi, el EFP iba mas alla con watermarking por comprador e identidad publica mas fuerte del archivo entregado."; s = "" },
  @{ t = "Que falta concretamente: insertar datos de compra o comprador en el archivo descargado, integrar el ID publico de obra en la entrega y reforzar la trazabilidad de cada descarga en una capa mas forense."; s = "" },
  @{ t = "Por que importa: esta mejora fortalece seguridad, trazabilidad y percepcion profesional del sistema sin rehacer el flujo actual de biblioteca."; s = "" },
  @{ t = "Recomendacion operativa: dejarlo como evolucion del flujo actual de descarga, no como rediseño completo del modulo de compras."; s = "" },

  @{ t = "5. Pendientes importantes de segundo nivel"; s = "Heading1" },

  @{ t = "5.1 Compra como invitado"; s = "Heading2" },
  @{ t = "El EFP la proponia como forma de reducir friccion comercial. Hoy el sistema esta construido alrededor de usuario autenticado y biblioteca propia."; s = "" },
  @{ t = "Que falta concretamente: checkout sin cuenta, asociacion por correo, recuperacion posterior de compra y estrategia para migrar esas compras a una cuenta si el comprador luego se registra."; s = "" },
  @{ t = "Por que importa: puede mejorar conversion, pero tambien agrega complejidad operativa, legal y de soporte. Por eso es importante, aunque no necesariamente lo mas urgente."; s = "" },
  @{ t = "Recomendacion operativa: tratarlo como decision deliberada de producto. No conviene meterlo solo porque el EFP lo menciona; conviene activarlo cuando el flujo actual este mas maduro."; s = "" },

  @{ t = "5.2 Recuperacion de compra y postventa automatizada"; s = "Heading2" },
  @{ t = "Relacionada con lo anterior, falta una capa mas fuerte de recuperacion de compras por correo o por referencia para reducir soporte manual."; s = "" },
  @{ t = "Que falta concretamente: reenvio de accesos, recuperacion de descargas, mejor historial de compra y reglas claras para renovacion o regeneracion controlada de acceso."; s = "" },
  @{ t = "Por que importa: mejora confianza del comprador y reduce carga operativa para administracion."; s = "" },

  @{ t = "5.3 Conciliacion, reembolsos y contracargos"; s = "Heading2" },
  @{ t = "La capa de compra real ya existe, pero todavia no esta completamente cerrada la operacion financiera alrededor de incidentes y conciliacion."; s = "" },
  @{ t = "Que falta concretamente: reglas completas de reembolso, tratamiento de contracargos, impacto en saldos o puntos, y mejor lectura administrativa del ciclo completo del dinero."; s = "" },
  @{ t = "Por que importa: esta parte es menos visible para marketing, pero muy importante para operar con menos riesgo cuando el uso real crezca."; s = "" },

  @{ t = "5.4 Panel de autores y expediente mas profundo"; s = "Heading2" },
  @{ t = "La seccion de autores ya mejoro mucho, pero aun hay espacio para enriquecer el detalle de autor, la lectura administrativa y la presentacion de informacion relevante."; s = "" },
  @{ t = "Que falta concretamente: mejor resumen de actividad, mas contexto editorial, mejor lectura de estatus y eventual integracion con fidelidad, badges y economica del autor."; s = "" },
  @{ t = "Por que importa: ayuda tanto a administracion como a la narrativa publica de la plataforma."; s = "" },

  @{ t = "6. Pendientes estrategicos de tercer nivel"; s = "Heading1" },

  @{ t = "6.1 Barra de marcas ancla y publicidad institucional"; s = "Heading2" },
  @{ t = "El EFP la planteaba como construccion de prestigio y no como monetizacion inmediata. Hoy no existe como modulo maduro."; s = "" },
  @{ t = "Por que importa: puede reforzar la imagen institucional, pero no bloquea el funcionamiento presente del sistema."; s = "" },

  @{ t = "6.2 Generador institucional para la propia marca"; s = "Heading2" },
  @{ t = "Separado del generador para autores, el EFP pensaba una herramienta promocional para la plataforma misma."; s = "" },
  @{ t = "Por que importa: es util para crecimiento futuro, pero conviene despues de tener primero el generador base del autor."; s = "" },

  @{ t = "6.3 Video promocional y extensiones de fases posteriores"; s = "Heading2" },
  @{ t = "Estas ideas conservan valor estrategico, pero no deben competir por prioridad contra fidelidad, economia y proteccion de obra."; s = "" },

  @{ t = "7. Pendientes que ya no deben verse como vacio total"; s = "Heading1" },
  @{ t = "Conviene dejar asentado que algunas piezas del EFP ya no pertenecen a la categoria pendiente total. Por ejemplo, regalias y solicitudes de pago ya existen en forma funcional, la compra real con Stripe ya existe, la bitacora ya existe en varias acciones relevantes y la separacion entre perfiles certificados y anonimos ya esta absorbida por el modelo."; s = "" },
  @{ t = "Esto es importante para no rehacer trabajo que ya esta avanzado ni evaluar el sistema actual con una foto antigua."; s = "" },

  @{ t = "8. Ruta sugerida para no perdernos"; s = "Heading1" },
  @{ t = "Orden recomendado de continuidad:"; s = "" },
  @{ t = "1. Consolidar fidelidad real en datos y panel."; s = "" },
  @{ t = "2. Reforzar economia visible del autor usando la base actual de regalias."; s = "" },
  @{ t = "3. Implementar ID publico de obra y fortalecer identidad publica de autor y obra."; s = "" },
  @{ t = "4. Evolucionar proteccion de descarga con marca de agua y trazabilidad reforzada."; s = "" },
  @{ t = "5. Construir generador promocional basico para autores."; s = "" },
  @{ t = "6. Revaluar compra como invitado cuando el flujo autenticado ya este mas redondo."; s = "" },
  @{ t = "7. Dejar para despues las capas institucionales y de expansion."; s = "" },

  @{ t = "9. Conclusion ejecutiva"; s = "Heading1" },
  @{ t = "El proyecto ya tiene una base real y funcional. El vacio principal ya no es de infraestructura basica, sino de diferenciacion. Lo que mas vale rescatar del EFP no es una lista infinita de modulos, sino las piezas que convierten a EditorialHub en una plataforma editorial claramente distinta: fidelidad, economia legible para el autor, identidad editorial visible, promocion asistida y proteccion fuerte de la obra."; s = "" },
  @{ t = "Mientras esa ruta se mantenga clara, este documento puede servir como referencia de continuidad para decidir que construir despues y para evitar que el trabajo diario se disperse en tareas menos importantes."; s = "" }
)

$body = (($lines | ForEach-Object { P $_.t $_.s }) -join "") + "<w:sectPr><w:pgSz w:w='12240' w:h='15840'/><w:pgMar w:top='1440' w:right='1440' w:bottom='1440' w:left='1440' w:header='708' w:footer='708' w:gutter='0'/></w:sectPr>"
$doc = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?><w:document xmlns:wpc='http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas' xmlns:mc='http://schemas.openxmlformats.org/markup-compatibility/2006' xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships' xmlns:m='http://schemas.openxmlformats.org/officeDocument/2006/math' xmlns:v='urn:schemas-microsoft-com:vml' xmlns:wp14='http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing' xmlns:wp='http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing' xmlns:w10='urn:schemas-microsoft-com:office:word' xmlns:w='http://schemas.openxmlformats.org/wordprocessingml/2006/main' xmlns:w14='http://schemas.microsoft.com/office/word/2010/wordml' xmlns:wpg='http://schemas.microsoft.com/office/word/2010/wordprocessingGroup' xmlns:wpi='http://schemas.microsoft.com/office/word/2010/wordprocessingInk' xmlns:wne='http://schemas.microsoft.com/office/word/2006/wordml' xmlns:wps='http://schemas.microsoft.com/office/word/2010/wordprocessingShape' mc:Ignorable='w14 wp14'><w:body>$body</w:body></w:document>"
$created = (Get-Date).ToUniversalTime().ToString("s") + "Z"
$core = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?><cp:coreProperties xmlns:cp='http://schemas.openxmlformats.org/package/2006/metadata/core-properties' xmlns:dc='http://purl.org/dc/elements/1.1/' xmlns:dcterms='http://purl.org/dc/terms/' xmlns:dcmitype='http://purl.org/dc/dcmitype/' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'><dc:title>$(E $title)</dc:title><dc:subject>Guia de pendientes prioritarios</dc:subject><dc:creator>Codex</dc:creator><cp:keywords>EditorialHub, pendientes, EFP, continuidad, priorizacion</cp:keywords><dc:description>Documento de trabajo con pendientes explicados y priorizados a partir del comparativo entre el EFP y el estado actual.</dc:description><cp:lastModifiedBy>Codex</cp:lastModifiedBy><dcterms:created xsi:type='dcterms:W3CDTF'>$created</dcterms:created><dcterms:modified xsi:type='dcterms:W3CDTF'>$created</dcterms:modified></cp:coreProperties>"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$tmp = Join-Path $env:TEMP ("editorialhub_pending_guide_" + [guid]::NewGuid().ToString("N"))
$zipOut = "$out.zip"

if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
if (Test-Path $out) { Remove-Item $out -Force }
if (Test-Path $zipOut) { Remove-Item $zipOut -Force }

New-Item -ItemType Directory -Path $tmp | Out-Null
[System.IO.Compression.ZipFile]::ExtractToDirectory($template, $tmp)
[IO.File]::WriteAllText((Join-Path $tmp 'word\document.xml'), $doc, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $tmp 'docProps\core.xml'), $core, [Text.UTF8Encoding]::new($false))
[System.IO.Compression.ZipFile]::CreateFromDirectory($tmp, $zipOut)
Move-Item $zipOut $out -Force
Remove-Item $tmp -Recurse -Force

Write-Output "Documento generado: $out"
