$ErrorActionPreference = "Stop"
function E([string]$t){ if($null -eq $t){return ""}; [System.Security.SecurityElement]::Escape($t) }
function P([string]$t,[string]$s=""){
  $x=E $t
  if([string]::IsNullOrWhiteSpace($s)){ return "<w:p><w:r><w:t xml:space='preserve'>$x</w:t></w:r></w:p>" }
  return "<w:p><w:pPr><w:pStyle w:val='$s'/></w:pPr><w:r><w:t xml:space='preserve'>$x</w:t></w:r></w:p>"
}

$root="c:\\proyectos\\editorialhub"
$docs=Join-Path $root "docs"
$template=Join-Path $docs "EditorialHub_Manual_Mantenimiento.docx"
$out=Join-Path $docs "EditorialHub_Resumen_Ejecutivo_Servicios_y_Pendientes.docx"
$issued=Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$title="EditorialHub - Resumen Ejecutivo de Servicios Contratados, Configurados y Pendientes"

$lines=@(
  @{t=$title;s="Title"},
  @{t="Documento ejecutivo amplio sobre Cloudflare, Vercel, Railway, R2 y siguientes pasos";s="Subtitle"},
  @{t="Version del documento: 1.0";s=""},
  @{t="Fecha de emision: $issued";s=""},
  @{t="1. Resumen ejecutivo";s="Heading1"},
  @{t="EditorialHub avanzo de forma importante en la preparacion de su infraestructura base. Durante esta etapa se definio la arquitectura objetivo recomendada para la plataforma, se seleccionaron los servicios principales y se ejecuto el alta inicial de las cuentas y recursos mas importantes. La estrategia aprobada fue: Cloudflare Registrar para dominio y capa de DNS, Vercel para el frontend, Railway para backend y base de datos PostgreSQL, y Cloudflare R2 para almacenamiento de archivos.";s=""},
  @{t="A la fecha, el dominio editorialhub.com.mx ya fue contratado y quedo activo en Cloudflare. La cuenta de Vercel ya fue creada, vinculada con GitHub y preparada para el futuro despliegue del frontend. La cuenta de Railway tambien fue creada, vinculada con GitHub, y ya cuenta con una base PostgreSQL funcional y en linea. La parte que intencionalmente se dejo pendiente fue el despliegue real del frontend en Vercel y del backend en Railway, debido a que el estado mas reciente del proyecto sigue estando en local y aun no se ha subido a GitHub.";s=""},
  @{t="La decision de detener el despliegue antes de conectarlo a una version antigua del repositorio fue correcta. Esto evito publicar una version desactualizada o inconsistente del sistema. La infraestructura ya esta encaminada y preparada, pero el paso final de publicacion debe realizarse cuando exista una version local suficientemente estable, ordenada y subida correctamente al repositorio.";s=""},
  @{t="2. Arquitectura objetivo aprobada";s="Heading1"},
  @{t="La arquitectura recomendada para EditorialHub quedo definida de la siguiente forma:";s=""},
  @{t="- Cloudflare Registrar: registro y administracion del dominio oficial.";s=""},
  @{t="- Cloudflare DNS: administracion de zona DNS y enrutamiento de subdominios.";s=""},
  @{t="- Vercel: hosting y despliegue del frontend construido con Next.js.";s=""},
  @{t="- Railway: hosting del backend construido con NestJS y servicio administrado de PostgreSQL.";s=""},
  @{t="- Cloudflare R2: almacenamiento futuro de archivos, portadas, contraportadas, PDFs y otros assets.";s=""},
  @{t="La ventaja de esta arquitectura es que separa responsabilidades de forma limpia. Cada servicio cubre una funcion clara y especializada. Esto simplifica la operacion, mejora escalabilidad y reduce el riesgo de improvisar una plataforma productiva sobre un solo hosting inadecuado.";s=""},
  @{t="3. Trabajo realizado en Cloudflare";s="Heading1"},
  @{t="En Cloudflare ya se completo la etapa mas importante: la compra y activacion del dominio editorialhub.com.mx. El dominio quedo activo dentro de la cuenta del proyecto y la renovacion automatica se mantuvo habilitada. Esto protege a la marca contra expiraciones accidentales y evita el riesgo de perder el dominio por falta de renovacion manual.";s=""},
  @{t="Tambien quedo confirmado que el dominio esta asociado a la cuenta correcta y que Cloudflare ya se encuentra listo para fungir como administrador principal del dominio. Esto deja resuelta la base de identidad digital de EditorialHub.";s=""},
  @{t="Adicionalmente, quedo claro que Cloudflare podra servir despues para dos funciones extra: la administracion de DNS y la configuracion futura de Cloudflare R2 para archivos. Tambien se explico que, aunque el dominio ya exista, eso no significa que automaticamente existan correos funcionales como admin@editorialhub.com.mx. Para eso sera necesario, mas adelante, configurar reenvio de correo o contratar un proveedor de buzones profesionales.";s=""},
  @{t="4. Trabajo realizado en Vercel";s="Heading1"},
  @{t="En Vercel ya se avanzo hasta el punto correcto de preparacion de plataforma. Se creo la cuenta, se selecciono el contexto comercial del proyecto, se definio un espacio de trabajo para EditorialHub y se autorizo la integracion con GitHub usando la cuenta mSandoval40. Vercel ya puede ver el repositorio EditorialHub y esta listo para importarlo como proyecto.";s=""},
  @{t="Tambien se verifico que Vercel detecta correctamente el proyecto como Next.js y que la configuracion preliminar del frontend puede montarse desde la raiz del repositorio. En la interfaz ya quedo listo el nombre de proyecto editorialhub.";s=""},
  @{t="Sin embargo, no se ejecuto el deploy final. La razon fue tecnica y totalmente valida: Vercel despliega lo que ya se encuentre en GitHub, no necesariamente lo mas reciente en la maquina local. Como el trabajo actual mas avanzado de EditorialHub todavia no ha sido subido al repositorio remoto, desplegar en este momento habria significado publicar una version vieja del sistema. La integracion ya esta preparada, pero el despliegue debe retomarse despues de subir el estado correcto del proyecto.";s=""},
  @{t="5. Trabajo realizado en Railway";s="Heading1"},
  @{t="En Railway tambien se completo la preparacion de cuenta y se avanzo hasta la creacion exitosa de la base de datos PostgreSQL. La cuenta fue autenticada con GitHub, se aceptaron las condiciones iniciales de uso y se llego al dashboard del workspace personal.";s=""},
  @{t="Hubo un intento inicial que arrojo el mensaje Team not found, pero el problema no era estructural. Railway aun no habia quedado bien ubicado en el workspace adecuado. Una vez que se regreso al dashboard correcto y se creo el recurso desde el flujo apropiado, la base PostgreSQL se genero sin problema.";s=""},
  @{t="La base creada quedo dentro de un proyecto que Railway nombro automaticamente como jubilant-contentment. Ese nombre no representa un error ni una mala configuracion; es simplemente el nombre interno que Railway asigna si el usuario no define uno manualmente. Dentro de ese proyecto ya existe el servicio Postgres en estado Online y con todas sus variables de entorno generadas, incluyendo DATABASE_URL, PGHOST, PGPORT, PGUSER, PGPASSWORD y otras auxiliares.";s=""},
  @{t="Lo que no se hizo todavia fue crear el servicio del backend conectado al repositorio. La razon fue la misma que en Vercel: Railway desplegaria el contenido actual de GitHub, y en este momento la version mas actual del backend sigue existiendo localmente. Se concluyo correctamente que no conviene publicar el backend desde una referencia vieja.";s=""},
  @{t="6. Lo que ya quedo efectivamente resuelto";s="Heading1"},
  @{t="A esta fecha, los puntos que pueden darse por resueltos son los siguientes:";s=""},
  @{t="- Dominio oficial contratado: editorialhub.com.mx.";s=""},
  @{t="- Dominio activo en Cloudflare con renovacion automatica.";s=""},
  @{t="- Cuenta de Vercel creada y vinculada con GitHub.";s=""},
  @{t="- Repositorio EditorialHub visible desde Vercel.";s=""},
  @{t="- Cuenta de Railway creada y vinculada con GitHub.";s=""},
  @{t="- Base PostgreSQL creada en Railway y en estado Online.";s=""},
  @{t="- Variables de base de datos disponibles para futura conexion del backend.";s=""},
  @{t="En terminos ejecutivos, eso significa que la fundacion de infraestructura ya esta montada. No se trata solo de ideas o cotizaciones: ya hay activos reales contratados y configurados.";s=""},
  @{t="7. Lo que deliberadamente se dejo pendiente";s="Heading1"},
  @{t="No se trata de omisiones. Son pasos detenidos de forma consciente para no publicar una version desactualizada del sistema.";s=""},
  @{t="- Deploy del frontend en Vercel.";s=""},
  @{t="- Deploy del backend en Railway.";s=""},
  @{t="- Conexion real entre frontend productivo y backend productivo.";s=""},
  @{t="- Configuracion del almacenamiento de archivos en Cloudflare R2.";s=""},
  @{t="- Configuracion de correos con dominio.";s=""},
  @{t="La causa comun de estas pausas es una sola: el estado mas actual del proyecto aun no se ha subido a GitHub y por lo tanto no es prudente hacer deploy publico.";s=""},
  @{t="8. Justificacion de la pausa antes del deploy";s="Heading1"},
  @{t="La pausa fue una decision correcta de gobierno tecnico. En plataformas como Vercel y Railway, el despliegue de repositorios integrados depende del contenido que ya esta almacenado en GitHub. Si el repositorio remoto no refleja el estado real mas reciente del sistema, la publicacion resultante puede ser confusa, vieja o incluso romper expectativas del proyecto.";s=""},
  @{t="Publicar antes de tiempo habria generado una falsa percepcion de avance y posteriormente obligaria a rehacer o sobreescribir infraestructura sobre una base que no representa el trabajo local actual. Al detenerse ahora, se conservaron los beneficios del onboarding y de la contratacion, sin asumir el costo tecnico de un despliegue prematuro.";s=""},
  @{t="9. Lo que falta por hacer";s="Heading1"},
  @{t="Los pendientes se pueden dividir en tres grupos: preparacion del codigo, cierre de infraestructura y salida controlada.";s=""},
  @{t="9.1 Preparacion del codigo";s="Heading2"},
  @{t="- Revisar y estabilizar localmente el estado actual del proyecto.";s=""},
  @{t="- Definir un punto de corte suficientemente solido para primer despliegue.";s=""},
  @{t="- Ordenar commits y subir el estado correcto a GitHub.";s=""},
  @{t="Este punto es el habilitador real para Vercel y Railway.";s=""},
  @{t="9.2 Cierre de infraestructura";s="Heading2"},
  @{t="- En Vercel: importar definitivamente el proyecto y ejecutar el primer deploy.";s=""},
  @{t="- En Railway: agregar el servicio del backend desde GitHub.";s=""},
  @{t="- Configurar variables del backend y vincularlo con la base PostgreSQL.";s=""},
  @{t="- Configurar subdominios en Cloudflare, por ejemplo www.editorialhub.com.mx y api.editorialhub.com.mx.";s=""},
  @{t="- Conectar el dominio con Vercel y posteriormente el subdominio de API con Railway.";s=""},
  @{t="9.3 Componentes pendientes de maduracion";s="Heading2"},
  @{t="- Implementar Cloudflare R2 para almacenamiento real de archivos.";s=""},
  @{t="- Definir estrategia de correo con dominio, al menos via email routing o proveedor profesional.";s=""},
  @{t="- Validar flujo de entorno productivo, incluyendo webhooks, URLs reales y variables seguras.";s=""},
  @{t="10. Riesgos si se avanza sin seguir el orden correcto";s="Heading1"},
  @{t="Los principales riesgos identificados son los siguientes:";s=""},
  @{t="- Desplegar una version de GitHub que no representa el trabajo actual.";s=""},
  @{t="- Generar confusiones entre entorno local y entorno publicado.";s=""},
  @{t="- Tener frontend o backend productivo apuntando a configuraciones incompletas.";s=""},
  @{t="- Posponer demasiado la migracion de archivos a R2 y seguir dependiendo de almacenamiento local.";s=""},
  @{t="- Publicar antes de terminar la organizacion basica del repositorio y sus variables.";s=""},
  @{t="Todos estos riesgos son evitables si se mantiene el orden ya acordado: primero consolidar el codigo local, luego subir a GitHub, y solo despues completar deploys y enlaces productivos.";s=""},
  @{t="11. Ruta recomendada de retomada";s="Heading1"},
  @{t="Cuando se retome esta linea de trabajo, la secuencia recomendada es la siguiente:";s=""},
  @{t="1. Hacer un corte tecnico del proyecto local.";s=""},
  @{t="2. Limpiar, ordenar y subir el estado bueno del repositorio a GitHub.";s=""},
  @{t="3. Terminar el deploy del frontend en Vercel.";s=""},
  @{t="4. Crear el servicio backend en Railway desde el repositorio.";s=""},
  @{t="5. Configurar variables y conexion con PostgreSQL.";s=""},
  @{t="6. Configurar dominio y subdominios en Cloudflare.";s=""},
  @{t="7. Implementar R2 para archivos.";s=""},
  @{t="8. Validar pruebas finales de entorno casi productivo.";s=""},
  @{t="12. Conclusion ejecutiva";s="Heading1"},
  @{t="EditorialHub ya no esta en fase de solo planeacion de servicios. El dominio oficial ya fue contratado, las cuentas principales ya fueron creadas, Vercel ya esta vinculado con GitHub, Railway ya dispone de una base PostgreSQL activa y la arquitectura objetivo ya quedo decidida.";s=""},
  @{t="Lo que falta ya no es definir la estrategia general, sino completar la fase de publicacion con orden y oportunidad. La clave ahora no es contratar mas por contratar, sino terminar de preparar el estado correcto del proyecto para que el primer despliegue en Vercel y Railway refleje fielmente el trabajo local ya construido.";s=""},
  @{t="En resumen, la infraestructura ya esta suficientemente encaminada. El siguiente gran hito no es comprar otro servicio, sino preparar la version correcta del codigo para terminar el enlace entre GitHub, Vercel, Railway y Cloudflare sin comprometer calidad ni consistencia.";s=""}
)

$body = (($lines | ForEach-Object { P $_.t $_.s }) -join "") + "<w:sectPr><w:pgSz w:w='12240' w:h='15840'/><w:pgMar w:top='1440' w:right='1440' w:bottom='1440' w:left='1440' w:header='708' w:footer='708' w:gutter='0'/></w:sectPr>"
$doc = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?><w:document xmlns:wpc='http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas' xmlns:mc='http://schemas.openxmlformats.org/markup-compatibility/2006' xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships' xmlns:m='http://schemas.openxmlformats.org/officeDocument/2006/math' xmlns:v='urn:schemas-microsoft-com:vml' xmlns:wp14='http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing' xmlns:wp='http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing' xmlns:w10='urn:schemas-microsoft-com:office:word' xmlns:w='http://schemas.openxmlformats.org/wordprocessingml/2006/main' xmlns:w14='http://schemas.microsoft.com/office/word/2010/wordml' xmlns:wpg='http://schemas.microsoft.com/office/word/2010/wordprocessingGroup' xmlns:wpi='http://schemas.microsoft.com/office/word/2010/wordprocessingInk' xmlns:wne='http://schemas.microsoft.com/office/word/2006/wordml' xmlns:wps='http://schemas.microsoft.com/office/word/2010/wordprocessingShape' mc:Ignorable='w14 wp14'><w:body>$body</w:body></w:document>"
$created=(Get-Date).ToUniversalTime().ToString("s")+"Z"
$core="<?xml version='1.0' encoding='UTF-8' standalone='yes'?><cp:coreProperties xmlns:cp='http://schemas.openxmlformats.org/package/2006/metadata/core-properties' xmlns:dc='http://purl.org/dc/elements/1.1/' xmlns:dcterms='http://purl.org/dc/terms/' xmlns:dcmitype='http://purl.org/dc/dcmitype/' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'><dc:title>$(E $title)</dc:title><dc:subject>Infraestructura, servicios y pendientes de EditorialHub</dc:subject><dc:creator>Codex</dc:creator><cp:keywords>EditorialHub, Cloudflare, Vercel, Railway, R2, infraestructura</cp:keywords><dc:description>Resumen ejecutivo sobre servicios contratados, configurados y pendientes.</dc:description><cp:lastModifiedBy>Codex</cp:lastModifiedBy><dcterms:created xsi:type='dcterms:W3CDTF'>$created</dcterms:created><dcterms:modified xsi:type='dcterms:W3CDTF'>$created</dcterms:modified></cp:coreProperties>"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$tmp = Join-Path $env:TEMP ("editorialhub_doc_" + [guid]::NewGuid().ToString("N"))
$zipOut = "$out.zip"
if(Test-Path $tmp){ Remove-Item $tmp -Recurse -Force }
if(Test-Path $out){ Remove-Item $out -Force }
if(Test-Path $zipOut){ Remove-Item $zipOut -Force }
New-Item -ItemType Directory -Path $tmp | Out-Null
[System.IO.Compression.ZipFile]::ExtractToDirectory($template,$tmp)
[IO.File]::WriteAllText((Join-Path $tmp 'word\\document.xml'),$doc,[Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $tmp 'docProps\\core.xml'),$core,[Text.UTF8Encoding]::new($false))
[System.IO.Compression.ZipFile]::CreateFromDirectory($tmp,$zipOut)
Move-Item $zipOut $out -Force
Remove-Item $tmp -Recurse -Force

Write-Output \"Documento generado: $out\"
