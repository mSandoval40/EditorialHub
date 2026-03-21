"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { Suspense, useEffect, useState } from "react";
import { SiteSectionHeader } from "@/components/site-section-header";
import { getStoredToken } from "@/lib/api";

export default function CompraExitosaPage() {
  return (
    <Suspense fallback={<main style={pageStyle}><section id="resultado" style={cardStyle}>Cargando...</section></main>}>
      <CompraExitosaContent />
    </Suspense>
  );
}

function CompraExitosaContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [verificationState, setVerificationState] = useState<"checking" | "confirmed" | "pending" | "login-required">("checking");
  const [message, setMessage] = useState("Estamos validando tu compra con Stripe.");

  useEffect(() => {
    async function verifyLibrary() {
      const token = getStoredToken();

      if (!token) {
        setVerificationState("login-required");
        setMessage("Pago recibido. Inicia sesion para ver tu biblioteca.");
        return;
      }

      try {
        if (!sessionId) {
          setVerificationState("pending");
          setMessage("Stripe redirigio correctamente, pero no se recibio el identificador de la sesion para validar la compra.");
          return;
        }

        const apiBaseUrl =
          process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";

        const response = await fetch(`${apiBaseUrl}/purchases/checkout/session/${sessionId}/verify`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("No fue posible validar la compra con Stripe.");
        }

        const payload = (await response.json()) as { purchase: unknown | null };
        if (payload.purchase) {
          setVerificationState("confirmed");
          setMessage("Pago confirmado. Tu biblioteca ya esta disponible.");
        } else {
          setVerificationState("pending");
          setMessage("Stripe devolvio el pago exitoso, pero la compra aun no aparece confirmada en tu biblioteca. El backend la esta reconciliando con la sesion de pago.");
        }
      } catch {
        setVerificationState("pending");
        setMessage("Stripe reporto el pago, pero aun no fue posible confirmar la compra en tu biblioteca. Recarga en unos segundos.");
      }
    }

    void verifyLibrary();
  }, [sessionId]);

  return (
    <>
      <SiteSectionHeader
        title="Compra completada"
        activeNav="catalogo"
        chips={[
          { label: "Resultado", href: "#resultado" },
          { label: "Biblioteca", href: "/biblioteca" },
          { label: "Catalogo", href: "/catalogo" },
        ]}
      />
      <main style={pageStyle}>
        <section id="resultado" style={cardStyle}>
          <p style={eyebrowStyle(verificationState === "confirmed")}>
            {verificationState === "confirmed" ? "Pago completado" : "Pago recibido"}
          </p>
          <h1 style={titleStyle}>
            {verificationState === "confirmed" ? "Compra confirmada" : "Compra en proceso de confirmacion"}
          </h1>
          <p style={textStyle}>{message}</p>
          {sessionId ? <p style={metaStyle}>Sesion Stripe: {sessionId}</p> : null}
          <div style={actionsStyle}>
            <Link href="/biblioteca" style={primaryLinkStyle}>Ir a mi biblioteca</Link>
            <Link href="/catalogo" style={secondaryLinkStyle}>Volver al catalogo</Link>
          </div>
        </section>
      </main>
    </>
  );
}

const pageStyle: CSSProperties = { minHeight: "calc(100vh - 132px)", backgroundColor: "#f6f7fb", display: "flex", alignItems: "center", justifyContent: "center", padding: "36px 24px 48px", fontFamily: "Georgia, serif" };
const cardStyle: CSSProperties = { width: "100%", maxWidth: "680px", backgroundColor: "#ffffff", borderRadius: "10px", padding: "32px", boxShadow: "0 20px 50px rgba(0,0,0,0.08)", display: "grid", gap: "16px" };
const titleStyle: CSSProperties = { margin: 0, color: "#013473", fontSize: "32px", fontFamily: "'Times New Roman', serif" };
const textStyle: CSSProperties = { margin: 0, color: "#4f5b66", fontSize: "15px", lineHeight: "1.8" };
const metaStyle: CSSProperties = { margin: 0, color: "#7a8794", fontSize: "12px", wordBreak: "break-all" };
const actionsStyle: CSSProperties = { display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "8px" };
const primaryLinkStyle: CSSProperties = { backgroundColor: "#013473", color: "#ffffff", textDecoration: "none", padding: "12px 16px", borderRadius: "6px", fontSize: "14px" };
const secondaryLinkStyle: CSSProperties = { backgroundColor: "#eef2f7", color: "#013473", textDecoration: "none", padding: "12px 16px", borderRadius: "6px", fontSize: "14px" };

function eyebrowStyle(isConfirmed: boolean): CSSProperties {
  return {
    margin: 0,
    color: isConfirmed ? "#2E7D32" : "#9a6700",
    fontSize: "12px",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  };
}
