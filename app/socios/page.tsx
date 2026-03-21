"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { buildAdminSectionChips } from "@/components/admin-section-chips";
import { SectionPageFrame, SectionSidebarCard } from "@/components/section-page-frame";
import { SiteSectionHeader } from "@/components/site-section-header";
import {
  assignFavoredSocio,
  fetchMe,
  fetchUsers,
  getStoredToken,
  removeFavoredSocio,
  type AuthUser,
} from "@/lib/api";

type LoadState = "loading" | "ready" | "error";

type SocioRoyaltySummary = {
  confirmedSalesCount: number;
  confirmedUnits: number;
  grossSalesAmount: string;
  royaltyGeneratedAmount: string;
  platformShareAmount: string;
  estimatedProcessorFeeAmount: string;
  platformNetAmount: string;
  reservedRoyaltyAmount: string;
  paidRoyaltyAmount: string;
  paidNetAmount: string;
  availableRoyaltyAmount: string;
  lastSaleAt: string | null;
  lastPayoutAt: string | null;
  economicOverview: {
    authorShareAmount: string;
    platformShareAmount: string;
    estimatedProcessorFeeAmount: string;
    platformNetAmount: string;
    authorParticipationPercent: string;
    platformParticipationPercent: string;
    processorFeeConfigured: boolean;
    processorFeePercent: string;
    processorFeeFixedAmount: string;
  };
  recentSales: Array<{
    purchaseId: string;
    workTitle: string;
    soldAt: string;
    unitPrice: string;
    royaltyAmount: string;
    authorNetAmount: string;
    platformAmount: string;
    estimatedProcessorFeeAmount: string;
    platformNetAmount: string;
    buyerEmail: string | null;
  }>;
};

type SocioBankValidationAttempt = {
  id: string;
  provider: string;
  amountMinor?: number;
  currency: string;
  referenceCode?: string | null;
  status: string;
  sentAt: string | null;
  confirmedAt: string | null;
  expiresAt: string | null;
  verificationAttemptsUsed: number;
  maxVerificationAttempts: number;
  notes: string | null;
};

type ExtendedCollaboratorProfile = NonNullable<AuthUser["collaboratorProfile"]> & {
  id: string;
  legalName?: string | null;
  bio?: string | null;
  royaltyRatePercent?: string | null;
  createdAt?: string;
  updatedAt?: string;
  curp?: string | null;
  dateOfBirth?: string | null;
  bankValidationStatus?: string | null;
  bankValidationReference?: string | null;
  bankValidationRequestedAt?: string | null;
  bankValidationNotes?: string | null;
  bankValidatedAt?: string | null;
  latestBankValidationAttempt?: SocioBankValidationAttempt | null;
  royaltiesSummary?: SocioRoyaltySummary | null;
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
};

type SocioDirectoryEntry = {
  id: string;
  userId: string;
  displayName: string;
  realName: string;
  email: string;
  avatarUrl: string | null;
  accountLabel: string;
  primaryAdministrativeLabel: string;
  administrativeLabels: string[];
  createdAt: string;
  updatedAt: string;
  favored: boolean;
  favoredAssignedAt: string | null;
  createdWorkCount: number;
  confirmedPurchaseCount: number;
  collaboratorProfile: ExtendedCollaboratorProfile | null;
};

const LAST_SELECTED_SOCIO_KEY = "editorialhub_admin_last_socio_detail";

export default function SociosPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [selectedSocioId, setSelectedSocioId] = useState<string | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<"listado" | "detalles">("listado");
  const [actionId, setActionId] = useState<string | null>(null);
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false);

  useEffect(() => {
    function syncAnchorFromHash() {
      setActiveAnchor(window.location.hash === "#detalles" ? "detalles" : "listado");
    }

    syncAnchorFromHash();
    window.addEventListener("hashchange", syncAnchorFromHash);
    return () => window.removeEventListener("hashchange", syncAnchorFromHash);
  }, []);

  async function loadData() {
    const token = getStoredToken();

    if (!token) {
      setState("error");
      setMessage("Inicia sesion como administrador para consultar el directorio de socios.");
      return;
    }

    try {
      const [me, usersResponse] = await Promise.all([fetchMe(token), fetchUsers(token)]);

      if (!me.roles.includes("ADMIN") && !me.roles.includes("ADMIN_02")) {
        throw new Error("Tu cuenta no tiene permisos administrativos para entrar a Socios.");
      }

      setIsPrimaryAdmin(me.roles.includes("ADMIN"));
      setUsers(
        usersResponse.items.filter(
          (item) => !item.roles.includes("ADMIN") && !item.roles.includes("ADMIN_02"),
        ),
      );
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error ? error.message : "No fue posible cargar el directorio de socios.",
      );
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const socios = useMemo<SocioDirectoryEntry[]>(() => {
    return users
      .map((user) => {
        const collaboratorProfile = (user.collaboratorProfile as ExtendedCollaboratorProfile | null) ?? null;
        const realName = buildRealName(user, collaboratorProfile);
        const displayName = collaboratorProfile?.publicName?.trim() || realName || user.email;

        return {
          id: user.id,
          userId: user.id,
          displayName,
          realName,
          email: user.email,
          avatarUrl: user.profile?.avatarUrl ?? null,
          accountLabel: user.accountLabel,
          primaryAdministrativeLabel: user.primaryAdministrativeLabel,
          administrativeLabels: user.administrativeLabels,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          favored: user.favoredSocio.isFavored,
          favoredAssignedAt: user.favoredSocio.assignedAt,
          createdWorkCount: user.activitySummary.createdWorkCount,
          confirmedPurchaseCount: user.activitySummary.confirmedPurchaseCount,
          collaboratorProfile,
        };
      })
      .sort((left, right) =>
        left.displayName.localeCompare(right.displayName, "es", { sensitivity: "base" }),
      );
  }, [users]);

  useEffect(() => {
    if (socios.length === 0) {
      setSelectedSocioId(null);
      return;
    }

    const storedId =
      typeof window !== "undefined" ? window.sessionStorage.getItem(LAST_SELECTED_SOCIO_KEY) : null;

    if (storedId && socios.some((socio) => socio.id === storedId)) {
      setSelectedSocioId((current) => current ?? storedId);
      return;
    }

    setSelectedSocioId((current) =>
      current && socios.some((socio) => socio.id === current) ? current : socios[0]?.id ?? null,
    );
  }, [socios]);

  const selectedSocio = socios.find((socio) => socio.id === selectedSocioId) ?? null;
  const favoredCount = socios.filter((socio) => socio.favored).length;
  const sociosWithCollaboratorProfile = socios.filter((socio) => socio.collaboratorProfile).length;
  const sociosWithBankPending = socios.filter(
    (socio) => socio.collaboratorProfile?.bankValidationStatus === "PENDING_VALIDATION",
  ).length;

  async function refreshUsers() {
    const token = getStoredToken();
    if (!token) {
      return;
    }

    const usersResponse = await fetchUsers(token);
    setUsers(
      usersResponse.items.filter(
        (item) => !item.roles.includes("ADMIN") && !item.roles.includes("ADMIN_02"),
      ),
    );
  }

  function handleSelectSocio(socioId: string) {
    setSelectedSocioId(socioId);
    setActiveAnchor("detalles");

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(LAST_SELECTED_SOCIO_KEY, socioId);
      window.location.hash = "detalles";
      document.getElementById("detalles")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function toggleFavoredSocio(socio: SocioDirectoryEntry) {
    const token = getStoredToken();
    if (!token) {
      setMessage("La sesion expiro antes de guardar el cambio.");
      return;
    }

    setActionId(socio.id);
    setMessage("");

    try {
      if (socio.favored) {
        await removeFavoredSocio(token, socio.id);
      } else {
        await assignFavoredSocio(token, socio.id);
      }

      await refreshUsers();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible actualizar la designacion de Socio_Favorecido.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function toggleDiamondLoyalty(socio: SocioDirectoryEntry) {
    if (!socio.collaboratorProfile) {
      setMessage("El socio necesita perfil colaborador para entrar al sistema de fidelidad.");
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setMessage("La sesion expiro antes de guardar el cambio.");
      return;
    }

    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";

    setActionId(`diamond-${socio.id}`);
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/users/${socio.id}/loyalty-diamond`, {
        method: socio.collaboratorProfile.loyalty?.isManualDiamond ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
      const nextMessage = Array.isArray(payload?.message)
        ? payload.message.join(" ")
        : payload?.message ?? "No fue posible actualizar Diamante.";

      if (!response.ok) {
        throw new Error(nextMessage);
      }

      await refreshUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible actualizar Diamante.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <main style={pageStyle}>
      <SiteSectionHeader
        title="Directorio de socios"
        activeNav="socios"
        adminChips={buildAdminSectionChips("socios")}
        chips={[
          { label: "Listado", href: "#listado", active: activeAnchor === "listado" },
          { label: "Detalles", href: "#detalles", active: activeAnchor === "detalles" },
        ]}
      />

      <section style={heroBandStyle}>
        <div style={heroBandInnerStyle}>
          <div>
            <h1 style={pageTitleStyle}>Socios registrados</h1>
            <p style={pageSubtitleStyle}>
              Listado administrativo independiente para revisar socios, actividad general y designacion de Socio_Favorecido sin mezclarlo con el panel principal.
            </p>
          </div>
          <div style={heroMetricsStyle}>
            <span style={metricBadgeStyle}>Socios: {socios.length}</span>
            <span style={metricBadgeStyle}>Socios favorecidos: {favoredCount}</span>
            <span style={metricBadgeStyle}>Con perfil colaborador: {sociosWithCollaboratorProfile}</span>
          </div>
        </div>
      </section>

      <SectionPageFrame
        maxWidth="1320px"
        sidebar={
          <>
            <SectionSidebarCard title="Resumen del directorio">
              <p style={sidebarTextStyle}>Socios registrados: <strong>{socios.length}</strong></p>
              <p style={sidebarTextStyle}>Socios favorecidos: <strong>{favoredCount}</strong></p>
              <p style={sidebarTextStyle}>Validacion bancaria pendiente: <strong>{sociosWithBankPending}</strong></p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Modo de trabajo">
              <p style={sidebarTextStyle}>Listado ordena a los socios y evita la vista amontonada del panel anterior.</p>
              <p style={sidebarTextStyle}>Detalles abre el expediente amplio del socio seleccionado dentro de esta misma pagina.</p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Detalle actual">
              <p style={sidebarTextStyle}>
                {selectedSocio
                  ? `Seleccion actual: ${selectedSocio.displayName}`
                  : "Todavia no hay un socio seleccionado."}
              </p>
              <p style={sidebarTextStyle}>
                {selectedSocio
                  ? `Actividad: ${selectedSocio.createdWorkCount} obras y ${selectedSocio.confirmedPurchaseCount} compras confirmadas.`
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
                Vista general de socios con lectura limpia, datos basicos y acceso al detalle.
              </p>
            </div>
          </div>

          {state === "loading" ? <div style={emptyStateStyle}>Cargando socios...</div> : null}

          {state === "ready" && socios.length === 0 ? (
            <div style={emptyStateStyle}>Todavia no hay socios disponibles en la plataforma.</div>
          ) : null}

          {state === "ready" && socios.length > 0 ? (
            <div style={listStyle}>
              {socios.map((socio) => (
                <article key={socio.id} style={rowCardStyle}>
                  <div style={avatarColumnStyle}>
                    {socio.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={socio.avatarUrl}
                        alt={`Avatar de ${socio.displayName}`}
                        style={avatarImageStyle}
                      />
                    ) : (
                      <div style={avatarPlaceholderStyle}>{getInitials(socio.displayName)}</div>
                    )}
                  </div>

                  <div style={mainInfoColumnStyle}>
                    <div style={rowTitleLineStyle}>
                      <h3 style={nameStyle}>{socio.displayName}</h3>
                      <span style={socio.favored ? favoredBadgeStyle : regularBadgeStyle}>
                        {socio.favored ? "SOCIO_FAVORECIDO" : "SOCIO"}
                      </span>
                    </div>
                    <p style={metaLineStyle}>Correo: <strong>{socio.email}</strong></p>
                    <p style={metaLineStyle}>Etiqueta principal: <strong>{socio.primaryAdministrativeLabel}</strong></p>
                    <p style={metaLineStyle}>Actividad: <strong>{socio.createdWorkCount}</strong> obras | <strong>{socio.confirmedPurchaseCount}</strong> compras</p>
                  </div>

                  <div style={secondaryInfoColumnStyle}>
                    <p style={sideMetaLineStyle}>Cuenta: {socio.accountLabel}</p>
                    <p style={sideMetaLineStyle}>
                      Banco: {formatBankValidationStatus(socio.collaboratorProfile?.bankValidationStatus ?? null)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSelectSocio(socio.id)}
                      style={detailButtonStyle}
                    >
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
                Expediente administrativo ampliado del socio seleccionado.
              </p>
            </div>
          </div>

          {selectedSocio ? (
            <div style={detailLayoutStyle}>
              <div style={detailHeroStyle}>
                <div style={detailIdentityStyle}>
                  {selectedSocio.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedSocio.avatarUrl}
                      alt={`Avatar de ${selectedSocio.displayName}`}
                      style={detailAvatarImageStyle}
                    />
                  ) : (
                    <div style={detailAvatarPlaceholderStyle}>
                      {getInitials(selectedSocio.displayName)}
                    </div>
                  )}

                  <div style={detailIdentityTextStyle}>
                    <div style={detailBadgeRowStyle}>
                      <span style={selectedSocio.favored ? favoredHeroBadgeStyle : regularHeroBadgeStyle}>
                        {selectedSocio.favored ? "SOCIO_FAVORECIDO" : "SOCIO"}
                      </span>
                      <span style={detailTypeBadgeStyle}>{selectedSocio.accountLabel}</span>
                    </div>
                    <h3 style={detailNameStyle}>{selectedSocio.displayName}</h3>
                    <p style={detailSublineStyle}>
                      Nombre real: <strong>{selectedSocio.realName}</strong>
                    </p>
                    <p style={detailSublineStyle}>
                      Correo: <strong>{selectedSocio.email}</strong>
                    </p>
                  </div>
                </div>

                <div style={detailStatsGridStyle}>
                  <DetailStat label="Fecha de alta" value={formatDate(selectedSocio.createdAt)} />
                  <DetailStat label="Obras creadas" value={String(selectedSocio.createdWorkCount)} />
                  <DetailStat label="Compras confirmadas" value={String(selectedSocio.confirmedPurchaseCount)} />
                  <DetailStat
                    label="Validacion bancaria"
                    value={formatBankValidationStatus(selectedSocio.collaboratorProfile?.bankValidationStatus ?? null)}
                  />
                </div>
              </div>

              <div style={detailActionBarStyle}>
                <button
                  type="button"
                  onClick={() => void toggleFavoredSocio(selectedSocio)}
                  disabled={!isPrimaryAdmin || actionId === selectedSocio.id}
                  style={
                    selectedSocio.favored
                      ? destructiveActionButtonStyle(!isPrimaryAdmin || actionId === selectedSocio.id)
                      : primaryActionButtonStyle(!isPrimaryAdmin || actionId === selectedSocio.id)
                  }
                >
                  {selectedSocio.favored ? "Retirar Socio_Favorecido" : "Asignar Socio_Favorecido"}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleDiamondLoyalty(selectedSocio)}
                  disabled={!isPrimaryAdmin || !selectedSocio.collaboratorProfile || actionId === `diamond-${selectedSocio.id}`}
                  style={
                    selectedSocio.collaboratorProfile?.loyalty?.isManualDiamond
                      ? destructiveActionButtonStyle(!isPrimaryAdmin || !selectedSocio.collaboratorProfile || actionId === `diamond-${selectedSocio.id}`)
                      : primaryActionButtonStyle(!isPrimaryAdmin || !selectedSocio.collaboratorProfile || actionId === `diamond-${selectedSocio.id}`)
                  }
                >
                  {selectedSocio.collaboratorProfile?.loyalty?.isManualDiamond ? "Retirar Diamante" : "Asignar Diamante"}
                </button>
                {!isPrimaryAdmin ? (
                  <p style={helperTextStyle}>Solo el ADMIN principal puede cambiar esta designacion.</p>
                ) : null}
              </div>

              <div style={detailGridStyle}>
                <DetailBlock title="Lectura administrativa">
                  <p style={detailParagraphStyle}>Etiqueta principal: {selectedSocio.primaryAdministrativeLabel}</p>
                  <p style={detailParagraphStyle}>
                    Etiquetas: {selectedSocio.administrativeLabels.join(", ") || "Sin etiquetas derivadas"}
                  </p>
                  <p style={detailParagraphStyle}>
                    Ultima actualizacion: {formatDate(selectedSocio.updatedAt)}
                  </p>
                  <p style={detailParagraphStyle}>
                    Asignacion favorecida: {formatOptionalDate(selectedSocio.favoredAssignedAt)}
                  </p>
                </DetailBlock>

                <DetailBlock title="Perfil colaborador">
                  <p style={detailParagraphStyle}>
                    Perfil: {selectedSocio.collaboratorProfile?.publicName ?? "Todavia no captura perfil colaborador"}
                  </p>
                  <p style={detailParagraphStyle}>
                    Tipo: {formatProfileType(selectedSocio.collaboratorProfile?.authorProfileType ?? null)}
                  </p>
                  <p style={detailParagraphStyle}>
                    Estado: {formatApplicationStatus(selectedSocio.collaboratorProfile?.applicationStatus ?? null)}
                  </p>
                  <p style={detailParagraphStyle}>
                    Regalia actual: {selectedSocio.collaboratorProfile?.royaltyRatePercent ? `${selectedSocio.collaboratorProfile.royaltyRatePercent}%` : "No definida"}
                  </p>
                </DetailBlock>

                <DetailBlock title="Fidelidad">
                  <p style={detailParagraphStyle}>
                    Nivel actual: {selectedSocio.collaboratorProfile?.loyalty?.label ?? "Sin lectura"}
                  </p>
                  <p style={detailParagraphStyle}>
                    Tasa vigente: {selectedSocio.collaboratorProfile?.loyalty?.currentRatePercent ? `${selectedSocio.collaboratorProfile.loyalty.currentRatePercent}%` : "No definida"}
                  </p>
                  <p style={detailParagraphStyle}>
                    Puntos: {selectedSocio.collaboratorProfile?.loyalty?.points ?? 0}
                  </p>
                  <p style={detailParagraphStyle}>
                    Siguiente nivel: {selectedSocio.collaboratorProfile?.loyalty?.nextLevelLabel ?? "Maximo actual"}
                  </p>
                  <p style={detailParagraphStyle}>
                    Estado Diamante: {selectedSocio.collaboratorProfile?.loyalty?.isManualDiamond ? "Asignado por administracion" : "No asignado"}
                  </p>
                </DetailBlock>

                <DetailBlock title="Identidad y datos">
                  <p style={detailParagraphStyle}>
                    Nombre legal: {selectedSocio.collaboratorProfile?.legalName ?? "No capturado"}
                  </p>
                  <p style={detailParagraphStyle}>
                    CURP: {selectedSocio.collaboratorProfile?.curp ?? "No capturado"}
                  </p>
                  <p style={detailParagraphStyle}>
                    Fecha de nacimiento: {formatOptionalDate(selectedSocio.collaboratorProfile?.dateOfBirth ?? null)}
                  </p>
                  <p style={detailParagraphStyle}>
                    Biografia: {selectedSocio.collaboratorProfile?.bio?.trim() || "Sin biografia capturada."}
                  </p>
                </DetailBlock>

                <DetailBlock title="Validacion bancaria">
                  <p style={detailParagraphStyle}>
                    Estado: {formatBankValidationStatus(selectedSocio.collaboratorProfile?.bankValidationStatus ?? null)}
                  </p>
                  <p style={detailParagraphStyle}>
                    Referencia: {selectedSocio.collaboratorProfile?.bankValidationReference ?? "Sin referencia"}
                  </p>
                  <p style={detailParagraphStyle}>
                    Solicitada: {formatOptionalDate(selectedSocio.collaboratorProfile?.bankValidationRequestedAt ?? null)}
                  </p>
                  <p style={detailParagraphStyle}>
                    Validada: {formatOptionalDate(selectedSocio.collaboratorProfile?.bankValidatedAt ?? null)}
                  </p>
                  <p style={detailParagraphStyle}>
                    Notas: {selectedSocio.collaboratorProfile?.bankValidationNotes?.trim() || "Sin notas administrativas."}
                  </p>
                  {selectedSocio.collaboratorProfile?.latestBankValidationAttempt ? (
                    <p style={detailParagraphStyle}>
                      Microdeposito: {formatBankMicrodepositStatus(selectedSocio.collaboratorProfile.latestBankValidationAttempt.status)}
                    </p>
                  ) : null}
                </DetailBlock>

                <DetailBlock title="Resumen de regalias">
                  {selectedSocio.collaboratorProfile?.royaltiesSummary ? (
                    <>
                      <p style={detailParagraphStyle}>
                        Ventas confirmadas: {selectedSocio.collaboratorProfile.royaltiesSummary.confirmedSalesCount}
                      </p>
                      <p style={detailParagraphStyle}>
                        Bruto vendido: {formatMxCurrency(selectedSocio.collaboratorProfile.royaltiesSummary.grossSalesAmount)}
                      </p>
                      <p style={detailParagraphStyle}>
                        Parte del autor: {formatMxCurrency(selectedSocio.collaboratorProfile.royaltiesSummary.economicOverview.authorShareAmount)}
                      </p>
                      <p style={detailParagraphStyle}>
                        Parte EditorialHub: {formatMxCurrency(selectedSocio.collaboratorProfile.royaltiesSummary.economicOverview.platformShareAmount)}
                      </p>
                      <p style={detailParagraphStyle}>
                        Procesador estimado: {formatMxCurrency(selectedSocio.collaboratorProfile.royaltiesSummary.economicOverview.estimatedProcessorFeeAmount)}
                      </p>
                      <p style={detailParagraphStyle}>
                        Disponibles: {formatMxCurrency(selectedSocio.collaboratorProfile.royaltiesSummary.availableRoyaltyAmount)}
                      </p>
                      <p style={detailParagraphStyle}>
                        Pagado neto: {formatMxCurrency(selectedSocio.collaboratorProfile.royaltiesSummary.paidNetAmount)}
                      </p>
                      <p style={detailParagraphStyle}>
                        Ultima venta: {formatOptionalDateTime(selectedSocio.collaboratorProfile.royaltiesSummary.lastSaleAt)}
                      </p>
                    </>
                  ) : (
                    <p style={detailParagraphStyle}>Este socio todavia no tiene resumen de regalias disponible.</p>
                  )}
                </DetailBlock>

                <DetailBlock title="Ventas recientes">
                  {selectedSocio.collaboratorProfile?.royaltiesSummary?.recentSales?.length ? (
                    <div style={salesListStyle}>
                      {selectedSocio.collaboratorProfile.royaltiesSummary.recentSales.map((sale) => (
                        <div key={sale.purchaseId} style={saleCardStyle}>
                          <p style={saleTitleStyle}>{sale.workTitle}</p>
                          <p style={saleMetaStyle}>{formatOptionalDateTime(sale.soldAt)}</p>
                          <p style={saleMetaStyle}>
                            Venta: {formatMxCurrency(sale.unitPrice)} | Autor: {formatMxCurrency(sale.authorNetAmount)}
                          </p>
                          <p style={saleMetaStyle}>
                            EditorialHub: {formatMxCurrency(sale.platformAmount)} | Procesador estimado: {formatMxCurrency(sale.estimatedProcessorFeeAmount)}
                          </p>
                          <p style={saleMetaStyle}>
                            Margen plataforma estimado: {formatMxCurrency(sale.platformNetAmount)}
                          </p>
                          <p style={saleMetaStyle}>
                            Comprador: {sale.buyerEmail ?? "Sin correo visible"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={detailParagraphStyle}>Todavia no hay ventas recientes para mostrar en este socio.</p>
                  )}
                </DetailBlock>

                <DetailBlock title="Lectura economica">
                  {selectedSocio.collaboratorProfile?.royaltiesSummary ? (
                    <>
                      <p style={detailParagraphStyle}>
                        Participacion del autor: {selectedSocio.collaboratorProfile.royaltiesSummary.economicOverview.authorParticipationPercent}%
                      </p>
                      <p style={detailParagraphStyle}>
                        Participacion EditorialHub: {selectedSocio.collaboratorProfile.royaltiesSummary.economicOverview.platformParticipationPercent}%
                      </p>
                      <p style={detailParagraphStyle}>
                        Margen plataforma estimado: {formatMxCurrency(selectedSocio.collaboratorProfile.royaltiesSummary.economicOverview.platformNetAmount)}
                      </p>
                      <p style={detailParagraphStyle}>
                        Regla de procesador: {selectedSocio.collaboratorProfile.royaltiesSummary.economicOverview.processorFeeConfigured
                          ? `${selectedSocio.collaboratorProfile.royaltiesSummary.economicOverview.processorFeePercent}% + MXN ${selectedSocio.collaboratorProfile.royaltiesSummary.economicOverview.processorFeeFixedAmount}`
                          : "Sin configurar en entorno"}
                      </p>
                    </>
                  ) : (
                    <p style={detailParagraphStyle}>Este socio todavia no tiene lectura economica disponible.</p>
                  )}
                </DetailBlock>
              </div>
            </div>
          ) : (
            <div style={emptyDetailStateStyle}>
              <p style={emptyDetailTextStyle}>
                Todavia no hay un socio seleccionado. Regresa al listado y usa el boton <strong>Ver detalle</strong>.
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

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailStatCardStyle}>
      <span style={detailStatLabelStyle}>{label}</span>
      <strong style={detailStatValueStyle}>{value}</strong>
    </div>
  );
}

function buildRealName(
  user: AuthUser,
  collaboratorProfile: ExtendedCollaboratorProfile | null,
) {
  const profileName = [user.profile?.firstName, user.profile?.lastName]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim();

  if (collaboratorProfile?.legalName?.trim()) {
    return collaboratorProfile.legalName.trim();
  }

  if (profileName) {
    return profileName;
  }

  return "No capturado";
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
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

function formatOptionalDateTime(value: string | null) {
  if (!value) {
    return "Sin dato";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMxCurrency(value: string | number) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(typeof value === "string" ? value : "0");
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  return `MXN ${safeValue.toFixed(2)}`;
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

function formatBankMicrodepositStatus(value: string | null) {
  switch (value) {
    case "MICRODEPOSIT_SENT":
      return "Enviado";
    case "CONFIRMED":
      return "Confirmado";
    case "REJECTED":
      return "Rechazado";
    case "EXPIRED":
      return "Expirado";
    default:
      return "Sin intento";
  }
}

function formatProfileType(value: "CERTIFIED" | "ANONYMOUS" | null) {
  if (value === "ANONYMOUS") {
    return "Anonimo";
  }

  if (value === "CERTIFIED") {
    return "Certificado";
  }

  return "Sin perfil";
}

function formatApplicationStatus(value: "IN_REVIEW" | "APPROVED" | "REJECTED" | null) {
  switch (value) {
    case "APPROVED":
      return "Aprobado";
    case "REJECTED":
      return "Rechazado";
    case "IN_REVIEW":
      return "En revision";
    default:
      return "Sin perfil";
  }
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

function primaryActionButtonStyle(disabled: boolean): CSSProperties {
  return {
    border: "none",
    borderRadius: "999px",
    backgroundColor: disabled ? "#87a78f" : "#2e7d32",
    color: "#ffffff",
    padding: "11px 18px",
    fontSize: "13px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "Georgia, 'Times New Roman', serif",
  };
}

function destructiveActionButtonStyle(disabled: boolean): CSSProperties {
  return {
    border: "none",
    borderRadius: "999px",
    backgroundColor: disabled ? "#c49595" : "#c62828",
    color: "#ffffff",
    padding: "11px 18px",
    fontSize: "13px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "Georgia, 'Times New Roman', serif",
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
  maxWidth: "900px",
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

const nameStyle: CSSProperties = {
  margin: 0,
  color: "#173a67",
  fontSize: "22px",
};

const regularBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  fontWeight: 700,
  backgroundColor: "#e8f6ef",
  color: "#1d6b43",
};

const favoredBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  fontWeight: 700,
  backgroundColor: "#fff6dd",
  color: "#8a5a00",
  border: "1px solid #f0d48a",
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
  fontFamily: "Georgia, 'Times New Roman', serif",
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

const regularHeroBadgeStyle: CSSProperties = {
  ...regularBadgeStyle,
  backgroundColor: "rgba(46, 125, 50, 0.24)",
  color: "#ffffff",
};

const favoredHeroBadgeStyle: CSSProperties = {
  ...favoredBadgeStyle,
  backgroundColor: "rgba(240, 212, 138, 0.2)",
  color: "#fff2cc",
  border: "1px solid rgba(240, 212, 138, 0.45)",
};

const detailTypeBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  fontWeight: 700,
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
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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

const detailActionBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const helperTextStyle: CSSProperties = {
  margin: 0,
  color: "#5b6878",
  fontSize: "13px",
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

const salesListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const saleCardStyle: CSSProperties = {
  padding: "12px 14px",
  borderRadius: "12px",
  backgroundColor: "#f8fbfe",
  border: "1px solid #e0e8f1",
};

const saleTitleStyle: CSSProperties = {
  margin: 0,
  color: "#163a67",
  fontSize: "15px",
};

const saleMetaStyle: CSSProperties = {
  margin: "6px 0 0 0",
  color: "#607182",
  fontSize: "12px",
};



