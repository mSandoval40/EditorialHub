"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { buildAdminSectionChips } from "@/components/admin-section-chips";
import { SectionPageFrame, SectionSidebarCard } from "@/components/section-page-frame";
import { SiteSectionHeader } from "@/components/site-section-header";
import {
  clearStoredToken,
  fetchMyPurchases,
  fetchMyWorks,
  fetchMyWorkReview,
  getStoredToken,
  upsertWorkReview,
  type LibraryPurchase,
  type MyWorkReview,
  type Work,
} from "@/lib/api";

type ReviewCardState = {
  canReview: boolean;
  hasPurchased: boolean;
  review: MyWorkReview | null;
  form: {
    rating: number;
    comment: string;
  };
  expanded: boolean;
  saving: boolean;
  message: string;
  error: boolean;
};

export default function BibliotecaPage() {
  const [library, setLibrary] = useState<LibraryPurchase[]>([]);
  const [publishedWorks, setPublishedWorks] = useState<Work[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [showLogoutConfirmDialog, setShowLogoutConfirmDialog] = useState(false);
  const [reviewCards, setReviewCards] = useState<Record<string, ReviewCardState>>({});
  const acquiredCount = library.reduce((total, purchase) => total + purchase.items.length, 0);
  const publishedCount = publishedWorks.length;
  const [activeSection, setActiveSection] = useState<"publicadas" | "adquiridas">("publicadas");

  useEffect(() => {
    async function loadLibrary() {
      const token = getStoredToken();

      if (!token) {
        setState("error");
        setMessage("No hay sesión activa. Inicia sesión para abrir tu biblioteca.");
        return;
      }

      try {
        const [purchaseResult, worksResult] = await Promise.allSettled([
          fetchMyPurchases(token),
          fetchMyWorks(token),
        ]);

        const nextMessages: string[] = [];

        const purchases =
          purchaseResult.status === "fulfilled" ? purchaseResult.value.items : [];
        const works =
          worksResult.status === "fulfilled"
            ? worksResult.value.items.filter((work) => work.status === "PUBLISHED")
            : [];

        if (purchaseResult.status === "rejected") {
          nextMessages.push(
            purchaseResult.reason instanceof Error
              ? purchaseResult.reason.message
              : "No fue posible cargar las obras adquiridas.",
          );
        }

        if (worksResult.status === "rejected") {
          nextMessages.push(
            worksResult.reason instanceof Error
              ? worksResult.reason.message
              : "No fue posible cargar las obras publicadas.",
          );
        }

        setLibrary(purchases);
        setPublishedWorks(works);

        const purchasedItems = purchases.flatMap((purchase) => purchase.items);
        const reviewEntries = await Promise.all(
          purchasedItems.map(async (item) => {
            try {
              const access = await fetchMyWorkReview(token, item.workId);
              return [
                item.workId,
                {
                  canReview: access.canReview,
                  hasPurchased: access.hasPurchased,
                  review: access.review,
                  form: {
                    rating: access.review?.rating ?? 5,
                    comment: access.review?.comment ?? "",
                  },
                  expanded: false,
                  saving: false,
                  message: "",
                  error: false,
                } satisfies ReviewCardState,
              ] as const;
            } catch {
              return [
                item.workId,
                {
                  canReview: false,
                  hasPurchased: true,
                  review: null,
                  form: {
                    rating: 5,
                    comment: "",
                  },
                  expanded: false,
                  saving: false,
                  message: "",
                  error: false,
                } satisfies ReviewCardState,
              ] as const;
            }
          }),
        );

        setReviewCards(Object.fromEntries(reviewEntries));
        setMessage(nextMessages.join(" "));
        setState("ready");
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "No fue posible cargar tu biblioteca.");
      }
    }

    void loadLibrary();
  }, []);

  useEffect(() => {
    const publishedSection = document.getElementById("publicadas");
    const acquiredSection = document.getElementById("adquiridas");

    if (!publishedSection || !acquiredSection) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries.length === 0) {
          return;
        }

        const nextId = visibleEntries[0]?.target.id;
        if (nextId === "publicadas" || nextId === "adquiridas") {
          setActiveSection(nextId);
        }
      },
      {
        rootMargin: "-25% 0px -45% 0px",
        threshold: [0.2, 0.35, 0.55],
      },
    );

    observer.observe(publishedSection);
    observer.observe(acquiredSection);

    return () => {
      observer.disconnect();
    };
  }, [state, publishedCount, acquiredCount]);

  async function handleDownloadPurchaseItem(itemId: string) {
    const token = getStoredToken();
    if (!token) {
      setMessage("Tu sesión expiró. Inicia sesión de nuevo.");
      return;
    }

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";

      const response = await fetch(`${apiBaseUrl}/purchases/me/items/${itemId}/download`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
        const nextMessage = Array.isArray(payload?.message)
          ? payload.message.join(" ")
          : payload?.message ?? "No fue posible descargar el manuscrito comprado.";
        throw new Error(nextMessage);
      }

      const blob = await response.blob();
      const explicitFileName = response.headers.get("x-download-filename");
      const contentDisposition = response.headers.get("content-disposition");
      const suggestedFileName =
        explicitFileName ??
        extractDownloadFilename(contentDisposition) ??
        `editorialhub-${itemId}.pdf`;
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = suggestedFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible descargar el manuscrito comprado.");
    }
  }

  function updateReviewCard(workId: string, updater: (current: ReviewCardState) => ReviewCardState) {
    setReviewCards((current) => {
      const currentCard = current[workId];
      if (!currentCard) {
        return current;
      }

      return {
        ...current,
        [workId]: updater(currentCard),
      };
    });
  }

  function toggleReviewComposer(workId: string) {
    updateReviewCard(workId, (current) => ({
      ...current,
      expanded: !current.expanded,
      message: "",
      error: false,
    }));
  }

  function updateReviewRating(workId: string, rating: number) {
    updateReviewCard(workId, (current) => ({
      ...current,
      form: {
        ...current.form,
        rating,
      },
      message: "",
      error: false,
    }));
  }

  function updateReviewComment(workId: string, comment: string) {
    updateReviewCard(workId, (current) => ({
      ...current,
      form: {
        ...current.form,
        comment,
      },
      message: "",
      error: false,
    }));
  }

  async function handleSaveReview(workId: string) {
    const token = getStoredToken();
    const reviewCard = reviewCards[workId];

    if (!token || !reviewCard) {
      setMessage("Tu sesión expiró. Inicia sesión de nuevo.");
      return;
    }

    if (!reviewCard.canReview) {
      updateReviewCard(workId, (current) => ({
        ...current,
        message: "Necesitas haber comprado la obra para poder calificarla.",
        error: true,
      }));
      return;
    }

    if (reviewCard.form.comment.trim().length < 10) {
      updateReviewCard(workId, (current) => ({
        ...current,
        message: "Escribe un comentario de al menos 10 caracteres.",
        error: true,
      }));
      return;
    }

    updateReviewCard(workId, (current) => ({
      ...current,
      saving: true,
      message: "",
      error: false,
    }));

    try {
      const response = await upsertWorkReview(token, workId, {
        rating: reviewCard.form.rating,
        comment: reviewCard.form.comment,
      });

      updateReviewCard(workId, (current) => ({
        ...current,
        review: response.review,
        form: {
          rating: response.review.rating,
          comment: response.review.comment,
        },
        expanded: false,
        saving: false,
        message: response.message,
        error: false,
      }));
    } catch (error) {
      updateReviewCard(workId, (current) => ({
        ...current,
        saving: false,
        message:
          error instanceof Error ? error.message : "No fue posible guardar la calificación y el comentario.",
        error: true,
      }));
    }
  }

  function logout() {
    clearStoredToken();
    window.location.href = "/login";
  }

  function cancelLogout() {
    setShowLogoutConfirmDialog(false);
  }

  return (
    <main style={pageStyle}>
      <SiteSectionHeader
        title="Mi biblioteca"
        activeNav="biblioteca"
        adminChips={buildAdminSectionChips("biblioteca")}
        chips={[
          {
            label: `${publishedCount} publicadas`,
            href: "#publicadas",
            active: activeSection === "publicadas",
          },
          {
            label: `${acquiredCount} adquiridas`,
            href: "#adquiridas",
            active: activeSection === "adquiridas",
          },
        ]}
      />

      <SectionPageFrame
        maxWidth="1080px"
        sidebar={
          <>
            <SectionSidebarCard title="Resumen de biblioteca">
              <p style={sidebarTextStyle}>Publicadas: <strong>{publishedCount}</strong></p>
              <p style={sidebarTextStyle}>Adquiridas: <strong>{acquiredCount}</strong></p>
              <p style={sidebarTextStyle}>Seccion activa: <strong>{activeSection === "publicadas" ? "Obras publicadas" : "Obras adquiridas"}</strong></p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Guia rapida">
              <p style={sidebarTextStyle}>Aqui puedes revisar lo que publicaste y lo que ya compraste.</p>
              <p style={sidebarTextStyle}>Las descargas siguen controladas por la clave y su limite correspondiente.</p>
              <p style={sidebarTextStyle}>Tambien puedes calificar y comentar desde esta misma biblioteca.</p>
            </SectionSidebarCard>
          </>
        }
      >
        {message ? <div style={feedbackStyle(state === "error")}>{message}</div> : null}

        {state === "loading" ? <div style={emptyCardStyle}>Cargando biblioteca...</div> : null}

        {state === "ready" ? (
          <>
            <section id="publicadas" style={sectionCardStyle}>
              <div style={sectionHeaderRowStyle}>
                <div style={{ display: "grid", gap: "6px" }}>
                  <h2 style={sectionTitleStyle}>Obras publicadas</h2>
                  <p style={sectionIntroStyle}>
                    Tus propias obras publicadas como autor dentro de EditorialHub.
                  </p>
                </div>
              </div>

              {publishedWorks.length === 0 ? (
                <div style={emptyInnerCardStyle}>
                  Todavía no tienes obras publicadas. Cuando publiques una obra, aparecerá aquí.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "16px" }}>
                  {publishedWorks.map((work) => (
                    <article key={work.id} style={libraryItemStyle}>
                      <div style={libraryCoverWrapStyle}>
                        {work.assets.cover?.url ? (
                          <img src={work.assets.cover.url} alt={`Portada de ${work.title}`} style={libraryCoverStyle} />
                        ) : (
                          <div style={libraryCoverPlaceholderStyle}>Sin portada</div>
                        )}
                      </div>

                      <div style={{ display: "grid", gap: "14px" }}>
                        <div style={{ display: "grid", gap: "8px" }}>
                          <div>
                            <p style={itemTitleStyle}>{work.title}</p>
                            <p style={itemMetaStyle}>
                              {work.publicationType} · Estado {work.status} · Edición {work.currentEdition}
                            </p>
                          </div>

                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <span style={pillStyle}>Slug {work.slug}</span>
                            <span style={pillStyle}>
                              {work.publishedAt
                                ? `Publicada ${new Date(work.publishedAt).toLocaleDateString("es-MX")}`
                                : "Publicada"}
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <Link href={`/obra/${work.slug}`} style={secondaryActionLinkStyle}>
                              Ver ficha pública
                            </Link>
                            <Link href="/publicar" style={secondaryActionLinkStyle}>
                              Ir a mis obras
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section id="adquiridas" style={sectionCardStyle}>
              <div style={sectionHeaderRowStyle}>
                <div style={{ display: "grid", gap: "6px" }}>
                  <h2 style={sectionTitleStyle}>Obras adquiridas</h2>
                  <p style={sectionIntroStyle}>
                    Las obras que compraste y que forman parte de tu biblioteca de lectura.
                  </p>
                </div>
              </div>

              {library.length === 0 ? (
                <div style={emptyInnerCardStyle}>
                  Todavía no has adquirido obras publicadas. Entra al catálogo y agrega una a tu biblioteca.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "16px" }}>
                  {library.map((purchase) =>
                    purchase.items.map((item) => {
                      const reviewCard = reviewCards[item.workId];
                      const reviewMessage = reviewCard?.message ?? "";
                      const currentReview = reviewCard?.review ?? null;

                      return (
                        <article key={item.id} style={libraryItemStyle}>
                          <div style={libraryCoverWrapStyle}>
                            {item.coverUrl ? (
                              <img src={item.coverUrl} alt={`Portada de ${item.title}`} style={libraryCoverStyle} />
                            ) : (
                              <div style={libraryCoverPlaceholderStyle}>Sin portada</div>
                            )}
                          </div>

                          <div style={{ display: "grid", gap: "14px" }}>
                            <div style={{ display: "grid", gap: "8px" }}>
                              <div>
                                <p style={itemTitleStyle}>{item.title}</p>
                                <p style={itemMetaStyle}>
                                  por {item.authorName} · {item.publicationType} · Edición {item.editionNumber}
                                </p>
                              </div>

                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <span style={pillStyle}>Folio {purchase.folio}</span>
                                <span style={pillStyle}>MXN {purchase.totalAmount}</span>
                                <span style={pillStyle}>
                                  {item.purchasedAt
                                    ? `Adquirida ${new Date(item.purchasedAt).toLocaleDateString("es-MX")}`
                                    : "Compra confirmada"}
                                </span>
                              </div>

                              {purchase.downloadKey ? (
                                <p style={downloadKeyStyle}>
                                  Clave de descarga: <strong>{purchase.downloadKey.code}</strong> · vence el{" "}
                                  {new Date(purchase.downloadKey.expiresAt).toLocaleDateString("es-MX")}
                                </p>
                              ) : null}
                              {purchase.downloadKey ? (
                                <p style={downloadLimitStyle}>
                                  {purchase.downloadKey.maxAttempts - purchase.downloadKey.attemptsUsed > 0
                                    ? `Te quedan ${purchase.downloadKey.maxAttempts - purchase.downloadKey.attemptsUsed} de ${purchase.downloadKey.maxAttempts} descargas disponibles.`
                                    : `Ya alcanzaste el limite de ${purchase.downloadKey.maxAttempts} descargas.`}
                                </p>
                              ) : null}


                              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                <Link href={`/obra/${item.workSlug}`} style={secondaryActionLinkStyle}>
                                  Ver ficha pública
                                </Link>
                                {item.manuscriptUrl ? (
                                  <div style={{ display: "grid", gap: "6px" }}>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadPurchaseItem(item.id)}
                                      style={primaryActionButtonStyle}
                                    >
                                      Descargar manuscrito
                                    </button>
                                    <span style={downloadHintStyle}>
                                      El archivo se descargara con el nombre de la obra. Maximo {purchase.downloadKey?.maxAttempts ?? 3} descargas.
                                    </span>
                                  </div>
                                ) : (
                                  <span style={disabledStyle}>Manuscrito no disponible</span>
                                )}
                              </div>
                            </div>

                            <section style={reviewPanelStyle}>
                              <div style={reviewSummaryHeaderStyle}>
                                <div style={{ display: "grid", gap: "4px" }}>
                                  <p style={reviewLabelStyle}>Tu calificación</p>
                                  <div style={reviewStarsRowStyle}>
                                    <span style={reviewStarsValueStyle}>
                                      {buildStarString(currentReview?.rating ?? 0)}
                                    </span>
                                    <span style={reviewStarsTextStyle}>
                                      {currentReview
                                        ? `${currentReview.rating} de 5`
                                        : "Aún no has calificado esta obra"}
                                    </span>
                                  </div>
                                  <p style={reviewHelperTextStyle}>
                                    {currentReview
                                      ? `Última actualización ${new Date(currentReview.updatedAt).toLocaleDateString("es-MX")}`
                                      : "Comparte tu experiencia de lectura desde aquí mismo."}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleReviewComposer(item.workId)}
                                  style={reviewToggleButtonStyle}
                                >
                                  {reviewCard?.expanded
                                    ? "Cancelar"
                                    : currentReview
                                      ? "Editar calificación y comentario"
                                      : "Calificar y dejar comentario"}
                                </button>
                              </div>

                              {currentReview?.comment ? (
                                <p style={reviewCommentPreviewStyle}>{currentReview.comment}</p>
                              ) : null}

                              {reviewMessage ? (
                                <div style={feedbackStyle(reviewCard?.error ?? false)}>{reviewMessage}</div>
                              ) : null}

                              {reviewCard?.expanded ? (
                                <div style={reviewComposerStyle}>
                                  <p style={reviewComposerTextStyle}>
                                    {reviewCard.canReview
                                      ? "Selecciona tus estrellas y deja un comentario honesto sobre la obra."
                                      : reviewCard.hasPurchased
                                        ? "Tu compra ya fue detectada. Si el sistema aún no te deja reseñar, recarga la página."
                                        : "Solo los socios que ya compraron esta obra pueden dejar una reseña."}
                                  </p>

                                  <div style={reviewPickerRowStyle}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => updateReviewRating(item.workId, star)}
                                        disabled={!reviewCard.canReview || reviewCard.saving}
                                        style={reviewStarButtonStyle(
                                          (reviewCard.form.rating ?? 0) >= star,
                                          !reviewCard.canReview || reviewCard.saving,
                                        )}
                                      >
                                        ★
                                      </button>
                                    ))}
                                    <span style={reviewCurrentRatingStyle}>
                                      {reviewCard.form.rating} de 5
                                    </span>
                                  </div>

                                  <textarea
                                    rows={4}
                                    value={reviewCard.form.comment}
                                    onChange={(event) => updateReviewComment(item.workId, event.target.value)}
                                    disabled={!reviewCard.canReview || reviewCard.saving}
                                    placeholder="Comparte una opinión honesta sobre la lectura, el ritmo, la historia o lo que más te dejó esta obra."
                                    style={reviewTextareaStyle(!reviewCard.canReview || reviewCard.saving)}
                                  />

                                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveReview(item.workId)}
                                      disabled={!reviewCard.canReview || reviewCard.saving}
                                      style={saveReviewButtonStyle(!reviewCard.canReview || reviewCard.saving)}
                                    >
                                      {reviewCard.saving
                                        ? "Guardando reseña..."
                                        : "Guardar calificación y comentario"}
                                    </button>
                                    {!reviewCard.canReview ? (
                                      <span style={reviewHelpPillStyle}>
                                        Necesitas haber comprado la obra para reseñarla
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              ) : null}
                            </section>
                          </div>
                        </article>
                      );
                    }),
                  )}
                </div>
              )}
            </section>
          </>
        ) : null}
      </SectionPageFrame>

      {showLogoutConfirmDialog ? (
        <div style={dialogOverlayStyle}>
          <div style={dialogCardStyle}>
            <h3 style={dialogTitleStyle}>Confirmar cierre de sesión</h3>
            <p style={dialogTextStyle}>
              Estás a punto de salir de tu biblioteca y volver a la pantalla de acceso.
            </p>
            <div style={dialogActionsStyle}>
              <button type="button" onClick={logout} style={dialogPrimaryButtonStyle}>
                Sí cerrar sesión
              </button>
              <button type="button" onClick={cancelLogout} style={dialogSecondaryButtonStyle}>
                No cerrar sesión
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#f8f9fa",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const emptyCardStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "18px 20px",
  color: "#666666",
};

const sectionCardStyle = {
  display: "grid",
  gap: "16px",
};

const sectionHeaderRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap" as const,
};

const sectionTitleStyle = {
  color: "#013473",
  fontSize: "20px",
  margin: 0,
  fontFamily: "'Times New Roman', serif",
};

const sectionIntroStyle = {
  color: "#5f6368",
  fontSize: "14px",
  margin: 0,
  lineHeight: "1.8",
};

const emptyInnerCardStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "14px",
  color: "#666666",
  border: "1px solid #e0e6ed",
};

const libraryItemStyle = {
  display: "grid",
  gridTemplateColumns: "96px 1fr",
  gap: "12px",
  border: "1px solid #e0e6ed",
  borderRadius: "8px",
  padding: "10px 12px",
  alignItems: "start",
  backgroundColor: "#ffffff",
};

const libraryCoverWrapStyle = {
  width: "96px",
  height: "154px",
  borderRadius: "6px",
  overflow: "hidden",
  backgroundColor: "#eef2f7",
  border: "1px solid #dde4ec",
};

const libraryCoverStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
  display: "block",
};

const libraryCoverPlaceholderStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#7a8794",
  fontSize: "12px",
  textAlign: "center" as const,
  padding: "10px",
};

const itemTitleStyle = {
  color: "#013473",
  fontSize: "16px",
  fontWeight: "bold",
  margin: "0 0 4px 0",
};

const itemMetaStyle = {
  color: "#666666",
  fontSize: "12px",
  margin: 0,
};

const pillStyle = {
  backgroundColor: "#f3f6fa",
  color: "#4f5b66",
  borderRadius: "999px",
  padding: "5px 9px",
  fontSize: "11px",
};

const downloadKeyStyle = {
  color: "#4f5b66",
  fontSize: "12px",
  margin: 0,
  lineHeight: "1.6",
};

const downloadLimitStyle = {
  color: "#7a5c00",
  fontSize: "12px",
  margin: "-4px 0 0 0",
  lineHeight: "1.6",
};

const downloadHintStyle = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "1.5",
};

const secondaryActionLinkStyle = {
  color: "#013473",
  backgroundColor: "#eef2f7",
  padding: "7px 11px",
  borderRadius: "4px",
  textDecoration: "none",
  fontSize: "12px",
};

const primaryActionButtonStyle = {
  backgroundColor: "#013473",
  color: "#ffffff",
  border: "none",
  borderRadius: "4px",
  padding: "7px 11px",
  cursor: "pointer",
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: "12px",
};

const disabledStyle = {
  color: "#777777",
  backgroundColor: "#f3f4f6",
  padding: "9px 12px",
  borderRadius: "4px",
  fontSize: "12px",
};

const reviewPanelStyle = {
  borderTop: "1px solid #e8edf3",
  paddingTop: "14px",
  display: "grid",
  gap: "12px",
};

const reviewSummaryHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "center",
  flexWrap: "wrap" as const,
};

const reviewLabelStyle = {
  margin: 0,
  color: "#013473",
  fontSize: "13px",
  fontWeight: "bold",
};

const reviewStarsRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const reviewStarsValueStyle = {
  color: "#f59e0b",
  fontSize: "20px",
  letterSpacing: "0.08em",
};

const reviewStarsTextStyle = {
  color: "#4b5563",
  fontSize: "14px",
};

const reviewHelperTextStyle = {
  margin: 0,
  color: "#6b7280",
  fontSize: "12px",
};

const reviewToggleButtonStyle = {
  color: "#013473",
  backgroundColor: "#eef2f7",
  border: "1px solid #d7dfe8",
  borderRadius: "999px",
  padding: "10px 14px",
  fontSize: "13px",
  cursor: "pointer",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const reviewCommentPreviewStyle = {
  margin: 0,
  color: "#3f4750",
  fontSize: "14px",
  lineHeight: "1.8",
  backgroundColor: "#f8fafc",
  borderRadius: "6px",
  padding: "12px 14px",
};

const reviewComposerStyle = {
  display: "grid",
  gap: "12px",
  backgroundColor: "#fbfcfe",
  border: "1px solid #e6ecf3",
  borderRadius: "8px",
  padding: "14px",
};

const reviewComposerTextStyle = {
  margin: 0,
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: "1.7",
};

const reviewPickerRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const reviewCurrentRatingStyle = {
  color: "#013473",
  fontSize: "14px",
  fontWeight: "bold",
  marginLeft: "6px",
};

const reviewHelpPillStyle = {
  color: "#6b7280",
  backgroundColor: "#eef2f7",
  border: "1px solid #d7dfe8",
  padding: "10px 16px",
  borderRadius: "999px",
  fontSize: "12px",
};

const dialogOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(1, 21, 52, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  zIndex: 1000,
};

const dialogCardStyle = {
  width: "100%",
  maxWidth: "520px",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "28px",
  boxShadow: "0 24px 60px rgba(1, 21, 52, 0.2)",
  display: "grid",
  gap: "18px",
};

const dialogTitleStyle = {
  margin: 0,
  color: "#013473",
  fontSize: "24px",
  fontFamily: "'Times New Roman', serif",
  textAlign: "center" as const,
};

const dialogTextStyle = {
  margin: 0,
  color: "#444444",
  fontSize: "14px",
  lineHeight: "1.8",
  textAlign: "center" as const,
};

const dialogActionsStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "12px",
  flexWrap: "wrap" as const,
};

const dialogPrimaryButtonStyle = {
  backgroundColor: "#013473",
  color: "#ffffff",
  padding: "12px 18px",
  border: "none",
  borderRadius: "4px",
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: "14px",
  cursor: "pointer",
};

const dialogSecondaryButtonStyle = {
  backgroundColor: "#eef2f7",
  color: "#013473",
  padding: "12px 18px",
  border: "1px solid #d7dfe8",
  borderRadius: "4px",
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: "14px",
  cursor: "pointer",
};
const sidebarTextStyle = {
  margin: 0,
  color: "#4b5563",
  fontSize: "12px",
  lineHeight: "1.65",
};

function feedbackStyle(isError: boolean) {
  return {
    padding: "14px 18px",
    borderRadius: "4px",
    backgroundColor: isError ? "#fdecea" : "#e8f5e9",
    color: isError ? "#b71c1c" : "#1b5e20",
    fontSize: "14px",
  };
}

function reviewStarButtonStyle(active: boolean, disabled: boolean): CSSProperties {
  return {
    border: "none",
    backgroundColor: "transparent",
    color: active ? "#f59e0b" : "#cbd5e1",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "30px",
    lineHeight: 1,
    padding: 0,
  };
}

function reviewTextareaStyle(disabled: boolean): CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "6px",
    border: "1px solid #d7dfe8",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "14px",
    lineHeight: "1.8",
    resize: "vertical",
    color: "#1f2937",
    backgroundColor: disabled ? "#f8fafc" : "#ffffff",
    boxSizing: "border-box",
  };
}

function saveReviewButtonStyle(disabled: boolean): CSSProperties {
  return {
    backgroundColor: disabled ? "#94a3b8" : "#013473",
    color: "#ffffff",
    padding: "10px 16px",
    borderRadius: "6px",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "13px",
    fontFamily: "Georgia, 'Times New Roman', serif",
  };
}

function buildStarString(rating: number) {
  if (rating <= 0) {
    return "☆☆☆☆☆";
  }

  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function extractDownloadFilename(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const simpleMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return simpleMatch?.[1] ?? null;
}
