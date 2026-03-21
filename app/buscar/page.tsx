"use client";

import type { CSSProperties } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SectionPageFrame, SectionSidebarCard } from "@/components/section-page-frame";
import { SiteSectionHeader } from "@/components/site-section-header";
import {
  fetchMyPurchases,
  fetchMyWorks,
  fetchPublishedWorks,
  fetchUsers,
  getStoredToken,
  type AuthUser,
  type LibraryPurchase,
  type Work,
} from "@/lib/api";

type SearchState = "loading" | "ready" | "error";
type AnchorKey = "en-esta-pagina" | "exterior";

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  href?: string;
  bucket: "obra" | "autor" | "biblioteca" | "panel";
};

export default function BuscarPage() {
  return (
    <Suspense fallback={<main style={fallbackPageStyle}>Cargando buscador...</main>}>
      <BuscarPageContent />
    </Suspense>
  );
}

function BuscarPageContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/catalogo";
  const [query, setQuery] = useState("");
  const [externalQuery, setExternalQuery] = useState("");
  const [state, setState] = useState<SearchState>("loading");
  const [message, setMessage] = useState("");
  const [activeAnchor, setActiveAnchor] = useState<AnchorKey>("en-esta-pagina");
  const [publishedWorks, setPublishedWorks] = useState<Work[]>([]);
  const [myWorks, setMyWorks] = useState<Work[]>([]);
  const [myPurchases, setMyPurchases] = useState<LibraryPurchase[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [externalEngine, setExternalEngine] = useState<"google" | "brave">("google");

  useEffect(() => {
    function syncHash() {
      setActiveAnchor(window.location.hash === "#exterior" ? "exterior" : "en-esta-pagina");
    }

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    async function loadSources() {
      const token = getStoredToken();

      setState("loading");
      setMessage("");

      try {
        const tasks: Promise<unknown>[] = [fetchPublishedWorks()];

        if (token) {
          tasks.push(
            fetchMyWorks(token).catch(() => ({ items: [] as Work[] })),
            fetchMyPurchases(token).catch(() => ({ items: [] as LibraryPurchase[] })),
            fetchUsers(token).catch(() => ({ items: [] as AuthUser[] })),
          );
        }

        const [publishedResponse, myWorksResponse, myPurchasesResponse, usersResponse] =
          await Promise.all(tasks);

        setPublishedWorks((publishedResponse as { items: Work[] }).items);
        setMyWorks((myWorksResponse as { items: Work[] } | undefined)?.items ?? []);
        setMyPurchases((myPurchasesResponse as { items: LibraryPurchase[] } | undefined)?.items ?? []);
        setUsers((usersResponse as { items: AuthUser[] } | undefined)?.items ?? []);
        setState("ready");
      } catch (error) {
        setState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "No fue posible preparar la seccion de busqueda.",
        );
      }
    }

    void loadSources();
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const internalResults = useMemo<SearchResult[]>(() => {
    if (!normalizedQuery) {
      return [];
    }

    const results: SearchResult[] = [];
    const seen = new Set<string>();

    publishedWorks.forEach((work) => {
      const haystack = [
        work.title,
        work.authorPublicName ?? "",
        work.description ?? "",
        String(work.metadata?.genre ?? ""),
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedQuery)) {
        return;
      }

      const key = `work-${work.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          id: key,
          title: work.title,
          subtitle: work.authorPublicName ?? "Autor pendiente",
          meta: `Obra publicada | ${formatPublicationType(work.publicationType)} | ${formatOptionalDate(work.publishedAt)}`,
          href: `/obra/${work.slug || work.id}`,
          bucket: "obra",
        });
      }
    });

    users
      .filter((user) => Boolean(user.collaboratorProfile))
      .forEach((user) => {
        const fullName = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ");
        const extendedProfile = (user.profile ?? null) as
          | {
              publicBio?: string | null;
              publicPreferences?: string | null;
            }
          | null;
        const haystack = [
          user.collaboratorProfile?.publicName ?? "",
          fullName,
          user.email,
          extendedProfile?.publicBio ?? "",
          extendedProfile?.publicPreferences ?? "",
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(normalizedQuery)) {
          return;
        }

        const key = `author-${user.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            id: key,
            title: user.collaboratorProfile?.publicName ?? user.email,
            subtitle: fullName || "Autor registrado",
            meta: `Autor | ${user.email}`,
            bucket: "autor",
          });
        }
      });

    myWorks.forEach((work) => {
      const haystack = [work.title, work.description ?? "", work.status].join(" ").toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return;
      }

      const key = `my-work-${work.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          id: key,
          title: work.title,
          subtitle: "Mi panel",
          meta: `Mi obra | ${work.status} | ${formatPublicationType(work.publicationType)}`,
          href: `/obra/${work.slug || work.id}`,
          bucket: "panel",
        });
      }
    });

    myPurchases.flatMap((purchase) => purchase.items).forEach((item) => {
      const haystack = [item.title, item.authorName].join(" ").toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return;
      }

      const key = `library-${item.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          id: key,
          title: item.title,
          subtitle: item.authorName,
          meta: `Biblioteca | ${formatPublicationType(item.publicationType)} | ${formatOptionalDate(item.purchasedAt)}`,
          href: `/obra/${item.workSlug || item.workId}`,
          bucket: "biblioteca",
        });
      }
    });

    return results
      .sort((left, right) => left.title.localeCompare(right.title, "es", { sensitivity: "base" }))
      .slice(0, 40);
  }, [myPurchases, myWorks, normalizedQuery, publishedWorks, users]);

  const groupedResults = useMemo(() => {
    return {
      obras: internalResults.filter((item) => item.bucket === "obra"),
      autores: internalResults.filter((item) => item.bucket === "autor"),
      panel: internalResults.filter((item) => item.bucket === "panel"),
      biblioteca: internalResults.filter((item) => item.bucket === "biblioteca"),
    };
  }, [internalResults]);

  const externalHref = useMemo(() => {
    const encoded = encodeURIComponent(externalQuery.trim());
    if (!encoded) {
      return null;
    }

    if (externalEngine === "brave") {
      return `https://search.brave.com/search?q=${encoded}`;
    }

    return `https://www.google.com/search?q=${encoded}`;
  }, [externalEngine, externalQuery]);

  return (
    <main style={pageStyle}>
      <SiteSectionHeader
        title="Buscar"
        activeNav="none"
        chips={[
          { label: "En esta pagina", href: "#en-esta-pagina", active: activeAnchor === "en-esta-pagina" },
          { label: "Exterior", href: "#exterior", active: activeAnchor === "exterior" },
        ]}
      />

      <SectionPageFrame
        maxWidth="1320px"
        sidebar={
          <>
            <SectionSidebarCard title="Busqueda interna">
              <p style={sidebarTextStyle}>`En esta pagina` ahora busca dentro de toda la plataforma EditorialHub.</p>
              <p style={sidebarTextStyle}>Incluye obras publicadas y, si tienes acceso, tambien resultados de panel, biblioteca y directorio de autores.</p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Busqueda exterior">
              <p style={sidebarTextStyle}>`Exterior` lanza la misma consulta hacia un motor de busqueda web.</p>
              <p style={sidebarTextStyle}>Motores iniciales: <strong>Google</strong> y <strong>Brave</strong>.</p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Origen">
              <p style={sidebarTextStyle}>Llegaste desde: <strong>{formatFromLabel(from)}</strong></p>
              <p style={sidebarTextStyle}>El acceso vino del header global, pero la busqueda interna ya no queda limitada a ese modulo.</p>
            </SectionSidebarCard>
          </>
        }
      >
        {message ? <div style={feedbackStyle(state === "error")}>{message}</div> : null}

        <section style={searchBoxSectionStyle}>
          <h2 style={searchHeadingStyle}>Centro de busqueda</h2>
          <p style={searchHelpStyle}>
            Escribe una consulta una sola vez y decide si la quieres correr dentro de EditorialHub o hacia afuera.
          </p>
          <input
            type="text"
            placeholder="Escribe titulo, autor, genero o palabra clave"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={searchInputStyle}
          />
        </section>

        <section id="en-esta-pagina" style={sectionCardStyle}>
          <div style={sectionTitleRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>En esta pagina</h2>
              <p style={sectionDescriptionStyle}>
                Busqueda interna general dentro de toda la plataforma EditorialHub.
              </p>
            </div>
            <span style={contextBadgeStyle}>EditorialHub completo</span>
          </div>

          {state === "loading" ? <div style={emptyStateStyle}>Preparando indices de busqueda interna...</div> : null}

          {state === "ready" && !normalizedQuery ? (
            <div style={emptyStateStyle}>Escribe algo para buscar dentro de EditorialHub.</div>
          ) : null}

          {state === "ready" && normalizedQuery && internalResults.length === 0 ? (
            <div style={emptyStateStyle}>No hubo coincidencias dentro de EditorialHub para esa consulta.</div>
          ) : null}

          {state === "ready" && internalResults.length > 0 ? (
            <div style={internalGridStyle}>
              <SearchGroup title="Obras" items={groupedResults.obras} />
              <SearchGroup title="Autores" items={groupedResults.autores} />
              <SearchGroup title="Mi panel" items={groupedResults.panel} />
              <SearchGroup title="Mi biblioteca" items={groupedResults.biblioteca} />
            </div>
          ) : null}
        </section>

        <section id="exterior" style={sectionCardStyle}>
          <div style={sectionTitleRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Exterior</h2>
              <p style={sectionDescriptionStyle}>
                Lanza una consulta propia hacia un motor de busqueda externo.
              </p>
            </div>
          </div>

          <div style={externalPanelStyle}>
            <input
              type="text"
              placeholder="Escribe aqui tu busqueda web"
              value={externalQuery}
              onChange={(event) => setExternalQuery(event.target.value)}
              style={searchInputStyle}
            />

            <div style={engineRowStyle}>
              <button
                type="button"
                onClick={() => setExternalEngine("google")}
                style={externalEngine === "google" ? activeEngineButtonStyle : engineButtonStyle}
              >
                Google
              </button>
              <button
                type="button"
                onClick={() => setExternalEngine("brave")}
                style={externalEngine === "brave" ? activeEngineButtonStyle : engineButtonStyle}
              >
                Brave
              </button>
            </div>

            <p style={externalHelpStyle}>
              Motor seleccionado: <strong>{externalEngine === "google" ? "Google" : "Brave"}</strong>
            </p>

            {externalHref ? (
              <a href={externalHref} target="_blank" rel="noreferrer" style={externalLaunchLinkStyle}>
                Buscar en {externalEngine === "google" ? "Google" : "Brave"}
              </a>
            ) : (
              <div style={emptyStateStyle}>Escribe una consulta para habilitar la busqueda externa.</div>
            )}
          </div>
        </section>
      </SectionPageFrame>
    </main>
  );
}

function SearchGroup({ title, items }: { title: string; items: SearchResult[] }) {
  return (
    <section style={groupCardStyle}>
      <h3 style={groupTitleStyle}>{title}</h3>
      {items.length > 0 ? (
        <ResultList items={items} />
      ) : (
        <div style={groupEmptyStyle}>Sin resultados en esta categoria.</div>
      )}
    </section>
  );
}

function ResultList({ items }: { items: SearchResult[] }) {
  return (
    <div style={resultListStyle}>
      {items.map((item) => {
        const content = (
          <>
            <p style={resultTitleStyle}>{item.title}</p>
            <p style={resultSubtitleStyle}>{item.subtitle}</p>
            <p style={resultMetaStyle}>{item.meta}</p>
          </>
        );

        return item.href ? (
          <a key={item.id} href={item.href} style={resultCardLinkStyle}>
            {content}
          </a>
        ) : (
          <div key={item.id} style={resultCardStyle}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function formatFromLabel(from: string) {
  switch (from) {
    case "/catalogo":
      return "Catalogo";
    case "/autores":
      return "Autores";
    case "/biblioteca":
      return "Mi biblioteca";
    case "/panel":
      return "Mi panel";
    case "/admin":
      return "Admin";
    default:
      return from.replace("/", "") || "Desconocido";
  }
}

function formatPublicationType(value: Work["publicationType"] | LibraryPurchase["items"][number]["publicationType"]) {
  switch (value) {
    case "BOOK":
      return "Libro";
    case "MAGAZINE":
      return "Revista";
    case "ARTICLE":
      return "Articulo";
    default:
      return "Otro";
  }
}

function formatOptionalDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function feedbackStyle(isError: boolean): CSSProperties {
  return {
    padding: "14px 16px",
    borderRadius: "12px",
    border: `1px solid ${isError ? "#efb7b7" : "#d7e3ef"}`,
    backgroundColor: isError ? "#fff5f5" : "#f7fbff",
    color: isError ? "#8b1f1f" : "#14395f",
    fontSize: "14px",
  };
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f3f6fb",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const fallbackPageStyle: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f3f6fb",
  fontFamily: "Georgia, 'Times New Roman', serif",
  padding: "32px 40px",
  color: "#123c6b",
};

const sidebarTextStyle: CSSProperties = {
  margin: 0,
  color: "#4b5563",
  fontSize: "12px",
  lineHeight: 1.65,
};

const searchBoxSectionStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #dde6f1",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 12px 30px rgba(10, 28, 52, 0.05)",
  display: "grid",
  gap: "10px",
};

const searchHeadingStyle: CSSProperties = {
  margin: 0,
  color: "#133a67",
  fontSize: "28px",
};

const searchHelpStyle: CSSProperties = {
  margin: 0,
  color: "#5a6878",
  fontSize: "14px",
};

const searchInputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid #d8e2ef",
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: "14px",
  boxSizing: "border-box",
};

const sectionCardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #dde6f1",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 12px 30px rgba(10, 28, 52, 0.05)",
  display: "grid",
  gap: "14px",
};

const sectionTitleRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: "#123c6b",
  fontSize: "26px",
};

const sectionDescriptionStyle: CSSProperties = {
  margin: "6px 0 0 0",
  color: "#5d6c7c",
  fontSize: "14px",
};

const contextBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  backgroundColor: "#eef5fb",
  border: "1px solid #c9d8e8",
  color: "#174c7f",
  padding: "7px 12px",
  fontSize: "12px",
  fontWeight: "bold",
};

const emptyStateStyle: CSSProperties = {
  padding: "20px 16px",
  borderRadius: "12px",
  backgroundColor: "#f7f9fc",
  border: "1px dashed #cfd9e6",
  color: "#4e6072",
  fontSize: "14px",
  textAlign: "center",
};

const internalGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "16px",
};

const groupCardStyle: CSSProperties = {
  borderRadius: "14px",
  border: "1px solid #dde6f1",
  backgroundColor: "#fbfdff",
  padding: "14px",
  display: "grid",
  gap: "12px",
};

const groupTitleStyle: CSSProperties = {
  margin: 0,
  color: "#163a67",
  fontSize: "18px",
};

const groupEmptyStyle: CSSProperties = {
  color: "#6c7b8a",
  fontSize: "13px",
};

const resultListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const resultCardStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid #dde6f1",
  backgroundColor: "#ffffff",
  padding: "14px",
  display: "grid",
  gap: "4px",
};

const resultCardLinkStyle: CSSProperties = {
  ...resultCardStyle,
  textDecoration: "none",
};

const resultTitleStyle: CSSProperties = {
  margin: 0,
  color: "#163a67",
  fontSize: "16px",
  fontWeight: "bold",
};

const resultSubtitleStyle: CSSProperties = {
  margin: 0,
  color: "#526377",
  fontSize: "13px",
};

const resultMetaStyle: CSSProperties = {
  margin: 0,
  color: "#6a7a8b",
  fontSize: "12px",
};

const externalPanelStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
};

const engineRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const engineButtonStyle: CSSProperties = {
  border: "1px solid #cfd9e6",
  backgroundColor: "#f7f9fc",
  color: "#163a67",
  borderRadius: "999px",
  padding: "9px 14px",
  fontSize: "13px",
  cursor: "pointer",
};

const activeEngineButtonStyle: CSSProperties = {
  ...engineButtonStyle,
  backgroundColor: "#163a67",
  border: "1px solid #163a67",
  color: "#ffffff",
};

const externalHelpStyle: CSSProperties = {
  margin: 0,
  color: "#5c6c7c",
  fontSize: "14px",
};

const externalLaunchLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "fit-content",
  textDecoration: "none",
  borderRadius: "999px",
  backgroundColor: "#163a67",
  color: "#ffffff",
  padding: "11px 18px",
  fontSize: "13px",
};
