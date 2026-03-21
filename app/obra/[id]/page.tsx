"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { SiteSectionHeader } from "@/components/site-section-header";
import {
  checkoutPublishedWork,
  fetchMyWorkReview,
  fetchMyPurchases,
  fetchPublishedWork,
  fetchPublishedWorkReviews,
  fetchPublishedWorks,
  getStoredToken,
  upsertWorkReview,
  type PublishedWorkReview,
  type Work,
} from "@/lib/api";

export default function ObraDetallePage() {
  const termsVersion = "2026-03-v1";
  const params = useParams<{ id: string }>();
  const identifier = params?.id;
  const [work, setWork] = useState<Work | null>(null);
  const [relatedWorks, setRelatedWorks] = useState<Work[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [purchaseState, setPurchaseState] = useState<"idle" | "loading" | "owned" | "ready" | "error">("idle");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [reviews, setReviews] = useState<PublishedWorkReview[]>([]);
  const [reviewState, setReviewState] = useState<"idle" | "saving" | "error" | "success">("idle");
  const [reviewMessage, setReviewMessage] = useState("");
  const [canReview, setCanReview] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });

  useEffect(() => {
    async function loadWork() {
      if (!identifier) {
        setState("error");
        setMessage("No se encontro el identificador de la obra.");
        return;
      }

      try {
        const [currentWork, reviewsResponse] = await Promise.all([
          fetchPublishedWork(identifier),
          fetchPublishedWorkReviews(identifier),
        ]);
        setWork(currentWork);
        setReviews(reviewsResponse.items);

        const catalog = await fetchPublishedWorks();
        const related = catalog.items.filter(
          (item) => item.id !== currentWork.id && item.authorProfileId === currentWork.authorProfileId,
        );
        setRelatedWorks(related.slice(0, 3));

        const token = getStoredToken();
        if (token) {
          try {
            const [purchases, reviewAccess] = await Promise.all([
              fetchMyPurchases(token),
              fetchMyWorkReview(token, currentWork.id),
            ]);
            const alreadyOwned = purchases.items.some((purchase) =>
              purchase.items.some((item) => item.workId === currentWork.id),
            );

            if (alreadyOwned) {
              setPurchaseState("owned");
              setPurchaseMessage("Esta obra ya esta en tu biblioteca.");
            } else {
              setPurchaseState("ready");
            }

            setCanReview(reviewAccess.canReview);
            setHasPurchased(reviewAccess.hasPurchased);
            if (reviewAccess.review) {
              setReviewForm({
                rating: reviewAccess.review.rating,
                comment: reviewAccess.review.comment,
              });
            }
          } catch {
            setPurchaseState("ready");
          }
        } else {
          setPurchaseState("ready");
        }

        setState("ready");
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "No fue posible cargar la obra.");
      }
    }

    loadWork();
  }, [identifier]);

  const metadata = work?.metadata ?? {};
  const language = typeof metadata.language === "string" ? metadata.language : "No especificado";
  const genre = typeof metadata.genre === "string" ? metadata.genre : "Sin genero";
  const pageCount = typeof metadata.pageCount === "number" || typeof metadata.pageCount === "string" ? metadata.pageCount : "-";
  const keywords = Array.isArray(metadata.keywords) ? metadata.keywords : [];
  const coverUrl = work?.assets.cover?.url ?? null;
  const backCoverUrl = work?.assets.backCover?.url ?? null;
  const ratingSummary = work?.ratings;
  const visibleAverage = ratingSummary?.visibleAverage ?? null;
  const totalReviews = ratingSummary?.totalReviews ?? 0;
  const editorial = work?.editorial;

  async function reloadReviews(currentIdentifier: string, currentWorkId: string) {
    const [workResponse, reviewsResponse] = await Promise.all([
      fetchPublishedWork(currentIdentifier),
      fetchPublishedWorkReviews(currentIdentifier),
    ]);
    setWork(workResponse);
    setReviews(reviewsResponse.items);

    const token = getStoredToken();
    if (token) {
      const reviewAccess = await fetchMyWorkReview(token, currentWorkId);
      setCanReview(reviewAccess.canReview);
      setHasPurchased(reviewAccess.hasPurchased);
      if (reviewAccess.review) {
        setReviewForm({
          rating: reviewAccess.review.rating,
          comment: reviewAccess.review.comment,
        });
      }
    }
  }

  async function handleSaveReview() {
    if (!work) {
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setReviewState("error");
      setReviewMessage("Inicia sesion para poder calificar y comentar esta obra.");
      return;
    }

    if (!canReview) {
      setReviewState("error");
      setReviewMessage("Solo los socios que ya compraron esta obra pueden dejar una reseña.");
      return;
    }

    if (reviewForm.comment.trim().length < 10) {
      setReviewState("error");
      setReviewMessage("Escribe un comentario de al menos 10 caracteres.");
      return;
    }

    setReviewState("saving");
    setReviewMessage("");

    try {
      const response = await upsertWorkReview(token, work.id, reviewForm);
      setReviewState("success");
      setReviewMessage(response.message);
      if (identifier) {
        await reloadReviews(identifier, work.id);
      }
    } catch (error) {
      setReviewState("error");
      setReviewMessage(
        error instanceof Error ? error.message : "No fue posible guardar tu calificacion.",
      );
    }
  }

  async function handleCheckout() {
    if (!work) {
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setPurchaseState("error");
      setPurchaseMessage("Inicia sesion con tu cuenta para agregar esta obra a tu biblioteca.");
      return;
    }

    if (!termsAccepted) {
      setPurchaseState("error");
      setPurchaseMessage("Debes aceptar los terminos y la politica de privacidad antes de pagar.");
      return;
    }

    setPurchaseState("loading");
    setPurchaseMessage("");

    try {
      const response = (await checkoutPublishedWork(token, work.id, {
        acceptTerms: true,
        termsVersion,
      })) as {
        message: string;
        alreadyOwned: boolean;
        checkoutUrl: string | null;
      };

      if (response.alreadyOwned) {
        setPurchaseState("owned");
        setPurchaseMessage(response.message);
        return;
      }

      if (!response.checkoutUrl) {
        throw new Error("No fue posible obtener la sesion de pago con Stripe.");
      }

      setPurchaseState("loading");
      setPurchaseMessage("Redirigiendo a Stripe Checkout...");
      window.location.href = response.checkoutUrl;
    } catch (error) {
      setPurchaseState("error");
      setPurchaseMessage(
        error instanceof Error ? error.message : "No fue posible iniciar el pago con Stripe.",
      );
    }
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <SiteSectionHeader
        title={work?.title ?? "Detalle de obra"}
        activeNav="catalogo"
        chips={[
          { label: "Catalogo", href: "/catalogo" },
          { label: "Detalle", href: "#" },
          { label: "Mi panel", href: "/panel" },
        ]}
      />

      <div style={{ padding: "16px 40px", backgroundColor: "#f8f9fa", borderBottom: "1px solid #e0e0e0", fontSize: "13px" }}>
        <Link href="/catalogo" style={{ color: "#037D8C", textDecoration: "none" }}>Catalogo</Link>
        <span style={{ color: "#93908B", margin: "0 8px" }}>/</span>
        <span style={{ color: "#93908B" }}>{work?.title ?? "Detalle de obra"}</span>
      </div>

      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 40px" }}>
        {message ? <div style={feedbackStyle(state === "error")}>{message}</div> : null}

        {work ? (
          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "48px", alignItems: "start" }}>
            <div>
              <div style={coverStyle}>
                {coverUrl ? (
                  <img src={coverUrl} alt={`Portada de ${work.title}`} style={coverImageStyle} />
                ) : (
                  <span style={{ color: "#b8cad9", fontSize: "14px", fontStyle: "italic" }}>Portada publicada</span>
                )}
              </div>
              <div style={{ marginTop: "20px", padding: "14px 16px", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
                <p style={{ color: "#93908B", fontSize: "12px", margin: "0 0 4px 0" }}>Slug publico</p>
                <p style={{ color: "#013473", fontSize: "13px", fontWeight: "bold", margin: 0 }}>{work.slug}</p>
              </div>
            </div>

            <div>
              <span style={typeBadgeStyle}>{work.publicationType}</span>
              <h1 style={{ color: "#013473", fontSize: "38px", lineHeight: 1.2, margin: "14px 0 12px 0", fontFamily: "'Times New Roman', serif" }}>{work.title}</h1>
              <p style={{ color: "#666666", fontSize: "16px", margin: "0 0 22px 0" }}>por {work.authorPublicName ?? "Autor pendiente"}</p>

              {editorial?.editorialBadgeText || editorial?.editorialHeadline || editorial?.featuredReviewNote ? (
                <div style={editorialSpotlightStyle}>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {editorial?.editorialBadgeText ? (
                      <span style={editorialSpotlightBadgeStyle}>{editorial.editorialBadgeText}</span>
                    ) : null}
                    <span style={editorialSpotlightMetaStyle}>Capa editorial visible</span>
                  </div>
                  {editorial?.editorialHeadline ? (
                    <p style={editorialSpotlightHeadlineStyle}>{editorial.editorialHeadline}</p>
                  ) : null}
                  {editorial?.featuredReviewNote ? (
                    <p style={editorialSpotlightTextStyle}>{editorial.featuredReviewNote}</p>
                  ) : null}
                </div>
              ) : null}

              <div style={ratingHeroCardStyle}>
                <div>
                  <p style={ratingEyebrowStyle}>Calificacion de lectores</p>
                  <div style={ratingHeroRowStyle}>
                    <span style={ratingHeroValueStyle}>
                      {visibleAverage !== null ? visibleAverage.toFixed(1) : "--"}
                    </span>
                    <span style={ratingHeroStarsStyle}>
                      {visibleAverage !== null ? buildStarString(visibleAverage) : "☆☆☆☆☆"}
                    </span>
                    <span style={ratingHeroCountStyle}>
                      {totalReviews > 0 ? `${totalReviews} reseñas` : "Aun no hay reseñas"}
                    </span>
                  </div>
                  {editorial?.hasVisibleRatingOverride ? (
                    <p style={editorialOverrideNoteStyle}>
                      Esta ficha muestra una presentacion editorial visible adicional sobre la señal organica.
                    </p>
                  ) : null}
                </div>

                <div style={ratingBreakdownWrapStyle}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingSummary?.breakdown[star as 1 | 2 | 3 | 4 | 5] ?? 0;
                    const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                    return (
                      <div key={star} style={ratingBreakdownRowStyle}>
                        <span style={ratingBreakdownLabelStyle}>{star}★</span>
                        <div style={ratingBreakdownBarTrackStyle}>
                          <span style={{ ...ratingBreakdownBarFillStyle, width: `${percent}%` }} />
                        </div>
                        <span style={ratingBreakdownCountStyle}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "28px" }}>
                <button
                  onClick={handleCheckout}
                  disabled={purchaseState === "loading" || purchaseState === "owned" || !termsAccepted}
                  style={checkoutButtonStyle(
                    purchaseState === "loading" || purchaseState === "owned" || !termsAccepted,
                    purchaseState === "owned",
                  )}
                >
                  {purchaseState === "loading"
                    ? "Preparando pago..."
                    : purchaseState === "owned"
                      ? "Ya esta en tu biblioteca"
                      : "Comprar con Stripe"}
                </button>
                <Link href="/panel" style={panelShortcutStyle}>Ir a mi panel</Link>
                <span style={publishedPillStyle}>Publicada</span>
              </div>

              {purchaseMessage ? (
                <div style={purchaseFeedbackStyle(purchaseState === "error")}>{purchaseMessage}</div>
              ) : null}

              <div style={termsBoxStyle}>
                <label style={termsLabelStyle}>
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    style={{ marginTop: "3px" }}
                  />
                  <span>
                    Acepto los{" "}
                    <Link href="/terminos#terminos" style={termsLinkStyle}>terminos de uso</Link>
                    {" "}y la{" "}
                    <Link href="/terminos#privacidad" style={termsLinkStyle}>politica de privacidad</Link>
                    {" "}para iniciar el pago. Version {termsVersion}.
                  </span>
                </label>
              </div>

              <div style={{ borderTop: "1px solid #e8e8e8", borderBottom: "1px solid #e8e8e8", padding: "20px 0", marginBottom: "28px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", rowGap: "12px" }}>
                  <span style={detailLabelStyle}>Idioma</span>
                  <span style={detailValueStyle}>{language}</span>

                  <span style={detailLabelStyle}>Genero</span>
                  <span style={detailValueStyle}>{genre}</span>

                  <span style={detailLabelStyle}>Paginas</span>
                  <span style={detailValueStyle}>{pageCount}</span>

                  <span style={detailLabelStyle}>Publicado</span>
                  <span style={detailValueStyle}>{work.publishedAt ? new Date(work.publishedAt).toLocaleDateString("es-MX") : "Disponible"}</span>
                </div>
              </div>

              <div>
                <h2 style={{ color: "#013473", fontSize: "22px", margin: "0 0 14px 0", fontFamily: "'Times New Roman', serif" }}>Sinopsis</h2>
                <p style={{ color: "#444444", fontSize: "15px", lineHeight: "1.8", margin: 0 }}>
                  {work.description ?? "Sinopsis pendiente de captura."}
                </p>
              </div>

              {keywords.length > 0 ? (
                <div style={{ marginTop: "24px" }}>
                  <p style={{ color: "#93908B", fontSize: "12px", margin: "0 0 10px 0" }}>Palabras clave</p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {keywords.map((keyword) => (
                      <span key={String(keyword)} style={keywordStyle}>{String(keyword)}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ marginTop: "36px", display: "grid", gap: "18px" }}>
                <h2 style={{ color: "#013473", fontSize: "22px", margin: 0, fontFamily: "'Times New Roman', serif" }}>Galeria editorial</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
                  <div style={galleryCardStyle}>
                    <p style={galleryLabelStyle}>Portada</p>
                    {coverUrl ? (
                      <img src={coverUrl} alt={`Portada de ${work.title}`} style={galleryImageStyle} />
                    ) : (
                      <p style={galleryEmptyStyle}>Sin portada publicada.</p>
                    )}
                  </div>

                  <div style={galleryCardStyle}>
                    <p style={galleryLabelStyle}>Contraportada</p>
                    {backCoverUrl ? (
                      <img src={backCoverUrl} alt={`Contraportada de ${work.title}`} style={galleryImageStyle} />
                    ) : (
                      <p style={galleryEmptyStyle}>Sin contraportada publicada.</p>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "28px", display: "grid", gap: "18px" }}>
                <h2 style={{ color: "#013473", fontSize: "22px", margin: 0, fontFamily: "'Times New Roman', serif" }}>Acceso al manuscrito</h2>
                <div style={manuscriptNoticeStyle}>
                  <p style={{ color: "#013473", fontWeight: "bold", margin: "0 0 6px 0" }}>Manuscrito protegido</p>
                  <p style={{ color: "#5f6368", fontSize: "14px", lineHeight: "1.7", margin: 0 }}>
                    El archivo completo ya no se expone publicamente. Una vez que agregues la obra a tu biblioteca,
                    podras descargarla desde tu panel con acceso protegido.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: "36px", display: "grid", gap: "18px" }}>
                <h2 style={{ color: "#013473", fontSize: "22px", margin: 0, fontFamily: "'Times New Roman', serif" }}>Comentarios y calificaciones</h2>

                <div style={reviewComposerStyle}>
                  <div style={{ display: "grid", gap: "10px" }}>
                    <p style={reviewComposerTitleStyle}>Tu opinion sobre esta obra</p>
                    <p style={reviewComposerTextStyle}>
                      {canReview
                        ? "Ya puedes dejar tu calificacion y comentario porque esta obra forma parte de tu biblioteca."
                        : hasPurchased
                          ? "Tu compra ya fue detectada. Si el sistema aun no te deja reseñar, recarga la pagina."
                          : "Solo los socios que ya compraron esta obra pueden dejar una reseña organica."}
                    </p>
                  </div>

                  <div style={reviewStarsPickerRowStyle}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm((current) => ({ ...current, rating: star }))}
                        disabled={!canReview || reviewState === "saving"}
                        style={reviewStarButtonStyle(reviewForm.rating >= star, !canReview || reviewState === "saving")}
                      >
                        ★
                      </button>
                    ))}
                    <span style={reviewCurrentRatingStyle}>{reviewForm.rating} de 5</span>
                  </div>

                  <textarea
                    rows={5}
                    value={reviewForm.comment}
                    onChange={(event) =>
                      setReviewForm((current) => ({ ...current, comment: event.target.value }))
                    }
                    disabled={!canReview || reviewState === "saving"}
                    placeholder="Comparte una opinion honesta sobre la lectura, el ritmo, la historia o lo que mas te dejo esta obra."
                    style={reviewTextareaStyle(!canReview || reviewState === "saving")}
                  />

                  {reviewMessage ? (
                    <div style={purchaseFeedbackStyle(reviewState === "error")}>{reviewMessage}</div>
                  ) : null}

                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={handleSaveReview}
                      disabled={!canReview || reviewState === "saving"}
                      style={saveReviewButtonStyle(!canReview || reviewState === "saving")}
                    >
                      {reviewState === "saving" ? "Guardando reseña..." : "Guardar calificacion y comentario"}
                    </button>
                    {!canReview ? (
                      <span style={reviewHelpPillStyle}>
                        Necesitas haber comprado la obra para reseñarla
                      </span>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: "grid", gap: "14px" }}>
                  {reviews.length > 0 ? (
                    reviews.map((review) => (
                      <article key={review.id} style={reviewCardStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                          <div>
                            <p style={reviewAuthorStyle}>{review.reviewerDisplayName}</p>
                            <p style={reviewLabelStyle}>{review.reviewerLabel}</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={reviewStarsStyle}>{buildStarString(review.rating)}</p>
                            <p style={reviewDateStyle}>
                              {new Date(review.updatedAt).toLocaleDateString("es-MX")}
                            </p>
                          </div>
                        </div>
                        <p style={reviewCommentStyle}>{review.comment}</p>
                      </article>
                    ))
                  ) : (
                    <div style={emptyBoxStyle}>
                      Esta obra aun no tiene comentarios publicados. El primer socio comprador que la reseñe abrira esta conversacion.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : state === "loading" ? (
          <div style={emptyBoxStyle}>Cargando detalle de la obra...</div>
        ) : null}
      </section>

      {relatedWorks.length > 0 ? (
        <section style={{ backgroundColor: "#f8f9fa", padding: "48px 40px" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <h2 style={{ color: "#013473", fontSize: "24px", margin: "0 0 24px 0", fontFamily: "'Times New Roman', serif" }}>Mas obras del mismo autor</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "24px" }}>
              {relatedWorks.map((related) => (
                <Link key={related.id} href={`/obra/${related.slug}`} style={relatedCardStyle}>
                  <div style={{ backgroundColor: "#0d345f", height: "150px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {related.assets.cover?.url ? (
                      <img src={related.assets.cover.url} alt={`Portada de ${related.title}`} style={relatedCoverImageStyle} />
                    ) : (
                      <span style={{ color: "#b8cad9", fontSize: "12px", fontStyle: "italic" }}>Portada</span>
                    )}
                  </div>
                  <div style={{ padding: "16px" }}>
                    <p style={{ color: "#037D8C", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px 0" }}>{related.publicationType}</p>
                    <p style={{ color: "#013473", fontSize: "18px", lineHeight: 1.3, margin: 0 }}>{related.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

const coverStyle: CSSProperties = { backgroundColor: "#0d345f", height: "500px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" };
const coverImageStyle: CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
const typeBadgeStyle = { display: "inline-block", backgroundColor: "#037D8C", color: "#ffffff", fontSize: "12px", padding: "4px 10px", borderRadius: "3px" };
const publishedPillStyle = { backgroundColor: "#edf8ef", color: "#2E7D32", padding: "12px 18px", borderRadius: "4px", fontSize: "14px", fontWeight: "bold" };
const detailLabelStyle = { color: "#93908B", fontSize: "14px" };
const detailValueStyle = { color: "#013473", fontSize: "14px", fontWeight: "bold" };
const keywordStyle = { backgroundColor: "#eef2f7", color: "#4f5b66", padding: "4px 10px", borderRadius: "999px", fontSize: "12px" };
const relatedCardStyle = { backgroundColor: "#ffffff", border: "1px solid #e0e0e0", borderRadius: "4px", overflow: "hidden", textDecoration: "none", display: "block" };
const relatedCoverImageStyle: CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
const galleryCardStyle = { border: "1px solid #e2e6ee", borderRadius: "6px", padding: "12px", backgroundColor: "#ffffff", display: "grid", gap: "10px" };
const galleryLabelStyle = { color: "#013473", fontSize: "13px", fontWeight: "bold", margin: 0 };
const galleryImageStyle: CSSProperties = { width: "100%", height: "320px", objectFit: "cover", borderRadius: "4px", display: "block" };
const galleryEmptyStyle: CSSProperties = { color: "#8b9097", fontSize: "14px", margin: 0, minHeight: "320px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8f9fa", borderRadius: "4px" };
const manuscriptNoticeStyle = { border: "1px solid #dbe3f1", borderRadius: "6px", backgroundColor: "#f7fbff", padding: "16px" };
const termsBoxStyle = { marginTop: "16px", padding: "14px 16px", border: "1px solid #d9e3ef", borderRadius: "6px", backgroundColor: "#f7fbff" };
const termsLabelStyle = { display: "flex", gap: "10px", alignItems: "flex-start", color: "#4f5b66", fontSize: "13px", lineHeight: "1.7" };
const termsLinkStyle = { color: "#037D8C", textDecoration: "none", fontWeight: "bold" };
const emptyBoxStyle = { padding: "24px", borderRadius: "4px", backgroundColor: "#f8f9fa", color: "#666666" };
const ratingHeroCardStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 300px) 1fr",
  gap: "24px",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  backgroundColor: "#fafcfe",
  padding: "18px 20px",
  marginBottom: "24px",
};
const ratingEyebrowStyle = { color: "#6b7280", fontSize: "12px", margin: "0 0 8px 0", textTransform: "uppercase" as const, letterSpacing: "0.08em" };
const ratingHeroRowStyle = { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" as const };
const ratingHeroValueStyle = { color: "#013473", fontSize: "34px", fontWeight: "bold", lineHeight: 1 };
const ratingHeroStarsStyle = { color: "#f59e0b", fontSize: "22px", letterSpacing: "0.08em" };
const ratingHeroCountStyle = { color: "#4b5563", fontSize: "14px" };
const ratingBreakdownWrapStyle = { display: "grid", gap: "8px", alignContent: "center" };
const ratingBreakdownRowStyle = { display: "grid", gridTemplateColumns: "36px 1fr 28px", gap: "10px", alignItems: "center" };
const ratingBreakdownLabelStyle = { color: "#4b5563", fontSize: "13px", fontWeight: "bold" };
const ratingBreakdownBarTrackStyle = { height: "10px", borderRadius: "999px", backgroundColor: "#e5e7eb", overflow: "hidden" };
const ratingBreakdownBarFillStyle = { display: "block", height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)" };
const ratingBreakdownCountStyle = { color: "#6b7280", fontSize: "12px", textAlign: "right" as const };
const editorialSpotlightStyle = {
  border: "1px solid #f0d48a",
  backgroundColor: "#fff8e6",
  borderRadius: "10px",
  padding: "16px 18px",
  marginBottom: "18px",
  display: "grid",
  gap: "10px",
};
const editorialSpotlightBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: "999px",
  backgroundColor: "#8a5a00",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "bold",
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
};
const editorialSpotlightMetaStyle = {
  color: "#8a5a00",
  fontSize: "12px",
  fontWeight: "bold",
  alignSelf: "center",
};
const editorialSpotlightHeadlineStyle = {
  color: "#6d4700",
  fontSize: "20px",
  margin: 0,
  fontWeight: "bold",
};
const editorialSpotlightTextStyle = {
  color: "#6b4f12",
  fontSize: "14px",
  lineHeight: "1.8",
  margin: 0,
};
const editorialOverrideNoteStyle = {
  color: "#8a5a00",
  fontSize: "12px",
  lineHeight: "1.7",
  margin: "8px 0 0 0",
};
const reviewComposerStyle = { border: "1px solid #dbe3f1", borderRadius: "8px", backgroundColor: "#f8fbff", padding: "18px", display: "grid", gap: "16px" };
const reviewComposerTitleStyle = { color: "#013473", fontSize: "18px", fontWeight: "bold", margin: 0 };
const reviewComposerTextStyle = { color: "#4f5b66", fontSize: "14px", lineHeight: "1.7", margin: 0 };
const reviewStarsPickerRowStyle = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" as const };
const reviewCurrentRatingStyle = { color: "#4b5563", fontSize: "13px", marginLeft: "6px" };
const reviewHelpPillStyle = { color: "#6b7280", backgroundColor: "#eef2f7", padding: "10px 14px", borderRadius: "999px", fontSize: "12px" };
const reviewCardStyle = { border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#ffffff", padding: "18px", display: "grid", gap: "12px" };
const reviewAuthorStyle = { color: "#013473", fontSize: "16px", fontWeight: "bold", margin: 0 };
const reviewLabelStyle = { color: "#6b7280", fontSize: "12px", margin: "4px 0 0 0" };
const reviewStarsStyle = { color: "#f59e0b", fontSize: "16px", margin: 0 };
const reviewDateStyle = { color: "#6b7280", fontSize: "12px", margin: "4px 0 0 0" };
const reviewCommentStyle = { color: "#374151", fontSize: "15px", lineHeight: "1.8", margin: 0 };

function feedbackStyle(isError: boolean) {
  return {
    padding: "14px 18px",
    borderRadius: "4px",
    backgroundColor: isError ? "#fdecea" : "#e8f5e9",
    color: isError ? "#b71c1c" : "#1b5e20",
    fontSize: "14px",
    marginBottom: "24px",
  };
}

function buildStarString(value: number) {
  return Array.from({ length: 5 }, (_item, index) => (value >= index + 1 ? "★" : "☆")).join("");
}

function reviewStarButtonStyle(active: boolean, disabled: boolean): CSSProperties {
  return {
    backgroundColor: "transparent",
    border: "none",
    color: active ? "#f59e0b" : "#c7ced6",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "28px",
    lineHeight: 1,
    padding: 0,
  };
}

function reviewTextareaStyle(disabled: boolean): CSSProperties {
  return {
    width: "100%",
    border: "1px solid #d4dce6",
    borderRadius: "8px",
    padding: "14px 16px",
    resize: "vertical",
    minHeight: "140px",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "15px",
    backgroundColor: disabled ? "#f3f4f6" : "#ffffff",
    color: "#1f2937",
    boxSizing: "border-box",
  };
}

function saveReviewButtonStyle(disabled: boolean): CSSProperties {
  return {
    backgroundColor: disabled ? "#97a6ba" : "#013473",
    color: "#ffffff",
    padding: "12px 18px",
    borderRadius: "6px",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "14px",
    fontFamily: "Georgia, 'Times New Roman', serif",
  };
}

function checkoutButtonStyle(disabled: boolean, owned: boolean) {
  return {
    backgroundColor: owned ? "#dfeaf7" : disabled ? "#94a3b8" : "#013473",
    color: owned ? "#013473" : "#ffffff",
    padding: "12px 18px",
    borderRadius: "4px",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "14px",
    fontFamily: "Georgia, 'Times New Roman', serif",
  };
}

const panelShortcutStyle = {
  color: "#013473",
  backgroundColor: "#eef2f7",
  padding: "12px 18px",
  borderRadius: "4px",
  fontSize: "14px",
  textDecoration: "none",
};

function purchaseFeedbackStyle(isError: boolean) {
  return {
    padding: "14px 16px",
    borderRadius: "6px",
    backgroundColor: isError ? "#fdecea" : "#edf8ef",
    color: isError ? "#b71c1c" : "#2E7D32",
    fontSize: "14px",
    lineHeight: "1.7",
    marginBottom: "14px",
  };
}
