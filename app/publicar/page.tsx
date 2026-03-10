"use client";
import { useState } from "react";

export default function Publicar() {
  const [paso, setPaso] = useState(1);
  const [genero, setGenero] = useState("");
  const [idioma, setIdioma] = useState("Español");
  const [precio, setPrecio] = useState("80");

  const generos = ["Ensayo", "Narrativa", "Poesía", "Novela", "Cuento", "Crónica", "Biografía", "Autoayuda", "Técnico", "Otro"];
  const idiomas = ["Español", "Inglés", "Francés", "Portugués", "Otro"];

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
          <a href="/panel" style={{ color: "#ffffff", textDecoration: "none", fontSize: "13px" }}>Mi panel</a>
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
        }}>Publicar una obra</h1>
        <p style={{ color: "#93908B", fontSize: "13px" }}>
          Completa los tres pasos para publicar tu libro en el catálogo
        </p>
      </section>

      {/* PASOS */}
      <div style={{ padding: "32px 40px", maxWidth: "800px", margin: "0 auto" }}>

        {/* INDICADOR DE PASOS */}
        <div style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "40px",
          gap: "0",
        }}>
          {[
            { num: 1, label: "Datos de la obra" },
            { num: 2, label: "Archivo y portada" },
            { num: 3, label: "Precio y publicación" },
          ].map((p, i) => (
            <div key={p.num} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: paso >= p.num ? "#013473" : "#e0e0e0",
                  color: paso >= p.num ? "#ffffff" : "#93908B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "bold",
                  flexShrink: 0,
                }}>{p.num}</div>
                <span style={{
                  fontSize: "13px",
                  color: paso >= p.num ? "#013473" : "#93908B",
                  fontWeight: paso === p.num ? "bold" : "normal",
                }}>{p.label}</span>
              </div>
              {i < 2 && (
                <div style={{
                  flex: 1,
                  height: "2px",
                  backgroundColor: paso > p.num ? "#013473" : "#e0e0e0",
                  margin: "0 16px",
                }} />
              )}
            </div>
          ))}
        </div>

        {/* PASO 1 — DATOS */}
        {paso === 1 && (
          <div style={{
            backgroundColor: "#ffffff",
            padding: "40px",
            borderRadius: "4px",
          }}>
            <h2 style={{ color: "#013473", fontSize: "20px", marginBottom: "32px" }}>
              Paso 1 — Datos de la obra
            </h2>

            <div style={{ display: "grid", gap: "24px" }}>
              <div>
                <label style={{ display: "block", color: "#013473", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
                  Título de la obra *
                </label>
                <input type="text" placeholder="Título completo de tu libro"
                  style={{ width: "100%", padding: "12px 16px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "14px", fontFamily: "Georgia, serif", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", color: "#013473", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
                  Sinopsis *
                </label>
                <textarea placeholder="Describe tu obra en 2-3 párrafos. Esta descripción aparecerá en el catálogo."
                  rows={5}
                  style={{ width: "100%", padding: "12px 16px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "14px", fontFamily: "Georgia, serif", boxSizing: "border-box", resize: "vertical" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div>
                  <label style={{ display: "block", color: "#013473", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
                    Género *
                  </label>
                  <select
                    value={genero}
                    onChange={(e) => setGenero(e.target.value)}
                    style={{ width: "100%", padding: "12px 16px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "14px", fontFamily: "Georgia, serif", boxSizing: "border-box" }}>
                    <option value="">Selecciona un género</option>
                    {generos.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", color: "#013473", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
                    Idioma *
                  </label>
                  <select
                    value={idioma}
                    onChange={(e) => setIdioma(e.target.value)}
                    style={{ width: "100%", padding: "12px 16px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "14px", fontFamily: "Georgia, serif", boxSizing: "border-box" }}>
                    {idiomas.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", color: "#013473", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
                  Palabras clave (separadas por coma)
                </label>
                <input type="text" placeholder="ej. historia, México, independencia"
                  style={{ width: "100%", padding: "12px 16px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "14px", fontFamily: "Georgia, serif", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ marginTop: "40px", textAlign: "right" }}>
              <button
                onClick={() => setPaso(2)}
                style={{ backgroundColor: "#013473", color: "#ffffff", padding: "12px 32px", border: "none", borderRadius: "4px", fontSize: "15px", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* PASO 2 — ARCHIVOS */}
        {paso === 2 && (
          <div style={{
            backgroundColor: "#ffffff",
            padding: "40px",
            borderRadius: "4px",
          }}>
            <h2 style={{ color: "#013473", fontSize: "20px", marginBottom: "32px" }}>
              Paso 2 — Archivo y portada
            </h2>

            <div style={{ display: "grid", gap: "32px" }}>
              <div>
                <label style={{ display: "block", color: "#013473", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
                  Archivo del libro * (PDF o ePub)
                </label>
                <div style={{
                  border: "2px dashed #e0e0e0",
                  borderRadius: "4px",
                  padding: "40px",
                  textAlign: "center",
                  cursor: "pointer",
                }}>
                  <p style={{ color: "#93908B", fontSize: "14px", marginBottom: "8px" }}>
                    Arrastra tu archivo aquí o haz clic para seleccionar
                  </p>
                  <p style={{ color: "#93908B", fontSize: "12px" }}>PDF o ePub — Máximo 50 MB</p>
                  <input type="file" accept=".pdf,.epub" style={{ marginTop: "16px" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", color: "#013473", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
                  Portada * (imagen JPG o PNG)
                </label>
                <div style={{
                  border: "2px dashed #e0e0e0",
                  borderRadius: "4px",
                  padding: "40px",
                  textAlign: "center",
                  cursor: "pointer",
                }}>
                  <p style={{ color: "#93908B", fontSize: "14px", marginBottom: "8px" }}>
                    Arrastra tu portada aquí o haz clic para seleccionar
                  </p>
                  <p style={{ color: "#93908B", fontSize: "12px" }}>JPG o PNG — Mínimo 800x1200px — Máximo 5 MB</p>
                  <input type="file" accept=".jpg,.jpeg,.png" style={{ marginTop: "16px" }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => setPaso(1)}
                style={{ backgroundColor: "transparent", color: "#013473", padding: "12px 32px", border: "1px solid #013473", borderRadius: "4px", fontSize: "15px", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                ← Anterior
              </button>
              <button
                onClick={() => setPaso(3)}
                style={{ backgroundColor: "#013473", color: "#ffffff", padding: "12px 32px", border: "none", borderRadius: "4px", fontSize: "15px", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* PASO 3 — PRECIO */}
        {paso === 3 && (
          <div style={{
            backgroundColor: "#ffffff",
            padding: "40px",
            borderRadius: "4px",
          }}>
            <h2 style={{ color: "#013473", fontSize: "20px", marginBottom: "32px" }}>
              Paso 3 — Precio y publicación
            </h2>

            <div style={{ display: "grid", gap: "24px" }}>
              <div>
                <label style={{ display: "block", color: "#013473", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
                  Precio de venta (MXN) *
                </label>
                <input
                  type="number"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  min="50"
                  style={{ width: "200px", padding: "12px 16px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "14px", fontFamily: "Georgia, serif", boxSizing: "border-box" }} />
                <p style={{ color: "#93908B", fontSize: "12px", marginTop: "6px" }}>Precio mínimo: $50.00 MXN</p>
              </div>

              {/* DESGLOSE */}
              <div style={{
                backgroundColor: "#f8f9fa",
                padding: "24px",
                borderRadius: "4px",
                border: "1px solid #e0e0e0",
              }}>
                <h3 style={{ color: "#013473", fontSize: "15px", marginBottom: "16px" }}>Desglose por venta</h3>
                <div style={{ display: "grid", gap: "10px" }}>
                  {[
                    { label: "Precio de venta", valor: `$${parseFloat(precio || "0").toFixed(2)} MXN` },
                    { label: "Comisión del procesador (~6.6%)", valor: `-$${(parseFloat(precio || "0") * 0.066).toFixed(2)} MXN` },
                    { label: "Comisión EditorialHub (8% — Nivel Bronce)", valor: `-$${(parseFloat(precio || "0") * 0.08).toFixed(2)} MXN` },
                    { label: "Tu ingreso neto por venta", valor: `$${(parseFloat(precio || "0") * (1 - 0.066 - 0.08)).toFixed(2)} MXN`, bold: true },
                  ].map((fila, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", borderTop: i === 3 ? "1px solid #013473" : "none", paddingTop: i === 3 ? "10px" : "0" }}>
                      <span style={{ color: "#93908B", fontSize: "13px" }}>{fila.label}</span>
                      <span style={{ color: fila.bold ? "#013473" : "#333333", fontSize: "13px", fontWeight: fila.bold ? "bold" : "normal" }}>{fila.valor}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                  <input type="checkbox" style={{ marginTop: "3px" }} />
                  <span style={{ color: "#93908B", fontSize: "13px", lineHeight: "1.6" }}>
                    Confirmo que soy el autor o titular de los derechos de esta obra y que su contenido cumple con los criterios editoriales de EditorialHub.
                  </span>
                </label>
              </div>
            </div>

            <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => setPaso(2)}
                style={{ backgroundColor: "transparent", color: "#013473", padding: "12px 32px", border: "1px solid #013473", borderRadius: "4px", fontSize: "15px", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                ← Anterior
              </button>
              <button style={{ backgroundColor: "#037D8C", color: "#ffffff", padding: "12px 32px", border: "none", borderRadius: "4px", fontSize: "15px", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                Enviar para revisión
              </button>
            </div>
          </div>
        )}
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