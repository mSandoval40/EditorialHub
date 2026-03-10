export default function Admin() {
  const stats = [
    { label: "Autores registrados", valor: "12" },
    { label: "Obras publicadas", valor: "34" },
    { label: "Ventas del mes", valor: "87" },
    { label: "Ingresos del mes", valor: "$2,340.00" },
  ];

  const autores = [
    { id: 1, nombre: "L.R. Sandoval", perfil: "Propietario", nivel: "—", obras: 6, ventas: 45, estado: "Activo" },
    { id: 2, nombre: "Autor Invitado 1", perfil: "Certificado", nivel: "Plata", obras: 3, ventas: 22, estado: "Activo" },
    { id: 3, nombre: "Autor Invitado 2", perfil: "Certificado", nivel: "Bronce", obras: 2, ventas: 8, estado: "Activo" },
    { id: 4, nombre: "Autor Invitado 3", perfil: "Anónimo", nivel: "Bronce", obras: 1, ventas: 3, estado: "Activo" },
    { id: 5, nombre: "Autor Invitado 4", perfil: "Certificado", nivel: "Bronce", obras: 0, ventas: 0, estado: "Pendiente" },
  ];

  const obrasEnRevision = [
    { id: 1, titulo: "Título pendiente 1", autor: "Autor Invitado 2", enviada: "08/03/2026", genero: "Ensayo" },
    { id: 2, titulo: "Título pendiente 2", autor: "Autor Invitado 3", enviada: "09/03/2026", genero: "Narrativa" },
  ];

  return (
    <main style={{
      minHeight: "100vh",
      backgroundColor: "#f8f9fa",
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
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <span style={{
            backgroundColor: "#037D8C",
            color: "#ffffff",
            padding: "4px 12px",
            borderRadius: "2px",
            fontSize: "12px",
          }}>ADMINISTRADOR</span>
          <a href="/login" style={{
            color: "#ffffff",
            textDecoration: "none",
            fontSize: "13px",
            border: "1px solid #93908B",
            padding: "6px 14px",
            borderRadius: "3px",
          }}>Cerrar sesión</a>
        </div>
      </nav>

      {/* ENCABEZADO */}
      <section style={{
        backgroundColor: "#013473",
        padding: "32px 40px",
      }}>
        <h1 style={{
          color: "#ffffff",
          fontSize: "26px",
          fontFamily: "'Times New Roman', serif",
          marginBottom: "4px",
        }}>Panel administrativo</h1>
        <p style={{ color: "#93908B", fontSize: "13px" }}>
          Grupo Sandoval Avilés — L.R. Sandoval
        </p>
      </section>

      <div style={{ padding: "32px 40px" }}>

        {/* TARJETAS DE RESUMEN */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
          marginBottom: "32px",
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "4px",
              borderTop: "4px solid #013473",
            }}>
              <p style={{ color: "#93908B", fontSize: "12px", marginBottom: "8px" }}>{s.label}</p>
              <p style={{ color: "#013473", fontSize: "28px", fontWeight: "bold" }}>{s.valor}</p>
            </div>
          ))}
        </div>

        {/* OBRAS EN REVISIÓN */}
        <div style={{
          backgroundColor: "#ffffff",
          borderRadius: "4px",
          overflow: "hidden",
          marginBottom: "32px",
        }}>
          <div style={{
            padding: "20px 32px",
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#FFF8E1",
          }}>
            <h2 style={{ color: "#013473", fontSize: "18px", fontFamily: "'Times New Roman', serif" }}>
              Obras en revisión
            </h2>
            <span style={{
              backgroundColor: "#F57F17",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: "2px",
              fontSize: "12px",
            }}>{obrasEnRevision.length} pendientes</span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                {["Título", "Autor", "Género", "Fecha de envío", "Acciones"].map((col) => (
                  <th key={col} style={{
                    padding: "12px 24px",
                    textAlign: "left",
                    color: "#93908B",
                    fontSize: "12px",
                    fontWeight: "normal",
                    borderBottom: "1px solid #e0e0e0",
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {obrasEnRevision.map((obra) => (
                <tr key={obra.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "16px 24px", color: "#013473", fontSize: "14px" }}>{obra.titulo}</td>
                  <td style={{ padding: "16px 24px", color: "#333333", fontSize: "14px" }}>{obra.autor}</td>
                  <td style={{ padding: "16px 24px", color: "#93908B", fontSize: "13px" }}>{obra.genero}</td>
                  <td style={{ padding: "16px 24px", color: "#93908B", fontSize: "13px" }}>{obra.enviada}</td>
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button style={{
                        backgroundColor: "#013473",
                        color: "#ffffff",
                        padding: "6px 14px",
                        border: "none",
                        borderRadius: "3px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}>Aprobar</button>
                      <button style={{
                        backgroundColor: "transparent",
                        color: "#c0392b",
                        padding: "6px 14px",
                        border: "1px solid #c0392b",
                        borderRadius: "3px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}>Rechazar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TABLA DE AUTORES */}
        <div style={{
          backgroundColor: "#ffffff",
          borderRadius: "4px",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "20px 32px",
            borderBottom: "1px solid #e0e0e0",
          }}>
            <h2 style={{ color: "#013473", fontSize: "18px", fontFamily: "'Times New Roman', serif" }}>
              Autores registrados
            </h2>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                {["Nombre", "Perfil", "Nivel", "Obras", "Ventas", "Estado", "Acciones"].map((col) => (
                  <th key={col} style={{
                    padding: "12px 24px",
                    textAlign: "left",
                    color: "#93908B",
                    fontSize: "12px",
                    fontWeight: "normal",
                    borderBottom: "1px solid #e0e0e0",
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {autores.map((autor) => (
                <tr key={autor.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "16px 24px", color: "#013473", fontSize: "14px" }}>{autor.nombre}</td>
                  <td style={{ padding: "16px 24px" }}>
                    <span style={{
                      backgroundColor: autor.perfil === "Propietario" ? "#013473" : autor.perfil === "Certificado" ? "#E8F0FB" : "#f0f0f0",
                      color: autor.perfil === "Propietario" ? "#ffffff" : autor.perfil === "Certificado" ? "#013473" : "#93908B",
                      padding: "3px 8px",
                      borderRadius: "2px",
                      fontSize: "11px",
                    }}>{autor.perfil}</span>
                  </td>
                  <td style={{ padding: "16px 24px", color: "#333333", fontSize: "14px" }}>{autor.nivel}</td>
                  <td style={{ padding: "16px 24px", color: "#333333", fontSize: "14px" }}>{autor.obras}</td>
                  <td style={{ padding: "16px 24px", color: "#333333", fontSize: "14px" }}>{autor.ventas}</td>
                  <td style={{ padding: "16px 24px" }}>
                    <span style={{
                      backgroundColor: autor.estado === "Activo" ? "#E8F5E9" : "#FFF8E1",
                      color: autor.estado === "Activo" ? "#2E7D32" : "#F57F17",
                      padding: "3px 8px",
                      borderRadius: "2px",
                      fontSize: "11px",
                    }}>{autor.estado}</span>
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    <button style={{
                      backgroundColor: "transparent",
                      color: "#013473",
                      padding: "5px 12px",
                      border: "1px solid #013473",
                      borderRadius: "3px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}>Ver detalle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* FOOTER */}
      <footer style={{
        backgroundColor: "#013473",
        padding: "24px 40px",
        textAlign: "center",
        color: "#93908B",
        fontSize: "13px",
        marginTop: "48px",
      }}>
        <p>© 2026 EditorialHub — Grupo Sandoval Avilés — Plataformas Digitales — L.R. Sandoval</p>
      </footer>
    </main>
  );
}