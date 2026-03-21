"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties, FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import { buildAdminSectionChips } from "@/components/admin-section-chips";
import { SiteSectionHeader } from "@/components/site-section-header";
import {
  clearStoredToken,
  createWork,
  fetchMe,
  fetchMyAuthorProfile,
  fetchMyWork,
  getStoredToken,
  submitWorkForReview,
  uploadWorkAsset,
  updateWork,
  type AuthorProfile,
  type CreateWorkPayload,
  type Work,
} from "@/lib/api";

const MIN_WORK_PRICE_MXN = 10;
const MIN_SUGGESTED_PRICE_MXN = 35;
const MAX_SUGGESTED_PRICE_MXN = 180;
const TEMP_DRAFT_TITLE = "Borrador temporal";

type PublishAuthorProfile = AuthorProfile & {
  publishingCompliance?: {
    hasFiscalData: boolean;
    hasBankingData: boolean;
    canPublish: boolean;
    missingFields: string[];
  };
  payoutAccountData?: Record<string, unknown> | null;
  payoutMethod?: string | null;
  legalName?: string | null;
  curp?: string | null;
  dateOfBirth?: string | null;
};

type SuggestedPriceRange = {
  min: number;
  max: number;
  pageCount: number;
};

export default function Publicar() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Georgia, 'Times New Roman', serif", padding: "32px 40px" }}>Cargando editor...</main>}>
      <PublicarContent />
    </Suspense>
  );
}

function PublicarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workId = searchParams.get("workId");
  const [startedWithExistingWork] = useState(Boolean(workId));
  const isEditing = Boolean(workId);
  const isExistingEditFlow = startedWithExistingWork;
  const [authorProfile, setAuthorProfile] = useState<PublishAuthorProfile | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [currentWork, setCurrentWork] = useState<Work | null>(null);
  const activeWorkId = workId ?? currentWork?.id ?? null;
  const [selectedGenre, setSelectedGenre] = useState("");
  const [appliedGenres, setAppliedGenres] = useState<string[]>([]);
  const [form, setForm] = useState<CreateWorkPayload>({
    title: "",
    description: "",
    publicationType: "BOOK",
    metadata: {},
  });
  const [keywords, setKeywords] = useState<string[]>(["", "", "", "", "", ""]);
  const [pages, setPages] = useState("");
  const [price, setPrice] = useState("");
  const [suggestedPriceRange, setSuggestedPriceRange] = useState<SuggestedPriceRange | null>(null);
  const [language, setLanguage] = useState("Espanol");
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [uploadState, setUploadState] = useState<"idle" | "loading">("idle");
  const [uploadingAssetKind, setUploadingAssetKind] = useState<"cover" | "back-cover" | "manuscript" | null>(null);
  const [saveNotice, setSaveNotice] = useState<{
    type: "success" | "error";
    title: string;
    messages: string[];
  } | null>(null);
  const [showSubmitConfirmDialog, setShowSubmitConfirmDialog] = useState(false);
  const [showReviewConfirmDialog, setShowReviewConfirmDialog] = useState(false);
  const [showReviewSuccessDialog, setShowReviewSuccessDialog] = useState(false);
  const [showLogoutConfirmDialog, setShowLogoutConfirmDialog] = useState(false);
  const [reviewActionState, setReviewActionState] = useState<"idle" | "loading">("idle");
  const [reviewDialogMessage, setReviewDialogMessage] = useState("");
  const [assetMessages, setAssetMessages] = useState<
    Record<"cover" | "back-cover" | "manuscript", { type: "error" | "success"; text: string } | null>
  >({
    cover: null,
    "back-cover": null,
    manuscript: null,
  });

  useEffect(() => {
    async function loadPage() {
      const token = getStoredToken();
      if (!token) {
        setLoadState("error");
        setMessage("No hay sesion activa. Inicia sesion para publicar.");
        return;
      }

      try {
        const [, authorResponse] = await Promise.all([
          fetchMe(token),
          fetchMyAuthorProfile(token).catch(() => ({ authorProfile: null as AuthorProfile | null })),
        ]);
        setAuthorProfile((authorResponse.authorProfile as AuthorProfile | null) ?? null);

        if (workId) {
          const work = await fetchMyWork(token, workId);
          const metadata = work.metadata ?? {};

          setCurrentWork(work);
          setForm({
            title: work.title === TEMP_DRAFT_TITLE ? "" : work.title,
            description: work.description ?? "",
            publicationType: work.publicationType,
            metadata,
          });
          const metadataKeywords = Array.isArray(metadata.keywords)
            ? metadata.keywords
                .filter((item): item is string => typeof item === "string")
                .slice(0, 6)
            : [];
          setKeywords([...metadataKeywords, "", "", "", "", "", ""].slice(0, 6));
          setPages(
            typeof metadata.pageCount === "number" || typeof metadata.pageCount === "string"
              ? String(metadata.pageCount)
              : "",
          );
          setPrice(
            typeof metadata.price === "number" || typeof metadata.price === "string"
              ? String(metadata.price)
              : "",
          );
          setLanguage(typeof metadata.language === "string" ? metadata.language : "Espanol");
          const metadataGenres = Array.isArray(metadata.genres)
            ? metadata.genres.filter((item): item is string => typeof item === "string").slice(0, 3)
            : typeof metadata.genre === "string" && metadata.genre.trim().length > 0
              ? [metadata.genre]
              : [];
          setSelectedGenre(metadataGenres[0] ?? "");
          setAppliedGenres(metadataGenres);
        }

        setLoadState("ready");
      } catch (error) {
        clearStoredToken();
        setLoadState("error");
        setMessage(error instanceof Error ? error.message : "No fue posible cargar la sesion.");
      }
    }

    loadPage();
  }, [workId]);

  function buildWorkPayload(): CreateWorkPayload {
    const parsedPrice = Number(price.trim());
    const preservedMetadata =
      currentWork?.metadata && typeof currentWork.metadata === "object" && !Array.isArray(currentWork.metadata)
        ? { ...currentWork.metadata }
        : {};

    const metadata: Record<string, unknown> = {
      ...preservedMetadata,
      language,
      genre: appliedGenres[0] || null,
      genres: appliedGenres,
      price: Number.isFinite(parsedPrice) ? parsedPrice.toFixed(2) : null,
      pageCount: pages ? Number(pages) : null,
      keywords: keywords.map((item) => item.trim()).filter(Boolean),
    };

    return {
      title: form.title.trim() || TEMP_DRAFT_TITLE,
      description: form.description,
      publicationType: form.publicationType,
      metadata,
    };
  }

  function getRequiredCompletionErrors() {
    const errors: string[] = [];
    const normalizedTitle = form.title.trim();
    const normalizedDescription = (form.description ?? "").trim();
    const normalizedPages = pages.trim();
    const normalizedPrice = price.trim();
    const parsedPages = Number(normalizedPages);
    const parsedPrice = Number(normalizedPrice);

    if (!normalizedTitle) {
      errors.push("Captura el titulo de la obra.");
    }

    if (appliedGenres.length < 3) {
      const missingGenres = 3 - appliedGenres.length;
      errors.push(
        missingGenres === 1
          ? "Falta aplicar 1 genero obligatorio."
          : `Faltan aplicar ${missingGenres} generos obligatorios.`,
      );
    }

    if (!normalizedDescription) {
      errors.push("Captura la sinopsis de la obra.");
    }

    if (!normalizedPages || !Number.isFinite(parsedPages) || parsedPages <= 0) {
      errors.push("Indica un numero de paginas valido.");
    }

    if (!normalizedPrice) {
      errors.push("Indica el precio de venta en MXN.");
    } else if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      errors.push("El precio debe ser un numero mayor a 0.");
    } else if (parsedPrice < MIN_WORK_PRICE_MXN) {
      errors.push(`El precio minimo para checkout con Stripe en MXN es ${MIN_WORK_PRICE_MXN.toFixed(2)}.`);
    }

    return errors;
  }

  async function ensureDraftForUploads(token: string) {
    if (currentWork) {
      return currentWork;
    }

    const response = await createWork(token, buildWorkPayload());
    setCurrentWork(response.work);
    router.replace(`/publicar?workId=${response.work.id}`);
    router.refresh();
    return response.work;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const completionErrors = getRequiredCompletionErrors();
    const hasRequiredAssets = Boolean(currentWork?.assets.cover && currentWork?.assets.manuscript);

    if (completionErrors.length > 0 || !hasRequiredAssets) {
      const nextMessages = [...completionErrors];

      if (!currentWork?.assets.cover) {
        nextMessages.push("Sube la portada obligatoria.");
      }

      if (!currentWork?.assets.manuscript) {
        nextMessages.push("Sube el manuscrito obligatorio.");
      }

      setSubmitState("error");
      setMessage(nextMessages[0] ?? "Completa la informacion requerida antes de continuar.");
      setSaveNotice({
        type: "error",
        title: "Faltan datos por completar",
        messages: nextMessages,
      });
      return;
    }

    setShowSubmitConfirmDialog(true);
  }

  async function confirmSubmit() {
    const token = getStoredToken();

    if (!token) {
      setSubmitState("error");
      setMessage("Tu sesion expiro. Inicia sesion de nuevo.");
      setSaveNotice({
        type: "error",
        title: "No se pudieron guardar los cambios",
        messages: ["Tu sesion expiro. Inicia sesion de nuevo."],
      });
      setShowSubmitConfirmDialog(false);
      return;
    }

    setSubmitState("loading");
    setMessage("");

    try {
      const response = activeWorkId
        ? await updateWork(token, activeWorkId, buildWorkPayload())
        : await createWork(token, buildWorkPayload());

      setCurrentWork(response.work);
      setSubmitState("success");
      setMessage(
        isExistingEditFlow
          ? `${response.message} La obra quedo actualizada con estatus ${response.work.status}.`
          : `${response.message} La obra quedo creada con estatus ${response.work.status}.`,
      );
      setSaveNotice({
        type: "success",
        title: isExistingEditFlow ? "Cambios guardados correctamente" : "Obra creada correctamente",
        messages: [
          isExistingEditFlow
            ? `${response.message} La obra quedo actualizada con estatus ${response.work.status}.`
            : `${response.message} La obra quedo creada con estatus ${response.work.status}.`,
        ],
      });

      if (!activeWorkId) {
        router.replace(`/publicar?workId=${response.work.id}`);
        router.refresh();
      }
    } catch (error) {
      const nextMessage =
        error instanceof Error
          ? error.message
          : isEditing
            ? "No fue posible actualizar la obra."
            : "No fue posible crear la obra.";
      setSubmitState("error");
      setMessage(nextMessage);
      setSaveNotice({
        type: "error",
        title: "No se pudieron guardar los cambios",
        messages: [nextMessage],
      });
    } finally {
      setShowSubmitConfirmDialog(false);
    }
  }

  async function handleAssetUpload(
    kind: "cover" | "back-cover" | "manuscript",
    file: File | null,
  ) {
    const token = getStoredToken();

    if (!token || !file) {
      return;
    }

    setUploadState("loading");
    setUploadingAssetKind(kind);
    setMessage("");
    setAssetMessages((current) => ({ ...current, [kind]: null }));

    try {
      await validateAssetBeforeUpload(kind, file);
      const work = await ensureDraftForUploads(token);
      const response = await uploadWorkAsset(token, work.id, kind, file);
      setCurrentWork(response.work);
      setMessage(response.message);
      setAssetMessages((current) => ({
        ...current,
        [kind]: { type: "success", text: response.message },
      }));
    } catch (error) {
      const nextError =
        error instanceof Error ? error.message : "No fue posible cargar el archivo.";
      setMessage("");
      setAssetMessages((current) => ({
        ...current,
        [kind]: { type: "error", text: nextError },
      }));
    } finally {
      setUploadState("idle");
      setUploadingAssetKind(null);
    }
  }

  async function handleDownloadManuscript(workIdToDownload: string) {
    const token = getStoredToken();

    if (!token) {
      setMessage("Tu sesion expiro. Inicia sesion de nuevo.");
      return;
    }

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";

      const response = await fetch(`${apiBaseUrl}/works/${workIdToDownload}/assets/manuscript`, {
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
          : payload?.message ?? "No fue posible descargar el manuscrito.";
        throw new Error(nextMessage);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `obra-${workIdToDownload}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible descargar el manuscrito.");
    }
  }

  function requestSubmitForReview() {
    setReviewDialogMessage("");
    setShowReviewConfirmDialog(true);
  }

  async function confirmSubmitForReview() {
    const token = getStoredToken();

    if (!token || !currentWork) {
      setReviewDialogMessage("No hay una obra lista para enviar a revision.");
      setShowReviewConfirmDialog(false);
      return;
    }

    setReviewActionState("loading");
    setMessage("");

    try {
      const response = await submitWorkForReview(token, currentWork.id);
      setCurrentWork(response.work);
      setReviewDialogMessage(response.message);
      setShowReviewConfirmDialog(false);
      setShowReviewSuccessDialog(true);
    } catch (error) {
      setReviewDialogMessage(error instanceof Error ? error.message : "No fue posible enviar la obra a revision.");
      setShowReviewConfirmDialog(false);
    } finally {
      setReviewActionState("idle");
    }
  }

  function logout() {
    clearStoredToken();
    window.location.href = "/login";
  }

  function cancelSubmitConfirmation() {
    setShowSubmitConfirmDialog(false);
  }

  function cancelReviewConfirmation() {
    setShowReviewConfirmDialog(false);
    setReviewDialogMessage("");
  }

  function closeReviewSuccessDialog() {
    setShowReviewSuccessDialog(false);
    setReviewDialogMessage("");
  }

  function cancelLogout() {
    setShowLogoutConfirmDialog(false);
  }

  function estimateSuggestedPrice() {
    const parsedPages = Number(pages.trim());

    if (!Number.isFinite(parsedPages) || parsedPages <= 0) {
      setSuggestedPriceRange(null);
      return;
    }

    setSuggestedPriceRange(buildSuggestedPriceRange(parsedPages));
  }

  const canEstimateSuggestedPrice =
    pages.trim().length > 0 &&
    Number.isFinite(Number(pages.trim())) &&
    Number(pages.trim()) > 0;
  const requiredCompletionErrors = getRequiredCompletionErrors();
  const missingRequiredAssets = [
    currentWork?.assets.cover ? null : "Sube la portada obligatoria.",
    currentWork?.assets.manuscript ? null : "Sube el manuscrito obligatorio.",
  ].filter((item): item is string => Boolean(item));
  const hasRequiredAssets = missingRequiredAssets.length === 0;
  const isWorkEditable = !currentWork || currentWork.status === "DRAFT" || currentWork.status === "REJECTED";
  const publishingCompliance =
    authorProfile?.publishingCompliance ?? buildPublishingCompliance(authorProfile);
  const canCompleteCreation =
    loadState === "ready" &&
    isWorkEditable &&
    submitState !== "loading" &&
    uploadState !== "loading" &&
    requiredCompletionErrors.length === 0 &&
    hasRequiredAssets;
  const pendingCreationRequirements = [...requiredCompletionErrors, ...missingRequiredAssets];
  const canSubmitCurrentWorkForReview =
    Boolean(currentWork && currentWork.status === "DRAFT") &&
    canCompleteCreation &&
    submitState === "success" &&
    reviewActionState !== "loading";

  const availableGenres = [
    "Literatura y ficcion",
    "Relato corto",
    "Romance",
    "Erotica",
    "Ciencia ficcion y fantasia",
    "Mitologia",
    "Asian pop fiction",
    "Ficcion otaku",
    "Anime narrativa",
    "Juvenil",
    "Infantil",
    "Misterio, thriller y suspenso",
    "Crimen, investigacion",
    "Misterio psicologico",
    "Terror psicologico",
    "Terror perturbador",
    "Comics y novela grafica",
    "Arte y entretenimiento",
    "Cocina y gastronomia",
    "Salud, fitness y nutricion",
    "Deportes y aire libre",
    "Viajes",
    "Negocios e inversion",
    "Biografias y memorias",
    "Historia",
    "Politica y ciencias sociales",
    "Religion y espiritualidad",
    "Educacion y ensenanza",
    "Autoayuda",
  ];

  const assetRequirements = {
    cover: "JPG o PNG, maximo 5 MB, orientacion vertical, minimo flexible 625 x 1000 px. Ideal recomendado: 1000 x 1600 px, con proporcion vertical flexible cercana al estandar editorial.",
    "back-cover":
      "JPG o PNG, maximo 5 MB, orientacion vertical, minimo flexible 625 x 1000 px. La contraportada es opcional en esta etapa.",
    manuscript: "Solo PDF o ePub. No se aceptan DOC, DOCX, TXT u otros formatos.",
  } as const;

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <SiteSectionHeader
        title={isExistingEditFlow ? "Editar obra" : "Publicar obra"}
        activeNav="publicar"
        adminChips={buildAdminSectionChips("publicar")}
        chips={[
          { label: "Editor", href: "#editor" },
          { label: "Archivos", href: "#archivos" },
          { label: "Resumen", href: "#resumen" },
          { label: "Volver al panel", href: "/panel?refresh=1" },
        ]}
      />

      <section id="editor" style={{ padding: "22px 20px 36px" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: "16px", alignItems: "start" }}>
          <div style={{ display: "grid", gap: "16px" }}>
            {!publishingCompliance.canPublish ? (
              <div style={collaboratorWarningStyle}>
                <p style={collaboratorWarningEyebrowStyle}>Aviso importante</p>
                <h2 style={collaboratorWarningTitleStyle}>Para poder publicar, primero debes de completar tu perfil de colaborador en Mi panel</h2>
                <p style={collaboratorWarningTextStyle}>
                  Antes de enviar obras a revision debes completar tu perfil de colaborador y tus datos bancarios en{" "}
                  <Link href="/panel?refresh=1#perfil" style={collaboratorWarningLinkStyle}>
                    Mi panel
                  </Link>
                  .{" "}
                  <strong style={collaboratorWarningHighlightStyle}>
                    Esto solo afecta tu capacidad para publicar.
                  </strong>{" "}
                  Te faltan: {publishingCompliance.missingFields.join(", ")}.
                  <br />
                  <strong style={collaboratorWarningHighlightStyle}>
                    Mientras puedes seguir disfrutando de comprar y leer.
                  </strong>
                </p>
              </div>
            ) : null}

            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <h2 style={cardTitleStyle}>Paso 1 - Datos generales de la obra</h2>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: "16px 18px", display: "grid", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Titulo de la obra *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Escribe el titulo de tu libro"
                  required
                  disabled={!isWorkEditable}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Tipo de publicacion *</label>
                  <select
                    value={form.publicationType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        publicationType: event.target.value as CreateWorkPayload["publicationType"],
                      }))
                    }
                    disabled={!isWorkEditable}
                    style={inputStyle}
                  >
                    <option value="BOOK">Libro</option>
                    <option value="MAGAZINE">Revista</option>
                    <option value="ARTICLE">Articulo</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Idioma</label>
                  <select value={language} onChange={(event) => setLanguage(event.target.value)} disabled={!isWorkEditable} style={inputStyle}>
                    <option>Espanol</option>
                    <option>Ingles</option>
                    <option>Bilingue</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px", alignItems: "end" }}>
                <div>
                  <label style={labelStyle}>Genero</label>
                  <select
                    value={selectedGenre}
                    onChange={(event) => setSelectedGenre(event.target.value)}
                    disabled={!isWorkEditable}
                    style={inputStyle}
                  >
                    <option value="">Selecciona un genero</option>
                    {availableGenres.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedGenre) {
                      setMessage("Primero selecciona un genero y luego aplicalo.");
                      return;
                    }
                    if (appliedGenres.includes(selectedGenre)) {
                      setMessage(`Ese genero ya fue aplicado: ${selectedGenre}.`);
                      return;
                    }
                    if (appliedGenres.length >= 3) {
                      setMessage("Solo puedes aplicar hasta 3 generos por obra.");
                      return;
                    }
                    setAppliedGenres((current) => [...current, selectedGenre]);
                    setMessage(`Genero aplicado: ${selectedGenre}.`);
                  }}
                  disabled={!isWorkEditable || appliedGenres.length >= 3}
                  style={applyGenreButtonStyle(!isWorkEditable || appliedGenres.length >= 3)}
                >
                  Aplicar genero
                </button>
              </div>

              <div style={appliedGenreBoxStyle}>
                <p style={{ color: "#013473", fontSize: "13px", fontWeight: "bold", margin: "0 0 4px 0" }}>
                  Generos aplicados
                </p>
                {appliedGenres.length > 0 ? (
                  <div style={appliedGenresListStyle}>
                    {appliedGenres.map((genre) => (
                      <span key={genre} style={appliedGenreChipStyle}>
                        {genre}
                        <button
                          type="button"
                          onClick={() => {
                            setAppliedGenres((current) => current.filter((item) => item !== genre));
                            setMessage(`Genero retirado: ${genre}.`);
                          }}
                          style={removeGenreButtonStyle}
                        >
                          Quitar
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "#5f6368", fontSize: "13px", margin: 0 }}>
                    Todavia no has aplicado generos a esta obra.
                  </p>
                )}
                <p style={genreRequirementTextStyle(appliedGenres.length === 3)}>
                  {appliedGenres.length === 3
                    ? "Los 3 generos obligatorios ya fueron aplicados."
                    : appliedGenres.length === 2
                      ? "Debes aplicar 1 genero mas. Los 3 generos son obligatorios."
                      : appliedGenres.length === 1
                        ? "Debes aplicar 2 generos mas. Los 3 generos son obligatorios."
                        : "Debes aplicar 3 generos. Los 3 generos son obligatorios."}
                </p>
              </div>

              <div>
                <label style={labelStyle}>Sinopsis</label>
                <textarea
                  value={form.description ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Describe tu obra en un texto breve y claro"
                  rows={8}
                  disabled={!isWorkEditable}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <div>
                <label style={labelStyle}>Numero de paginas</label>
                <div style={pageEstimatorRowStyle}>
                  <div style={{ maxWidth: "320px", width: "100%" }}>
                    <input
                      type="number"
                      value={pages}
                      onChange={(event) => {
                        setPages(event.target.value);
                        setSuggestedPriceRange(null);
                      }}
                      placeholder="Ej. 120"
                      disabled={!isWorkEditable}
                      style={inputStyle}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={estimateSuggestedPrice}
                    disabled={!isWorkEditable || !canEstimateSuggestedPrice}
                    style={estimateButtonStyle(canEstimateSuggestedPrice)}
                  >
                    Estimar precio
                  </button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Precio de venta (MXN) *</label>
                <div style={priceRowStyle}>
                  <div style={{ maxWidth: "320px", width: "100%" }}>
                    <input
                      type="number"
                      min="10.00"
                      step="0.01"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      placeholder="Ej. 10.00"
                      required
                      disabled={!isWorkEditable}
                      style={inputStyle}
                    />
                  </div>
                  {suggestedPriceRange ? (
                    <div style={suggestedPriceBadgeStyle}>
                      <p style={suggestedPriceLabelStyle}>PRECIO SUGERIDO ENTRE:</p>
                      <p style={suggestedPriceValueStyle}>
                        $ {suggestedPriceRange.min.toFixed(2)} y ${suggestedPriceRange.max.toFixed(2)} MXP
                      </p>
                    </div>
                  ) : null}
                </div>
                <p style={{ color: "#666666", fontSize: "12px", margin: "8px 0 0 0", lineHeight: "1.7" }}>
                  Este es el precio que se usara en el checkout para la compra de la obra. Para pruebas con Stripe en MXN, usa al menos {MIN_WORK_PRICE_MXN.toFixed(2)}.
                </p>
              </div>

              <div>
                <label style={labelStyle}>Palabras o frases clave</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 36px" }}>
                  {keywords.map((keyword, index) => (
                    <input
                      key={`keyword-${index + 1}`}
                      type="text"
                      value={keyword}
                      onChange={(event) =>
                        setKeywords((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? event.target.value : item,
                          ),
                        )
                      }
                      placeholder={`Palabra clave ${index + 1}`}
                      disabled={!isWorkEditable}
                      style={inputStyle}
                    />
                  ))}
                </div>
              </div>

              <div style={{ borderTop: "1px solid #ececec", paddingTop: "20px", display: "grid", gap: "16px" }}>
                <div>
                  <h3 style={{ color: "#013473", fontSize: "16px", margin: "0 0 6px 0", fontFamily: "'Times New Roman', serif" }}>
                    Archivos de la obra
                  </h3>
                  <p style={{ color: "#666666", fontSize: "13px", margin: 0, lineHeight: "1.7" }}>
                    La portada, la contraportada y el manuscrito tambien entran a revision editorial. Puedes cargarlos en cualquier momento y el sistema los asociara automaticamente a tu borrador.
                  </p>
                </div>

                <div style={{ display: "grid", gap: "14px" }}>
                  {[
                    {
                      kind: "cover" as const,
                      label: "Portada",
                      accept: "image/png,image/jpeg",
                      current: currentWork?.assets.cover,
                    },
                    {
                      kind: "back-cover" as const,
                      label: "Contraportada",
                      accept: "image/png,image/jpeg",
                      current: currentWork?.assets.backCover,
                    },
                    {
                      kind: "manuscript" as const,
                      label: "Manuscrito",
                      accept: ".pdf,.epub,application/pdf,application/epub+zip",
                      current: currentWork?.assets.manuscript,
                    },
                  ].map((asset) => (
                    <div key={asset.kind} style={assetCardStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                        <div>
                          <p style={{ color: "#013473", fontSize: "14px", fontWeight: "bold", margin: "0 0 4px 0" }}>{asset.label}</p>
                          <p style={{ color: "#666666", fontSize: "13px", margin: 0 }}>
                            {asset.current ? `Archivo actual: ${asset.current.originalName}` : "Todavia no has cargado este archivo."}
                          </p>
                        </div>

                        {asset.current && asset.kind !== "manuscript" ? (
                          <Link
                            href={`/visor-archivo?url=${encodeURIComponent(asset.current.url)}&label=${encodeURIComponent(asset.label)}&type=image`}
                            style={assetLinkStyle}
                          >
                            Ver archivo
                          </Link>
                        ) : null}
                      </div>

                      {asset.current && asset.kind !== "manuscript" ? (
                        <div style={thumbnailWrapStyle}>
                          <img src={asset.current.url} alt={asset.label} style={thumbnailStyle} />
                        </div>
                      ) : null}

                      {asset.current && asset.kind === "manuscript" ? (
                        <div style={manuscriptPreviewStyle}>
                          <p style={{ color: "#013473", fontSize: "13px", fontWeight: "bold", margin: "0 0 4px 0" }}>
                            Manuscrito cargado
                          </p>
                          <p style={{ color: "#666666", fontSize: "12px", margin: 0 }}>
                            {asset.current.originalName}
                          </p>
                          {currentWork ? (
                            <button
                              type="button"
                              onClick={() => handleDownloadManuscript(currentWork.id)}
                              style={manuscriptActionButtonStyle}
                            >
                              Descargar manuscrito
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      {assetMessages[asset.kind] ? (
                        <div style={assetFeedbackStyle(assetMessages[asset.kind]!.type === "error")}>
                          {assetMessages[asset.kind]!.text}
                        </div>
                      ) : null}

                      <div style={filePickerWrapStyle}>
                        <label
                          htmlFor={`asset-upload-${asset.kind}`}
                          style={filePickerButtonStyle(loadState === "ready" && uploadState !== "loading" && isWorkEditable)}
                        >
                          {asset.kind === "cover"
                            ? "Seleccionar portada"
                            : asset.kind === "back-cover"
                              ? "Seleccionar contraportada"
                              : "Seleccionar manuscrito"}
                        </label>
                        <span style={filePickerHintStyle}>
                          {asset.current
                            ? `Archivo cargado: ${asset.current.originalName}`
                            : "Ningun archivo seleccionado"}
                        </span>
                        <input
                          id={`asset-upload-${asset.kind}`}
                          type="file"
                          accept={asset.accept}
                          disabled={loadState !== "ready" || uploadState === "loading" || !isWorkEditable}
                          onChange={(event) => {
                            const selectedFile = event.target.files?.[0] ?? null;
                            void handleAssetUpload(asset.kind, selectedFile);
                            event.currentTarget.value = "";
                          }}
                          style={hiddenFileInputStyle}
                        />
                      </div>

                      <p style={assetHintStyle}>{assetRequirements[asset.kind]}</p>

                      {!currentWork ? (
                        <p style={{ color: "#8a6d3b", fontSize: "12px", margin: 0 }}>
                          Puedes subir archivos desde ahora. Al cargar el primero, el sistema creara automaticamente tu borrador en segundo plano.
                        </p>
                      ) : uploadingAssetKind === asset.kind ? (
                        <p style={{ color: "#013473", fontSize: "12px", margin: 0 }}>Cargando archivo...</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {message ? <div style={feedbackStyle(submitState === "error" || loadState === "error")}>{message}</div> : null}

              <div style={footerActionsWrapStyle}>
                <Link href="/panel?refresh=1" style={{ color: "#013473", textDecoration: "none", fontSize: "14px" }}>
                  Volver al panel
                </Link>

                <div style={submitAreaStyle}>
                  <button
                    type="submit"
                    disabled={!canCompleteCreation}
                    style={primarySubmitButtonStyle(canCompleteCreation)}
                  >
                    {submitState === "loading"
                      ? isExistingEditFlow
                        ? "Guardando cambios..."
                        : "Creando y continuando..."
                      : isExistingEditFlow
                        ? "Guardar cambios"
                        : "Crear y continuar"}
                  </button>

                  {!isExistingEditFlow && pendingCreationRequirements.length > 0 ? (
                    <div style={pendingChecklistStyle}>
                      <p style={pendingChecklistTitleStyle}>
                        Falta completar para habilitar &quot;Crear y continuar&quot;:
                      </p>
                      <ul style={pendingChecklistListStyle}>
                        {pendingCreationRequirements.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {canSubmitCurrentWorkForReview ? (
                    <button
                      type="button"
                      onClick={requestSubmitForReview}
                      style={reviewSubmitButtonStyle}
                    >
                      Enviar a revision
                    </button>
                  ) : null}
                </div>
              </div>
              </form>
            </div>
          </div>

          <aside style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h3 style={cardTitleStyle}>Resumen de publicacion</h3>
            </div>

            <div style={{ padding: "18px 18px 20px", display: "grid", gap: "14px" }}>
              <div>
                <p style={summaryLabelStyle}>Estado</p>
                <p style={summaryValueStyle}>{currentWork?.status ?? "En captura"}</p>
              </div>

              <div>
                <p style={summaryLabelStyle}>Slug</p>
                <p style={summaryValueStyle}>{currentWork?.slug ?? "Pendiente"}</p>
              </div>

              <div>
                <p style={summaryLabelStyle}>Autor</p>
                <p style={summaryValueStyle}>{currentWork?.authorPublicName ?? "Se asigna desde tu perfil"}</p>
              </div>

              <div>
                <p style={summaryLabelStyle}>Generos</p>
                <p style={summaryValueStyle}>{appliedGenres.length > 0 ? appliedGenres.join(", ") : "Pendiente"}</p>
              </div>

              <div>
                <p style={summaryLabelStyle}>Precio</p>
                <p style={summaryValueStyle}>{price ? `MXN ${Number(price).toFixed(2)}` : "Pendiente"}</p>
              </div>

              <div>
                <p style={summaryLabelStyle}>Archivos cargados</p>
                <p style={summaryValueStyle}>
                  {currentWork
                    ? [
                        currentWork.assets.cover ? "portada" : null,
                        currentWork.assets.backCover ? "contraportada" : null,
                        currentWork.assets.manuscript ? "manuscrito" : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Ninguno todavia"
                    : "Aun no se han cargado archivos"}
                </p>
              </div>

              <div style={{ borderTop: "1px solid #e8e8e8", paddingTop: "18px" }}>
                <p style={{ color: "#013473", fontSize: "14px", fontWeight: "bold", margin: "0 0 10px 0" }}>Proximas etapas</p>
                <ul style={{ margin: 0, paddingLeft: "18px", color: "#444444", fontSize: "13px", lineHeight: "1.8" }}>
                  <li>{isExistingEditFlow ? "Guardar correcciones de la obra" : "Completar toda la informacion y archivos"}</li>
                  <li>Verificar portada, contraportada y manuscrito</li>
                  <li>Volver al panel</li>
                  <li>Enviar la obra a revision</li>
                  <li>Esperar aprobacion admin</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {saveNotice ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <p style={modalEyebrowStyle(saveNotice.type === "error")}>
              {saveNotice.type === "error" ? "Revision requerida" : "Operacion completada"}
            </p>
            <h3 style={modalTitleStyle}>{saveNotice.title}</h3>
            <div style={{ display: "grid", gap: "10px" }}>
              {saveNotice.messages.map((item, index) => (
                <p key={`${item}-${index}`} style={modalMessageStyle}>
                  {saveNotice.messages.length > 1 ? `${index + 1}. ` : ""}
                  {item}
                </p>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSaveNotice(null)}
                style={modalCloseButtonStyle(saveNotice.type === "error")}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showSubmitConfirmDialog ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <p style={modalEyebrowStyle(false)}>Confirmacion</p>
            <h3 style={modalTitleStyle}>
              {isExistingEditFlow ? "Confirmar guardado de cambios" : "Confirmar creacion y continuidad"}
            </h3>
            <p style={modalMessageStyle}>
              {isExistingEditFlow
                ? "Se guardaran los cambios de esta obra y se conservara el flujo actual de publicacion."
                : "Se guardara la obra con todos sus datos y archivos cargados para continuar con el flujo de publicacion."}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={confirmSubmit}
                style={modalCloseButtonStyle(false)}
              >
                {isExistingEditFlow ? "Si guardar cambios" : "Si crear y continuar"}
              </button>
              <button
                type="button"
                onClick={cancelSubmitConfirmation}
                style={secondaryModalButtonStyle}
              >
                No continuar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showReviewConfirmDialog ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <p style={modalEyebrowStyle(false)}>Confirmacion</p>
            <h3 style={modalTitleStyle}>Confirmar envio a revision</h3>
            <p style={modalMessageStyle}>
              La obra se enviara a revision editorial y dejara de estar disponible para edicion en este ciclo.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={confirmSubmitForReview}
                style={modalCloseButtonStyle(false)}
              >
                {reviewActionState === "loading" ? "Enviando..." : "Si enviar a revision"}
              </button>
              <button
                type="button"
                onClick={cancelReviewConfirmation}
                style={secondaryModalButtonStyle}
              >
                No enviar a revision
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showReviewSuccessDialog ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <p style={modalEyebrowStyle(false)}>Operacion completada</p>
            <h3 style={modalTitleStyle}>Obra enviada a revision</h3>
            <p style={modalMessageStyle}>
              {reviewDialogMessage || "La obra fue enviada correctamente a revision editorial."}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={closeReviewSuccessDialog}
                style={modalCloseButtonStyle(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showLogoutConfirmDialog ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <p style={modalEyebrowStyle(false)}>Confirmacion</p>
            <h3 style={modalTitleStyle}>Confirmar cierre de sesion</h3>
            <p style={modalMessageStyle}>
              Estas a punto de salir del flujo de publicacion y volver a la pantalla de acceso.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap" }}>
              <button type="button" onClick={logout} style={modalCloseButtonStyle(false)}>
                Si cerrar sesion
              </button>
              <button type="button" onClick={cancelLogout} style={secondaryModalButtonStyle}>
                No cerrar sesion
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

const cardStyle: CSSProperties = { backgroundColor: "#ffffff", borderRadius: "4px", overflow: "hidden" };
const cardHeaderStyle: CSSProperties = { padding: "14px 18px", borderBottom: "1px solid #e0e0e0" };
const cardTitleStyle: CSSProperties = { color: "#013473", fontSize: "16px", margin: 0, fontFamily: "'Times New Roman', serif" };
const collaboratorWarningStyle: CSSProperties = {
  backgroundColor: "#fff4f3",
  border: "1px solid #f1c9c6",
  borderRadius: "6px",
  padding: "14px 16px",
  display: "grid",
  gap: "10px",
};
const collaboratorWarningEyebrowStyle: CSSProperties = {
  color: "#b71c1c",
  fontSize: "12px",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  margin: 0,
};
const collaboratorWarningTitleStyle: CSSProperties = {
  color: "#a11b1b",
  fontSize: "22px",
  margin: 0,
  fontFamily: "'Times New Roman', serif",
};
const collaboratorWarningTextStyle: CSSProperties = {
  color: "#6f1d1b",
  fontSize: "13px",
  lineHeight: "1.65",
  margin: 0,
};
const collaboratorWarningHighlightStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: "bold",
  color: "#8a1414",
};
const collaboratorWarningLinkStyle: CSSProperties = {
  color: "#013473",
  fontWeight: "bold",
  textDecoration: "underline",
};
const labelStyle: CSSProperties = { display: "block", color: "#013473", fontSize: "12px", fontWeight: "bold", marginBottom: "5px" };
const inputStyle: CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "13px", fontFamily: "Georgia, serif", boxSizing: "border-box", backgroundColor: "#ffffff" };
const assetCardStyle: CSSProperties = { border: "1px solid #e6e6e6", borderRadius: "4px", padding: "10px 12px", display: "grid", gap: "9px", backgroundColor: "#fbfbfb" };
const assetLinkStyle: CSSProperties = { color: "#013473", fontSize: "13px", textDecoration: "none" };
const assetHintStyle: CSSProperties = { color: "#666666", fontSize: "12px", lineHeight: "1.7", margin: 0 };
const filePickerWrapStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" };
const filePickerHintStyle: CSSProperties = { color: "#5f6368", fontSize: "13px" };
const hiddenFileInputStyle: CSSProperties = { position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 };
const assetFeedbackStyle = (isError: boolean): CSSProperties => ({
  padding: "10px 12px",
  borderRadius: "4px",
  backgroundColor: isError ? "#fdecea" : "#e8f5e9",
  color: isError ? "#b71c1c" : "#1b5e20",
  fontSize: "12px",
  lineHeight: "1.6",
});
const thumbnailWrapStyle: CSSProperties = { border: "1px solid #e0e0e0", borderRadius: "4px", backgroundColor: "#ffffff", padding: "10px", width: "fit-content" };
const thumbnailStyle: CSSProperties = { width: "104px", height: "166px", objectFit: "cover", display: "block", borderRadius: "2px" };
const manuscriptPreviewStyle: CSSProperties = { border: "1px dashed #bfd7f1", borderRadius: "4px", backgroundColor: "#eef6ff", padding: "10px 12px" };
const manuscriptActionButtonStyle: CSSProperties = { marginTop: "10px", backgroundColor: "#013473", color: "#ffffff", border: "none", borderRadius: "4px", padding: "10px 12px", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "12px" };
const appliedGenreBoxStyle: CSSProperties = { border: "1px solid #d9e3ef", borderRadius: "4px", backgroundColor: "#f7fbff", padding: "12px 14px" };
const appliedGenresListStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "10px" };
const appliedGenreChipStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "999px", backgroundColor: "#e8f0fb", color: "#013473", fontSize: "12px", fontWeight: "bold" };
const removeGenreButtonStyle: CSSProperties = { border: "none", backgroundColor: "#c62828", color: "#ffffff", borderRadius: "999px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", fontFamily: "Georgia, serif" };
const pageEstimatorRowStyle: CSSProperties = { display: "flex", gap: "12px", alignItems: "end", flexWrap: "wrap" };
const priceRowStyle: CSSProperties = { display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" };
const suggestedPriceBadgeStyle: CSSProperties = { border: "1px solid #e4d6b1", borderRadius: "4px", backgroundColor: "#fff8e8", padding: "10px 14px", minWidth: "220px" };
const suggestedPriceLabelStyle: CSSProperties = { color: "#8b5e00", fontSize: "12px", fontWeight: "bold", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.04em" };
const suggestedPriceValueStyle: CSSProperties = { color: "#6a2f00", fontSize: "15px", fontWeight: "bold", margin: 0 };
const footerActionsWrapStyle: CSSProperties = { display: "grid", gap: "16px", justifyItems: "center", marginTop: "8px" };
const submitAreaStyle: CSSProperties = { width: "100%", display: "grid", gap: "12px", justifyItems: "center" };
const pendingChecklistStyle: CSSProperties = { width: "100%", maxWidth: "670px", border: "1px solid #d7dfe9", borderRadius: "4px", backgroundColor: "#f5f8fc", padding: "14px 16px", boxSizing: "border-box" };
const pendingChecklistTitleStyle: CSSProperties = { color: "#1d496d", fontSize: "13px", fontWeight: "bold", margin: "0 0 10px 0" };
const pendingChecklistListStyle: CSSProperties = { margin: 0, paddingLeft: "18px", color: "#374151", fontSize: "12px", lineHeight: "1.8" };
const reviewSubmitButtonStyle: CSSProperties = { width: "100%", maxWidth: "330px", backgroundColor: "#2e7d32", color: "#ffffff", padding: "11px 18px", border: "none", borderRadius: "4px", fontSize: "13px", cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: "bold", boxShadow: "0 10px 22px rgba(46, 125, 50, 0.2)" };
const summaryLabelStyle: CSSProperties = { color: "#93908B", fontSize: "12px", margin: "0 0 4px 0" };
const summaryValueStyle: CSSProperties = { color: "#013473", fontSize: "15px", fontWeight: "bold", margin: 0 };
const modalOverlayStyle: CSSProperties = { position: "fixed", inset: 0, backgroundColor: "rgba(1, 22, 45, 0.58)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", zIndex: 1000 };
const modalCardStyle: CSSProperties = { width: "100%", maxWidth: "560px", backgroundColor: "#ffffff", borderRadius: "8px", padding: "24px 26px", boxShadow: "0 18px 50px rgba(0, 0, 0, 0.18)", display: "grid", gap: "14px" };
const modalEyebrowStyle = (isError: boolean): CSSProperties => ({ color: isError ? "#b71c1c" : "#1b5e20", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 });
const modalTitleStyle: CSSProperties = { color: "#013473", fontSize: "24px", margin: 0, fontFamily: "'Times New Roman', serif" };
const modalMessageStyle: CSSProperties = { color: "#444444", fontSize: "14px", lineHeight: "1.8", margin: 0 };
const modalCloseButtonStyle = (isError: boolean): CSSProperties => ({ backgroundColor: isError ? "#b71c1c" : "#013473", color: "#ffffff", border: "none", borderRadius: "4px", padding: "12px 18px", cursor: "pointer", fontFamily: "Georgia, serif" });
const secondaryModalButtonStyle: CSSProperties = { backgroundColor: "#f3f4f6", color: "#1f2937", border: "1px solid #d1d5db", borderRadius: "4px", padding: "12px 18px", cursor: "pointer", fontFamily: "Georgia, serif" };
function estimateButtonStyle(enabled: boolean): CSSProperties {
  return {
    backgroundColor: enabled ? "#013473" : "#d8dde5",
    color: enabled ? "#ffffff" : "#68717d",
    border: "none",
    borderRadius: "4px",
    padding: "12px 18px",
    cursor: enabled ? "pointer" : "not-allowed",
    fontFamily: "Georgia, serif",
    minWidth: "170px",
    whiteSpace: "nowrap",
  };
}

function filePickerButtonStyle(enabled: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "190px",
    padding: "12px 18px",
    borderRadius: "4px",
    border: "1px solid #013473",
    backgroundColor: enabled ? "#013473" : "#b9c4d6",
    color: "#ffffff",
    cursor: enabled ? "pointer" : "not-allowed",
    fontFamily: "Georgia, serif",
    fontSize: "14px",
    fontWeight: "bold",
    boxSizing: "border-box",
  };
}

function applyGenreButtonStyle(disabled: boolean): CSSProperties {
  return {
    backgroundColor: disabled ? "#b9c4d6" : "#013473",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    padding: "12px 16px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "Georgia, serif",
    whiteSpace: "nowrap",
  };
}

function primarySubmitButtonStyle(enabled: boolean): CSSProperties {
  return {
    width: "100%",
    maxWidth: "370px",
    backgroundColor: enabled ? "#0d4f9a" : "#6f82a3",
    color: "#ffffff",
    padding: "15px 28px",
    border: "none",
    borderRadius: "4px",
    fontSize: "15px",
    cursor: enabled ? "pointer" : "not-allowed",
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
    boxShadow: enabled ? "0 10px 22px rgba(13, 79, 154, 0.22)" : "none",
    transition: "background-color 160ms ease, box-shadow 160ms ease",
  };
}

function genreRequirementTextStyle(isComplete: boolean): CSSProperties {
  return {
    color: isComplete ? "#1b5e20" : "#8b2d2d",
    fontSize: "12px",
    margin: "10px 0 0 0",
    fontWeight: isComplete ? "bold" : "normal",
  };
}

function feedbackStyle(isError: boolean): CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: "4px",
    backgroundColor: isError ? "#fdecea" : "#e8f5e9",
    color: isError ? "#b71c1c" : "#1b5e20",
    fontSize: "13px",
    lineHeight: "1.6",
  };
}

function roundToNearestFive(value: number) {
  return Math.round(value / 5) * 5;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildSuggestedPriceRange(pageCount: number): SuggestedPriceRange {
  const normalizedPageCount = Math.max(1, Math.round(pageCount));
  let minPerPage = 0.15;
  let maxPerPage = 0.25;

  // Referencia exploratoria basada en ebooks vigentes con paginas visibles en Google Play Books,
  // ajustada con un piso comercial local para obras muy cortas.
  if (normalizedPageCount <= 80) {
    minPerPage = 0.7;
    maxPerPage = 1.0;
  } else if (normalizedPageCount <= 180) {
    minPerPage = 0.4;
    maxPerPage = 0.65;
  } else if (normalizedPageCount <= 320) {
    minPerPage = 0.28;
    maxPerPage = 0.45;
  } else if (normalizedPageCount <= 500) {
    minPerPage = 0.18;
    maxPerPage = 0.32;
  }

  const rawMin = normalizedPageCount * minPerPage;
  const rawMax = normalizedPageCount * maxPerPage;
  const suggestedMin = clamp(
    roundToNearestFive(Math.max(MIN_SUGGESTED_PRICE_MXN, rawMin)),
    MIN_SUGGESTED_PRICE_MXN,
    MAX_SUGGESTED_PRICE_MXN,
  );
  const suggestedMax = clamp(
    roundToNearestFive(Math.max(suggestedMin + 10, Math.max(70, rawMax))),
    suggestedMin + 10,
    MAX_SUGGESTED_PRICE_MXN,
  );

  return {
    min: suggestedMin,
    max: suggestedMax,
    pageCount: normalizedPageCount,
  };
}

function readImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({ width: image.width, height: image.height });
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No fue posible leer la imagen seleccionada."));
    };

    image.src = objectUrl;
  });
}

async function validateAssetBeforeUpload(
  kind: "cover" | "back-cover" | "manuscript",
  file: File,
) {
  if (kind === "manuscript") {
    const allowedMimeTypes = ["application/pdf", "application/epub+zip"];
    const allowedExtensions = [".pdf", ".epub"];
    const lowerName = file.name.toLowerCase();

    if (
      !allowedMimeTypes.includes(file.type) &&
      !allowedExtensions.some((extension) => lowerName.endsWith(extension))
    ) {
      throw new Error("El manuscrito solo puede subirse en formato PDF o ePub.");
    }

    return;
  }

  const allowedImageMimeTypes = ["image/jpeg", "image/png"];
  if (!allowedImageMimeTypes.includes(file.type)) {
    throw new Error("Portada y contraportada solo aceptan archivos JPG o PNG.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Portada y contraportada no deben exceder 5 MB.");
  }

  const { width, height } = await readImageDimensions(file);

  if (width < 625 || height < 1000) {
    throw new Error("La imagen debe medir al menos 625 x 1000 px. Lo ideal es 1000 x 1600 px o mas.");
  }

  if (height <= width) {
    throw new Error("La imagen debe tener orientacion vertical.");
  }

  const aspectRatio = height / width;
  if (aspectRatio < 1.35 || aspectRatio > 1.9) {
    throw new Error("La imagen debe mantener una proporcion vertical razonable para portada editorial.");
  }
}

function buildPublishingCompliance(authorProfile: PublishAuthorProfile | null) {
  const payoutAccountData =
    authorProfile && typeof authorProfile.payoutAccountData === "object" && authorProfile.payoutAccountData
      ? (authorProfile.payoutAccountData as Record<string, unknown>)
      : {};

  const legalName = typeof authorProfile?.legalName === "string" ? authorProfile.legalName.trim() : "";
  const curp = typeof authorProfile?.curp === "string" ? authorProfile.curp.trim().toUpperCase() : "";
  const dateOfBirth = normalizeDateInputValue(authorProfile?.dateOfBirth);
  const payoutMethod =
    typeof authorProfile?.payoutMethod === "string" ? authorProfile.payoutMethod.trim() : "";
  const accountHolder =
    typeof payoutAccountData.accountHolder === "string" ? payoutAccountData.accountHolder.trim() : "";
  const bankName = typeof payoutAccountData.bankName === "string" ? payoutAccountData.bankName.trim() : "";
  const clabe = typeof payoutAccountData.clabe === "string" ? payoutAccountData.clabe.trim() : "";
  const missingFields: string[] = [];

  if (!legalName) {
    missingFields.push("nombre o razon social");
  }

  if (!/^[A-Z]{4}[0-9]{6}[A-Z0-9]{8}$/.test(curp)) {
    missingFields.push("CURP");
  }

  if (!dateOfBirth) {
    missingFields.push("fecha de nacimiento");
  }

  if (!payoutMethod) {
    missingFields.push("metodo de pago");
  }

  if (!accountHolder) {
    missingFields.push("titular bancario");
  }

  if (!bankName) {
    missingFields.push("banco");
  }

  if (!/^[0-9]{18}$/.test(clabe)) {
    missingFields.push("CLABE valida de 18 digitos");
  }

  const hasFiscalData = Boolean(legalName) && /^[A-Z]{4}[0-9]{6}[A-Z0-9]{8}$/.test(curp) && Boolean(dateOfBirth);
  const hasBankingData = Boolean(payoutMethod) && Boolean(accountHolder) && Boolean(bankName) && /^[0-9]{18}$/.test(clabe);

  return {
    hasFiscalData,
    hasBankingData,
    canPublish: hasFiscalData && hasBankingData,
    missingFields,
  };
}

function normalizeDateInputValue(value: unknown) {
  if (!value) {
    return "";
  }

  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}
