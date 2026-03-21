"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { buildAdminSectionChips } from "@/components/admin-section-chips";
import { SectionPageFrame, SectionSidebarCard } from "@/components/section-page-frame";
import { SiteSectionHeader } from "@/components/site-section-header";
import { fetchPublishedWorks, fetchUsers, getStoredToken, type AuthUser, type Work } from "@/lib/api";

type LoadState = "loading" | "ready" | "error";

type ExtendedCollaboratorProfile = NonNullable<AuthUser["collaboratorProfile"]> & {
  id: string;
  bio?: string | null;
  royaltyRatePercent?: string | null;
  loyalty?: {
    level: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";
    label: string;
    points: number;
    currentRatePercent: string;
    nextLevelLabel: string | null;
    nextLevelRatePercent: string | null;
    pointsToNextLevel: number;
    progressPercent: number;
    estimatedExtraPer100Mxn: string;
    isManualDiamond: boolean;
    assignedAt?: string | null;
  } | null;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  legalName?: string | null;
  curp?: string | null;
  dateOfBirth?: string | null;
  bankValidationStatus?: string;
  bankValidationReference?: string | null;
  bankValidationRequestedAt?: string | null;
  bankValidationNotes?: string | null;
  bankValidatedAt?: string | null;
};

type ExtendedVisibleProfile = NonNullable<AuthUser["profile"]> & {
  publicBio?: string | null;
  publicPreferences?: string | null;
  showAvatar?: boolean;
  showPublicBio?: boolean;
  showPublicPreferences?: boolean;
};

type AuthorDirectoryEntry = {
  id: string;
  userId: string;
  publicName: string;
  legalName: string | null;
  realName: string;
  email: string;
  avatarUrl: string | null;
  publicBio: string | null;
  publicPreferences: string | null;
  registeredAt: string;
  updatedAt: string;
  profileType: "CERTIFIED" | "ANONYMOUS";
  applicationStatus: "IN_REVIEW" | "APPROVED" | "REJECTED";
  bio: string | null;
  royaltyRatePercent: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  curp: string | null;
  dateOfBirth: string | null;
  bankValidationStatus: string | null;
  bankValidationReference: string | null;
  bankValidationRequestedAt: string | null;
  bankValidationNotes: string | null;
  bankValidatedAt: string | null;
  loyaltyLabel: string | null;
  loyaltyRatePercent: string | null;
  loyaltyPoints: number;
  nextLoyaltyLabel: string | null;
  loyaltyAssignedManually: boolean;
  publishedWorks: Work[];
};

const LAST_SELECTED_AUTHOR_KEY = "editorialhub_admin_last_author_detail";

export default function AutoresPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [publishedWorks, setPublishedWorks] = useState<Work[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<"listado" | "detalles">("listado");

  useEffect(() => {
    function syncAnchorFromHash() {
      setActiveAnchor(window.location.hash === "#detalles" ? "detalles" : "listado");
    }

    syncAnchorFromHash();
    window.addEventListener("hashchange", syncAnchorFromHash);
    return () => window.removeEventListener("hashchange", syncAnchorFromHash);
  }, []);

  useEffect(() => {
    async function loadData() {
      const token = getStoredToken();

      if (!token) {
        setState("error");
        setMessage("Inicia sesion como administrador para consultar el directorio de autores.");
        return;
      }

      try {
        const [usersResponse, worksResponse] = await Promise.all([
          fetchUsers(token),
          fetchPublishedWorks(),
        ]);

        setUsers(usersResponse.items);
        setPublishedWorks(worksResponse.items);
        setState("ready");
      } catch (error) {
        setState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "No fue posible cargar el directorio de autores.",
        );
      }
    }

    void loadData();
  }, []);

  const authors = useMemo<AuthorDirectoryEntry[]>(() => {
    const worksByAuthorProfileId = new Map<string, Work[]>();

    publishedWorks.forEach((work) => {
      const current = worksByAuthorProfileId.get(work.authorProfileId) ?? [];
      current.push(work);
      worksByAuthorProfileId.set(work.authorProfileId, current);
    });

    return users
      .filter((user) => Boolean(user.collaboratorProfile))
      .map((user) => {
        const collaboratorProfile = user.collaboratorProfile as ExtendedCollaboratorProfile;
        const visibleProfile = user.profile as ExtendedVisibleProfile | null;
        const realName = buildRealName(user, collaboratorProfile);
        const authorWorks = worksByAuthorProfileId.get(collaboratorProfile.id) ?? [];

        return {
          id: collaboratorProfile.id,
          userId: user.id,
          publicName: collaboratorProfile.publicName,
          legalName: collaboratorProfile.legalName ?? null,
          realName,
          email: user.email,
          avatarUrl: visibleProfile?.avatarUrl ?? null,
          publicBio:
            visibleProfile?.showPublicBio
              ? (visibleProfile.publicBio?.trim() || collaboratorProfile.bio || null)
              : null,
          publicPreferences:
            visibleProfile?.showPublicPreferences
              ? visibleProfile.publicPreferences?.trim() || null
              : null,
          registeredAt: collaboratorProfile.createdAt ?? user.createdAt,
          updatedAt: collaboratorProfile.updatedAt ?? user.updatedAt,
          profileType: collaboratorProfile.authorProfileType,
          applicationStatus: collaboratorProfile.applicationStatus,
          bio: collaboratorProfile.bio ?? null,
          royaltyRatePercent: collaboratorProfile.royaltyRatePercent ?? null,
          rejectionReason: collaboratorProfile.rejectionReason ?? null,
          approvedAt: collaboratorProfile.approvedAt ?? null,
          rejectedAt: collaboratorProfile.rejectedAt ?? null,
          curp: collaboratorProfile.curp ?? null,
          dateOfBirth: collaboratorProfile.dateOfBirth ?? null,
          bankValidationStatus: collaboratorProfile.bankValidationStatus ?? null,
          bankValidationReference: collaboratorProfile.bankValidationReference ?? null,
          bankValidationRequestedAt: collaboratorProfile.bankValidationRequestedAt ?? null,
          bankValidationNotes: collaboratorProfile.bankValidationNotes ?? null,
          bankValidatedAt: collaboratorProfile.bankValidatedAt ?? null,
          loyaltyLabel: collaboratorProfile.loyalty?.label ?? null,
          loyaltyRatePercent: collaboratorProfile.loyalty?.currentRatePercent ?? null,
          loyaltyPoints: collaboratorProfile.loyalty?.points ?? 0,
          nextLoyaltyLabel: collaboratorProfile.loyalty?.nextLevelLabel ?? null,
          loyaltyAssignedManually: collaboratorProfile.loyalty?.isManualDiamond ?? false,
          publishedWorks: [...authorWorks].sort((left, right) =>
            left.title.localeCompare(right.title, "es", { sensitivity: "base" }),
          ),
        };
      })
      .sort((left, right) =>
        left.publicName.localeCompare(right.publicName, "es", { sensitivity: "base" }),
      );
  }, [publishedWorks, users]);

  const effectiveSelectedAuthorId = useMemo(() => {
    if (authors.length === 0) {
      return null;
    }

    if (selectedAuthorId && authors.some((author) => author.id === selectedAuthorId)) {
      return selectedAuthorId;
    }

    const storedId =
      typeof window !== "undefined" ? window.sessionStorage.getItem(LAST_SELECTED_AUTHOR_KEY) : null;

    if (storedId && authors.some((author) => author.id === storedId)) {
      return storedId;
    }

    return null;
  }, [authors, selectedAuthorId]);

  const selectedAuthor =
    authors.find((author) => author.id === effectiveSelectedAuthorId) ?? null;

  const approvedAuthors = authors.filter(
    (author) => author.applicationStatus === "APPROVED",
  ).length;
  const authorsWithPublishedWorks = authors.filter(
    (author) => author.publishedWorks.length > 0,
  ).length;

  function handleSelectAuthor(authorId: string) {
    setSelectedAuthorId(authorId);
    setActiveAnchor("detalles");

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(LAST_SELECTED_AUTHOR_KEY, authorId);
      window.history.replaceState(null, "", "#detalles");
      document.getElementById("detalles")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <main style={pageStyle}>
      <SiteSectionHeader
        title="Directorio de autores"
        activeNav="autores"
        adminChips={buildAdminSectionChips("autores")}
        chips={[
          { label: "Listado", href: "#listado", active: activeAnchor === "listado" },
          { label: "Detalles", href: "#detalles", active: activeAnchor === "detalles" },
        ]}
      />

      <section style={heroBandStyle}>
        <div style={heroBandInnerStyle}>
          <div>
            <h1 style={pageTitleStyle}>Autores registrados</h1>
            <p style={pageSubtitleStyle}>
              Listado administrativo con acceso rapido al detalle completo de cada autor.
            </p>
          </div>
          <div style={heroMetricsStyle}>
            <span style={metricBadgeStyle}>Autores: {authors.length}</span>
            <span style={metricBadgeStyle}>Aprobados: {approvedAuthors}</span>
            <span style={metricBadgeStyle}>Con obras publicadas: {authorsWithPublishedWorks}</span>
          </div>
        </div>
      </section>

      <SectionPageFrame
        maxWidth="1320px"
        sidebar={
          <>
            <SectionSidebarCard title="Resumen del directorio">
              <p style={sidebarTextStyle}>Autores registrados: <strong>{authors.length}</strong></p>
              <p style={sidebarTextStyle}>Autores aprobados: <strong>{approvedAuthors}</strong></p>
              <p style={sidebarTextStyle}>Autores con obras publicadas: <strong>{authorsWithPublishedWorks}</strong></p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Anclas de trabajo">
              <p style={sidebarTextStyle}>Listado abre la vista general ordenada alfabeticamente.</p>
              <p style={sidebarTextStyle}>Detalles muestra el ultimo autor seleccionado dentro de esta misma pagina.</p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Detalle actual">
              <p style={sidebarTextStyle}>
                {selectedAuthor
                  ? `Seleccion actual: ${selectedAuthor.publicName}`
                  : "Todavia no hay un autor seleccionado para detalle."}
              </p>
              <p style={sidebarTextStyle}>
                {selectedAuthor
                  ? `Obras publicadas visibles: ${selectedAuthor.publishedWorks.length}`
                  : "Usa Ver detalle desde el listado para cargar esta seccion."}
              </p>
            </SectionSidebarCard>
          </>
        }
      >
        {message ? <div style={feedbackStyle(state === "error")}>{message}</div> : null}

        <section id="listado" style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Listado</h2>
              <p style={sectionCaptionStyle}>
                Directorio alfabetico de autores con datos basicos y acceso al detalle.
              </p>
            </div>
          </div>

          {state === "loading" ? <div style={emptyStateStyle}>Cargando autores...</div> : null}

          {state === "ready" && authors.length === 0 ? (
            <div style={emptyStateStyle}>Todavia no hay autores registrados en la plataforma.</div>
          ) : null}

          {state === "ready" && authors.length > 0 ? (
            <div style={listStyle}>
              {authors.map((author) => (
                <article key={author.id} style={rowCardStyle}>
                  <div style={avatarColumnStyle}>
                    {author.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={author.avatarUrl}
                        alt={`Avatar de ${author.publicName}`}
                        style={avatarImageStyle}
                      />
                    ) : (
                      <div style={avatarPlaceholderStyle}>
                        {getInitials(author.publicName)}
                      </div>
                    )}
                  </div>

                  <div style={mainInfoColumnStyle}>
                    <div style={rowTitleLineStyle}>
                      <h3 style={authorNameStyle}>{author.publicName}</h3>
                      <span style={statusBadgeStyle(author.applicationStatus)}>
                        {formatApplicationStatus(author.applicationStatus)}
                      </span>
                      <span style={listLoyaltyBadgeStyle(author.loyaltyLabel)}>
                        {author.loyaltyLabel ?? "Sin membresia"}
                      </span>
                    </div>
                    <p style={metaLineStyle}>Nombre real: <strong>{author.realName}</strong></p>
                    <p style={metaLineStyle}>Fecha de registro: <strong>{formatDate(author.registeredAt)}</strong></p>
                    <p style={metaLineStyle}>Obras publicadas: <strong>{author.publishedWorks.length}</strong></p>
                  </div>

                  <div style={secondaryInfoColumnStyle}>
                    <p style={sideMetaLineStyle}>Tipo: {formatProfileType(author.profileType)}</p>
                    <p style={sideMetaLineStyle}>Correo: {author.email}</p>
                    <button type="button" onClick={() => handleSelectAuthor(author.id)} style={detailButtonStyle}>
                      Ver detalle
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section id="detalles" style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Detalles</h2>
              <p style={sectionCaptionStyle}>
                Perfil administrativo ampliado del ultimo autor seleccionado.
              </p>
            </div>
          </div>

          {selectedAuthor ? (
            <div style={detailLayoutStyle}>
              <div style={detailHeroStyle}>
                <div style={detailIdentityStyle}>
                  {selectedAuthor.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedAuthor.avatarUrl}
                      alt={`Avatar de ${selectedAuthor.publicName}`}
                      style={detailAvatarImageStyle}
                    />
                  ) : (
                    <div style={detailAvatarPlaceholderStyle}>
                      {getInitials(selectedAuthor.publicName)}
                    </div>
                  )}

                  <div style={detailIdentityTextStyle}>
                    <div style={detailBadgeRowStyle}>
                      <span style={statusBadgeStyle(selectedAuthor.applicationStatus)}>
                        {formatApplicationStatus(selectedAuthor.applicationStatus)}
                      </span>
                      <span style={detailTypeBadgeStyle}>
                        {formatProfileType(selectedAuthor.profileType)}
                      </span>
                    </div>
                    <h3 style={detailNameStyle}>{selectedAuthor.publicName}</h3>
                    <p style={detailSublineStyle}>
                      Nombre real: <strong>{selectedAuthor.realName}</strong>
                    </p>
                    <p style={detailSublineStyle}>
                      Correo de acceso: <strong>{selectedAuthor.email}</strong>
                    </p>
                  </div>
                </div>

                <div style={detailStatsGridStyle}>
                  <DetailStat label="Fecha de registro" value={formatDate(selectedAuthor.registeredAt)} />
                  <DetailStat label="Obras publicadas" value={String(selectedAuthor.publishedWorks.length)} />
                  <DetailStat label="Validacion bancaria" value={formatBankValidationStatus(selectedAuthor.bankValidationStatus)} />
                  <DetailStat
                    label="Membresia"
                    value={selectedAuthor.loyaltyLabel ?? "Sin lectura"}
                    cardStyle={detailLoyaltyStatCardStyle(selectedAuthor.loyaltyLabel)}
                    valueStyle={detailLoyaltyStatValueStyle(selectedAuthor.loyaltyLabel)}
                    labelStyle={detailLoyaltyStatLabelStyle(selectedAuthor.loyaltyLabel)}
                  />
                  <DetailStat label="Regalias" value={selectedAuthor.royaltyRatePercent ? `${selectedAuthor.royaltyRatePercent}%` : "No definido"} />
                </div>
              </div>

              <div style={detailGridStyle}>
                <DetailBlock title="Perfil">
                  <p style={detailParagraphStyle}>
                    {selectedAuthor.publicBio?.trim() || "Este autor no tiene biografia publica visible."}
                  </p>
                </DetailBlock>

                <DetailBlock title="Identidad y alta">
                  <p style={detailParagraphStyle}>Nombre legal: {selectedAuthor.legalName ?? "No capturado"}</p>
                  <p style={detailParagraphStyle}>CURP: {selectedAuthor.curp ?? "No capturado"}</p>
                  <p style={detailParagraphStyle}>Fecha de nacimiento: {formatOptionalDate(selectedAuthor.dateOfBirth)}</p>
                  <p style={detailParagraphStyle}>Alta aprobada: {formatOptionalDate(selectedAuthor.approvedAt)}</p>
                  <p style={detailParagraphStyle}>Ultima actualizacion: {formatOptionalDate(selectedAuthor.updatedAt)}</p>
                </DetailBlock>

                <DetailBlock title="Validacion bancaria">
                  <p style={detailParagraphStyle}>Estado: {formatBankValidationStatus(selectedAuthor.bankValidationStatus)}</p>
                  <p style={detailParagraphStyle}>Referencia: {selectedAuthor.bankValidationReference ?? "Sin referencia"}</p>
                  <p style={detailParagraphStyle}>Solicitada: {formatOptionalDate(selectedAuthor.bankValidationRequestedAt)}</p>
                  <p style={detailParagraphStyle}>Validada: {formatOptionalDate(selectedAuthor.bankValidatedAt)}</p>
                  <p style={detailParagraphStyle}>
                    Notas: {selectedAuthor.bankValidationNotes?.trim() || "Sin notas administrativas."}
                  </p>
                </DetailBlock>

                <DetailBlock title="Membresia y regalias">
                  <p style={detailParagraphStyle}>Categoria actual: {selectedAuthor.loyaltyLabel ?? "Sin lectura"}</p>
                  <p style={detailParagraphStyle}>
                    Tasa vigente: {selectedAuthor.loyaltyRatePercent ? `${selectedAuthor.loyaltyRatePercent}%` : selectedAuthor.royaltyRatePercent ? `${selectedAuthor.royaltyRatePercent}%` : "No definida"}
                  </p>
                  <p style={detailParagraphStyle}>Puntos acumulados: {selectedAuthor.loyaltyPoints}</p>
                  <p style={detailParagraphStyle}>Siguiente categoria: {selectedAuthor.nextLoyaltyLabel ?? "Maxima actual"}</p>
                  <p style={detailParagraphStyle}>
                    Estado Diamante: {selectedAuthor.loyaltyAssignedManually ? "Asignado por administracion" : "No asignado manualmente"}
                  </p>
                </DetailBlock>

                <DetailBlock title="Preferencias visibles">
                  <p style={detailParagraphStyle}>
                    {selectedAuthor.publicPreferences?.trim() || "Este autor no comparte gustos o preferencias publicas."}
                  </p>
                </DetailBlock>

                <DetailBlock title="Obras publicadas">
                  {selectedAuthor.publishedWorks.length > 0 ? (
                    <div style={worksListStyle}>
                      {selectedAuthor.publishedWorks.map((work) => (
                        <div key={work.id} style={workCardStyle}>
                          <p style={workTitleStyle}>{work.title}</p>
                          <p style={workMetaStyle}>
                            {formatPublicationType(work.publicationType)} | {formatOptionalDate(work.publishedAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={detailParagraphStyle}>Este autor todavia no tiene obras publicadas visibles.</p>
                  )}
                </DetailBlock>

                {selectedAuthor.applicationStatus === "REJECTED" ? (
                  <DetailBlock title="Observacion administrativa">
                    <p style={detailParagraphStyle}>
                      Motivo de rechazo: {selectedAuthor.rejectionReason?.trim() || "Sin observacion registrada."}
                    </p>
                    <p style={detailParagraphStyle}>Fecha de rechazo: {formatOptionalDate(selectedAuthor.rejectedAt)}</p>
                  </DetailBlock>
                ) : null}
              </div>
            </div>
          ) : (
            <div style={emptyDetailStateStyle}>
              <p style={emptyDetailTextStyle}>
                Todavia no hay un autor seleccionado. Regresa al listado y usa el boton <strong>Ver detalle</strong>.
              </p>
              <a href="#listado" style={backToListLinkStyle}>
                Regresar al listado
              </a>
            </div>
          )}
        </section>
      </SectionPageFrame>
    </main>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={detailBlockStyle}>
      <h3 style={detailBlockTitleStyle}>{title}</h3>
      <div style={detailBlockBodyStyle}>{children}</div>
    </section>
  );
}

function DetailStat({
  label,
  value,
  cardStyle,
  valueStyle,
  labelStyle,
}: {
  label: string;
  value: string;
  cardStyle?: CSSProperties;
  valueStyle?: CSSProperties;
  labelStyle?: CSSProperties;
}) {
  return (
    <div style={{ ...detailStatCardStyle, ...cardStyle }}>
      <span style={{ ...detailStatLabelStyle, ...labelStyle }}>{label}</span>
      <strong style={{ ...detailStatValueStyle, ...valueStyle }}>{value}</strong>
    </div>
  );
}

function buildRealName(user: AuthUser, collaboratorProfile: ExtendedCollaboratorProfile) {
  const profileName = [user.profile?.firstName, user.profile?.lastName]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim();

  if (collaboratorProfile.legalName?.trim()) {
    return collaboratorProfile.legalName.trim();
  }

  if (profileName) {
    return profileName;
  }

  return "No capturado";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatOptionalDate(value: string | null) {
  if (!value) {
    return "Sin dato";
  }

  return formatDate(value);
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatApplicationStatus(status: AuthorDirectoryEntry["applicationStatus"]) {
  switch (status) {
    case "APPROVED":
      return "Aprobado";
    case "REJECTED":
      return "Rechazado";
    default:
      return "En revision";
  }
}

function formatProfileType(type: AuthorDirectoryEntry["profileType"]) {
  return type === "ANONYMOUS" ? "Anonimo" : "Certificado";
}

function formatBankValidationStatus(value: string | null) {
  switch (value) {
    case "VALIDATED":
      return "Validada";
    case "PENDING_VALIDATION":
      return "Pendiente";
    case "REJECTED":
      return "Rechazada";
    case "MISSING":
      return "Sin captura";
    default:
      return "Sin dato";
  }
}

function formatPublicationType(value: Work["publicationType"]) {
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

function normalizeLoyaltyLabel(value: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getLoyaltyPalette(value: string | null) {
  const label = normalizeLoyaltyLabel(value);

  switch (label) {
    case "bronce":
      return {
        softBackground: "#f7e3d3",
        softBorder: "#c9834c",
        softText: "#8a4518",
        strongBackground: "linear-gradient(135deg, #e8b48a 0%, #c9783a 100%)",
        strongBorder: "1px solid rgba(110, 52, 13, 0.25)",
        strongLabel: "rgba(92, 43, 12, 0.78)",
        strongText: "#5b2b0c",
      };
    case "plata":
    case "silver":
      return {
        softBackground: "#eef2f6",
        softBorder: "#9aa8b6",
        softText: "#51606f",
        strongBackground: "linear-gradient(135deg, #eef3f8 0%, #c2cbd5 100%)",
        strongBorder: "1px solid rgba(83, 95, 108, 0.2)",
        strongLabel: "rgba(72, 84, 95, 0.78)",
        strongText: "#334150",
      };
    case "oro":
    case "gold":
      return {
        softBackground: "#fff1bf",
        softBorder: "#d7a514",
        softText: "#8c6400",
        strongBackground: "linear-gradient(135deg, #ffe38a 0%, #f1c232 100%)",
        strongBorder: "1px solid rgba(143, 101, 0, 0.24)",
        strongLabel: "rgba(117, 84, 0, 0.78)",
        strongText: "#6d4b00",
      };
    case "platino":
    case "platinum":
      return {
        softBackground: "#e6f6f4",
        softBorder: "#52a89f",
        softText: "#1e6b63",
        strongBackground: "linear-gradient(135deg, #c9f0eb 0%, #7ad0c2 100%)",
        strongBorder: "1px solid rgba(21, 95, 85, 0.22)",
        strongLabel: "rgba(18, 92, 82, 0.78)",
        strongText: "#0f5a50",
      };
    case "diamante":
    case "diamond":
      return {
        softBackground: "#fde8ee",
        softBorder: "#d45d87",
        softText: "#98254e",
        strongBackground: "linear-gradient(135deg, #ffe7f0 0%, #f5a4c0 100%)",
        strongBorder: "1px solid rgba(132, 31, 71, 0.22)",
        strongLabel: "rgba(120, 24, 63, 0.78)",
        strongText: "#7e1f46",
      };
    default:
      return {
        softBackground: "#fef2f2",
        softBorder: "#d35b5b",
        softText: "#a32828",
        strongBackground: "linear-gradient(135deg, #fff2c7 0%, #ffd866 100%)",
        strongBorder: "1px solid rgba(148, 101, 0, 0.22)",
        strongLabel: "rgba(112, 77, 0, 0.78)",
        strongText: "#6b4b00",
      };
  }
}

function listLoyaltyBadgeStyle(value: string | null): CSSProperties {
  const palette = getLoyaltyPalette(value);

  return {
    ...statusBadgeBaseStyle,
    backgroundColor: palette.softBackground,
    border: `1px solid ${palette.softBorder}`,
    color: palette.softText,
  };
}

function detailLoyaltyStatCardStyle(value: string | null): CSSProperties {
  const palette = getLoyaltyPalette(value);

  return {
    background: palette.strongBackground,
    border: palette.strongBorder,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
  };
}

function detailLoyaltyStatLabelStyle(value: string | null): CSSProperties {
  const palette = getLoyaltyPalette(value);

  return {
    color: palette.strongLabel,
  };
}

function detailLoyaltyStatValueStyle(value: string | null): CSSProperties {
  const palette = getLoyaltyPalette(value);

  return {
    color: palette.strongText,
  };
}

function feedbackStyle(isError: boolean): CSSProperties {
  return {
    padding: "14px 16px",
    borderRadius: "10px",
    border: `1px solid ${isError ? "#f0b5b5" : "#c8d9ef"}`,
    backgroundColor: isError ? "#fff5f5" : "#f6f9fd",
    color: isError ? "#8a1c1c" : "#103d71",
    fontSize: "14px",
  };
}

function statusBadgeStyle(
  status: AuthorDirectoryEntry["applicationStatus"],
): CSSProperties {
  if (status === "APPROVED") {
    return {
      ...statusBadgeBaseStyle,
      backgroundColor: "#e8f6ef",
      color: "#1d6b43",
    };
  }

  if (status === "REJECTED") {
    return {
      ...statusBadgeBaseStyle,
      backgroundColor: "#fff1f2",
      color: "#9f1239",
    };
  }

  return {
    ...statusBadgeBaseStyle,
    backgroundColor: "#fef3c7",
    color: "#92400e",
  };
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f3f6fb",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const heroBandStyle: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(1,52,115,0.08) 0%, rgba(255,255,255,0.98) 100%)",
  borderBottom: "1px solid #d8e2f0",
};

const heroBandInnerStyle: CSSProperties = {
  maxWidth: "1320px",
  margin: "0 auto",
  padding: "28px 20px 22px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "18px",
  flexWrap: "wrap",
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: "#123c6b",
  fontSize: "34px",
};

const pageSubtitleStyle: CSSProperties = {
  margin: "8px 0 0 0",
  color: "#526273",
  fontSize: "15px",
  lineHeight: 1.5,
};

const heroMetricsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const metricBadgeStyle: CSSProperties = {
  padding: "9px 12px",
  borderRadius: "999px",
  backgroundColor: "#ffffff",
  border: "1px solid #d5dfeb",
  color: "#163b68",
  fontSize: "13px",
};

const sidebarTextStyle: CSSProperties = {
  margin: 0,
  color: "#4b5563",
  fontSize: "12px",
  lineHeight: 1.65,
};

const sectionCardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #dde6f1",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 12px 30px rgba(10, 28, 52, 0.05)",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "12px",
  marginBottom: "18px",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: "#123c6b",
  fontSize: "28px",
};

const sectionCaptionStyle: CSSProperties = {
  margin: "6px 0 0 0",
  color: "#5b6878",
  fontSize: "14px",
};

const emptyStateStyle: CSSProperties = {
  padding: "28px 18px",
  borderRadius: "12px",
  backgroundColor: "#f7f9fc",
  border: "1px dashed #cfd9e6",
  color: "#4e6072",
  fontSize: "14px",
  textAlign: "center",
};

const listStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
};

const rowCardStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "92px minmax(0, 1fr) 240px",
  gap: "16px",
  alignItems: "center",
  padding: "16px",
  borderRadius: "14px",
  border: "1px solid #dde6f1",
  backgroundColor: "#fbfdff",
};

const avatarColumnStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
};

const avatarImageStyle: CSSProperties = {
  width: "72px",
  height: "72px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid #d8e2ef",
};

const avatarPlaceholderStyle: CSSProperties = {
  width: "72px",
  height: "72px",
  borderRadius: "50%",
  backgroundColor: "#123c6b",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  fontWeight: 700,
};

const mainInfoColumnStyle: CSSProperties = {
  minWidth: 0,
};

const rowTitleLineStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "8px",
};

const authorNameStyle: CSSProperties = {
  margin: 0,
  color: "#173a67",
  fontSize: "22px",
};

const metaLineStyle: CSSProperties = {
  margin: "4px 0",
  color: "#4f5f70",
  fontSize: "14px",
  lineHeight: 1.5,
};

const secondaryInfoColumnStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  justifyItems: "start",
};

const sideMetaLineStyle: CSSProperties = {
  margin: 0,
  color: "#5d6d7e",
  fontSize: "13px",
  lineHeight: 1.4,
};

const detailButtonStyle: CSSProperties = {
  marginTop: "8px",
  border: "none",
  borderRadius: "999px",
  backgroundColor: "#123c6b",
  color: "#ffffff",
  padding: "10px 16px",
  fontSize: "13px",
  cursor: "pointer",
};

const statusBadgeBaseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  fontWeight: 700,
};

const emptyDetailStateStyle: CSSProperties = {
  padding: "24px",
  borderRadius: "14px",
  backgroundColor: "#f7f9fc",
  border: "1px dashed #cfd9e6",
  textAlign: "center",
};

const emptyDetailTextStyle: CSSProperties = {
  margin: "0 0 14px 0",
  color: "#4d5f73",
  fontSize: "15px",
  lineHeight: 1.6,
};

const backToListLinkStyle: CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  borderRadius: "999px",
  backgroundColor: "#123c6b",
  color: "#ffffff",
  padding: "10px 16px",
  fontSize: "13px",
};

const detailLayoutStyle: CSSProperties = {
  display: "grid",
  gap: "18px",
};

const detailHeroStyle: CSSProperties = {
  padding: "18px",
  borderRadius: "16px",
  background:
    "linear-gradient(135deg, rgba(18,60,107,0.96) 0%, rgba(15,42,78,0.96) 100%)",
  color: "#ffffff",
  display: "grid",
  gap: "18px",
};

const detailIdentityStyle: CSSProperties = {
  display: "flex",
  gap: "16px",
  alignItems: "center",
  flexWrap: "wrap",
};

const detailAvatarImageStyle: CSSProperties = {
  width: "96px",
  height: "96px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "3px solid rgba(255,255,255,0.25)",
};

const detailAvatarPlaceholderStyle: CSSProperties = {
  width: "96px",
  height: "96px",
  borderRadius: "50%",
  backgroundColor: "rgba(255,255,255,0.14)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "30px",
  fontWeight: 700,
};

const detailIdentityTextStyle: CSSProperties = {
  minWidth: 0,
};

const detailBadgeRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "8px",
};

const detailTypeBadgeStyle: CSSProperties = {
  ...statusBadgeBaseStyle,
  backgroundColor: "rgba(255,255,255,0.14)",
  color: "#ffffff",
};

const detailNameStyle: CSSProperties = {
  margin: 0,
  fontSize: "30px",
};

const detailSublineStyle: CSSProperties = {
  margin: "6px 0 0 0",
  color: "rgba(255,255,255,0.88)",
  fontSize: "15px",
};

const detailStatsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "12px",
};

const detailStatCardStyle: CSSProperties = {
  borderRadius: "12px",
  padding: "14px",
  backgroundColor: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.14)",
  display: "grid",
  gap: "6px",
};

const detailStatLabelStyle: CSSProperties = {
  fontSize: "12px",
  color: "rgba(255,255,255,0.74)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const detailStatValueStyle: CSSProperties = {
  fontSize: "18px",
  color: "#ffffff",
};

const detailGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "16px",
};

const detailBlockStyle: CSSProperties = {
  border: "1px solid #dde6f1",
  borderRadius: "14px",
  overflow: "hidden",
  backgroundColor: "#ffffff",
};

const detailBlockTitleStyle: CSSProperties = {
  margin: 0,
  padding: "14px 16px",
  backgroundColor: "#f7f9fc",
  borderBottom: "1px solid #e3eaf2",
  color: "#163a67",
  fontSize: "18px",
};

const detailBlockBodyStyle: CSSProperties = {
  padding: "16px",
  display: "grid",
  gap: "10px",
};

const detailParagraphStyle: CSSProperties = {
  margin: 0,
  color: "#506173",
  fontSize: "14px",
  lineHeight: 1.65,
};

const worksListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const workCardStyle: CSSProperties = {
  padding: "12px 14px",
  borderRadius: "12px",
  backgroundColor: "#f8fbfe",
  border: "1px solid #e0e8f1",
};

const workTitleStyle: CSSProperties = {
  margin: 0,
  color: "#163a67",
  fontSize: "15px",
};

const workMetaStyle: CSSProperties = {
  margin: "6px 0 0 0",
  color: "#607182",
  fontSize: "12px",
};
