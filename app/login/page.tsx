"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/password-field";
import { SiteSectionHeader } from "@/components/site-section-header";
import { loginUser, setStoredToken } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [estado, setEstado] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [mensaje, setMensaje] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEstado("loading");
    setMensaje("");

    try {
      const response = await loginUser({
        email: correo,
        password: contrasena,
      });

      setStoredToken(response.accessToken);
      setEstado("success");
      setMensaje(`Sesión iniciada como ${response.user.email}. Redirigiendo al catálogo...`);
      router.push("/catalogo");
      router.refresh();
    } catch (error) {
      setEstado("error");
      setMensaje(error instanceof Error ? error.message : "No fue posible iniciar sesión.");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <SiteSectionHeader
        title="Iniciar sesión"
        activeNav="login"
        chips={[
          { label: "Acceso", href: "#acceso" },
          { label: "Recuperación", href: "/recuperar-contrasena" },
          { label: "Registro", href: "/registro" },
        ]}
      />

      <section
        id="acceso"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 140px)",
          padding: "40px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "460px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h1
              style={{
                color: "#013473",
                fontSize: "28px",
                fontFamily: "'Times New Roman', serif",
                marginBottom: "8px",
              }}
            >
              Iniciar sesión
            </h1>
            <p style={{ color: "#93908B", fontSize: "14px" }}>
              Usa tu cuenta real del backend para entrar al panel.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  color: "#013473",
                  fontSize: "13px",
                  fontWeight: "bold",
                  marginBottom: "6px",
                }}
              >
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                required
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
              <label
                style={{
                  display: "block",
                  color: "#013473",
                  fontSize: "13px",
                  fontWeight: "bold",
                  marginBottom: "6px",
                }}
              >
                Contraseña
              </label>
              <PasswordField
                placeholder="Tu contraseña"
                value={contrasena}
                onChange={(event) => setContrasena(event.target.value)}
                required
                minLength={8}
                autoComplete="current-password"
                style={{
                  padding: "12px 56px 12px 16px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontFamily: "Georgia, serif",
                }}
              />
            </div>

            <div style={{ textAlign: "right", marginBottom: "28px" }}>
              <div style={{ display: "grid", gap: "8px", justifyItems: "end" }}>
                <Link
                  href={`/recuperar-contrasena${correo ? `?email=${encodeURIComponent(correo)}` : ""}`}
                  style={{
                    color: "#013473",
                    fontSize: "13px",
                    fontWeight: "bold",
                    textDecoration: "none",
                  }}
                >
                  Recuperar contraseña
                </Link>
                <span style={{ color: "#93908B", fontSize: "13px", fontStyle: "italic" }}>
                  Si tu correo aún no está verificado, primero completa ese paso en registro.
                </span>
              </div>
            </div>

            {mensaje ? (
              <div
                style={{
                  marginBottom: "20px",
                  padding: "12px 14px",
                  borderRadius: "4px",
                  backgroundColor: estado === "error" ? "#fdecea" : "#e8f5e9",
                  color: estado === "error" ? "#b71c1c" : "#1b5e20",
                  fontSize: "13px",
                  lineHeight: "1.6",
                }}
              >
                {mensaje}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={estado === "loading"}
              style={{
                width: "100%",
                backgroundColor: estado === "loading" ? "#5c6f8f" : "#013473",
                color: "#ffffff",
                padding: "14px",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                cursor: estado === "loading" ? "wait" : "pointer",
                fontFamily: "Georgia, serif",
                marginBottom: "24px",
              }}
            >
              {estado === "loading" ? "Entrando..." : "Entrar a catálogo"}
            </button>
          </form>

          <div
            style={{
              textAlign: "center",
              padding: "18px 20px",
              border: "1px solid #d7e3f2",
              borderRadius: "18px",
              background:
                "linear-gradient(180deg, rgba(242,247,252,0.98) 0%, rgba(233,242,251,0.92) 100%)",
              boxShadow: "0 10px 24px rgba(1, 52, 115, 0.08)",
            }}
          >
            <p
              style={{
                color: "#6f7f95",
                fontSize: "13px",
                margin: 0,
                lineHeight: "1.7",
              }}
            >
              ¿Aún no tienes cuenta?{" "}
              <Link
                href="/registro"
                style={{
                  color: "#013473",
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </section>

      <footer
        style={{
          backgroundColor: "#013473",
          padding: "24px 40px",
          textAlign: "center",
          color: "#93908B",
          fontSize: "13px",
        }}
      >
        <p>© 2026 EditorialHub - Grupo Sandoval Avilés - Plataformas Digitales - L.R. Sandoval</p>
      </footer>
    </main>
  );
}


