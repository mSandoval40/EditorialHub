"use client";

/* eslint-disable @next/next/no-img-element */
import { useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { Suspense } from "react";

export default function VisorArchivoPage() {
  return (
    <Suspense fallback={<main style={pageStyle}><section style={cardStyle}>Cargando visor...</section></main>}>
      <VisorArchivoContent />
    </Suspense>
  );
}

function VisorArchivoContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") ?? "";
  const label = searchParams.get("label") ?? "Archivo";
  const type = searchParams.get("type") ?? "file";
  const isImage = type === "image";

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <header style={{ display: "grid", gap: "8px" }}>
          <p style={eyebrowStyle}>Revision de archivo</p>
          <h1 style={titleStyle}>{label}</h1>
          <p style={descriptionStyle}>
            Aqui puedes revisar el archivo cargado y luego volver facilmente al flujo anterior.
          </p>
        </header>

        <div style={viewerStyle}>
          {url ? (
            isImage ? (
              <img src={url} alt={label} style={imageStyle} />
            ) : (
              <iframe src={url} title={label} style={iframeStyle} />
            )
          ) : (
            <p style={emptyStyle}>No se encontro una URL valida para mostrar este archivo.</p>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button onClick={() => window.history.back()} style={backButtonStyle}>
            Regresar
          </button>
        </div>
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f5f6f8",
  padding: "32px 20px",
  display: "flex",
  justifyContent: "center",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: "1100px",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "24px",
  display: "grid",
  gap: "20px",
  boxShadow: "0 14px 40px rgba(0, 0, 0, 0.08)",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: "#037D8C",
  fontSize: "12px",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "#013473",
  fontSize: "30px",
};

const descriptionStyle: CSSProperties = {
  margin: 0,
  color: "#5f6368",
  fontSize: "14px",
  lineHeight: "1.7",
};

const viewerStyle: CSSProperties = {
  minHeight: "70vh",
  border: "1px solid #d9dce3",
  borderRadius: "6px",
  overflow: "hidden",
  backgroundColor: "#101214",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const imageStyle: CSSProperties = {
  maxWidth: "100%",
  maxHeight: "78vh",
  objectFit: "contain",
  display: "block",
};

const iframeStyle: CSSProperties = {
  width: "100%",
  minHeight: "78vh",
  border: "none",
  backgroundColor: "#ffffff",
};

const emptyStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "14px",
};

const backButtonStyle: CSSProperties = {
  backgroundColor: "#013473",
  color: "#ffffff",
  border: "none",
  borderRadius: "4px",
  padding: "12px 18px",
  cursor: "pointer",
  fontFamily: "Georgia, serif",
};
