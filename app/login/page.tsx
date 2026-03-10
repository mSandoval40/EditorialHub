"use client";
import { useState } from "react";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");

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

      {/* FORMULARIO */}
      <section style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "calc(100vh - 140px)",
        padding: "40px",
      }}>
        <div style={{
          width: "100%",
          maxWidth: "440px",
        }}>
          {/* ENCABEZADO */}
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h1 style={{
              color: "#013473",
              fontSize: "28px",
              fontFamily: "'Times New Roman', serif",
              marginBottom: "8px",
            }}>Iniciar sesión</h1>
            <p style={{ color: "#93908B", fontSize: "14px" }}>
              Accede a tu panel de autor
            </p>
          </div>

          {/* CAMPOS */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              color: "#013473",
              fontSize: "13px",
              fontWeight: "bold",
              marginBottom: "6px",
            }}>Correo electrónico</label>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
                fontSize: "14px",
                fontFamily: "Georgia, serif",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={{
              display: "block",
              color: "#013473",
              fontSize: "13px",
              fontWeight: "bold",
              marginBottom: "6px",
            }}>Contraseña</label>
            <input
              type="password"
              placeholder="Tu contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
                fontSize: "14px",
                fontFamily: "Georgia, serif",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ textAlign: "right", marginBottom: "28px" }}>
            <a href="#" style={{
              color: "#037D8C",
              fontSize: "13px",
              textDecoration: "none",
            }}>¿Olvidaste tu contraseña?</a>
          </div>

          <button style={{
            width: "100%",
            backgroundColor: "#013473",
            color: "#ffffff",
            padding: "14px",
            border: "none",
            borderRadius: "4px",
            fontSize: "16px",
            cursor: "pointer",
            fontFamily: "Georgia, serif",
            marginBottom: "24px",
          }}>
            Entrar a mi panel
          </button>

          <div style={{
            textAlign: "center",
            paddingTop: "24px",
            borderTop: "1px solid #e0e0e0",
          }}>
            <p style={{ color: "#93908B", fontSize: "13px" }}>
              ¿Aún no tienes cuenta?{" "}
              <a href="/registro" style={{
                color: "#013473",
                fontWeight: "bold",
                textDecoration: "none",
              }}>Regístrate aquí</a>
            </p>
          </div>
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