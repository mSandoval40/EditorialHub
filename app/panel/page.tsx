export default function Panel() {
  const autor = {
    nombre: "L.R. Sandoval",
    perfil: "Certificado",
    nivel: "Bronce",
    comision: "8%",
    puntos: 35,
    puntosProximoNivel: 50,
  };

  const obras = [
    { id: 1, titulo: "Título del libro 1", precio: "$80.00 MXN", ventas: 12, estado: "Publicada", idObra: "EH-0001-202603-0001" },
    { id: 2, titulo: "Título del libro 2", precio: "$80.00 MXN", ventas: 8, estado: "Publicada", idObra: "EH-0001-202603-0002" },
    { id: 3, titulo: "Título del libro 3", precio: "$80.00 MXN", ventas: 5, estado: "Publicada", idObra: "EH-0001-202603-0003" },
    { id: 4, titulo: "Título del libro 4", precio: "$80.00 MXN", ventas: 0, estado: "En revisión", idObra: "EH-0001-202603-0004" },
    { id: 5, titulo: "Título del libro 5", precio: "$80.00 MXN", ventas: 0, estado: "Borrador", idObra: "—" },
  ];

  const totalVentas = obras.reduce((acc, o) => acc + o.ventas, 0);
  const ingresoNeto = totalVentas * 74.72;
  const porcentaje = Math.min((autor.puntos / autor.puntosProximoNivel) * 100, 100);

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
          <span style={{ color: "#93908B", fontSize: "13px" }}>Hola, {autor.nombre}</span>
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
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <h1 style={{
            color: "#ffffff",
            fontSize: "26px",
            fontFamily: "'Times New Roman', serif",
            marginBottom: "4px",
          }}>Panel de autor</h1>
          <p style={{ color: "#93908B", fontSize: "13px" }}>
            {autor.nombre} — Perfil {autor.perfil}
          </p>
        </div>
        <div style={{
          backgroundColor: "#037D8C",
          color: "#ffffff",
          padding: "8px 20px",
          borderRadius: "4px",
          fontSize: "13px",
          cursor: "pointer",
        }}>
          + Publicar nueva obra
        </div>
      </section>

      <div style={{ padding: "32px 40px" }}>

        {/* TARJETAS DE RESUMEN */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
          marginBottom: "32px",
        }}>
          {[
            { label: "Obras publicadas", valor: obras.filter(o => o.estado === "Publicada").length.toString() },
            { label: "Ventas totales", valor: totalVentas.toString() },
            { label: "Ingreso neto", valor: `$${ingresoNeto.toFixed(2)}` },
            { label: "Comisión actual", valor: autor.comision },
          ].map((tarjeta, i) => (
            <div key={i} style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "4px",
              borderTop: "4px solid #013473",
            }}>
              <p style={{ color: "#93908B", fontSize: "12px", marginBottom: "8px" }}>{tarjeta.label}</p>
              <p style={{ color: "#013473", fontSize: "28px", fontWeight: "bold" }}>{tarjeta.valor}</p>
            </div>
          ))}
        </div>

        {/* NIVEL Y PUNTOS */}
        <div style={{
          backgroundColor: "#ffffff",
          padding: "24px 32px",
          borderRadius: "4px",
          marginBottom: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "40px",
        }}>
          <div>
            <p style={{ color: "#93908B", fontSize: "12px", marginBottom: "4px" }}>Nivel actual</p>
            <p style={{ color: "#013473", fontSize: "22px", fontWeight: "bold" }}>{autor.nivel}</p>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "#93908B", fontSize: "12px" }}>{autor.puntos} puntos</span>
              <span style={{ color: "#93908B", fontSize: "12px" }}>Siguiente nivel: {autor.puntosProximoNivel} pts (Plata)</span>
            </div>
            <div style={{ backgroundColor: "#f0f0f0", borderRadius: "4px", height: "10px" }}>
              <div style={{
                backgroundColor: "#037D8C",
                width: `${porcentaje}%`,
                height: "10px",
                borderRadius: "4px",
              }} />
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#93908B", fontSize: "12px", marginBottom: "4px" }}>Comisión</p>
            <p style={{ color: "#037D8C", fontSize: "22px", fontWeight: "bold" }}>{autor.comision}</p>
          </div>
        </div>

        {/* TABLA DE OBRAS */}
        <div style={{
          backgroundColor: "#ffffff",
          borderRadius: "4px",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "20px 32px",
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <h2 style={{ color: "#013473", fontSize: "18px", fontFamily: "'Times New Roman', serif" }}>
              Mis obras
            </h2>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                {["Título", "ID de obra", "Precio", "Ventas", "Estado"].map((col) => (
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
              {obras.map((obra) => (
                <tr key={obra.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "16px 24px", color: "#013473", fontSize: "14px" }}>{obra.titulo}</td>
                  <td style={{ padding: "16px 24px", color: "#93908B", fontSize: "12px", fontFamily: "Courier New, monospace" }}>{obra.idObra}</td>
                  <td style={{ padding: "16px 24px", color: "#333333", fontSize: "14px" }}>{obra.precio}</td>
                  <td style={{ padding: "16px 24px", color: "#333333", fontSize: "14px" }}>{obra.ventas}</td>
                  <td style={{ padding: "16px 24px" }}>
                    <span style={{
                      backgroundColor: obra.estado === "Publicada" ? "#E8F5E9" : obra.estado === "En revisión" ? "#FFF8E1" : "#f0f0f0",
                      color: obra.estado === "Publicada" ? "#2E7D32" : obra.estado === "En revisión" ? "#F57F17" : "#93908B",
                      padding: "4px 10px",
                      borderRadius: "2px",
                      fontSize: "12px",
                    }}>{obra.estado}</span>
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