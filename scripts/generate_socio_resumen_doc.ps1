$docPath = 'c:\proyectos\editorialhub\docs\EditorialHub_Resumen_Ejecutivo_Calificaciones_Comentarios_Socio_Favorecido.docx'
$tmp = Join-Path $env:TEMP ('edh_docx_' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tmp | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tmp '_rels') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tmp 'word') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tmp 'word\_rels') | Out-Null

$contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
'@

$rels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
'@

$wordRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships" />
'@

$body = @'
EditorialHub - Resumen Ejecutivo y Operativo
Sistema de Calificaciones, Comentarios y Socio_Favorecido

1. Proposito del documento
Este documento deja asentado el planteamiento funcional, operativo y tecnico de la futura capa de calificaciones, comentarios y favorecimiento editorial dentro de EditorialHub. Su objetivo es preservar con claridad las decisiones tomadas, evitar que la logica quede dispersa entre conversaciones y servir como base de continuidad antes de entrar a la implementacion.

2. Punto de partida del sistema
EditorialHub ya evoluciono hacia una identidad visible unica: Socio. De cara al usuario, la plataforma no debe fragmentar la experiencia entre comprador y autor como si fueran identidades distintas. Un Socio puede comprar, publicar, mantener biblioteca y operar su perfil dentro de una misma cuenta. De cara al sistema, todavia existen roles y elementos internos de compatibilidad, pero estos ya no deben dominar la experiencia del producto.

Con esa base, la siguiente evolucion natural del sistema es incorporar una capa real de reputacion y conversacion alrededor de las obras publicadas: estrellas, promedio, calificaciones, comentarios y reseñas visibles para otros socios. Esta capa debe construirse correctamente desde su origen, con reglas autenticas, trazabilidad y control editorial administrado.

3. Objetivo del sistema de calificaciones y comentarios
El objetivo no es solo mostrar adornos visuales de estrellas en el catalogo. El objetivo es construir un flujo real de valor reputacional para cada obra publicada.

Ese sistema debe permitir:
- mostrar una calificacion promedio por obra en el Catalogo,
- mostrar estrellas y volumen de interaccion,
- exponer comentarios y reseñas en el detalle de la obra,
- permitir que socios compradores califiquen obras que realmente adquirieron,
- mantener una capa editorial diferenciada para favorecer de manera controlada ciertas obras propias,
- conservar trazabilidad interna entre opinion organica y presentacion editorial.

4. Flujo real de calificaciones y comentarios
El sistema base se construira sobre reseñas autenticas, vinculadas a compras reales.

Flujo operativo base:
1. Un Socio compra una obra.
2. La compra queda confirmada y la obra aparece en su biblioteca.
3. Solo un Socio con compra confirmada puede calificar y comentar esa obra.
4. El Socio puede dejar una calificacion de 1 a 5 estrellas.
5. El Socio puede dejar un comentario o reseña sobre la obra.
6. El sistema guarda esa reseña asociada al socio, a la obra y a la compra confirmada.
7. El Catalogo usa esas reseñas para mostrar una calificacion visible por obra.
8. El detalle de la obra muestra comentarios, estrellas y resumen de reputacion.

Decisiones operativas recomendadas para la primera version:
- Una reseña por socio por obra.
- La reseña puede editarse posteriormente por ese mismo socio.
- El comentario puede ser obligatorio o recomendado; la decision final puede dejarse para implementacion.
- La calificacion siempre debe estar ligada a una compra real confirmada.
- La reseña original no debe perderse ni sobrescribirse opacamente.

5. Presentacion en el Catalogo y en el detalle de la obra
En el Catalogo, cada obra debe mostrar una presentacion limpia y comercialmente util. La referencia visual buscada es una superficie ordenada, parecida a una vitrina comercial de ebooks, donde las estrellas y el promedio acompañan a la portada sin ensuciar la interfaz.

En el Catalogo se debera mostrar:
- promedio de estrellas,
- cantidad de calificaciones o reseñas,
- posibilidad de mostrar una señal editorial adicional si aplica,
- prioridad visual clara pero sin saturacion.

En el detalle de la obra se debera mostrar:
- promedio de estrellas,
- desglose de reseñas,
- comentarios de socios compradores,
- comentarios editoriales cuando existan,
- jerarquia entre contenido organico y contenido editorial.

6. Principio rector: reseña organica separada de intervencion editorial
Se definio como criterio tecnico correcto que el sistema no debe manipular opacamente los datos originales. La reseña organica del socio comprador debe existir y conservarse como fuente autentica. Sin embargo, se acepta una segunda capa de intervencion editorial administrada para la presentacion publica de ciertas obras.

Esto significa:
- la reseña original del socio se conserva,
- el sistema puede tener una capa visible de curaduria editorial,
- la capa editorial no destruye la fuente organica,
- la capa editorial queda trazable y administrada,
- la vista publica puede combinar señal organica y señal editorial.

7. Favorecimiento editorial dentro del proyecto
EditorialHub nace como un proyecto impulsado para dar mayor visibilidad a obras que, en plataformas masivas, quedan enterradas entre miles o millones de titulos. Por esa razon, se acepta de forma explicita la construccion de una capa de favorecimiento editorial dentro del propio proyecto.

Ese favorecimiento editorial no se plantea como alteracion silenciosa del dato fuente, sino como una facultad deliberada de impulso editorial controlado. Su razon de ser es estrategica y comercial: dar posicion, visibilidad y mejores condiciones de exhibicion a ciertas obras propias dentro del ecosistema de EditorialHub.

8. Limite clave: el favorecimiento no se hara desde la cuenta ADMIN como identidad editorial
Se identifico un hueco importante: no es deseable que la cuenta ADMIN se use directamente para publicar obras y, a la vez, para operar la plataforma. Mezclar administracion tecnica e identidad editorial generaria ruido, confusion y mala separacion de responsabilidades.

Por eso se tomo la decision de introducir una figura interna especial: Socio_Favorecido.

9. Definicion de Socio_Favorecido
Socio_Favorecido sera una designacion interna, administrativa y no publica. No sera una identidad visible para el usuario comun, ni un rol comercial exhibido en la interfaz publica. Sera una marca interna del sistema para identificar al socio cuyas obras podran recibir el tratamiento de favorecimiento editorial.

Principios de Socio_Favorecido:
- Es una designacion interna.
- No sustituye la identidad base de Socio.
- No convierte a la persona en administrador.
- Sirve para determinar que las obras publicadas por ese socio son elegibles para herramientas especiales de impulso editorial.
- Se asigna desde administracion, no desde auto registro.
- Su finalidad es separar la identidad editorial favorecida de la cuenta ADMIN.

10. Consecuencia funcional de Socio_Favorecido
Toda obra publicada y generada desde un socio marcado internamente como Socio_Favorecido sera considerada obra elegible para favorecimiento editorial.

Eso permitira mantener dos planos claramente separados:
- plano tecnico y administrativo: manejado por ADMIN,
- plano editorial favorecido: representado por las obras del Socio_Favorecido.

11. Facultades editoriales proyectadas sobre obras de Socio_Favorecido
La capa de favorecimiento editorial aplicable a las obras de Socio_Favorecido podra incluir, entre otras herramientas:
- comentario editorial especial,
- reseña editorial visible,
- destacamiento de ciertas reseñas reales,
- ocultamiento de reseñas visibles en la capa publica,
- prioridad de comentarios en el detalle,
- orden editorial de reseñas,
- insignias de recomendacion editorial,
- calificacion editorial visible diferenciada de la organica,
- impulso de exhibicion en Catalogo y detalle.

La filosofia de esta capa es clara: favorecer editorialmente ciertas obras propias dentro del sistema sin borrar la fuente organica original.

12. Panel administrativo de Socios
Se establecio expresamente que el proceso de identificar y asignar a un Socio_Favorecido debe realizarse desde un panel especifico de Socios accesible solo desde ADMIN.

Este punto es critico y no debe quedar ambiguo.

Flujo operativo del panel de Socios:
1. El administrador principal entra al area ADMIN.
2. Desde ADMIN accede a una seccion o panel llamado Socios.
3. Ese panel lista socios existentes con informacion util para identificarlos.
4. El administrador principal puede revisar sus datos, etiquetas administrativas y actividad.
5. Desde ese panel se puede marcar o retirar la designacion de Socio_Favorecido.
6. Una vez asignada la designacion, las obras publicadas por ese socio quedan elegibles para la capa de favorecimiento editorial.

13. Alcance del panel de Socios accesible solo desde ADMIN
Debe quedar claro que este panel no es una herramienta abierta a todos los administradores secundarios ni a otros socios. La intencion planteada es que la designacion de Socio_Favorecido sea una facultad altamente restringida.

Por lo tanto, el panel de Socios debe cumplir estas reglas:
- Debe vivir bajo el area ADMIN.
- Debe estar protegido por permisos administrativos.
- Debe servir como punto central para localizar socios y asignarles etiquetas especiales.
- Debe registrar auditoria interna de cambios.
- Debe exponer el estado actual de cada socio: identidad base, etiquetas administrativas, actividad y, de ser el caso, si ya es Socio_Favorecido.

14. Informacion que deberia mostrar el panel de Socios
El panel de Socios deberia mostrar como minimo:
- correo del socio,
- nombre publico del perfil colaborador,
- fecha de alta,
- cantidad de obras creadas,
- cantidad de compras confirmadas,
- etiquetas administrativas derivadas (Socio lector, Socio autor, Socio mixto, etc.),
- indicador visible de si el socio ya esta marcado como Socio_Favorecido.

Acciones esperadas en ese panel:
- Asignar como Socio_Favorecido.
- Retirar privilegio de Socio_Favorecido.
- Ver resumen de actividad del socio.
- Navegar a sus obras para identificar rapidamente cuales son elegibles para impulso editorial.

15. Diferencia entre ADMIN y Socio_Favorecido
La separacion conceptual debe quedar firme:
- ADMIN gobierna la plataforma, configura, supervisa y opera.
- Socio_Favorecido publica obras elegibles para impulso editorial.

ADMIN no debe ser la identidad editorial que publica para luego favorecerse directamente. Esa mezcla se considera inadecuada para el orden del sistema. En su lugar, ADMIN designa a un Socio_Favorecido y las obras de ese socio se convierten en la base del tratamiento editorial privilegiado.

16. Estructura recomendada de datos para la siguiente etapa
Aunque en este documento no se implementa todavia la base de datos de reseñas, se deja recomendado el siguiente enfoque conceptual:

Capa 1. Reseña organica real
- obra,
- socio comprador,
- compra confirmada,
- estrellas,
- comentario,
- fecha,
- estado visible.

Capa 2. Resumen organico
- promedio real,
- cantidad real de reseñas,
- distribucion por estrellas.

Capa 3. Intervencion editorial administrada
- comentario editorial,
- reseñas destacadas,
- reseñas ocultas de la vista publica,
- orden editorial de aparicion,
- calificacion editorial visible,
- prioridad de exhibicion.

Capa 4. Vinculo de elegibilidad
- la obra debe pertenecer a un Socio_Favorecido para permitir la capa editorial privilegiada.

17. Ruta recomendada de implementacion
Se sugiere abordar la implementacion por etapas, en este orden:

Fase 1. Infraestructura de Socio_Favorecido
- crear la marca interna de Socio_Favorecido,
- crear el panel de Socios bajo ADMIN,
- habilitar asignacion y retiro de esa designacion,
- registrar auditoria de esos cambios.

Fase 2. Reseñas reales de compradores
- modelo de datos de calificaciones y comentarios,
- endpoints de creacion, edicion y lectura,
- exposicion de promedio y conteo en Catalogo y detalle.

Fase 3. Capa editorial privilegiada
- comentarios editoriales,
- reseñas destacadas,
- reseñas ocultas,
- orden editorial,
- calificacion editorial visible,
- herramientas de presentacion de impulso.

Fase 4. Integracion visual completa
- estrellas en Catalogo,
- comentarios en detalle,
- insignias editoriales,
- jerarquia entre opinion organica y capa editorial.

18. Decision ejecutiva consolidada
La decision consolidada es la siguiente:
- EditorialHub tendra un sistema real de calificaciones y comentarios ligado a compras autenticas.
- La reseña organica del socio comprador sera la base original del sistema.
- Encima de esa base existira una capa de intervencion editorial administrada.
- El favorecimiento editorial no se operara directamente desde la cuenta ADMIN como identidad editorial.
- Para ese fin se introducira una designacion interna llamada Socio_Favorecido.
- Toda obra generada y publicada desde un Socio_Favorecido sera elegible para herramientas de favorecimiento editorial.
- La asignacion y gestion de Socio_Favorecido se hara desde un panel de Socios accesible solo desde ADMIN.

19. Cierre
Este documento deja registrada la logica de negocio, la separacion conceptual y la ruta operativa acordada para que el tema no quede en el aire ni dependa de la memoria de una conversacion aislada. Su funcion es servir como documento de continuidad antes de la fase de implementacion.
'@

$xml = New-Object System.Xml.XmlDocument
$xml.LoadXml('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>')
$manager = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$manager.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
$bodyNode = $xml.SelectSingleNode('//w:body', $manager)
$ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

foreach ($paragraph in ($body -split "`r?`n`r?`n")) {
  $p = $xml.CreateElement('w', 'p', $ns)
  $r = $xml.CreateElement('w', 'r', $ns)
  $lines = $paragraph -split "`r?`n"

  for ($i = 0; $i -lt $lines.Length; $i++) {
    $t = $xml.CreateElement('w', 't', $ns)
    $spaceAttr = $xml.CreateAttribute('xml', 'space', 'http://www.w3.org/XML/1998/namespace')
    $spaceAttr.Value = 'preserve'
    $t.Attributes.Append($spaceAttr) | Out-Null
    $t.InnerText = $lines[$i]
    $r.AppendChild($t) | Out-Null

    if ($i -lt ($lines.Length - 1)) {
      $br = $xml.CreateElement('w', 'br', $ns)
      $r.AppendChild($br) | Out-Null
    }
  }

  $p.AppendChild($r) | Out-Null
  $bodyNode.AppendChild($p) | Out-Null
}

$sectPr = $xml.CreateElement('w', 'sectPr', $ns)
$pgSz = $xml.CreateElement('w', 'pgSz', $ns)
foreach ($name in @('w', 'h')) {
  $attr = $xml.CreateAttribute('w', $name, $ns)
  $attr.Value = if ($name -eq 'w') { '12240' } else { '15840' }
  $pgSz.Attributes.Append($attr) | Out-Null
}
$sectPr.AppendChild($pgSz) | Out-Null

$pgMar = $xml.CreateElement('w', 'pgMar', $ns)
foreach ($entry in @(
  @('top', '1440'),
  @('right', '1440'),
  @('bottom', '1440'),
  @('left', '1440'),
  @('header', '708'),
  @('footer', '708'),
  @('gutter', '0')
)) {
  $attr = $xml.CreateAttribute('w', $entry[0], $ns)
  $attr.Value = $entry[1]
  $pgMar.Attributes.Append($attr) | Out-Null
}
$sectPr.AppendChild($pgMar) | Out-Null
$bodyNode.AppendChild($sectPr) | Out-Null

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $tmp '[Content_Types].xml'), $contentTypes, $utf8NoBom)
[System.IO.File]::WriteAllText((Join-Path $tmp '_rels\.rels'), $rels, $utf8NoBom)
$xml.Save((Join-Path $tmp 'word\document.xml'))
[System.IO.File]::WriteAllText((Join-Path $tmp 'word\_rels\document.xml.rels'), $wordRels, $utf8NoBom)

if (Test-Path $docPath) { Remove-Item $docPath -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tmp, $docPath)
Remove-Item $tmp -Recurse -Force
Write-Output $docPath
