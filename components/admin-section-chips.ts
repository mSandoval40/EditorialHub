import type { SectionChipLink } from "@/components/site-section-header";

export function buildAdminSectionChips(
  activeExternal: "catalogo" | "admin" | "mantenimiento" | "panel" | "publicar" | "biblioteca" | "autores" | "socios" | "none" = "none",
  localChips: SectionChipLink[] = [],
): SectionChipLink[] {
  return [
    { label: "Catalogo", href: "/catalogo", tone: "strong", active: activeExternal === "catalogo" },
    { label: "Admin", href: "/admin", tone: "strong", active: activeExternal === "admin" },
    { label: "Mantenimiento", href: "/mantenimiento", tone: "strong", active: activeExternal === "mantenimiento" },
    { label: "Mi panel", href: "/panel", tone: "strong", active: activeExternal === "panel" },
    { label: "Publicar", href: "/publicar", tone: "strong", active: activeExternal === "publicar" },
    { label: "Mi biblioteca", href: "/biblioteca", tone: "strong", active: activeExternal === "biblioteca" },
    { label: "Autores", href: "/autores", tone: "strong", active: activeExternal === "autores" },
    { label: "Socios", href: "/socios", tone: "strong", active: activeExternal === "socios" },
    ...localChips,
  ];
}
