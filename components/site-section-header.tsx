"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { clearStoredToken, fetchMe, getStoredToken, type AuthUser } from "@/lib/api";

export type SectionChipLink = {
  label: string;
  href: string;
  active?: boolean;
  tone?: "default" | "strong" | "accent";
};

type SiteSectionHeaderProps = {
  title: string;
  chips?: SectionChipLink[];
  titleChips?: SectionChipLink[];
  activeNav?: "catalogo" | "autores" | "socios" | "panel" | "biblioteca" | "publicar" | "admin" | "mantenimiento" | "login" | "registro" | "terminos" | "none";
  topSlogan?: string;
  brandVariant?: "default" | "catalogo";
  adminChips?: SectionChipLink[];
};

export function SiteSectionHeader({
  title,
  chips = [],
  titleChips = [],
  activeNav = "none",
  topSlogan = "Publica fácil, vende rápido, compra lo que quieras",
  brandVariant = "catalogo",
  adminChips = [],
}: SiteSectionHeaderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const token = getStoredToken();

      if (!token) {
        if (!cancelled) {
          setHasSession(false);
          setUser(null);
        }
        return;
      }

      try {
        const me = await fetchMe(token);
        if (!cancelled) {
          setUser(me);
          setHasSession(true);
        }
      } catch {
        clearStoredToken();
        if (!cancelled) {
          setHasSession(false);
          setUser(null);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const isAdmin = Boolean(user?.roles.includes("ADMIN") || user?.roles.includes("ADMIN_02"));
  const adminRoleLabel = user?.roles.includes("ADMIN")
    ? "ADMIN"
    : user?.roles.includes("ADMIN_02")
      ? "ADMIN_02"
      : null;
  const showSocioBadge = hasSession && !isAdmin;
  const userLabel = hasSession && user ? `${user.accountLabel} activo: ${user.email}` : "Visitante";
  const socioChips: SectionChipLink[] =
    hasSession && !isAdmin
      ? [
          ...(activeNav === "catalogo"
            ? []
            : [{ label: "Catalogo", href: "/catalogo", tone: "strong" as const, active: false }]),
          { label: "Mi panel", href: "/panel", tone: "strong", active: activeNav === "panel" },
          { label: "Mi biblioteca", href: "/biblioteca", tone: "strong", active: activeNav === "biblioteca" },
          { label: "Publicar", href: "/publicar", tone: "accent", active: activeNav === "publicar" },
        ]
      : [];
  const navItems = hasSession
    ? isAdmin
      ? []
      : []
    : [
        { href: "/catalogo", label: "Catalogo", active: activeNav === "catalogo" },
        { href: "/registro", label: "Publicar", active: activeNav === "registro" },
        { href: "/login", label: "Iniciar sesion", active: activeNav === "login" },
      ];

  function logout() {
    clearStoredToken();
    window.location.href = "/login";
  }

  const searchHref = pathname
    ? `/buscar?from=${encodeURIComponent(pathname)}#en-esta-pagina`
    : "/buscar";

  return (
    <>
      <nav style={navStyle}>
        <Link href="/" style={brandVariant === "catalogo" ? catalogBrandLinkStyle : brandLinkStyle}>
          {brandVariant === "catalogo" ? (
            <>
              <span style={catalogBrandWordmarkStyle}>
                <span style={catalogBrandEditorialStyle}>Editorial</span>
                <span style={catalogBrandHubStyle}>Hub</span>
              </span>
              <span style={catalogBrandTagStyle}>Plataforma editorial independiente</span>
            </>
          ) : (
            <>
              <span style={brandStyle}>EditorialHub</span>
              <span style={brandTagStyle}>Plataforma editorial independiente</span>
            </>
          )}
        </Link>

        {topSlogan ? <div style={topSloganStyle}>{topSlogan}</div> : <div style={navSpacerStyle} />}

        <div style={navLinksStyle}>
          <Link href={searchHref} style={headerSearchLinkStyle}>
            <span style={headerSearchTextStyle}>Buscar obras, autores, etc.</span>
            <SearchIcon />
          </Link>

          {navItems.map((item) => (
            <HeaderLink key={item.href} href={item.href} active={item.active}>
              {item.label}
            </HeaderLink>
          ))}

          <div style={sessionGroupStyle}>
            {hasSession && isAdmin && adminRoleLabel ? (
              <span style={adminModeBadgeStyle}>{adminRoleLabel}</span>
            ) : null}
            {showSocioBadge ? (
              <span style={socioModeBadgeStyle}>SOCIO</span>
            ) : null}
            <span style={hasSession ? activeSessionBadgeStyle : visitorSessionBadgeStyle}>{userLabel}</span>
          </div>

          {hasSession ? (
            <button onClick={logout} style={loginButtonStyle}>
              Cerrar sesion
            </button>
          ) : null}
        </div>
      </nav>

      <section style={heroWrapStyle}>
        <div style={heroInnerStyle}>
          <div style={sectionHeaderBarStyle}>
            <div style={heroTitleWrapStyle}>
              <h1 style={heroTitleStyle}>{title}</h1>
              {titleChips.length > 0 ? (
                <div style={titleChipGroupStyle}>
                  {titleChips.map((chip) => (
                    <a
                      key={`${chip.label}-${chip.href}`}
                      href={chip.href}
                      style={resolveLocalChipStyle(chip)}
                    >
                      {chip.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
            {(isAdmin && adminChips.length > 0) || (!isAdmin && socioChips.length > 0) ? (
              <div style={subnavGroupStyle}>
                {(isAdmin ? adminChips : socioChips).map((chip) => (
                  <a
                    key={`${chip.label}-${chip.href}`}
                    href={chip.href}
                    style={resolveTopChipStyle(chip)}
                  >
                    {chip.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          {chips.length > 0 ? (
            <div style={sectionLocalNavRowStyle}>
              <div style={sectionLocalNavGroupStyle}>
                {chips.map((chip) => (
                  <a
                    key={`${chip.label}-${chip.href}`}
                    href={chip.href}
                    style={resolveLocalChipStyle(chip)}
                  >
                    {chip.label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

function HeaderLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} style={active ? activeNavLinkStyle : navLinkStyle}>
      {children}
    </Link>
  );
}

function resolveLocalChipStyle(chip: SectionChipLink) {
  if (chip.active) {
    return chip.tone === "accent"
      ? activeAccentLocalSubnavLinkStyle
      : activeLocalSubnavLinkStyle;
  }

  return chip.tone === "accent" ? accentLocalSubnavLinkStyle : localSubnavLinkStyle;
}

function resolveTopChipStyle(chip: SectionChipLink) {
  if (chip.active) {
    return chip.tone === "accent"
      ? activeAccentLocalSubnavLinkStyle
      : activeSubnavLinkStyle;
  }

  if (chip.tone === "accent") {
    return accentLocalSubnavLinkStyle;
  }

  return chip.tone === "strong" ? strongSubnavLinkStyle : subnavLinkStyle;
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      style={headerSearchIconStyle}
    >
      <circle
        cx="11"
        cy="11"
        r="6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16 16L20 20"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

const navStyle = {
  backgroundColor: "#0e315d",
  padding: "8px 18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const brandLinkStyle = {
  textDecoration: "none",
  display: "flex",
  alignItems: "baseline",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const catalogBrandLinkStyle = {
  textDecoration: "none",
  display: "grid",
  gap: "0px",
  alignContent: "center",
  minWidth: "190px",
};

const brandStyle = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: "bold",
};

const catalogBrandWordmarkStyle = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: "0px",
  fontSize: "22px",
  fontWeight: "bold",
  lineHeight: 1,
};

const catalogBrandEditorialStyle = {
  color: "#ffffff",
};

const catalogBrandHubStyle = {
  color: "#c8d0db",
};

const brandTagStyle = {
  color: "#7fd0cf",
  fontSize: "11px",
  fontStyle: "italic",
};

const catalogBrandTagStyle = {
  color: "#d8e6f2",
  fontSize: "11px",
  fontStyle: "italic",
  marginTop: "2px",
};

const topSloganStyle = {
  flex: 1,
  minWidth: "220px",
  color: "#c5ced9",
  fontSize: "18px",
  fontWeight: "500",
  letterSpacing: "0.01em",
  textAlign: "left" as const,
  paddingLeft: "6px",
};

const navSpacerStyle = {
  flex: 1,
  minWidth: "24px",
};

const navLinksStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const headerSearchLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  textDecoration: "none",
  color: "#f4f8fc",
  padding: "4px 2px",
};

const headerSearchTextStyle = {
  color: "#eef5fb",
  fontSize: "12px",
  fontWeight: "600",
  whiteSpace: "nowrap" as const,
  letterSpacing: "0.01em",
};

const headerSearchIconStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#eef5fb",
  width: "16px",
  height: "16px",
  flex: "0 0 auto",
};

const sessionGroupStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const navLinkStyle = {
  color: "#dce8f7",
  textDecoration: "none",
  fontSize: "11px",
};

const activeNavLinkStyle = {
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "11px",
  fontWeight: "bold",
};

const loginButtonStyle = {
  color: "#ffffff",
  backgroundColor: "transparent",
  fontSize: "11px",
  border: "1px solid #53769d",
  padding: "4px 10px",
  borderRadius: "999px",
  cursor: "pointer",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const heroWrapStyle = {
  background: "linear-gradient(180deg, #0e315d 0%, #1b4678 54%, #f4f6f8 54%, #f4f6f8 100%)",
  padding: "2px 18px 0 18px",
};

const heroInnerStyle = {
  maxWidth: "1320px",
  margin: "0 auto",
  display: "grid",
  boxShadow: "0 10px 22px rgba(13, 34, 63, 0.07)",
};

const sectionHeaderBarStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "14px",
  padding: "8px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const heroTitleWrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap" as const,
  minWidth: "240px",
};

const heroTitleStyle = {
  margin: 0,
  color: "#10243d",
  fontSize: "18px",
  lineHeight: 1.1,
};

const titleChipGroupStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const subnavStyle = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap" as const,
};

const subnavGroupStyle = {
  ...subnavStyle,
  justifyContent: "flex-end",
};

const sectionLocalNavRowStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "0 0 14px 14px",
  marginTop: "-6px",
  padding: "0 14px 10px 14px",
  borderTop: "1px solid #edf2f7",
};

const sectionLocalNavGroupStyle = {
  ...subnavStyle,
  justifyContent: "flex-start",
  width: "100%",
  paddingTop: "10px",
};

const subnavLinkStyle = {
  textDecoration: "none",
  color: "#174c7f",
  backgroundColor: "#eaf2f9",
  borderRadius: "999px",
  padding: "6px 9px",
  fontSize: "11px",
  border: "1px solid #d8e3ee",
};

const activeSubnavLinkStyle = {
  ...subnavLinkStyle,
  color: "#ffffff",
  backgroundColor: "#0e315d",
  border: "1px solid #0e315d",
  boxShadow: "0 6px 14px rgba(14, 49, 93, 0.18)",
};

const strongSubnavLinkStyle = {
  ...subnavLinkStyle,
  color: "#ffffff",
  backgroundColor: "#174c7f",
  border: "1px solid #174c7f",
  boxShadow: "0 6px 14px rgba(23, 76, 127, 0.18)",
};

const localSubnavLinkStyle = {
  textDecoration: "none",
  color: "#34516f",
  backgroundColor: "#f7fafc",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "11px",
  border: "1px solid #d3deea",
};

const activeLocalSubnavLinkStyle = {
  ...localSubnavLinkStyle,
  color: "#174c7f",
  backgroundColor: "#eef5fb",
  border: "1px solid #b8cfe5",
  boxShadow: "none",
  fontWeight: "bold",
};

const accentLocalSubnavLinkStyle = {
  textDecoration: "none",
  color: "#ffffff",
  backgroundColor: "#2780c8",
  borderRadius: "999px",
  padding: "5px 11px",
  fontSize: "11px",
  border: "1px solid #1d6fae",
  boxShadow: "0 6px 14px rgba(39, 128, 200, 0.22)",
  fontWeight: "bold",
};

const activeAccentLocalSubnavLinkStyle = {
  ...accentLocalSubnavLinkStyle,
  backgroundColor: "#0f5f9d",
  border: "1px solid #0f5f9d",
  boxShadow: "0 8px 18px rgba(15, 95, 157, 0.24)",
};

const activeSessionBadgeStyle = {
  backgroundColor: "#17638d",
  border: "1px solid #51b7c3",
  borderRadius: "999px",
  padding: "4px 10px",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "bold",
};

const adminModeBadgeStyle = {
  backgroundColor: "#ffd54f",
  border: "1px solid #e0a800",
  borderRadius: "999px",
  padding: "4px 10px",
  color: "#5b4100",
  fontSize: "11px",
  fontWeight: "bold",
  boxShadow: "0 4px 10px rgba(224, 168, 0, 0.2)",
};

const socioModeBadgeStyle = {
  backgroundColor: "#43a047",
  border: "1px solid #2e7d32",
  borderRadius: "999px",
  padding: "4px 10px",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "bold",
  boxShadow: "0 4px 10px rgba(46, 125, 50, 0.18)",
};

const visitorSessionBadgeStyle = {
  backgroundColor: "#65788f",
  border: "1px solid #9ca9bb",
  borderRadius: "999px",
  padding: "4px 10px",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "bold",
};
