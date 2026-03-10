export default function Catalogo() {
  const libros = [
    {
      id: 1,
      titulo: "Título del libro 1",
      autor: "L.R. Sandoval",
      precio: "$80.00 MXN",
      genero: "Ensayo",
    },
    {
      id: 2,
      titulo: "Título del libro 2",
      autor: "L.R. Sandoval",
      precio: "$80.00 MXN",
      genero: "Narrativa",
    },
    {
      id: 3,
      titulo: "Título del libro 3",
      autor: "L.R. Sandoval",
      precio: "$80.00 MXN",
      genero: "Ensayo",
    },
  ];

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
          <a href="/" style={{ textDecoration: "none" }}>
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
          </a>
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <a href="/catalogo" style={{ color: "#037D8C", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>Catálogo</a>
          <a href="#" style={{ color: "#ffffff", textDecoration: "none", fontSize: "14px" }}>Autores</a>
          <a href="#" style={{ color: "#ffffff", textDecoration: "none", fontSize: "14px" }}>Publicar mi libro</a>
        </div>
      </nav>

      {/* ENCABEZADO */}
      <section style={{
        backgroundColor: "#f8f9fa",
        padding: "40px",
        borderBottom: "3px solid #013473",
      }}>
        <h1 style={{
          color: "#013473",
          fontSize: "32px",
          fontFamily: "'Times New Roman', serif",
          marginBottom: "8px",
        }}>Catálogo</h1>
        <p style={{ color: "#93908B", fontSize: "15px" }}>
          {libros.length} obras disponibles
        </p>
      </section>

      {/* LIBROS */}
      <section style={{ padding: "48px 40px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "32px",
          maxWidth: "1100px",
          margin: "0 auto",
        }}>
          {libros.map((libro) => (
            <div key={libro.id} style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e0e0e0",
              borderRadius: "4px",
              overflow: "hidden",
            }}>
              {/* PORTADA PLACEHOLDER */}
              <div style={{
                backgroundColor: "#013473",
                height: "220px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <span style={{
                  color: "#037D8C",
                  fontSize: "13px",
                  fontStyle: "italic",
                }}>Portada</span>
              </div>

              {/* DATOS */}
              <div style={{ padding: "20px" }}>
                <span style={{
                  backgroundColor: "#037D8C",
                  color: "#ffffff",
                  fontSize: "11px",
                  padding: "3px 8px",
                  borderRadius: "2px",
                  marginBottom: "10px",
                  display: "inline-block",
                }}>{libro.genero}</span>
                <h3 style={{
                  color: "#013473",
                  fontSize: "16px",
                  marginBottom: "6px",
                  fontFamily: "'Times New Roman', serif",
                }}>{libro.titulo}</h3>
                <p style={{
                  color: "#93908B",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}>{libro.autor}</p>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span style={{
                    color: "#013473",
                    fontSize: "18px",
                    fontWeight: "bold",
                  }}>{libro.precio}</span>
                  <a href="#" style={{
                    backgroundColor: "#013473",
                    color: "#ffffff",
                    padding: "8px 18px",
                    textDecoration: "none",
                    fontSize: "13px",
                    borderRadius: "3px",
                  }}>Comprar</a>
                </div>
              </div>
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