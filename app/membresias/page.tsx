"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { buildAdminSectionChips } from "@/components/admin-section-chips";
import { SectionPageFrame, SectionSidebarCard } from "@/components/section-page-frame";
import { SiteSectionHeader } from "@/components/site-section-header";

const membershipRows = [
  {
    level: "Bronce",
    color: "#c97b42",
    commission: "10%",
    range: "0 a 149 puntos",
    reading: "Base competitiva",
    benefit:
      "Entrada al sistema con comision base fuerte y acceso completo al modelo editorial de EditorialHub.",
  },
  {
    level: "Plata",
    color: "#8a9aaa",
    commission: "8%",
    range: "150 a 399 puntos",
    reading: "Primer ascenso serio",
    benefit:
      "Mejor condicion para autores que ya sostienen publicacion real, ventas confirmadas y continuidad visible.",
  },
  {
    level: "Oro",
    color: "#c49400",
    commission: "6%",
    range: "400 a 599 puntos",
    reading: "Consolidacion real",
    benefit:
      "Nivel para autores con actividad fuerte dentro de la plataforma y una economia editorial ya bastante visible.",
  },
  {
    level: "Platino",
    color: "#16867f",
    commission: "4%",
    range: "600 puntos o mas",
    reading: "Nivel alto",
    benefit:
      "Condicion de elite operativa para autores con trayectoria importante, permanencia y movimiento comercial sostenido.",
  },
];

const scoringRows = [
  {
    action: "Obra publicada",
    points: "5 puntos",
    detail: "Cada obra que ya queda visible y publicada dentro de EditorialHub suma a tu avance.",
  },
  {
    action: "Venta confirmada",
    points: "10 puntos",
    detail: "La venta real pesa mas que la simple publicacion porque refleja movimiento economico efectivo.",
  },
  {
    action: "Perfil publico completo",
    points: "5 puntos",
    detail: "Hoy cuenta cuando el autor ya tiene biografia visible y avatar o foto de perfil cargada.",
  },
];

export default function MembresiasPage() {
  return (
    <main style={pageStyle}>
      <SiteSectionHeader
        title="Membresias"
        activeNav="catalogo"
        brandVariant="catalogo"
        topSlogan="Publica facil, vende rapido, compra lo que quieras"
        adminChips={buildAdminSectionChips("catalogo")}
        chips={[
          { label: "Catalogo EditorialHub", href: "/catalogo" },
          { label: "Membresias", href: "/membresias", tone: "accent", active: true },
        ]}
      />

      <SectionPageFrame
        maxWidth="1320px"
        sidebar={
          <>
            <SectionSidebarCard title="Idea central">
              <p style={sidebarTextStyle}>
                Entre mas participa y permanece el autor, mejor puede ser su condicion economica dentro de EditorialHub.
              </p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Que si es">
              <p style={sidebarTextStyle}>Un sistema de fidelidad editorial ligado a actividad real.</p>
              <p style={sidebarTextStyle}>No es adorno visual ni gamificacion vacia.</p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Donde se refleja">
              <p style={sidebarTextStyle}>En la comision vigente del autor, su panel y la lectura administrativa.</p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Rangos actuales">
              <p style={sidebarTextStyle}>Bronce: 0 a 149</p>
              <p style={sidebarTextStyle}>Plata: 150 a 399</p>
              <p style={sidebarTextStyle}>Oro: 400 a 599</p>
              <p style={sidebarTextStyle}>Platino: 600 o mas</p>
            </SectionSidebarCard>
          </>
        }
      >
        <section style={heroCardStyle}>
          <p style={eyebrowStyle}>Sistema de fidelidad</p>
          <h2 style={heroTitleStyle}>Que son las membresias</h2>
          <p style={heroTextStyle}>
            Las membresias son la forma en que EditorialHub premia la permanencia, la publicacion activa y el movimiento real del autor dentro de la plataforma. No cambian lo que el autor puede hacer, pero si mejoran la condicion economica con la que participa.
          </p>
          <div style={heroBandStyle}>
            <span style={heroBandLabelStyle}>Idea simple:</span>
            <span style={heroBandTextStyle}>mas actividad util, mejor nivel, mejor comision.</span>
          </div>
        </section>

        <section style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Como funciona</h2>
              <p style={sectionSubtitleStyle}>
                El sistema revisa senales reales de participacion del autor y construye una categoria visible dentro de EditorialHub.
              </p>
            </div>
          </div>

          <div style={explanationGridStyle}>
            <article style={infoPanelStyle}>
              <h3 style={infoPanelTitleStyle}>Que toma en cuenta hoy</h3>
              <ul style={listStyle}>
                {scoringRows.map((item) => (
                  <li key={item.action} style={listItemStyle}>
                    <strong>{item.action}:</strong> {item.points}
                  </li>
                ))}
              </ul>
            </article>

            <article style={infoPanelStyle}>
              <h3 style={infoPanelTitleStyle}>Que cambia cuando subes</h3>
              <ul style={listStyle}>
                <li style={listItemStyle}>La comision vigente del autor.</li>
                <li style={listItemStyle}>La lectura visible de tu nivel en panel y vistas internas.</li>
                <li style={listItemStyle}>La percepcion economica de tu permanencia dentro de la plataforma.</li>
              </ul>
            </article>

            <article style={infoPanelStyle}>
              <h3 style={infoPanelTitleStyle}>Que no significa</h3>
              <ul style={listStyle}>
                <li style={listItemStyle}>No bloquea comprar, leer o navegar.</li>
                <li style={listItemStyle}>No sustituye la validacion de tu perfil colaborador.</li>
                <li style={listItemStyle}>No es una promesa automatica de beneficios fuera de la comision.</li>
              </ul>
            </article>
          </div>
        </section>

        <section style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Puntaje visible</h2>
              <p style={sectionSubtitleStyle}>
                Estas son las reglas actuales con las que el sistema suma puntos y empuja el avance del autor.
              </p>
            </div>
          </div>

          <div style={scoreGridStyle}>
            {scoringRows.map((row) => (
              <article key={row.action} style={scoreCardStyle}>
                <p style={scoreValueStyle}>{row.points}</p>
                <h3 style={scoreTitleStyle}>{row.action}</h3>
                <p style={scoreTextStyle}>{row.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Tabla de membresias</h2>
              <p style={sectionSubtitleStyle}>
                Esta tabla resume el sentido de cada nivel, su rango actual y como se lee su beneficio economico.
              </p>
            </div>
          </div>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeadStyle}>Nivel</th>
                  <th style={tableHeadStyle}>Comision visible</th>
                  <th style={tableHeadStyle}>Rango actual</th>
                  <th style={tableHeadStyle}>Lectura operativa</th>
                  <th style={tableHeadStyle}>Que representa</th>
                </tr>
              </thead>
              <tbody>
                {membershipRows.map((row) => (
                  <tr key={row.level}>
                    <td style={tableCellStyle}>
                      <span style={levelBadgeStyle(row.color)}>{row.level}</span>
                    </td>
                    <td style={tableCellStyle}>{row.commission}</td>
                    <td style={tableCellStyle}>{row.range}</td>
                    <td style={tableCellStyle}>{row.reading}</td>
                    <td style={tableCellStyle}>{row.benefit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Preguntas clave</h2>
            </div>
          </div>

          <div style={faqGridStyle}>
            <article style={faqCardStyle}>
              <h3 style={faqTitleStyle}>Donde veo mi nivel?</h3>
              <p style={faqTextStyle}>En Mi panel, dentro del bloque de membresia, y tambien en vistas internas de administracion.</p>
            </article>
            <article style={faqCardStyle}>
              <h3 style={faqTitleStyle}>Como subo de nivel?</h3>
              <p style={faqTextStyle}>Publicando, vendiendo y manteniendo un perfil publico mas completo y activo dentro de la plataforma.</p>
            </article>
            <article style={faqCardStyle}>
              <h3 style={faqTitleStyle}>Cual es el nivel mas alto visible?</h3>
              <p style={faqTextStyle}>Dentro de la explicacion publica de membresias, el nivel mas alto visible por puntos es Platino. Diamante sigue siendo una asignacion manual administrativa.</p>
            </article>
            <article style={faqCardStyle}>
              <h3 style={faqTitleStyle}>Esto ya esta cerrado al 100%?</h3>
              <p style={faqTextStyle}>La base funcional ya existe, pero el sistema todavia puede fortalecerse con mayor visibilidad publica y reglas periodicas mas formales.</p>
            </article>
          </div>
        </section>

        <section style={closingCardStyle}>
          <h2 style={closingTitleStyle}>Relacion con la economia del autor</h2>
          <p style={closingTextStyle}>
            La membresia no vive aislada. Su proposito real es conectarse con la economia visible del autor: que se entienda mejor cuanto vende, cuanto gana y como mejora su condicion economica conforme crece dentro de EditorialHub.
          </p>
          <div style={closingActionsStyle}>
            <Link href="/catalogo" style={secondaryLinkStyle}>
              Volver al catalogo
            </Link>
            <Link href="/panel" style={primaryLinkStyle}>
              Ir a Mi panel
            </Link>
          </div>
        </section>
      </SectionPageFrame>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f4f6f8",
  color: "#10243d",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const sidebarTextStyle: CSSProperties = {
  margin: 0,
  color: "#4b5563",
  fontSize: "12px",
  lineHeight: "1.7",
};

const heroCardStyle: CSSProperties = {
  borderRadius: "20px",
  padding: "26px 24px",
  background: "linear-gradient(135deg, #f5fbff 0%, #e4f1fb 54%, #ffffff 100%)",
  border: "1px solid #d3e4f2",
  boxShadow: "0 18px 34px rgba(16, 36, 61, 0.06)",
  display: "grid",
  gap: "12px",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: "#2780c8",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const heroTitleStyle: CSSProperties = {
  margin: 0,
  color: "#10243d",
  fontSize: "32px",
};

const heroTextStyle: CSSProperties = {
  margin: 0,
  color: "#495a6d",
  fontSize: "15px",
  lineHeight: 1.8,
  maxWidth: "920px",
};

const heroBandStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
  marginTop: "4px",
  backgroundColor: "#ffffff",
  border: "1px solid #d6e8f6",
  borderRadius: "999px",
  padding: "10px 14px",
  width: "fit-content",
};

const heroBandLabelStyle: CSSProperties = {
  color: "#0f5f9d",
  fontSize: "12px",
  fontWeight: 700,
};

const heroBandTextStyle: CSSProperties = {
  color: "#34485f",
  fontSize: "13px",
};

const sectionCardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "18px",
  padding: "22px 20px",
  boxShadow: "0 14px 30px rgba(17, 34, 64, 0.05)",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "end",
  gap: "16px",
  marginBottom: "16px",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: "#0f294a",
  fontSize: "24px",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0 0",
  color: "#6d7987",
  fontSize: "13px",
  lineHeight: 1.6,
};

const explanationGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
};

const infoPanelStyle: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid #dde8f1",
  backgroundColor: "#fbfdff",
  padding: "16px",
  display: "grid",
  gap: "10px",
};

const infoPanelTitleStyle: CSSProperties = {
  margin: 0,
  color: "#123c6b",
  fontSize: "17px",
};

const listStyle: CSSProperties = {
  margin: 0,
  paddingLeft: "18px",
  display: "grid",
  gap: "8px",
};

const listItemStyle: CSSProperties = {
  color: "#4f6072",
  fontSize: "14px",
  lineHeight: 1.6,
};

const scoreGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
};

const scoreCardStyle: CSSProperties = {
  borderRadius: "16px",
  padding: "18px 16px",
  border: "1px solid #dce6f0",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  display: "grid",
  gap: "8px",
};

const scoreValueStyle: CSSProperties = {
  margin: 0,
  color: "#0f5f9d",
  fontSize: "28px",
  fontWeight: 700,
};

const scoreTitleStyle: CSSProperties = {
  margin: 0,
  color: "#123c6b",
  fontSize: "17px",
};

const scoreTextStyle: CSSProperties = {
  margin: 0,
  color: "#526476",
  fontSize: "14px",
  lineHeight: 1.7,
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "920px",
};

const tableHeadStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  backgroundColor: "#f0f6fb",
  color: "#123c6b",
  fontSize: "13px",
  borderBottom: "1px solid #d7e3ef",
};

const tableCellStyle: CSSProperties = {
  padding: "14px",
  borderBottom: "1px solid #e6edf4",
  color: "#4b5c6d",
  fontSize: "14px",
  lineHeight: 1.6,
  verticalAlign: "top",
};

function levelBadgeStyle(color: string): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "6px 11px",
    backgroundColor: color,
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 700,
  };
}

const faqGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const faqCardStyle: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid #dbe6f0",
  backgroundColor: "#fafcff",
  padding: "16px",
  display: "grid",
  gap: "8px",
};

const faqTitleStyle: CSSProperties = {
  margin: 0,
  color: "#123c6b",
  fontSize: "17px",
};

const faqTextStyle: CSSProperties = {
  margin: 0,
  color: "#536375",
  fontSize: "14px",
  lineHeight: 1.7,
};

const closingCardStyle: CSSProperties = {
  borderRadius: "18px",
  padding: "24px 22px",
  background: "linear-gradient(135deg, #123c6b 0%, #0f5f9d 100%)",
  color: "#ffffff",
  display: "grid",
  gap: "12px",
};

const closingTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "24px",
};

const closingTextStyle: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.9)",
  fontSize: "15px",
  lineHeight: 1.75,
  maxWidth: "880px",
};

const closingActionsStyle: CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "4px",
};

const primaryLinkStyle: CSSProperties = {
  textDecoration: "none",
  backgroundColor: "#ffffff",
  color: "#123c6b",
  borderRadius: "999px",
  padding: "10px 16px",
  fontSize: "13px",
  fontWeight: 700,
};

const secondaryLinkStyle: CSSProperties = {
  textDecoration: "none",
  backgroundColor: "rgba(255,255,255,0.12)",
  color: "#ffffff",
  border: "1px solid rgba(255,255,255,0.28)",
  borderRadius: "999px",
  padding: "10px 16px",
  fontSize: "13px",
  fontWeight: 700,
};
