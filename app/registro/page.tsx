"use client";
import { useState } from "react";

export default function Registro() {
  const [tipoPerfil, setTipoPerfil] = useState<"certificado" | "anonimo" | null>(null);

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
          <a href="/catalogo" style={{ color: "#ffffff", textDecoration: "none", fontSize: "14px" }}>Catálogo</a>
          <a href="#" style={{ color: "#ffffff", textDecoration: "none", fontSize: "14px" }}>Autores</a>
          <a href="/registro" style={{ color: "#037D8C", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>Publicar mi libro</a>
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
        }}>Registro de autor</h1>
        <p style={{ color: "#93908B", fontSize: "15px" }}>
          Elige cómo quieres publicar en EditorialHub
        </p>
      </section>

      {/* SELECCIÓN DE PERFIL */}
      <section style={{ padding: "48px 40px", maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={{
          color: "#013473",
          fontSize: "22px",
          fontFamily: "'Times New Roman', serif",
          marginBottom: "32px",
          textAlign: "center",
        }}>Paso 1 — Elige tu tipo de perfil</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "48px" }}>
          
          {/* PERFIL CERTIFICADO */}
          <div
            onClick={() => setTipoPerfil("certificado")}
            style={{
              border: tipoPerfil === "certificado" ? "3px solid #013473" : "2px solid #e0e0e0",
              borderRadius: "6px",
              padding: "32px",
              cursor: "pointer",
              backgroundColor: tipoPerfil === "certificado" ? "#f0f4fb" : "#ffffff",
            }}>
            <div style={{
              backgroundColor: "#013473",
              color: "#ffffff",
              display: "inline-block",
              padding: "4px 12px",
              fontSize: "12px",
              borderRadius: "2px",
              marginBottom: "16px",
            }}>PERFIL CERTIFICADO</div>
            <h3 style={{ color: "#013473", fontSize: "18px", marginBottom: "12px" }}>
              Publicar con identidad
            </h3>
            <p style={{ color: "#93908B", fontSize: "14px", lineHeight: "1.7", marginBottom: "16px" }}>
              Tu nombre o pseudónimo es visible públicamente. Implica reconocimiento de autoría. Acceso al sistema completo de niveles y beneficios.
            </p>
            <ul style={{ color: "#333333", fontSize: "13px", lineHeight: "2", paddingLeft: "20px" }}>
              <li>Acceso a todos los niveles: Bronce → Diamante</li>
              <li>Badge de nivel visible en tu perfil</li>
              <li>Sistema de recomendaciones activo</li>
              <li>Perfil público completo</li>
            </ul>
          </div>

          {/* PERFIL ANÓNIMO */}
          <div
            onClick={() => setTipoPerfil("anonimo")}
            style={{
              border: tipoPerfil === "anonimo" ? "3px solid #037D8C" : "2px solid #e0e0e0",
              borderRadius: "6px",
              padding: "32px",
              cursor: "pointer",
              backgroundColor: tipoPerfil === "anonimo" ? "#f0fafb" : "#ffffff",
            }}>
            <div style={{
              backgroundColor: "#037D8C",
              color: "#ffffff",
              display: "inline-block",
              padding: "4px 12px",
              fontSize: "12px",
              borderRadius: "2px",
              marginBottom: "16px",
            }}>PERFIL ANÓNIMO</div>
            <h3 style={{ color: "#037D8C", fontSize: "18px", marginBottom: "12px" }}>
              Publicar con privacidad
            </h3>
            <p style={{ color: "#93908B", fontSize: "14px", lineHeight: "1.7", marginBottom: "16px" }}>
              Tu identidad no es visible públicamente. Tú decides si el mundo sabe que eres el autor. La plataforma sí conoce tu identidad real.
            </p>
            <ul style={{ color: "#333333", fontSize: "13px", lineHeight: "2", paddingLeft: "20px" }}>
              <li>Nivel Bronce permanente (8% de comisión)</li>
              <li>Sin perfil público visible</li>
              <li>Solo tus obras son visibles, no tu nombre</li>
              <li>Identificación interna obligatoria</li>
            </ul>
          </div>
        </div>

        {/* FORMULARIO — aparece al seleccionar perfil */}
        {tipoPerfil && (
          <div style={{
            border: "1px solid #e0e0e0",
            borderRadius: "6px",
            padding: "40px",
            backgroundColor: "#fafafa",
          }}>
            <h2 style={{
              color: "#013473",
              fontSize: "20px",
              fontFamily: "'Times New Roman', serif",
              marginBottom: "32px",
            }}>Paso 2 — Tus datos</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {[
                { label: "Nombre completo", placeholder: "Nombre real (uso interno)", type: "text" },
                { label: tipoPerfil === "certificado" ? "Nombre público o pseudónimo" : "Pseudónimo (opcional)", placeholder: tipoPerfil === "certificado" ? "Como aparecerás en el catálogo" : "Solo si deseas usarlo", type: "text" },
                { label: "Correo electrónico", placeholder: "correo@ejemplo.com", type: "email" },
                { label: "Confirmar correo", placeholder: "correo@ejemplo.com", type: "email" },
                { label: "Contraseña", placeholder: "Mínimo 8 caracteres", type: "password" },
                { label: "Confirmar contraseña", placeholder: "Repite tu contraseña", type: "password" },
              ].map((campo, i) => (
                <div key={i}>
                  <label style={{
                    display: "block",
                    color: "#013473",
                    fontSize: "13px",
                    fontWeight: "bold",
                    marginBottom: "6px",
                  }}>{campo.label}</label>
                  <input
                    type={campo.type}
                    placeholder={campo.placeholder}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #e0e0e0",
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontFamily: "Georgia, serif",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: "32px" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                <input type="checkbox" style={{ marginTop: "3px" }} />
                <span style={{ color: "#93908B", fontSize: "13px", lineHeight: "1.6" }}>
                  He leído y acepto los términos y condiciones de EditorialHub. Entiendo que mi identidad real será verificada por el administrador antes de poder publicar.
                </span>
              </label>
            </div>

            <div style={{ marginTop: "32px", textAlign: "center" }}>
              <button style={{
                backgroundColor: "#013473",
                color: "#ffffff",
                padding: "14px 48px",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                cursor: "pointer",
                fontFamily: "Georgia, serif",
              }}>
                Crear mi cuenta como autor {tipoPerfil === "certificado" ? "certificado" : "anónimo"}
              </button>
            </div>
          </div>
        )}
      </section>

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