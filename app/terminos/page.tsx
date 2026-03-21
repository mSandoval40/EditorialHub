import { SiteSectionHeader } from "@/components/site-section-header";

export default function TerminosPage() {
  return (
    <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
      <SiteSectionHeader
        title="Terminos, Privacidad y Cookies"
        activeNav="terminos"
        chips={[
          { label: "Terminos", href: "#terminos" },
          { label: "Privacidad", href: "#privacidad" },
          { label: "Cookies", href: "#cookies" },
        ]}
      />

      <div style={{ backgroundColor: '#f5f5f3', borderBottom: '3px solid #013473', padding: '40px 32px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ color: '#037D8C', fontSize: '13px', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Documentos legales
          </p>
          <h1 style={{ color: '#013473', fontSize: '32px', margin: '0 0 12px 0', fontWeight: 'bold' }}>
            Términos, Privacidad y Cookies
          </h1>
          <p style={{ color: '#93908B', fontSize: '14px', margin: 0 }}>
            Última actualización: 21 de marzo de 2026. Estos documentos constituyen la base operativa vigente para la etapa actual de EditorialHub y podrán actualizarse cuando cambien reglas de producto, operación o cumplimiento.
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: '#013473', padding: '16px 32px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <a href="#terminos" style={{ color: '#FFFFFF', textDecoration: 'none', fontSize: '14px', borderBottom: '2px solid #037D8C', paddingBottom: '2px' }}>
            1. Términos de Uso
          </a>
          <a href="#privacidad" style={{ color: '#FFFFFF', textDecoration: 'none', fontSize: '14px', borderBottom: '2px solid #037D8C', paddingBottom: '2px' }}>
            2. Política de Privacidad
          </a>
          <a href="#cookies" style={{ color: '#FFFFFF', textDecoration: 'none', fontSize: '14px', borderBottom: '2px solid #037D8C', paddingBottom: '2px' }}>
            3. Aviso de Cookies
          </a>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 32px' }}>
        {/* SECCIÓN 1: TÉRMINOS DE USO */}
        <section id="terminos" style={{ marginBottom: '64px' }}>
          <div style={{ borderLeft: '4px solid #013473', paddingLeft: '20px', marginBottom: '32px' }}>
            <h2 style={{ color: '#013473', fontSize: '24px', margin: '0 0 4px 0', fontWeight: 'bold' }}>
              1. Términos de Uso
            </h2>
            <p style={{ color: '#93908B', fontSize: '13px', margin: 0 }}>
              Versión operativa vigente
            </p>
          </div>

          {[
            { num: '1.', titulo: 'Aceptación', texto: 'Al usar EditorialHub, el usuario acepta los presentes términos. Si no está de acuerdo, no debe usar la plataforma.' },
            { num: '2.', titulo: 'Descripción del servicio', texto: 'EditorialHub es una plataforma digital de distribución y venta de libros en formato electrónico. Actúa como intermediario entre autores y compradores.' },
            { num: '3.', titulo: 'Registro de autores', texto: 'El autor declara que la información proporcionada al registrarse es verídica. Es responsable de mantener la confidencialidad de su contraseña y de toda actividad realizada desde su cuenta.' },
            { num: '4.', titulo: 'Publicación de obras', texto: 'El autor declara ser titular de los derechos de autor de las obras que publica o contar con autorización expresa para comercializarlas. EditorialHub no asume responsabilidad por disputas de derechos de autor entre terceros.' },
            { num: '5.', titulo: 'Comisiones', texto: 'EditorialHub cobra una comisión variable entre el 2% y el 10% sobre el precio de venta de cada obra, según el nivel de fidelidad del autor. La comisión vigente al momento de la transacción es la que aplica.' },
            { num: '6.', titulo: 'Compras y entregas', texto: 'Las compras son definitivas salvo que el archivo no haya sido descargado y la solicitud de reembolso se realice dentro de las 48 horas siguientes a la compra. El comprador es responsable de proporcionar un correo electrónico correcto para la entrega.' },
            { num: '7.', titulo: 'Contenido prohibido', texto: 'Queda prohibida la publicación de contenido que viole la ley mexicana, incite al odio o discriminación, o involucre material sexual con menores de edad. EditorialHub se reserva el derecho de retirar cualquier contenido que viole estas condiciones.' },
            { num: '8.', titulo: 'Reembolsos y contracargos', texto: 'El costo de un reembolso o contracargo se divide 50/50 entre la plataforma y el autor. Un reembolso solo aplica dentro de las primeras 48 horas desde la compra y únicamente si el archivo no ha sido descargado. Una vez descargado, no procede reembolso automático.' },
            { num: '9.', titulo: 'Limitación de responsabilidad', texto: 'EditorialHub no es responsable por daños directos o indirectos derivados del uso de la plataforma, incluyendo pérdida de datos o interrupciones del servicio.' },
            { num: '10.', titulo: 'Modificaciones', texto: 'EditorialHub se reserva el derecho de modificar estos términos en cualquier momento. Los usuarios serán notificados de cambios relevantes.' },
            { num: '11.', titulo: 'Ley aplicable', texto: 'Estos términos se rigen por las leyes de los Estados Unidos Mexicanos.' },
          ].map((art) => (
            <div key={art.num} style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
              <span style={{ color: '#013473', fontWeight: 'bold', fontSize: '15px', minWidth: '28px', paddingTop: '1px' }}>
                {art.num}
              </span>
              <div>
                <span style={{ color: '#013473', fontWeight: 'bold', fontSize: '15px' }}>
                  {art.titulo}.{' '}
                </span>
                <span style={{ color: '#444444', fontSize: '15px', lineHeight: '1.7' }}>
                  {art.texto}
                </span>
              </div>
            </div>
          ))}

          <div
            style={{
              backgroundColor: '#f5f5f3',
              border: '1px solid #e0e0e0',
              borderLeft: '4px solid #037D8C',
              padding: '20px 24px',
              borderRadius: '4px',
              marginTop: '32px',
            }}
          >
            <p style={{ color: '#013473', fontWeight: 'bold', fontSize: '14px', margin: '0 0 8px 0' }}>
              Aviso fiscal para autores
            </p>
            <p style={{ color: '#444444', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
              Las ventas realizadas a través de esta plataforma pueden generar obligaciones fiscales conforme a las leyes aplicables en tu país o región. Es tu responsabilidad conocer y cumplir dichas obligaciones. La plataforma mantiene registro de todas las transacciones y puede ser requerida a reportarlas ante las autoridades fiscales correspondientes.
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#f5f5f3',
              border: '1px solid #e0e0e0',
              borderLeft: '4px solid #93908B',
              padding: '20px 24px',
              borderRadius: '4px',
              marginTop: '16px',
            }}
          >
            <p style={{ color: '#013473', fontWeight: 'bold', fontSize: '14px', margin: '0 0 8px 0' }}>
              Aviso fiscal para compradores
            </p>
            <p style={{ color: '#444444', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
              Esta transacción queda registrada. Si requieres comprobante fiscal, contacta directamente al autor o a la plataforma antes de completar tu compra.
            </p>
          </div>
        </section>

        <div style={{ borderTop: '2px solid #e8e8e8', marginBottom: '64px' }} />

        {/* SECCIÓN 2: POLÍTICA DE PRIVACIDAD */}
        <section id="privacidad" style={{ marginBottom: '64px' }}>
          <div style={{ borderLeft: '4px solid #013473', paddingLeft: '20px', marginBottom: '32px' }}>
            <h2 style={{ color: '#013473', fontSize: '24px', margin: '0 0 4px 0', fontWeight: 'bold' }}>
              2. Política de Privacidad
            </h2>
            <p style={{ color: '#93908B', fontSize: '13px', margin: 0 }}>
              Versión base — sujeta a revisión legal profesional
            </p>
          </div>

          {[
            { num: '1.', titulo: 'Datos que recopilamos', texto: 'EditorialHub recopila: correo electrónico, datos de perfil proporcionados voluntariamente, datos de transacciones y datos técnicos de navegación (IP, dispositivo, navegador).' },
            { num: '2.', titulo: 'Uso de los datos', texto: 'Los datos se usan para: procesar transacciones, entregar los productos comprados, gestionar cuentas de autores, enviar comunicaciones relacionadas con el servicio y cumplir con obligaciones legales.' },
            { num: '3.', titulo: 'Compartir datos', texto: 'EditorialHub no vende datos personales a terceros. Comparte datos únicamente con procesadores de pago (Stripe, PayPal) y servicios de correo transaccional necesarios para operar la plataforma.' },
            { num: '4.', titulo: 'Retención de datos', texto: 'Los datos de transacciones se conservan por el tiempo que requiera la legislación fiscal aplicable. Los datos de cuenta se conservan mientras la cuenta esté activa.' },
            { num: '5.', titulo: 'Derechos del usuario', texto: 'El usuario puede solicitar acceso, corrección o eliminación de sus datos personales escribiendo al correo de contacto de la plataforma.' },
            { num: '6.', titulo: 'Cookies', texto: 'La plataforma usa cookies técnicas necesarias para el funcionamiento del sitio. No usa cookies de rastreo publicitario de terceros.' },
            { num: '7.', titulo: 'Seguridad', texto: 'EditorialHub implementa medidas técnicas razonables para proteger los datos personales. Sin embargo, ningún sistema es completamente seguro.' },
            { num: '8.', titulo: 'Contacto', texto: 'Para cualquier consulta sobre privacidad, el usuario puede escribir al correo de contacto oficial de la plataforma.' },
          ].map((art) => (
            <div key={art.num} style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
              <span style={{ color: '#013473', fontWeight: 'bold', fontSize: '15px', minWidth: '28px', paddingTop: '1px' }}>
                {art.num}
              </span>
              <div>
                <span style={{ color: '#013473', fontWeight: 'bold', fontSize: '15px' }}>
                  {art.titulo}.{' '}
                </span>
                <span style={{ color: '#444444', fontSize: '15px', lineHeight: '1.7' }}>
                  {art.texto}
                </span>
              </div>
            </div>
          ))}

          <div style={{ marginTop: '32px' }}>
            <p style={{ color: '#013473', fontWeight: 'bold', fontSize: '15px', marginBottom: '16px' }}>
              Tabla de datos recopilados y su uso
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#013473' }}>
                  <th style={{ color: '#FFFFFF', padding: '12px 16px', textAlign: 'left', fontWeight: 'normal' }}>
                    Dato recopilado
                  </th>
                  <th style={{ color: '#FFFFFF', padding: '12px 16px', textAlign: 'left', fontWeight: 'normal' }}>
                    Uso en el sistema
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Correo del comprador', 'Entrega del archivo, confirmación de compra, soporte. No se comparte con el autor.'],
                  ['Datos del autor (nombre, bio, foto)', 'Perfil público visible en el catálogo. El autor controla qué publica.'],
                  ['Método de pago del autor', 'Solo para liquidaciones. No se almacena información de tarjeta.'],
                  ['Historial de ventas', 'Reportes internos, cálculo de saldo y fidelidad. No es público.'],
                  ['Datos de uso de la herramienta IA', 'Cálculo de puntos de fidelidad. No se venden ni comparten.'],
                ].map(([dato, uso], i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#f5f5f3',
                      borderBottom: '1px solid #e8e8e8',
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: '#013473', fontWeight: 'bold', verticalAlign: 'top' }}>
                      {dato}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#444444', lineHeight: '1.6' }}>
                      {uso}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div style={{ borderTop: '2px solid #e8e8e8', marginBottom: '64px' }} />

        {/* SECCIÓN 3: AVISO DE COOKIES */}
        <section id="cookies" style={{ marginBottom: '64px' }}>
          <div style={{ borderLeft: '4px solid #013473', paddingLeft: '20px', marginBottom: '32px' }}>
            <h2 style={{ color: '#013473', fontSize: '24px', margin: '0 0 4px 0', fontWeight: 'bold' }}>
              3. Aviso de Cookies
            </h2>
            <p style={{ color: '#93908B', fontSize: '13px', margin: 0 }}>
              Versión base — sujeta a revisión legal profesional
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#f5f5f3',
              border: '1px solid #e0e0e0',
              padding: '28px 32px',
              borderRadius: '4px',
              lineHeight: '1.8',
            }}
          >
            <p style={{ color: '#444444', fontSize: '15px', margin: 0 }}>
              EditorialHub utiliza cookies técnicas necesarias para el funcionamiento del sitio, como el mantenimiento de sesión y preferencias básicas. No utilizamos cookies de rastreo publicitario de terceros. Al continuar usando el sitio, aceptas el uso de estas cookies.
            </p>
          </div>

          <div style={{ marginTop: '24px' }}>
            <p style={{ color: '#013473', fontWeight: 'bold', fontSize: '15px', marginBottom: '16px' }}>
              Tipos de cookies que usamos
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#013473' }}>
                  <th style={{ color: '#FFFFFF', padding: '12px 16px', textAlign: 'left', fontWeight: 'normal' }}>
                    Tipo
                  </th>
                  <th style={{ color: '#FFFFFF', padding: '12px 16px', textAlign: 'left', fontWeight: 'normal' }}>
                    Propósito
                  </th>
                  <th style={{ color: '#FFFFFF', padding: '12px 16px', textAlign: 'left', fontWeight: 'normal' }}>
                    Rastreo publicitario
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Sesión', 'Mantener al autor autenticado mientras navega el panel.', 'No'],
                  ['Preferencias', 'Recordar configuraciones básicas del usuario.', 'No'],
                  ['Seguridad', 'Protección contra solicitudes maliciosas (CSRF).', 'No'],
                ].map(([tipo, prop, rastreo], i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#f5f5f3',
                      borderBottom: '1px solid #e8e8e8',
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: '#013473', fontWeight: 'bold' }}>{tipo}</td>
                    <td style={{ padding: '12px 16px', color: '#444444', lineHeight: '1.6' }}>{prop}</td>
                    <td style={{ padding: '12px 16px', color: '#037D8C', fontWeight: 'bold' }}>{rastreo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div style={{ backgroundColor: '#013473', padding: '32px', borderRadius: '4px', textAlign: 'center' }}>
          <p style={{ color: '#FFFFFF', fontSize: '16px', margin: '0 0 20px 0' }}>
            ¿Listo para publicar tu libro?
          </p>
          <a
            href="/registro"
            style={{
              backgroundColor: '#037D8C',
              color: '#FFFFFF',
              padding: '12px 32px',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '15px',
              fontFamily: 'Georgia, serif',
            }}
          >
            Crear mi cuenta de autor
          </a>
        </div>
      </div>

      <footer style={{ backgroundColor: '#013473', padding: '24px 32px', textAlign: 'center', marginTop: '48px' }}>
        <div style={{ marginBottom: '12px' }}>
          <a href="/terminos" style={{ color: '#93908B', fontSize: '13px', textDecoration: 'none', marginRight: '24px' }}>
            Términos de Uso
          </a>
          <a href="/terminos#privacidad" style={{ color: '#93908B', fontSize: '13px', textDecoration: 'none', marginRight: '24px' }}>
            Privacidad
          </a>
          <a href="/terminos#cookies" style={{ color: '#93908B', fontSize: '13px', textDecoration: 'none' }}>
            Cookies
          </a>
        </div>
        <p style={{ color: '#93908B', fontSize: '13px', margin: 0 }}>
          © 2026 EditorialHub — Grupo Sandoval Avilés — L.R. Sandoval
        </p>
      </footer>
    </div>
  );
}



