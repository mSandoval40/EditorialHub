import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EditorialHub — Plataforma editorial independiente",
  description:
    "Publica, vende y distribuye tus libros digitales con comisiones desde 2%. La plataforma editorial independiente para autores de habla hispana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
