"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CSSProperties, FormEvent } from "react";
import { Suspense, useMemo, useState } from "react";
import { PasswordField } from "@/components/password-field";
import { SiteSectionHeader } from "@/components/site-section-header";
import { forgotPassword, resetPassword } from "@/lib/api";

const SHOW_DEV_CODES = process.env.NODE_ENV !== "production";

export default function RecuperarContrasenaPage() {
  return (
    <Suspense fallback={<main style={pageStyle}><section id="solicitud" style={contentStyle}>Cargando...</section></main>}>
      <RecuperarContrasenaContent />
    </Suspense>
  );
}

function RecuperarContrasenaContent() {
  const searchParams = useSearchParams();
  const emailParam = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [devCode, setDevCode] = useState("");
  const [requestState, setRequestState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [resetState, setResetState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [requestMessage, setRequestMessage] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestState("loading");
    setRequestMessage("");
    setResetMessage("");

    try {
      const response = await forgotPassword({ email });
      setRequestState("success");
      setRequestMessage(response.message);
      setDevCode(SHOW_DEV_CODES ? response.resetCode ?? "" : "");
      if (SHOW_DEV_CODES && response.resetCode) {
        setCode(response.resetCode);
      }
    } catch (error) {
      setRequestState("error");
      setRequestMessage(error instanceof Error ? error.message : "No fue posible solicitar el codigo.");
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetState("loading");
    setResetMessage("");

    try {
      const response = await resetPassword({
        email,
        code,
        newPassword,
        confirmNewPassword,
      });
      setResetState("success");
      setResetMessage(response.message);
    } catch (error) {
      setResetState("error");
      setResetMessage(error instanceof Error ? error.message : "No fue posible restablecer la contrasena.");
    }
  }

  return (
    <main style={pageStyle}>
      <SiteSectionHeader
        title="Recuperar contraseña"
        activeNav="login"
        chips={[
          { label: "Solicitar código", href: "#solicitud" },
          { label: "Restablecer", href: "#restablecer" },
          { label: "Login", href: "/login" },
        ]}
      />

      <section id="solicitud" style={contentStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Recuperar contrasena</h1>
          <p style={subtitleStyle}>
            Solicita tu codigo de recuperacion y despues define una nueva contrasena.
          </p>
          {emailParam ? (
            <div style={prefillNoticeStyle}>
              Detectamos este correo para ayudarte mas rapido: <strong>{emailParam}</strong>
            </div>
          ) : null}

          <form onSubmit={handleRequestCode} style={{ display: "grid", gap: "14px" }}>
            <label style={labelStyle}>Correo electronico</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              style={inputStyle}
            />
            {requestMessage ? <div style={feedbackStyle(requestState === "error")}>{requestMessage}</div> : null}
            <button type="submit" disabled={requestState === "loading"} style={primaryButtonStyle(requestState === "loading")}>
              {requestState === "loading" ? "Solicitando..." : "Solicitar codigo"}
            </button>
          </form>

          {SHOW_DEV_CODES && devCode ? (
            <div style={devCodeBoxStyle}>
              <p style={{ margin: "0 0 6px 0", color: "#7a5c00", fontWeight: "bold" }}>Codigo de desarrollo</p>
              <p style={{ margin: 0, color: "#7a5c00", fontSize: "28px", letterSpacing: "4px", fontWeight: "bold" }}>{devCode}</p>
            </div>
          ) : null}

          <form id="restablecer" onSubmit={handleResetPassword} style={{ display: "grid", gap: "14px", marginTop: "26px" }}>
            <label style={labelStyle}>Codigo de recuperacion</label>
            <input type="text" value={code} onChange={(event) => setCode(event.target.value)} required style={inputStyle} />
            <label style={labelStyle}>Nueva contrasena</label>
            <PasswordField
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              style={inputStyle}
            />
            <label style={labelStyle}>Confirmar nueva contrasena</label>
            <PasswordField
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              style={inputStyle}
            />
            {resetMessage ? <div style={feedbackStyle(resetState === "error")}>{resetMessage}</div> : null}
            <button type="submit" disabled={resetState === "loading"} style={primaryButtonStyle(resetState === "loading")}>
              {resetState === "loading" ? "Actualizando..." : "Restablecer contrasena"}
            </button>
          </form>

          <div style={{ marginTop: "22px", textAlign: "center" }}>
            <Link href="/login" style={secondaryLinkStyle}>Volver a login</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = { minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "Georgia, 'Times New Roman', serif" };
const contentStyle: CSSProperties = { display: "flex", justifyContent: "center", padding: "48px 24px" };
const cardStyle: CSSProperties = { width: "100%", maxWidth: "620px", backgroundColor: "#ffffff", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "28px" };
const titleStyle: CSSProperties = { color: "#013473", fontSize: "30px", margin: "0 0 8px 0", fontFamily: "'Times New Roman', serif" };
const subtitleStyle: CSSProperties = { color: "#5f6368", fontSize: "14px", lineHeight: "1.7", margin: "0 0 24px 0" };
const prefillNoticeStyle: CSSProperties = { marginBottom: "20px", padding: "12px 14px", backgroundColor: "#eef5ff", border: "1px solid #bfd4f1", borderRadius: "6px", color: "#013473", fontSize: "13px", lineHeight: "1.6" };
const labelStyle: CSSProperties = { color: "#013473", fontSize: "14px", fontWeight: "bold" };
const inputStyle: CSSProperties = { width: "100%", padding: "12px 14px", border: "1px solid #e0e0e0", borderRadius: "4px", fontFamily: "Georgia, serif", boxSizing: "border-box" };
const devCodeBoxStyle: CSSProperties = { marginTop: "18px", padding: "14px 16px", backgroundColor: "#fff8e1", border: "1px solid #f3d26b", borderRadius: "6px" };
const secondaryLinkStyle: CSSProperties = { color: "#013473", textDecoration: "none", fontWeight: "bold" };

function feedbackStyle(isError: boolean): CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: "4px",
    backgroundColor: isError ? "#fdecea" : "#e8f5e9",
    color: isError ? "#b71c1c" : "#1b5e20",
    fontSize: "13px",
    lineHeight: "1.6",
  };
}

function primaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    backgroundColor: disabled ? "#5c6f8f" : "#013473",
    color: "#ffffff",
    padding: "12px 16px",
    border: "none",
    borderRadius: "4px",
    cursor: disabled ? "wait" : "pointer",
    fontFamily: "Georgia, serif",
  };
}
