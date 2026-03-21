"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { buildAdminSectionChips } from "@/components/admin-section-chips";
import { SectionPageFrame, SectionSidebarCard } from "@/components/section-page-frame";
import { SiteSectionHeader } from "@/components/site-section-header";
import {
  approvePrimaryAdminChange,
  fetchPrimaryAdminChangeApproval,
  type PrimaryAdminChangeSummary,
} from "@/lib/admin-security-api";

export default function ConfirmarCambioAdminPage() {
  return (
    <Suspense fallback={<ConfirmarCambioAdminFallback />}>
      <ConfirmarCambioAdminContent />
    </Suspense>
  );
}

function ConfirmarCambioAdminContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [state, setState] = useState<"loading" | "ready" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [request, setRequest] = useState<PrimaryAdminChangeSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadRequest() {
      if (!token) {
        setState("error");
        setMessage("No se recibio un token de aprobacion valido.");
        return;
      }

      try {
        const response = await fetchPrimaryAdminChangeApproval(token);
        setRequest(response.request);
        setMessage(response.message);
        setState("ready");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No fue posible validar la solicitud.");
        setState("error");
      }
    }

    loadRequest();
  }, [token]);

  async function handleApprove() {
    if (!token) {
      setState("error");
      setMessage("No se recibio un token de aprobacion valido.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await approvePrimaryAdminChange(token);
      setMessage(response.message);
      setState("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible aprobar el cambio de ADMIN.");
      setState("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return renderLayout({ state, message, request, isSubmitting, onApprove: handleApprove });
}

function ConfirmarCambioAdminFallback() {
  return renderLayout({
    state: "loading",
    message: "Preparando la validacion del cambio de ADMIN...",
    request: null,
    isSubmitting: false,
    onApprove: undefined,
  });
}

function renderLayout({
  state,
  message,
  request,
  isSubmitting,
  onApprove,
}: {
  state: "loading" | "ready" | "success" | "error";
  message: string;
  request: PrimaryAdminChangeSummary | null;
  isSubmitting: boolean;
  onApprove?: () => void;
}) {
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <SiteSectionHeader
        title="Confirmacion de cambio de ADMIN"
        activeNav="admin"
        chips={buildAdminSectionChips("admin", [
          { label: "Seguridad", href: "/admin" },
          { label: "Confirmacion", href: "#confirmacion" },
        ])}
      />

      <SectionPageFrame
        maxWidth="1020px"
        sidebar={
          <>
            <SectionSidebarCard title="Resumen de seguridad">
              <p style={sidebarTextStyle}>Estado: <strong>{state}</strong></p>
              <p style={sidebarTextStyle}>Esta validacion confirma que el ADMIN saliente autorizo el cambio.</p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Que revisar">
              <p style={sidebarTextStyle}>Verifica el correo actual y el nuevo correo propuesto.</p>
              <p style={sidebarTextStyle}>Revisa vigencia del enlace antes de aprobar.</p>
            </SectionSidebarCard>
          </>
        }
      >
        <section id="confirmacion">
        <div style={cardStyle}>
          <h1 style={titleStyle}>Validacion del ADMIN saliente</h1>
          <p style={textStyle}>
            Este enlace valida que el cambio de correo y contrasena del ADMIN principal fue autorizado desde el correo anterior.
          </p>

          {message ? <div style={feedbackStyle(state === "error")}>{message}</div> : null}

          {request ? (
            <div style={{ display: "grid", gap: "10px" }}>
              <p style={metaStyle}><strong>Correo actual:</strong> {request.currentAdminEmail}</p>
              <p style={metaStyle}><strong>Nuevo correo propuesto:</strong> {request.newAdminEmail}</p>
              <p style={metaStyle}><strong>Solicitado:</strong> {new Date(request.requestedAt).toLocaleString("es-MX")}</p>
              <p style={metaStyle}><strong>Vence:</strong> {new Date(request.expiresAt).toLocaleString("es-MX")}</p>
            </div>
          ) : null}

          {state === "ready" && onApprove ? (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button type="button" onClick={onApprove} disabled={isSubmitting} style={primaryButtonStyle(isSubmitting)}>
                {isSubmitting ? "Aprobando..." : "Aprobar cambio de ADMIN"}
              </button>
              <a href="/login" style={secondaryLinkStyle}>
                Regresar
              </a>
            </div>
          ) : null}

          {state === "success" ? (
            <a href="/login" style={secondaryLinkStyle}>
              Ir a iniciar sesion con el nuevo ADMIN
            </a>
          ) : null}
        </div>
        </section>
      </SectionPageFrame>
    </main>
  );
}

const cardStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "32px",
  display: "grid",
  gap: "18px",
  boxShadow: "0 18px 42px rgba(1, 52, 115, 0.08)",
};

const titleStyle = {
  color: "#013473",
  fontSize: "30px",
  margin: 0,
  fontFamily: "'Times New Roman', serif",
};

const textStyle = {
  color: "#555555",
  fontSize: "15px",
  lineHeight: "1.8",
  margin: 0,
};

const metaStyle = {
  color: "#333333",
  fontSize: "14px",
  margin: 0,
};
const sidebarTextStyle = {
  margin: 0,
  color: "#4b5563",
  fontSize: "12px",
  lineHeight: "1.65",
};

function feedbackStyle(isError: boolean) {
  return {
    padding: "14px 16px",
    borderRadius: "4px",
    backgroundColor: isError ? "#fdecea" : "#e8f5e9",
    color: isError ? "#b71c1c" : "#1b5e20",
    fontSize: "14px",
  };
}

function primaryButtonStyle(isSubmitting: boolean) {
  return {
    backgroundColor: isSubmitting ? "#5c6f8f" : "#013473",
    color: "#ffffff",
    padding: "12px 18px",
    borderRadius: "4px",
    textDecoration: "none",
    border: "none",
    cursor: isSubmitting ? "wait" : "pointer",
    fontFamily: "Georgia, serif",
  } as const;
}

const secondaryLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 18px",
  borderRadius: "4px",
  textDecoration: "none",
  border: "1px solid #d0d6e0",
  color: "#013473",
  backgroundColor: "#f8fbff",
};
