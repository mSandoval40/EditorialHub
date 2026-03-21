"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/api";
import {
  fetchPrimaryAdminChangeStatus,
  requestPrimaryAdminChange,
  type PrimaryAdminChangeSummary,
} from "@/lib/admin-security-api";

type Props = {
  isPrimaryAdmin: boolean;
};

export function AdminPrimaryAdminChangeCard({ isPrimaryAdmin }: Props) {
  const [form, setForm] = useState({
    currentPassword: "",
    newEmail: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [pendingRequest, setPendingRequest] = useState<PrimaryAdminChangeSummary | null>(null);
  const [actionState, setActionState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  useEffect(() => {
    async function loadStatus() {
      if (!isPrimaryAdmin) {
        setPendingRequest(null);
        return;
      }

      const token = getStoredToken();
      if (!token) {
        return;
      }

      try {
        const response = await fetchPrimaryAdminChangeStatus(token);
        setPendingRequest(response.request);
      } catch (error) {
        setActionState("error");
        setMessage(error instanceof Error ? error.message : "No fue posible cargar el estado del cambio de ADMIN.");
      }
    }

    loadStatus();
  }, [isPrimaryAdmin]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.currentPassword || !form.newEmail || !form.newPassword || !form.confirmNewPassword) {
      setActionState("error");
      setMessage("Debes completar los cuatro campos para solicitar el cambio de ADMIN.");
      return;
    }

    if (form.newPassword.length < 8) {
      setActionState("error");
      setMessage("La nueva contrasena del ADMIN debe tener al menos 8 caracteres.");
      return;
    }

    if (form.newPassword !== form.confirmNewPassword) {
      setActionState("error");
      setMessage("La nueva contrasena y su confirmacion no coinciden.");
      return;
    }

    if (pendingRequest) {
      setActionState("error");
      setMessage("Ya existe una solicitud pendiente para cambiar el ADMIN principal.");
      return;
    }

    setActionState("idle");
    setMessage("");
    setPreviewUrl("");
    setShowConfirmDialog(true);
  }

  async function confirmRequest() {
    const token = getStoredToken();
    if (!token) {
      setActionState("error");
      setMessage("Tu sesion expiro. Inicia sesion de nuevo.");
      setShowConfirmDialog(false);
      return;
    }

    setActionState("loading");
    setMessage("");
    setPreviewUrl("");

    try {
      const response = await requestPrimaryAdminChange(token, form);
      setPendingRequest(response.request);
      setActionState("success");
      setMessage(response.message);
      setPreviewUrl(response.delivery.previewUrl ?? "");
      setForm({
        currentPassword: "",
        newEmail: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
    } catch (error) {
      setActionState("error");
      setMessage(error instanceof Error ? error.message : "No fue posible solicitar el cambio de ADMIN.");
      setShowConfirmDialog(false);
    }
  }

  if (!isPrimaryAdmin) {
    return (
      <section id="seguridad-admin" style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Cambio de ADMIN principal</h2>
        </div>
        <div style={sectionBodyStyle}>
          <p style={emptyStyle}>Esta seccion solo puede ser operada por el ADMIN principal.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section id="seguridad-admin" style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Cambio de ADMIN principal</h2>
        </div>

        <div style={sectionBodyStyle}>
          <p style={helperTextStyle}>
            Este cambio no se aplica en el momento. El sistema enviara un enlace de validacion al correo actual del ADMIN principal y solo tras aprobarlo se actualizara el acceso.
          </p>

          {pendingRequest ? (
            <div style={pendingCardStyle}>
              <p style={pendingTitleStyle}>Solicitud pendiente</p>
              <p style={pendingTextStyle}><strong>Correo actual:</strong> {pendingRequest.currentAdminEmail}</p>
              <p style={pendingTextStyle}><strong>Nuevo correo:</strong> {pendingRequest.newAdminEmail}</p>
              <p style={pendingTextStyle}><strong>Solicitado:</strong> {new Date(pendingRequest.requestedAt).toLocaleString("es-MX")}</p>
              <p style={pendingTextStyle}><strong>Vence:</strong> {new Date(pendingRequest.expiresAt).toLocaleString("es-MX")}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} style={formStyle}>
            <input
              type="password"
              placeholder="Contrasena actual del ADMIN"
              value={form.currentPassword}
              onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
              required
              minLength={8}
              style={inputStyle}
            />
            <input
              type="email"
              placeholder="Nuevo correo del ADMIN"
              value={form.newEmail}
              onChange={(event) => setForm((current) => ({ ...current, newEmail: event.target.value }))}
              required
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Nueva contrasena del ADMIN"
              value={form.newPassword}
              onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
              required
              minLength={8}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Confirmar nueva contrasena del ADMIN"
              value={form.confirmNewPassword}
              onChange={(event) => setForm((current) => ({ ...current, confirmNewPassword: event.target.value }))}
              required
              minLength={8}
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={actionState === "loading" || Boolean(pendingRequest)}
              style={submitButtonStyle(actionState === "loading" || Boolean(pendingRequest))}
            >
              {actionState === "loading" ? "Solicitando..." : "Solicitar cambio de ADMIN"}
            </button>
          </form>

          {message ? <div style={feedbackStyle(actionState === "error")}>{message}</div> : null}

          {previewUrl ? (
            <div style={previewCardStyle}>
              <p style={pendingTitleStyle}>Modo desarrollo</p>
              <p style={helperTextStyle}>SMTP no esta configurado todavia, asi que este es el enlace de validacion generado para probar el flujo completo.</p>
              <a href={previewUrl} style={previewLinkStyle}>{previewUrl}</a>
            </div>
          ) : null}
        </div>
      </section>

      {showConfirmDialog ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <p style={modalEyebrowStyle}>Confirmacion</p>
            <h3 style={modalTitleStyle}>Solicitar cambio de ADMIN principal</h3>
            <p style={modalTextStyle}>
              Se enviara un enlace de aprobacion al correo actual del ADMIN. Hasta que ese enlace se confirme, el correo y la contrasena nuevas no se aplicaran.
            </p>
            <div style={modalActionsStyle}>
              <button type="button" onClick={confirmRequest} disabled={actionState === "loading"} style={dangerConfirmButtonStyle(actionState === "loading")}>
                {actionState === "loading" ? "Solicitando..." : "Si, solicitar cambio"}
              </button>
              <button type="button" onClick={() => setShowConfirmDialog(false)} style={secondaryModalButtonStyle}>
                No continuar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showSuccessDialog ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <p style={{ ...modalEyebrowStyle, color: "#2E7D32" }}>Solicitud creada</p>
            <h3 style={modalTitleStyle}>Validacion pendiente</h3>
            <p style={modalTextStyle}>
              El cambio de ADMIN principal quedo en espera. Solo se aplicara cuando el correo anterior apruebe el enlace enviado.
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button type="button" onClick={() => setShowSuccessDialog(false)} style={secondaryModalButtonStyle}>
                Regresar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

const sectionStyle: CSSProperties = { backgroundColor: "#ffffff", borderRadius: "4px", overflow: "hidden" };
const sectionHeaderStyle: CSSProperties = { padding: "16px 22px", borderBottom: "1px solid #e0e0e0" };
const sectionBodyStyle: CSSProperties = { padding: "16px 22px", display: "grid", gap: "16px", justifyItems: "start" };
const sectionTitleStyle: CSSProperties = { color: "#013473", fontSize: "17px", margin: 0, fontFamily: "'Times New Roman', serif" };
const emptyStyle: CSSProperties = { color: "#666666", margin: 0 };
const helperTextStyle: CSSProperties = { color: "#555555", fontSize: "13px", lineHeight: "1.7", margin: 0, maxWidth: "760px" };
const formStyle: CSSProperties = { width: "100%", maxWidth: "620px", display: "grid", gap: "10px" };
const inputStyle: CSSProperties = { width: "100%", border: "1px solid #d8dde6", borderRadius: "4px", padding: "10px 12px", fontSize: "14px", fontFamily: "Georgia, serif" };
const pendingCardStyle: CSSProperties = { width: "100%", maxWidth: "620px", border: "1px solid #d6e4f5", backgroundColor: "#f8fbff", borderRadius: "6px", padding: "14px", display: "grid", gap: "6px" };
const previewCardStyle: CSSProperties = { width: "100%", maxWidth: "760px", border: "1px dashed #bfd7f1", backgroundColor: "#eef6ff", borderRadius: "6px", padding: "14px", display: "grid", gap: "8px" };
const pendingTitleStyle: CSSProperties = { color: "#013473", fontSize: "15px", fontWeight: "bold", margin: 0 };
const pendingTextStyle: CSSProperties = { color: "#444444", fontSize: "13px", margin: 0 };
const previewLinkStyle: CSSProperties = { color: "#013473", wordBreak: "break-all" };
const modalOverlayStyle: CSSProperties = { position: "fixed", inset: 0, backgroundColor: "rgba(1, 22, 45, 0.58)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", zIndex: 1000 };
const modalCardStyle: CSSProperties = { width: "100%", maxWidth: "560px", backgroundColor: "#ffffff", borderRadius: "8px", padding: "20px 22px", boxShadow: "0 18px 50px rgba(0, 0, 0, 0.18)", display: "grid", gap: "12px" };
const modalEyebrowStyle: CSSProperties = { color: "#b71c1c", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 };
const modalTitleStyle: CSSProperties = { color: "#013473", fontSize: "20px", margin: 0, fontFamily: "'Times New Roman', serif" };
const modalTextStyle: CSSProperties = { color: "#444444", fontSize: "14px", lineHeight: "1.7", margin: 0 };
const modalActionsStyle: CSSProperties = { display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "6px" };
const secondaryModalButtonStyle: CSSProperties = { backgroundColor: "#f3f4f6", color: "#1f2937", border: "1px solid #d1d5db", borderRadius: "4px", padding: "10px 14px", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "13px" };

function submitButtonStyle(disabled: boolean): CSSProperties {
  return {
    backgroundColor: disabled ? "#5c6f8f" : "#013473",
    color: "#ffffff",
    padding: "10px 14px",
    border: "none",
    borderRadius: "4px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "Georgia, serif",
    fontSize: "13px",
  };
}

function dangerConfirmButtonStyle(disabled: boolean): CSSProperties {
  return {
    backgroundColor: "#b71c1c",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    padding: "10px 14px",
    cursor: disabled ? "wait" : "pointer",
    opacity: disabled ? 0.7 : 1,
    fontFamily: "Georgia, serif",
    fontSize: "13px",
  };
}

function feedbackStyle(isError: boolean): CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: "4px",
    backgroundColor: isError ? "#fdecea" : "#e8f5e9",
    color: isError ? "#b71c1c" : "#1b5e20",
    fontSize: "13px",
  };
}
