"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { SiteSectionHeader } from "@/components/site-section-header";

export default function CompraCanceladaPage() {
  return (
    <Suspense fallback={<main style={pageStyle}><section id="resultado" style={cardStyle}>Cargando...</section></main>}>
      <CompraCanceladaContent />
    </Suspense>
  );
}

function CompraCanceladaContent() {
  const searchParams = useSearchParams();
  const purchaseId = searchParams.get("purchaseId");

  return (
    <>
      <SiteSectionHeader
        title="Compra cancelada"
        activeNav="catalogo"
        chips={[
          { label: "Resultado", href: "#resultado" },
          { label: "Catalogo", href: "/catalogo" },
          { label: "Mi panel", href: "/panel" },
        ]}
      />
      <main style={pageStyle}>
        <section id="resultado" style={cardStyle}>
          <p style={eyebrowStyle}>Pago cancelado</p>
          <h1 style={titleStyle}>La compra no se completo</h1>
          <p style={textStyle}>
            Tu intento de pago en Stripe fue cancelado o expiro antes de confirmarse. Puedes volver a intentarlo
            desde la ficha de la obra cuando quieras.
          </p>
          {purchaseId ? <p style={metaStyle}>Referencia interna: {purchaseId}</p> : null}
          <div style={actionsStyle}>
            <Link href="/catalogo" style={primaryLinkStyle}>Volver al catalogo</Link>
            <Link href="/panel" style={secondaryLinkStyle}>Ir a mi panel</Link>
          </div>
        </section>
      </main>
    </>
  );
}

const pageStyle: CSSProperties = { minHeight: "calc(100vh - 132px)", backgroundColor: "#f6f7fb", display: "flex", alignItems: "center", justifyContent: "center", padding: "36px 24px 48px", fontFamily: "Georgia, serif" };
const cardStyle: CSSProperties = { width: "100%", maxWidth: "680px", backgroundColor: "#ffffff", borderRadius: "10px", padding: "32px", boxShadow: "0 20px 50px rgba(0,0,0,0.08)", display: "grid", gap: "16px" };
const eyebrowStyle: CSSProperties = { margin: 0, color: "#b71c1c", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em" };
const titleStyle: CSSProperties = { margin: 0, color: "#013473", fontSize: "32px", fontFamily: "'Times New Roman', serif" };
const textStyle: CSSProperties = { margin: 0, color: "#4f5b66", fontSize: "15px", lineHeight: "1.8" };
const metaStyle: CSSProperties = { margin: 0, color: "#7a8794", fontSize: "12px", wordBreak: "break-all" };
const actionsStyle: CSSProperties = { display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "8px" };
const primaryLinkStyle: CSSProperties = { backgroundColor: "#013473", color: "#ffffff", textDecoration: "none", padding: "12px 16px", borderRadius: "6px", fontSize: "14px" };
const secondaryLinkStyle: CSSProperties = { backgroundColor: "#eef2f7", color: "#013473", textDecoration: "none", padding: "12px 16px", borderRadius: "6px", fontSize: "14px" };
