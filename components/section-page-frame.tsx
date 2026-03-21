"use client";

import type { CSSProperties, ReactNode } from "react";

type SectionPageFrameProps = {
  children: ReactNode;
  sidebar: ReactNode;
  maxWidth?: string;
  sidebarPosition?: "left" | "right";
};

export function SectionPageFrame({
  children,
  sidebar,
  maxWidth = "1120px",
  sidebarPosition = "right",
}: SectionPageFrameProps) {
  const isSidebarLeft = sidebarPosition === "left";

  return (
    <div
      style={{
        maxWidth,
        margin: "0 auto",
        padding: "18px 20px 28px",
        display: "grid",
        gridTemplateColumns: isSidebarLeft ? "300px minmax(0, 1fr)" : "minmax(0, 1fr) 300px",
        gap: "18px",
        alignItems: "start",
      }}
    >
      {isSidebarLeft ? <aside style={asideColumnStyle}>{sidebar}</aside> : null}
      <div style={{ minWidth: 0, display: "grid", gap: "16px" }}>{children}</div>
      {!isSidebarLeft ? <aside style={asideColumnStyle}>{sidebar}</aside> : null}
    </div>
  );
}

export function SectionSidebarCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={sidebarCardStyle}>
      <h3 style={sidebarTitleStyle}>{title}</h3>
      <div style={sidebarBodyStyle}>{children}</div>
    </section>
  );
}

const asideColumnStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  alignContent: "start",
  position: "sticky",
  top: "16px",
};

const sidebarCardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e1e7ef",
  borderRadius: "8px",
  overflow: "hidden",
  boxShadow: "0 8px 20px rgba(8, 26, 50, 0.04)",
};

const sidebarTitleStyle: CSSProperties = {
  margin: 0,
  padding: "12px 14px",
  color: "#013473",
  fontSize: "15px",
  fontFamily: "'Times New Roman', serif",
  borderBottom: "1px solid #e7edf5",
};

const sidebarBodyStyle: CSSProperties = {
  padding: "12px 14px",
  display: "grid",
  gap: "10px",
};
