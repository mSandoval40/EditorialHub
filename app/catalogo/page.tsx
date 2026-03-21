"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { buildAdminSectionChips } from "@/components/admin-section-chips";
import { SectionPageFrame, SectionSidebarCard } from "@/components/section-page-frame";
import { SiteSectionHeader } from "@/components/site-section-header";
import { fetchPublishedWorks, type Work } from "@/lib/api";

type LoadState = "loading" | "ready" | "error";

export default function CatalogoPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [hasSession] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return Boolean(window.localStorage.getItem("editorialhub_access_token"));
  });

  useEffect(() => {
    async function loadCatalog() {
      try {
        const response = await fetchPublishedWorks();
        const sorted = [...response.items].sort((left, right) => {
          const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
          const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
          return rightTime - leftTime;
        });

        setWorks(sorted);
        setState("ready");
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "No fue posible cargar el catalogo.");
      }
    }

    loadCatalog();
  }, []);

  const featuredWorks = works.slice(0, 10);
  const newWorks = works.slice(10, 20).length > 0 ? works.slice(10, 20) : works.slice(0, 10);
  const bestRatedWorks = useMemo(() => {
    return [...works]
      .filter((work) => (work.ratings?.totalReviews ?? 0) > 0 && work.ratings?.visibleAverage !== null)
      .sort((left, right) => {
        const leftRating = left.ratings?.visibleAverage ?? 0;
        const rightRating = right.ratings?.visibleAverage ?? 0;

        if (rightRating !== leftRating) {
          return rightRating - leftRating;
        }

        const leftReviews = left.ratings?.totalReviews ?? 0;
        const rightReviews = right.ratings?.totalReviews ?? 0;

        if (rightReviews !== leftReviews) {
          return rightReviews - leftReviews;
        }

        const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
        const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
        return rightTime - leftTime;
      })
      .slice(0, 10);
  }, [works]);
  const recommendedWorks = works.slice(20, 30).length > 0 ? works.slice(20, 30) : works.slice(0, 10);

  const genreLinks = useMemo(() => {
    const genreSet = new Set<string>();

    works.forEach((work) => {
      const genre = typeof work.metadata?.genre === "string" ? work.metadata.genre.trim() : "";
      if (genre) {
        genreSet.add(genre);
      }
    });

    return Array.from(genreSet).slice(0, 16);
  }, [works]);

  return (
    <main style={pageStyle}>
      <SiteSectionHeader
        title="Catálogo EditorialHub"
        activeNav="catalogo"
        brandVariant="catalogo"
        topSlogan="Publica fácil, vende rápido, compra lo que quieras"
        adminChips={buildAdminSectionChips("catalogo").filter((chip) => chip.label !== "Catalogo")}
        titleChips={
          hasSession
            ? [{ label: "Membresías", href: "/membresias", tone: "accent" as const }]
            : []
        }
        chips={[
          { label: "Destacadas", href: "#destacadas" },
          { label: "Novedades", href: "#novedades" },
          { label: "Mejores calificados", href: "#mejores-calificados" },
          { label: "Recomendadas", href: "#recomendadas" },
          { label: "Más para explorar", href: "#explorar" },
        ]}
      />

      <SectionPageFrame
        maxWidth="1320px"
        sidebarPosition="left"
        sidebar={
          <>
            <SectionSidebarCard title="Promocion editorial">
              <p style={sidebarTextStyle}>Aqui podremos colocar publicidad interna, promociones y lanzamientos especiales.</p>
              <p style={sidebarTextStyle}>Tambien funciona como espacio para noticias, recomendaciones o avisos destacados.</p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Resumen del catalogo">
              <p style={sidebarTextStyle}>Obras publicadas: <strong>{works.length}</strong></p>
              <p style={sidebarTextStyle}>Mejores calificadas: <strong>{bestRatedWorks.length}</strong></p>
              <p style={sidebarTextStyle}>Generos visibles: <strong>{genreLinks.length}</strong></p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Explora rapido">
              <p style={sidebarTextStyle}>Destacadas y novedades para descubrir lo mas reciente.</p>
              <p style={sidebarTextStyle}>Mejores calificados para seguir a los lectores.</p>
              <p style={sidebarTextStyle}>Mas para explorar para navegar por genero.</p>
            </SectionSidebarCard>
          </>
        }
      >
        {message ? <div style={feedbackStyle(state === "error")}>{message}</div> : null}

        {state === "loading" ? <div style={emptyStyle}>Cargando catalogo...</div> : null}

        {state === "ready" && works.length === 0 ? (
          <div style={emptyStyle}>Todavia no hay obras publicadas en el catalogo.</div>
        ) : null}

        {featuredWorks.length > 0 ? (
          <CatalogShelf
            id="destacadas"
            title="Publicadas recientes"
            subtitle="Portadas al frente, datos esenciales al pie y acceso directo a la ficha publica."
            works={featuredWorks}
          />
        ) : null}

        {newWorks.length > 0 ? (
          <CatalogShelf
            id="novedades"
            title="Novedades"
            subtitle="Una segunda pasada compacta para seguir explorando sin romper el ritmo visual."
            works={newWorks}
          />
        ) : null}

        {bestRatedWorks.length > 0 ? (
          <CatalogShelf
            id="mejores-calificados"
            title="Mejores calificados"
            subtitle="Las obras con mejor promedio visible y respaldo real de lectores."
            works={bestRatedWorks}
          />
        ) : null}

        {recommendedWorks.length > 0 ? (
          <CatalogShelf
            id="recomendadas"
            title="Recomendadas"
            subtitle="Una selección adicional para seguir navegando sin salir del flujo principal del catálogo."
            works={recommendedWorks}
          />
        ) : null}

        <section id="explorar" style={exploreSectionStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Mas para explorar</h2>
              <p style={sectionSubtitleStyle}>
                Generos ya presentes en el catalogo. Mas adelante aqui podremos entrarle a filtros finos,
                rankings y clasificaciones completas.
              </p>
            </div>
          </div>

          <div style={genreGridStyle}>
            {genreLinks.length > 0 ? (
              genreLinks.map((genre) => (
                <div key={genre} style={genreChipStyle}>
                  {genre}
                </div>
              ))
            ) : (
              <div style={emptyExploreStyle}>Todavia no hay generos suficientes para construir esta vista.</div>
            )}
          </div>
        </section>
      </SectionPageFrame>

      <footer style={footerStyle}>
        <div style={footerInnerStyle}>
          <p style={footerTopStyle}>EditorialHub</p>
          <p style={footerTextStyle}>
            Catalogo en evolucion. La base funcional ya esta viva; el pulido editorial y comercial seguira en las
            siguientes iteraciones.
          </p>
          <div style={footerLinksStyle}>
            <Link href="/terminos" style={footerLinkStyle}>
              Terminos
            </Link>
            <Link href="/registro" style={footerLinkStyle}>
              Publicar una obra
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function CatalogShelf({
  id,
  title,
  subtitle,
  works,
}: {
  id: string;
  title: string;
  subtitle: string;
  works: Work[];
}) {
  return (
    <section id={id} style={shelfSectionStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={sectionTitleStyle}>{title}</h2>
          <p style={sectionSubtitleStyle}>{subtitle}</p>
        </div>
      </div>

      <div style={shelfGridStyle}>
        {works.map((work) => {
          const genre = typeof work.metadata?.genre === "string" ? work.metadata.genre : "Sin genero";
          const pageCount =
            typeof work.metadata?.pageCount === "number" || typeof work.metadata?.pageCount === "string"
              ? String(work.metadata.pageCount)
              : "-";
          const language = typeof work.metadata?.language === "string" ? work.metadata.language : "Digital";
          const numericPrice =
            typeof work.metadata?.price === "number"
              ? work.metadata.price
              : typeof work.metadata?.price === "string"
                ? Number(work.metadata.price)
                : null;
          const ratingValue = work.ratings?.visibleAverage ?? null;
          const totalReviews = work.ratings?.totalReviews ?? 0;
          const editorialBadge = work.editorial?.editorialBadgeText ?? null;
          const editorialHeadline = work.editorial?.editorialHeadline ?? null;

          return (
            <Link key={work.id} href={`/obra/${work.slug}`} style={workCardLinkStyle}>
              <article style={workCardStyle}>
                <CatalogCover title={work.title} coverUrl={work.assets.cover?.url ?? null} />

                <div style={metaBlockStyle}>
                  <p style={typeLineStyle}>{work.publicationType}</p>
                  {editorialBadge ? <span style={editorialBadgeStyle}>{editorialBadge}</span> : null}
                  <h3 style={titleLineStyle}>{work.title}</h3>
                  {editorialHeadline ? <p style={editorialHeadlineStyle}>{editorialHeadline}</p> : null}
                  <p style={authorLineStyle}>{work.authorPublicName ?? "Autor pendiente"}</p>
                  <div style={ratingRowStyle}>
                    {ratingValue !== null && totalReviews > 0 ? (
                      <>
                        <span style={ratingStarsStyle}>{buildStarString(ratingValue)}</span>
                        <span style={ratingValueStyle}>{ratingValue.toFixed(1)}</span>
                        <span style={ratingCountStyle}>({totalReviews})</span>
                      </>
                    ) : (
                      <span style={ratingEmptyStyle}>Sin calificaciones todavia</span>
                    )}
                  </div>
                  <p style={microLineStyle}>{genre}</p>
                  <p style={microLineStyle}>
                    {language} · {pageCount} pags.
                  </p>
                  <p style={priceLineStyle}>
                    {numericPrice !== null && Number.isFinite(numericPrice)
                      ? `MXN ${numericPrice.toFixed(2)}`
                      : "Precio pendiente"}
                  </p>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function CatalogCover({ title, coverUrl }: { title: string; coverUrl: string | null }) {
  const [ratio, setRatio] = useState<number | null>(null);
  const tone = getCoverTone(ratio);

  if (!coverUrl) {
    return <div style={coverPlaceholderStyle}>Sin portada</div>;
  }

  return (
    <div style={coverFrameStyle(tone)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverUrl}
        alt={`Portada de ${title}`}
        style={coverThumbStyle(tone)}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth > 0 && naturalHeight > 0) {
            setRatio(naturalWidth / naturalHeight);
          }
        }}
      />
    </div>
  );
}

function buildStarString(value: number) {
  return Array.from({ length: 5 }, (_item, index) => (value >= index + 1 ? "★" : "☆")).join("");
}

function getCoverTone(ratio: number | null): "portrait" | "balanced" | "wide" {
  if (ratio === null) {
    return "balanced";
  }

  if (ratio <= 0.68) {
    return "portrait";
  }

  if (ratio >= 0.8) {
    return "wide";
  }

  return "balanced";
}

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#f4f6f8",
  color: "#10243d",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const sidebarTextStyle = {
  margin: 0,
  color: "#4b5563",
  fontSize: "12px",
  lineHeight: "1.7",
};

const shelfSectionStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "18px",
  padding: "16px 16px 14px 16px",
  boxShadow: "0 14px 30px rgba(17, 34, 64, 0.05)",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "end",
  gap: "16px",
  marginBottom: "12px",
};

const sectionTitleStyle = {
  margin: 0,
  color: "#0f294a",
  fontSize: "18px",
};

const sectionSubtitleStyle = {
  margin: "4px 0 0 0",
  color: "#6d7987",
  fontSize: "11px",
  lineHeight: 1.5,
};

const shelfGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))",
  gap: "14px",
};

const workCardLinkStyle = {
  textDecoration: "none",
};

const workCardStyle = {
  display: "grid",
  gap: "8px",
  alignContent: "start",
};

function coverFrameStyle(tone: "portrait" | "balanced" | "wide"): CSSProperties {
  return {
    background:
      tone === "portrait"
        ? "linear-gradient(180deg, #f1f5f9 0%, #dde7f0 100%)"
        : tone === "wide"
          ? "linear-gradient(180deg, #eef4f8 0%, #d8e3ec 100%)"
          : "linear-gradient(180deg, #eef3f8 0%, #dbe5ef 100%)",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 10px 20px rgba(13, 37, 65, 0.08)",
    aspectRatio: tone === "portrait" ? "1 / 1.6" : tone === "wide" ? "1 / 1.42" : "1 / 1.52",
    padding: tone === "portrait" ? "6px" : tone === "wide" ? "10px" : "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function coverThumbStyle(tone: "portrait" | "balanced" | "wide"): CSSProperties {
  return {
    width: tone === "portrait" ? "96%" : tone === "wide" ? "92%" : "94%",
    height: tone === "portrait" ? "96%" : tone === "wide" ? "90%" : "94%",
    objectFit: "contain",
    objectPosition: "center",
    display: "block",
    filter: "drop-shadow(0 8px 14px rgba(13, 37, 65, 0.14))",
  };
}

const coverPlaceholderStyle: CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1.52",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#68809c",
  fontSize: "12px",
  backgroundColor: "#ebeff3",
  borderRadius: "10px",
  boxShadow: "0 10px 20px rgba(13, 37, 65, 0.08)",
};

const metaBlockStyle = {
  display: "grid",
  gap: "2px",
};

const typeLineStyle = {
  margin: 0,
  color: "#1f6b8f",
  fontSize: "10px",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  fontWeight: "bold",
};

const editorialBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "3px 8px",
  borderRadius: "999px",
  backgroundColor: "#fff4d6",
  color: "#8a5a00",
  fontSize: "9px",
  fontWeight: "bold",
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
};

const titleLineStyle = {
  margin: 0,
  color: "#10243d",
  fontSize: "14px",
  lineHeight: 1.2,
};

const authorLineStyle = {
  margin: 0,
  color: "#4e5d6d",
  fontSize: "11px",
  lineHeight: 1.4,
};

const editorialHeadlineStyle = {
  margin: 0,
  color: "#8a5a00",
  fontSize: "10px",
  lineHeight: 1.4,
};

const microLineStyle = {
  margin: 0,
  color: "#728191",
  fontSize: "10px",
  lineHeight: 1.35,
};

const priceLineStyle = {
  margin: "2px 0 0 0",
  color: "#0e315d",
  fontSize: "11px",
  lineHeight: 1.4,
  fontWeight: "bold",
};

const ratingRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexWrap: "wrap" as const,
  minHeight: "18px",
};

const ratingStarsStyle = {
  color: "#f59e0b",
  fontSize: "11px",
  letterSpacing: "0.04em",
};

const ratingValueStyle = {
  color: "#10243d",
  fontSize: "10px",
  fontWeight: "bold",
};

const ratingCountStyle = {
  color: "#728191",
  fontSize: "10px",
};

const ratingEmptyStyle = {
  color: "#8b9097",
  fontSize: "10px",
};

const exploreSectionStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "18px",
  padding: "20px 18px 20px 18px",
  boxShadow: "0 14px 30px rgba(17, 34, 64, 0.05)",
};

const genreGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
  gap: "10px",
};

const genreChipStyle = {
  border: "1px solid #dde5ed",
  borderRadius: "12px",
  padding: "12px 14px",
  color: "#1d3552",
  fontSize: "13px",
  backgroundColor: "#fbfcfd",
};

const emptyExploreStyle = {
  color: "#6d7987",
  fontSize: "14px",
};

const footerStyle = {
  backgroundColor: "#0f294a",
  marginTop: "18px",
};

const footerInnerStyle = {
  maxWidth: "1320px",
  margin: "0 auto",
  padding: "24px 26px 28px 26px",
};

const footerTopStyle = {
  margin: 0,
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "bold",
};

const footerTextStyle = {
  margin: "8px 0 0 0",
  color: "#b6c7d9",
  fontSize: "13px",
  lineHeight: 1.6,
  maxWidth: "760px",
};

const footerLinksStyle = {
  marginTop: "16px",
  display: "flex",
  gap: "14px",
  flexWrap: "wrap" as const,
};

const footerLinkStyle = {
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "12px",
};

const emptyStyle = {
  backgroundColor: "#ffffff",
  color: "#5a6978",
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 14px 30px rgba(17, 34, 64, 0.05)",
};

function feedbackStyle(isError: boolean) {
  return {
    padding: "14px 16px",
    borderRadius: "14px",
    backgroundColor: isError ? "#fdecea" : "#e8f5e9",
    color: isError ? "#b71c1c" : "#1b5e20",
    fontSize: "14px",
  };
}


