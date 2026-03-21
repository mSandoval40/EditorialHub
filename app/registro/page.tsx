'use client';

import Link from "next/link";
import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";
import { PasswordField } from "@/components/password-field";
import { SiteSectionHeader } from "@/components/site-section-header";
import { registerUser, verifyEmail } from "@/lib/api";

type RegistroForm = {
  email: string;
  confirmEmail: string;
  password: string;
  confirmPassword: string;
};

const initialForm: RegistroForm = {
  email: "",
  confirmEmail: "",
  password: "",
  confirmPassword: "",
};

const SHOW_DEV_CODES = process.env.NODE_ENV !== "production";

const legalSections = [
  {
    id: "terminos",
    eyebrow: "Términos de Uso",
    title: "Condiciones para usar la plataforma",
    items: [
      "EditorialHub funciona como plataforma digital de distribución y venta de libros electrónicos.",
      "El usuario acepta estos términos al registrarse y es responsable del uso de su cuenta y contraseña.",
      "Las obras publicadas deben contar con derechos de autor o autorización expresa para su comercialización.",
      "La plataforma puede retirar contenido que incumpla la ley o las reglas internas del servicio.",
      "Las compras, reembolsos y contracargos se rigen por las condiciones publicadas por la plataforma.",
    ],
  },
  {
    id: "privacidad",
    eyebrow: "Política de Privacidad",
    title: "Cómo usamos y protegemos tus datos",
    items: [
      "Se recopilan datos de cuenta, datos técnicos básicos de navegación y datos de transacción.",
      "La información se utiliza para operar el servicio, entregar compras, administrar cuentas y cumplir obligaciones legales.",
      "No se venden datos personales a terceros; solo se comparten con servicios indispensables como procesadores de pago o correo transaccional.",
      "Los datos se conservan según la vigencia de la cuenta y los plazos legales aplicables.",
      "El usuario puede solicitar acceso, corrección o eliminación de sus datos por los canales de contacto oficiales.",
    ],
  },
  {
    id: "cookies",
    eyebrow: "Aviso de Cookies",
    title: "Cookies técnicas y de seguridad",
    items: [
      "La plataforma utiliza cookies técnicas necesarias para mantener sesión, preferencias básicas y medidas de seguridad.",
      "No se emplean cookies de rastreo publicitario de terceros en esta etapa operativa.",
      "Al continuar con el registro aceptas el uso de estas cookies técnicas necesarias para el funcionamiento del sitio.",
    ],
  },
];

export default function RegistroPage() {
  const [terminosAceptados, setTerminosAceptados] = useState(false);
  const [checkTerminos, setCheckTerminos] = useState(false);
  const [terminosRecorridos, setTerminosRecorridos] = useState(false);
  const [form, setForm] = useState<RegistroForm>(initialForm);
  const [verifyCode, setVerifyCode] = useState("");
  const [correoRegistrado, setCorreoRegistrado] = useState("");
  const [codigoDesarrollo, setCodigoDesarrollo] = useState("");
  const [estadoRegistro, setEstadoRegistro] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [estadoVerificacion, setEstadoVerificacion] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [mensajeRegistro, setMensajeRegistro] = useState("");
  const [mensajeVerificacion, setMensajeVerificacion] = useState("");
  const registrationEmailExists =
    estadoRegistro === "error" &&
    mensajeRegistro.toLowerCase().includes("ya existe una cuenta registrada con ese correo");

  function updateField<K extends keyof RegistroForm>(key: K, value: RegistroForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleLegalScroll(event: React.UIEvent<HTMLDivElement>) {
    if (terminosRecorridos) {
      return;
    }

    const target = event.currentTarget;
    const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 12;

    if (reachedBottom) {
      setTerminosRecorridos(true);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.email !== form.confirmEmail) {
      setEstadoRegistro("error");
      setMensajeRegistro("Los correos no coinciden.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setEstadoRegistro("error");
      setMensajeRegistro("Las contraseñas no coinciden.");
      return;
    }

    setEstadoRegistro("loading");
    setMensajeRegistro("");
    setEstadoVerificacion("idle");
    setMensajeVerificacion("");

    try {
      const response = await registerUser({
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      setCorreoRegistrado(response.user.email);
      setCodigoDesarrollo(SHOW_DEV_CODES ? response.verificationCode ?? "" : "");
      setVerifyCode(SHOW_DEV_CODES ? response.verificationCode ?? "" : "");
      setEstadoRegistro("success");
      setMensajeRegistro(
        `${response.message} La cuenta ya quedo lista para comprar y publicar.`,
      );
    } catch (error) {
      setEstadoRegistro("error");
      setMensajeRegistro(error instanceof Error ? error.message : "No fue posible crear la cuenta.");
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEstadoVerificacion("loading");
    setMensajeVerificacion("");

    try {
      const response = await verifyEmail({
        email: correoRegistrado || form.email,
        code: verifyCode,
      });

      setEstadoVerificacion("success");
      setMensajeVerificacion(
        `${response.message} Ya puedes iniciar sesion y usar tu perfil colaborador para comprar o publicar.`,
      );
    } catch (error) {
      setEstadoVerificacion("error");
      setMensajeVerificacion(error instanceof Error ? error.message : "No fue posible verificar el correo.");
    }
  }

  return (
    <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', backgroundColor: "#FFFFFF", minHeight: "100vh" }}>
      <SiteSectionHeader
        title="Registro de cuenta"
        activeNav="registro"
        chips={[
          { label: "Registro", href: "#" },
          { label: "Catalogo", href: "/catalogo" },
          { label: "Terminos", href: "/terminos" },
        ]}
      />

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "48px 32px" }}>
        {!terminosAceptados ? (
          <div>
            <div style={{ textAlign: "center", marginBottom: "36px" }}>
              <p style={{ color: "#037D8C", fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px 0" }}>
                Antes de registrarte
              </p>
              <h1 style={{ color: "#013473", fontSize: "28px", margin: "0 0 12px 0", fontWeight: "bold" }}>
                Lee y acepta los términos
              </h1>
              <p style={{ color: "#93908B", fontSize: "15px", margin: 0 }}>
                Tu cuenta quedara lista desde el inicio para comprar y publicar dentro de la plataforma.
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #d7e3f2",
                borderRadius: "18px",
                marginTop: "32px",
                marginBottom: "28px",
                overflow: "hidden",
                boxShadow: "0 18px 40px rgba(1, 52, 115, 0.08)",
              }}
            >
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: "1px solid #d7e3f2",
                  background: "linear-gradient(135deg, #013473 0%, #0d4d91 100%)",
                  color: "#ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <p style={{ margin: "0 0 6px 0", fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase", color: "#bcd3ef" }}>
                      Revisión legal previa
                    </p>
                    <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "bold" }}>Revisa el contenido antes de aceptar</h2>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "8px 12px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      backgroundColor: terminosRecorridos ? "#e8f5e9" : "rgba(255,255,255,0.14)",
                      color: terminosRecorridos ? "#1b5e20" : "#ffffff",
                    }}
                  >
                    {terminosRecorridos ? "Lectura mínima completada" : "Desplázate hasta el final para continuar"}
                  </span>
                </div>
                <p style={{ margin: "12px 0 0 0", fontSize: "14px", lineHeight: "1.7", color: "#e7eef8" }}>
                  Este resumen no sustituye los documentos completos, pero sí exige una revisión mínima antes de habilitar la aceptación.
                </p>
              </div>

              <div
                onScroll={handleLegalScroll}
                style={{
                  maxHeight: "420px",
                  overflowY: "auto",
                  padding: "24px",
                  display: "grid",
                  gap: "20px",
                  backgroundColor: "#fcfdff",
                }}
              >
                {legalSections.map((section) => (
                  <section
                    key={section.id}
                    style={{
                      padding: "20px 22px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline", flexWrap: "wrap" }}>
                      <div>
                        <p
                          style={{
                            margin: "0 0 6px 0",
                            color: "#037D8C",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.8px",
                            fontWeight: "bold",
                          }}
                        >
                          {section.eyebrow}
                        </p>
                        <h3 style={{ margin: 0, color: "#013473", fontSize: "19px" }}>{section.title}</h3>
                      </div>
                      <Link href={`/terminos#${section.id}`} style={{ color: "#037D8C", fontSize: "13px", fontWeight: "bold", textDecoration: "none" }}>
                        Leer documento completo
                      </Link>
                    </div>

                    <div style={{ marginTop: "14px", display: "grid", gap: "10px" }}>
                      {section.items.map((item) => (
                        <div key={item} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                          <span
                            aria-hidden="true"
                            style={{
                              marginTop: "8px",
                              width: "7px",
                              height: "7px",
                              borderRadius: "999px",
                              backgroundColor: "#013473",
                              flexShrink: 0,
                            }}
                          />
                          <p style={{ margin: 0, color: "#425466", fontSize: "14px", lineHeight: "1.75" }}>{item}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}

                <div
                  style={{
                    padding: "18px 20px",
                    borderRadius: "14px",
                    backgroundColor: "#eef6ff",
                    border: "1px solid #cddff5",
                  }}
                >
                  <p style={{ margin: "0 0 8px 0", color: "#013473", fontWeight: "bold", fontSize: "14px" }}>
                    Confirmación de cierre de lectura
                  </p>
                  <p style={{ margin: 0, color: "#5b6b80", fontSize: "13px", lineHeight: "1.7" }}>
                    Al llegar a esta parte, se habilitara la casilla para que puedas aceptar y continuar con la creacion de tu cuenta colaboradora.
                  </p>
                </div>
              </div>

              <div
                style={{
                  padding: "20px 24px 24px",
                  borderTop: "1px solid #d7e3f2",
                  backgroundColor: "#f6f9fc",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start",
                    cursor: terminosRecorridos ? "pointer" : "not-allowed",
                    opacity: terminosRecorridos ? 1 : 0.65,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkTerminos}
                    onChange={(event) => setCheckTerminos(event.target.checked)}
                    disabled={!terminosRecorridos}
                    style={{ width: "20px", height: "20px", marginTop: "2px", accentColor: "#013473", flexShrink: 0 }}
                  />
                  <span style={{ color: "#013473", fontSize: "15px", lineHeight: "1.7" }}>
                    He leído y acepto los{" "}
                    <Link href="/terminos#terminos" style={{ color: "#037D8C" }}>
                      Términos de Uso
                    </Link>
                    , la{" "}
                    <Link href="/terminos#privacidad" style={{ color: "#037D8C" }}>
                      Política de Privacidad
                    </Link>{" "}
                    y el{" "}
                    <Link href="/terminos#cookies" style={{ color: "#037D8C" }}>
                      Aviso de Cookies
                    </Link>
                    .
                  </span>
                </label>
                {!terminosRecorridos ? (
                  <p style={{ margin: "12px 0 0 34px", color: "#7a5c00", fontSize: "13px", lineHeight: "1.6" }}>
                    Desplázate hasta el final del contenido legal para habilitar esta casilla.
                  </p>
                ) : null}
              </div>
            </div>

            <button
              onClick={() => {
                if (checkTerminos) {
                  setTerminosAceptados(true);
                }
              }}
              disabled={!checkTerminos}
              style={primaryFullButton(checkTerminos ? "#013473" : "#cccccc", checkTerminos ? "pointer" : "not-allowed")}
            >
              {checkTerminos ? "Continuar con el registro" : "Acepta los términos para continuar"}
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "28px" }}>
            <div style={{ textAlign: "center", marginBottom: "8px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#e8f5e9",
                  border: "1px solid #4caf50",
                  borderRadius: "20px",
                  padding: "6px 16px",
                  marginBottom: "16px",
                }}
              >
                <span style={{ color: "#2e7d32", fontSize: "13px" }}>Términos aceptados</span>
              </div>
              <h1 style={{ color: "#013473", fontSize: "28px", margin: "0 0 8px 0", fontWeight: "bold" }}>
                Crea tu cuenta
              </h1>
              <p style={{ color: "#93908B", fontSize: "15px", margin: 0 }}>
                Con una sola cuenta podras comprar, publicar y gestionar tu biblioteca.
              </p>
            </div>

            {estadoRegistro !== "success" ? (
              <>
                <form onSubmit={handleRegister}>
                  <h2 style={sectionTitleStyle}>Paso 2 - Datos de acceso</h2>

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <label style={labelStyle}>Correo electrónico *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) => updateField("email", event.target.value)}
                        placeholder="correo@ejemplo.com"
                        required
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Confirma tu correo *</label>
                      <input
                        type="email"
                        value={form.confirmEmail}
                        onChange={(event) => updateField("confirmEmail", event.target.value)}
                        placeholder="Repite tu correo electrónico"
                        required
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Contraseña *</label>
                      <PasswordField
                        value={form.password}
                        onChange={(event) => updateField("password", event.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Confirma tu contraseña *</label>
                      <PasswordField
                        value={form.confirmPassword}
                        onChange={(event) => updateField("confirmPassword", event.target.value)}
                        placeholder="Repite tu contraseña"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {mensajeRegistro ? (
                    <div style={feedbackStyle(estadoRegistro === "error")}>
                      <div>{mensajeRegistro}</div>
                      {registrationEmailExists ? (
                        <div style={{ marginTop: "10px" }}>
                          <Link
                            href={`/recuperar-contrasena?email=${encodeURIComponent(form.email)}`}
                            style={{
                              color: "#013473",
                              fontWeight: "bold",
                              textDecoration: "none",
                            }}
                          >
                            Recuperar contrasena
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={estadoRegistro === "loading"}
                    style={primaryFullButton(
                      estadoRegistro === "loading" ? "#5c6f8f" : "#013473",
                      estadoRegistro === "loading" ? "wait" : "pointer",
                    )}
                  >
                    {estadoRegistro === "loading" ? "Creando cuenta..." : "Crear mi cuenta"}
                  </button>
                </form>
              </>
            ) : (
              <form onSubmit={handleVerify} style={{ display: "grid", gap: "18px" }}>
                <div style={successBoxStyle}>
                  <strong>Cuenta creada correctamente.</strong>
                  <div>Correo registrado: {correoRegistrado}</div>
                  <div>Ahora solo falta verificar tu correo para activar por completo tu cuenta colaboradora.</div>
                </div>

                <section
                  style={{
                    padding: "24px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "6px",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  <h2 style={{ ...sectionTitleStyle, marginBottom: "12px" }}>Paso 3 - Verifica tu correo</h2>
                  <p style={{ color: "#444444", fontSize: "14px", lineHeight: "1.7", margin: "0 0 16px 0" }}>
                    {SHOW_DEV_CODES
                      ? "En esta fase no se envía correo real. El backend devuelve un código de desarrollo para completar la verificación manualmente."
                      : "Revisa tu correo y captura el código de verificación para activar por completo tu cuenta colaboradora."}
                  </p>

                  {SHOW_DEV_CODES ? (
                    <div
                      style={{
                        marginBottom: "16px",
                        padding: "14px 16px",
                        backgroundColor: codigoDesarrollo ? "#fff8e1" : "#fdecea",
                        borderRadius: "4px",
                        color: codigoDesarrollo ? "#7a5c00" : "#b71c1c",
                        fontSize: "14px",
                        lineHeight: "1.6",
                      }}
                    >
                      {codigoDesarrollo ? (
                        <>
                          <div><strong>Código de verificación:</strong></div>
                          <div style={{ fontSize: "28px", fontWeight: "bold", letterSpacing: "4px", marginTop: "6px" }}>
                            {codigoDesarrollo}
                          </div>
                        </>
                      ) : (
                        <div>
                          El backend no devolvió el código de desarrollo en esta respuesta. Si vuelve a pasar, habrá que revisar ese endpoint.
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div>
                    <label style={labelStyle}>Código de verificación *</label>
                    <input
                      type="text"
                      value={verifyCode}
                      onChange={(event) => setVerifyCode(event.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>
                </section>

                {mensajeVerificacion ? (
                  <div style={feedbackStyle(estadoVerificacion === "error")}>{mensajeVerificacion}</div>
                ) : null}

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    disabled={estadoVerificacion === "loading"}
                    style={{
                      padding: "12px 18px",
                      backgroundColor: estadoVerificacion === "loading" ? "#5c6f8f" : "#013473",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "4px",
                      cursor: estadoVerificacion === "loading" ? "wait" : "pointer",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    {estadoVerificacion === "loading" ? "Verificando..." : "Verificar correo"}
                  </button>

                  {estadoVerificacion === "success" ? (
                    <Link
                      href="/login"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "12px 18px",
                        backgroundColor: "#ffffff",
                        color: "#013473",
                        border: "1px solid #013473",
                        borderRadius: "4px",
                        textDecoration: "none",
                      }}
                    >
                      Ir a login
                    </Link>
                  ) : null}
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <footer style={{ backgroundColor: "#013473", padding: "24px 32px", textAlign: "center", marginTop: "48px" }}>
        <p style={{ color: "#93908B", fontSize: "13px", margin: 0 }}>© 2026 EditorialHub - Grupo Sandoval Avilés - L.R. Sandoval</p>
      </footer>
    </div>
  );
}

const sectionTitleStyle: CSSProperties = {
  color: "#013473",
  fontSize: "18px",
  marginBottom: "20px",
  fontWeight: "bold",
};

const labelStyle: CSSProperties = {
  color: "#013473",
  fontSize: "14px",
  fontWeight: "bold",
  display: "block",
  marginBottom: "6px",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid #e0e0e0",
  borderRadius: "4px",
  fontSize: "15px",
  fontFamily: "Georgia, serif",
  boxSizing: "border-box",
};

const successBoxStyle: CSSProperties = {
  padding: "18px 20px",
  borderRadius: "6px",
  backgroundColor: "#e8f5e9",
  color: "#1b5e20",
  lineHeight: "1.7",
};

function feedbackStyle(isError: boolean): CSSProperties {
  return {
    marginTop: "4px",
    padding: "12px 14px",
    borderRadius: "4px",
    backgroundColor: isError ? "#fdecea" : "#e8f5e9",
    color: isError ? "#b71c1c" : "#1b5e20",
    fontSize: "13px",
    lineHeight: "1.6",
  };
}

function primaryFullButton(backgroundColor: string, cursor: CSSProperties["cursor"]): CSSProperties {
  return {
    width: "100%",
    padding: "16px",
    backgroundColor,
    color: "#FFFFFF",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    cursor,
    fontFamily: "Georgia, serif",
    marginTop: "28px",
  };
}


