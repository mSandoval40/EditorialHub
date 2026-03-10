export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      backgroundColor: "#ffffff",
      fontFamily: "Georgia, 'Times New Roman', serif",
    }}>
      {/* NAVEGACIÓN */}
      <nav style={{
        backgroundColor: "#013473",
        padding: "16px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <span style={{
            color: "#ffffff",
            fontSize: "24px",
            fontWeight: "bold",
            fontFamily: "'Times New Roman', serif",
          }}>EditorialHub</span>
          <span style={{
            color: "#037D8C",
            fontSize: "13px",
            fontStyle: "italic",
            marginLeft: "12px",
          }}>Plataforma editorial independiente</span>
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <a href="#" style={{ color: "#ffffff", textDecoration: "none", fontSize: "14px" }}>Catálogo</a>
          <a href="#" style={{ color: "#ffffff", textDecoration: "none", fontSize: "14px" }}>Autores</a>
          <a href="#" style={{ color: "#037D8C", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>Publicar mi libro</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        backgroundColor: "#013473",
        padding: "80px 40px",
        textAlign: "center",
        color: "#ffffff",
      }}>
        <h1 style={{
          fontSize: "52px",
          fontWeight: "bold",
          fontFamily: "'Times New Roman', serif",
          marginBottom: "16px",
        }}>EditorialHub</h1>
        <p style={{
          fontSize: "22px",
          color: "#037D8C",
          fontStyle: "italic",
          marginBottom: "12px",
        }}>Plataforma editorial independiente</p>
        <p style={{
          fontSize: "18px",
          color: "#93908B",
          marginBottom: "40px",
        }}>Publica – Vende – Distribuye</p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <a href="#" style={{
            backgroundColor: "#037D8C",
            color: "#ffffff",
            padding: "14px 32px",
            textDecoration: "none",
            fontSize: "16px",
            borderRadius: "4px",
          }}>Ver catálogo</a>
          <a href="#" style={{
            backgroundColor: "transparent",
            color: "#ffffff",
            padding: "14px 32px",
            textDecoration: "none",
            fontSize: "16px",
            borderRadius: "4px",
            border: "1px solid #ffffff",
          }}>Publicar mi libro</a>
        </div>
      </section>

      {/* DIFERENCIADORES */}
      <section style={{ padding: "64px 40px", backgroundColor: "#f8f9fa" }}>
        <h2 style={{
          textAlign: "center",
          fontSize: "28px",
          color: "#013473",
          fontFamily: "'Times New Roman', serif",
          marginBottom: "48px",
        }}>¿Por qué EditorialHub?</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "32px",
          maxWidth: "1000px",
          margin: "0 auto",
        }}>
          {[
            { titulo: "Comisión más baja del mercado", texto: "Arrancas en 8% y puedes llegar a 2%. Amazon cobra hasta 65%." },
            { titulo: "Publicar en menos de 5 minutos", texto: "Un formulario, una pantalla. Sin procesos engorrosos." },
            { titulo: "Tú dueño de tu relación con el lector", texto: "Sabes quién compra tus libros. El lector es tuyo, no de la plataforma." },
          ].map((item, i) => (
            <div key={i} style={{
              backgroundColor: "#ffffff",
              padding: "32px",
              borderTop: "4px solid #037D8C",
              borderRadius: "4px",
            }}>
              <h3 style={{ color: "#013473", fontSize: "16px", marginBottom: "12px" }}>{item.titulo}</h3>
              <p style={{ color: "#93908B", fontSize: "14px", lineHeight: "1.6" }}>{item.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        backgroundColor: "#013473",
        padding: "24px 40px",
        textAlign: "center",
        color: "#93908B",
        fontSize: "13px",
      }}>
        <p>© 2026 EditorialHub — Grupo Sandoval Avilés — Plataformas Digitales — L.R. Sandoval</p>
      </footer>
    </main>
  );
}