"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { SectionPageFrame, SectionSidebarCard } from "@/components/section-page-frame";
import { buildAdminSectionChips } from "@/components/admin-section-chips";
import { SiteSectionHeader } from "@/components/site-section-header";
import { AdminPrimaryAdminChangeCard } from "@/components/admin-primary-admin-change-card";
import {
  approveWork,
  cancelWorkPublication,
  clearStoredToken,
  fetchAuthorApplications,
  fetchModerationWorks,
  fetchMe,
  fetchUsers,
  getStoredToken,
  publishWork,
  rejectAuthorApplication,
  rejectWork,
  upsertWorkEditorialLayer,
  type AuthorProfile,
  type AuthUser,
  type Work,
} from "@/lib/api";

type AdminPendingAction =
  | { type: "schedule-payout"; id: string; label: string; text: string }
  | { type: "mark-payout-paid"; id: string; label: string; text: string }
  | { type: "fail-payout"; id: string; label: string; text: string }
  | { type: "retry-payout"; id: string; label: string; text: string }
  | { type: "cancel-payout"; id: string; label: string; text: string }
  | { type: "approve-author"; id: string; label: string; text: string }
  | { type: "reject-author"; id: string; label: string; text: string }
  | { type: "approve-work"; id: string; label: string; text: string }
  | { type: "reject-work"; id: string; label: string; text: string }
  | { type: "publish-work"; id: string; label: string; text: string }
  | { type: "logout"; label: string; text: string };

type AdminPayoutRequest = {
  id: string;
  status: string;
  grossAmount: string;
  commissionAmount: string;
  netAmount: string;
  currency: string;
  requestedAt: string;
  scheduledFor: string | null;
  paidAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  providerReference: string | null;
  notes: string | null;
  publicName?: string | null;
  userEmail?: string | null;
  cycleScheduledFor?: string | null;
  isEligibleForCurrentFridayWindow?: boolean;
};

type AdminRoyaltySummary = {
  confirmedSalesCount: number;
  confirmedUnits: number;
  grossSalesAmount: string;
  royaltyGeneratedAmount: string;
  reservedRoyaltyAmount: string;
  paidRoyaltyAmount: string;
  paidNetAmount: string;
  availableRoyaltyAmount: string;
  lastSaleAt: string | null;
  lastPayoutAt: string | null;
  recentSales: Array<{
    purchaseId: string;
    workTitle: string;
    soldAt: string;
    unitPrice: string;
    royaltyAmount: string;
    buyerEmail: string | null;
  }>;
};

type AdminBankValidationAttempt = {
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

type AdminCollaboratorProfile = {
  id: string;
  publicName: string;
  authorProfileType: "CERTIFIED" | "ANONYMOUS";
  applicationStatus: "IN_REVIEW" | "APPROVED" | "REJECTED";
  legalName: string | null;
  curp: string | null;
  dateOfBirth: string | null;
  bankValidationStatus: string | null;
  bankValidationReference: string | null;
  bankValidationRequestedAt: string | null;
  bankValidationNotes: string | null;
  bankValidatedAt: string | null;
  latestBankValidationAttempt: AdminBankValidationAttempt | null;
  royaltiesSummary: AdminRoyaltySummary;
};

type AdminSocio = AuthUser & {
  collaboratorProfile: AdminCollaboratorProfile | null;
};

export default function AdminPanel() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [socios, setSocios] = useState<AdminSocio[]>([]);
  const [applications, setApplications] = useState<AuthorProfile[]>([]);
  const [reviewWorks, setReviewWorks] = useState<Work[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<AdminPayoutRequest[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [authorRejections, setAuthorRejections] = useState<Record<string, string>>({});
  const [workRejections, setWorkRejections] = useState<Record<string, string>>({});
  const [workResubmitDates, setWorkResubmitDates] = useState<Record<string, string>>({});
  const [workApprovalNotes, setWorkApprovalNotes] = useState<Record<string, string>>({});
  const [editorialBadgeTexts, setEditorialBadgeTexts] = useState<Record<string, string>>({});
  const [editorialHeadlines, setEditorialHeadlines] = useState<Record<string, string>>({});
  const [editorialReviewNotes, setEditorialReviewNotes] = useState<Record<string, string>>({});
  const [editorialVisibleRatings, setEditorialVisibleRatings] = useState<Record<string, string>>({});
  const [payoutAdminNotes, setPayoutAdminNotes] = useState<Record<string, string>>({});
  const [actionId, setActionId] = useState<string | null>(null);
  const [pendingRemovalWork, setPendingRemovalWork] = useState<Work | null>(null);
  const [showRemovalWarning, setShowRemovalWarning] = useState(false);
  const [showRemovalConfirm, setShowRemovalConfirm] = useState(false);
  const [removalReason, setRemovalReason] = useState("");
  const [pendingAction, setPendingAction] = useState<AdminPendingAction | null>(null);
  const [showActionConfirmDialog, setShowActionConfirmDialog] = useState(false);
  const [showActionSuccessDialog, setShowActionSuccessDialog] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");

  useEffect(() => {
    async function loadAdminData() {
      const token = getStoredToken();

      if (!token) {
        setLoadState("error");
        setMessage("No hay sesion activa para acceder al panel administrativo.");
        return;
      }

      try {
        const me = await fetchMe(token);

        if (!me.roles.includes("ADMIN") && !me.roles.includes("ADMIN_02")) {
          throw new Error("Tu cuenta no tiene permisos administrativos.");
        }

        const apiBaseUrl =
          process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";
        const [applicationsResponse, reviewWorksResponse, usersResponse, payoutResponse] = await Promise.all([
          fetchAuthorApplications(token),
          fetchModerationWorks(token),
          fetchUsers(token),
          fetch(`${apiBaseUrl}/admin/royalties/payout-requests`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
        ]);
        const payoutPayload = (await payoutResponse.json().catch(() => null)) as
          | { items?: AdminPayoutRequest[] }
          | null;

        setUser(me);
        setSocios(
          usersResponse.items.filter((item) => !item.roles.includes("ADMIN") && !item.roles.includes("ADMIN_02")) as AdminSocio[],
        );
        setApplications(applicationsResponse.items);
        setReviewWorks(reviewWorksResponse.items);
        setPayoutRequests(Array.isArray(payoutPayload?.items) ? payoutPayload.items : []);
        setLoadState("ready");
      } catch (error) {
        setLoadState("error");
        setMessage(error instanceof Error ? error.message : "No fue posible cargar el panel admin.");
      }
    }

    loadAdminData();
  }, []);

  async function refreshAdminData() {
    const token = getStoredToken();
    if (!token) {
      return;
    }

    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";
    const [applicationsResponse, reviewWorksResponse, usersResponse, payoutResponse] = await Promise.all([
      fetchAuthorApplications(token),
      fetchModerationWorks(token),
      fetchUsers(token),
      fetch(`${apiBaseUrl}/admin/royalties/payout-requests`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
    ]);
    const payoutPayload = (await payoutResponse.json().catch(() => null)) as
      | { items?: AdminPayoutRequest[] }
      | null;

    setSocios(
      usersResponse.items.filter((item) => !item.roles.includes("ADMIN") && !item.roles.includes("ADMIN_02")) as AdminSocio[],
    );
    setApplications(applicationsResponse.items);
    setReviewWorks(reviewWorksResponse.items);
    setPayoutRequests(Array.isArray(payoutPayload?.items) ? payoutPayload.items : []);
  }

  function requestSchedulePayout(payoutRequest: AdminPayoutRequest) {
    setPendingAction({
      type: "schedule-payout",
      id: payoutRequest.id,
      label: "Si programar pago",
      text: `La solicitud de ${payoutRequest.publicName ?? payoutRequest.userEmail ?? "este socio"} quedara programada para el viernes operativo correspondiente.`,
    });
    setShowActionConfirmDialog(true);
  }

  function requestMarkPayoutPaid(payoutRequest: AdminPayoutRequest) {
    setPendingAction({
      type: "mark-payout-paid",
      id: payoutRequest.id,
      label: "Si marcar como pagado",
      text: `La solicitud de ${payoutRequest.publicName ?? payoutRequest.userEmail ?? "este socio"} se marcara como pagada. Esta accion solo debe ejecutarse el viernes despues de las 12:00 horas.`,
    });
    setShowActionConfirmDialog(true);
  }

  function requestFailPayout(payoutRequest: AdminPayoutRequest) {
    setPendingAction({
      type: "fail-payout",
      id: payoutRequest.id,
      label: "Si marcar como fallido",
      text: `La solicitud de ${payoutRequest.publicName ?? payoutRequest.userEmail ?? "este socio"} se marcara como fallida para permitir un reintento posterior.`,
    });
    setShowActionConfirmDialog(true);
  }

  function requestRetryPayout(payoutRequest: AdminPayoutRequest) {
    setPendingAction({
      type: "retry-payout",
      id: payoutRequest.id,
      label: "Si reintentar pago",
      text: `La solicitud fallida de ${payoutRequest.publicName ?? payoutRequest.userEmail ?? "este socio"} sera reprogramada para un nuevo ciclo de pago.`,
    });
    setShowActionConfirmDialog(true);
  }

  function requestCancelPayout(payoutRequest: AdminPayoutRequest) {
    setPendingAction({
      type: "cancel-payout",
      id: payoutRequest.id,
      label: "Si cancelar solicitud",
      text: `La solicitud de ${payoutRequest.publicName ?? payoutRequest.userEmail ?? "este socio"} se cancelara y el monto volvera a quedar disponible para un futuro retiro.`,
    });
    setShowActionConfirmDialog(true);
  }

  async function schedulePayoutRequest(payoutRequestId: string) {
    const token = getStoredToken();
    if (!token) {
      setMessage("La sesion expiro.");
      setShowActionConfirmDialog(false);
      return;
    }

    setActionId(payoutRequestId);
    setMessage("");

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";
      const response = await fetch(
        `${apiBaseUrl}/admin/royalties/payout-requests/${payoutRequestId}/schedule`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notes: payoutAdminNotes[payoutRequestId]?.trim() || undefined,
          }),
          cache: "no-store",
        },
      );
      const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
      const nextMessage = Array.isArray(payload?.message)
        ? payload.message.join(" ")
        : payload?.message ?? "No fue posible programar la solicitud de pago.";

      if (!response.ok) {
        throw new Error(nextMessage);
      }

      await refreshAdminData();
      setActionSuccessMessage(nextMessage);
      setShowActionConfirmDialog(false);
      setShowActionSuccessDialog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible programar la solicitud de pago.");
      setShowActionConfirmDialog(false);
    } finally {
      setActionId(null);
    }
  }

  async function markPayoutRequestPaid(payoutRequestId: string) {
    const token = getStoredToken();
    if (!token) {
      setMessage("La sesion expiro.");
      setShowActionConfirmDialog(false);
      return;
    }

    setActionId(payoutRequestId);
    setMessage("");

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";
      const response = await fetch(
        `${apiBaseUrl}/admin/royalties/payout-requests/${payoutRequestId}/mark-paid`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notes: payoutAdminNotes[payoutRequestId]?.trim() || undefined,
          }),
          cache: "no-store",
        },
      );
      const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
      const nextMessage = Array.isArray(payload?.message)
        ? payload.message.join(" ")
        : payload?.message ?? "No fue posible marcar la solicitud como pagada.";

      if (!response.ok) {
        throw new Error(nextMessage);
      }

      await refreshAdminData();
      setActionSuccessMessage(nextMessage);
      setShowActionConfirmDialog(false);
      setShowActionSuccessDialog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible marcar la solicitud como pagada.");
      setShowActionConfirmDialog(false);
    } finally {
      setActionId(null);
    }
  }

  async function failPayoutRequest(payoutRequestId: string) {
    const token = getStoredToken();
    if (!token) {
      setMessage("La sesion expiro.");
      setShowActionConfirmDialog(false);
      return;
    }

    setActionId(payoutRequestId);
    setMessage("");

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";
      const response = await fetch(
        `${apiBaseUrl}/admin/royalties/payout-requests/${payoutRequestId}/fail`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notes: payoutAdminNotes[payoutRequestId]?.trim() || undefined,
          }),
          cache: "no-store",
        },
      );
      const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
      const nextMessage = Array.isArray(payload?.message)
        ? payload.message.join(" ")
        : payload?.message ?? "No fue posible marcar la solicitud como fallida.";

      if (!response.ok) {
        throw new Error(nextMessage);
      }

      await refreshAdminData();
      setActionSuccessMessage(nextMessage);
      setShowActionConfirmDialog(false);
      setShowActionSuccessDialog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible marcar la solicitud como fallida.");
      setShowActionConfirmDialog(false);
    } finally {
      setActionId(null);
    }
  }

  async function retryPayoutRequest(payoutRequestId: string) {
    const token = getStoredToken();
    if (!token) {
      setMessage("La sesion expiro.");
      setShowActionConfirmDialog(false);
      return;
    }

    setActionId(payoutRequestId);
    setMessage("");

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";
      const response = await fetch(
        `${apiBaseUrl}/admin/royalties/payout-requests/${payoutRequestId}/retry`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notes: payoutAdminNotes[payoutRequestId]?.trim() || undefined,
          }),
          cache: "no-store",
        },
      );
      const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
      const nextMessage = Array.isArray(payload?.message)
        ? payload.message.join(" ")
        : payload?.message ?? "No fue posible reintentar la solicitud.";

      if (!response.ok) {
        throw new Error(nextMessage);
      }

      await refreshAdminData();
      setActionSuccessMessage(nextMessage);
      setShowActionConfirmDialog(false);
      setShowActionSuccessDialog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible reintentar la solicitud.");
      setShowActionConfirmDialog(false);
    } finally {
      setActionId(null);
    }
  }

  async function cancelPayoutRequest(payoutRequestId: string) {
    const token = getStoredToken();
    if (!token) {
      setMessage("La sesion expiro.");
      setShowActionConfirmDialog(false);
      return;
    }

    setActionId(payoutRequestId);
    setMessage("");

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";
      const response = await fetch(
        `${apiBaseUrl}/admin/royalties/payout-requests/${payoutRequestId}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notes: payoutAdminNotes[payoutRequestId]?.trim() || undefined,
          }),
          cache: "no-store",
        },
      );
      const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
      const nextMessage = Array.isArray(payload?.message)
        ? payload.message.join(" ")
        : payload?.message ?? "No fue posible cancelar la solicitud de pago.";

      if (!response.ok) {
        throw new Error(nextMessage);
      }

      await refreshAdminData();
      setActionSuccessMessage(nextMessage);
      setShowActionConfirmDialog(false);
      setShowActionSuccessDialog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible cancelar la solicitud de pago.");
      setShowActionConfirmDialog(false);
    } finally {
      setActionId(null);
    }
  }

  async function approve(authorProfileId: string) {
    setPendingAction({
      type: "approve-author",
      id: authorProfileId,
      label: "Si aprobar pendiente",
      text: "Este pendiente legado se aprobara manualmente para dejar regularizado el perfil del colaborador.",
    });
    setShowActionConfirmDialog(true);
  }

  async function confirmApprove(authorProfileId: string) {
    const token = getStoredToken();
    if (!token) {
      setMessage("La sesion expiro.");
      setShowActionConfirmDialog(false);
      return;
    }

    setActionId(authorProfileId);
    setMessage("");

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";

      const response = await fetch(`${apiBaseUrl}/admin/authors/${authorProfileId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
        const nextMessage = Array.isArray(payload?.message)
          ? payload.message.join(" ")
          : payload?.message ?? "No fue posible aprobar la solicitud.";
        throw new Error(nextMessage);
      }

      await refreshAdminData();
      setActionSuccessMessage("Pendiente legado aprobado correctamente.");
      setShowActionConfirmDialog(false);
      setShowActionSuccessDialog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible aprobar la solicitud.");
      setShowActionConfirmDialog(false);
    } finally {
      setActionId(null);
    }
  }

  async function reject(authorProfileId: string) {
    const rejectionReason = authorRejections[authorProfileId]?.trim() || "";

    if (!rejectionReason) {
      setMessage("Para rechazar este pendiente legado debes escribir el motivo de rechazo.");
      return;
    }

    setPendingAction({
      type: "reject-author",
      id: authorProfileId,
      label: "Si rechazar pendiente",
      text: "Este pendiente legado se rechazara con el motivo capturado.",
    });
    setShowActionConfirmDialog(true);
  }

  async function confirmReject(authorProfileId: string) {
    const token = getStoredToken();
    if (!token) {
      setMessage("La sesion expiro.");
      setShowActionConfirmDialog(false);
      return;
    }

    setActionId(authorProfileId);
    setMessage("");

    try {
      await rejectAuthorApplication(
        token,
        authorProfileId,
        authorRejections[authorProfileId] || "Solicitud rechazada por revision administrativa.",
      );
      await refreshAdminData();
      setActionSuccessMessage("Pendiente legado rechazado correctamente.");
      setShowActionConfirmDialog(false);
      setShowActionSuccessDialog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible rechazar la solicitud.");
      setShowActionConfirmDialog(false);
    } finally {
      setActionId(null);
    }
  }

  async function approveEditorialWork(workId: string) {
    setPendingAction({
      type: "approve-work",
      id: workId,
      label: "Si aprobar obra",
      text: "La obra seleccionada sera aprobada editorialmente y quedara lista para publicacion.",
    });
    setShowActionConfirmDialog(true);
  }

  async function confirmApproveEditorialWork(workId: string) {
    const token = getStoredToken();
    if (!token) {
      setMessage("La sesion expiro.");
      setShowActionConfirmDialog(false);
      return;
    }

    setActionId(workId);
    setMessage("");

    try {
      await approveWork(token, workId, workApprovalNotes[workId]?.trim() || undefined);
      await refreshAdminData();
      setActionSuccessMessage("Obra aprobada correctamente.");
      setShowActionConfirmDialog(false);
      setShowActionSuccessDialog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible aprobar la obra.");
      setShowActionConfirmDialog(false);
    } finally {
      setActionId(null);
    }
  }

  async function rejectEditorialWork(workId: string) {
    const rejectionReason = workRejections[workId]?.trim() || "";
    const resubmitDate = workResubmitDates[workId] || "";

    if (!rejectionReason) {
      setMessage("Para rechazar una obra debes escribir el motivo de rechazo.");
      return;
    }

    if (!resubmitDate) {
      setMessage("Para rechazar una obra debes indicar desde cuando podra volver a enviarse a revision.");
      return;
    }

    setPendingAction({
      type: "reject-work",
      id: workId,
      label: "Si rechazar obra",
      text: "La obra seleccionada sera rechazada y se guardaran el motivo y la fecha de nueva revision capturados.",
    });
    setShowActionConfirmDialog(true);
  }

  async function confirmRejectEditorialWork(workId: string) {
    const token = getStoredToken();
    if (!token) {
      setMessage("La sesion expiro.");
      setShowActionConfirmDialog(false);
      return;
    }

    const rejectionReason = workRejections[workId]?.trim() || "";
    const resubmitDate = workResubmitDates[workId] || "";

    if (!rejectionReason) {
      setMessage("Para rechazar una obra debes escribir el motivo de rechazo.");
      return;
    }

    if (!resubmitDate) {
      setMessage("Para rechazar una obra debes indicar desde cuando podra volver a enviarse a revision.");
      return;
    }

    setActionId(workId);
    setMessage("");

    try {
      await rejectWork(token, workId, rejectionReason, new Date(`${resubmitDate}T00:00:00`).toISOString());
      await refreshAdminData();
      setActionSuccessMessage("Obra rechazada correctamente.");
      setShowActionConfirmDialog(false);
      setShowActionSuccessDialog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible rechazar la obra.");
      setShowActionConfirmDialog(false);
    } finally {
      setActionId(null);
    }
  }

  async function publishApprovedWork(workId: string) {
    setPendingAction({
      type: "publish-work",
      id: workId,
      label: "Si publicar obra",
      text: "La obra seleccionada se publicara y quedara visible en el catalogo publico.",
    });
    setShowActionConfirmDialog(true);
  }

  async function saveEditorialLayer(work: Work) {
    const token = getStoredToken();
    if (!token) {
      setMessage("La sesion expiro.");
      return;
    }

    setActionId(work.id);
    setMessage("");

    try {
      const visibleRatingRaw = (editorialVisibleRatings[work.id] ?? "").trim();
      const parsedVisibleAverageRating = visibleRatingRaw ? Number(visibleRatingRaw) : null;

      if (
        visibleRatingRaw &&
        (!Number.isFinite(parsedVisibleAverageRating ?? NaN) ||
          (parsedVisibleAverageRating ?? 0) < 1 ||
          (parsedVisibleAverageRating ?? 0) > 5)
      ) {
        throw new Error("La calificacion editorial visible debe estar entre 1.00 y 5.00.");
      }

      const response = await upsertWorkEditorialLayer(token, work.id, {
        editorialBadgeText: editorialBadgeTexts[work.id] ?? work.editorial?.editorialBadgeText ?? "",
        editorialHeadline: editorialHeadlines[work.id] ?? work.editorial?.editorialHeadline ?? "",
        featuredReviewNote: editorialReviewNotes[work.id] ?? work.editorial?.featuredReviewNote ?? "",
        visibleAverageRating: parsedVisibleAverageRating,
      });

      await refreshAdminData();
      setActionSuccessMessage(response.message || "Capa editorial actualizada correctamente.");
      setShowActionSuccessDialog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible guardar la capa editorial.");
    } finally {
      setActionId(null);
    }
  }

  async function confirmPublishApprovedWork(workId: string) {
    const token = getStoredToken();
    if (!token) {
      setMessage("La sesion expiro.");
      setShowActionConfirmDialog(false);
      return;
    }

    setActionId(workId);
    setMessage("");

    try {
      await publishWork(token, workId);
      await refreshAdminData();
      setActionSuccessMessage("Obra publicada correctamente. Ya debe aparecer en el catalogo publico.");
      setShowActionConfirmDialog(false);
      setShowActionSuccessDialog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible publicar la obra.");
      setShowActionConfirmDialog(false);
    } finally {
      setActionId(null);
    }
  }

  async function cancelPublishedWork(workId: string) {
    const token = getStoredToken();
    if (!token) {
      setMessage("La sesion expiro.");
      return;
    }

    setActionId(workId);
    setMessage("");

    try {
      await cancelWorkPublication(token, workId, removalReason.trim());
      await refreshAdminData();
      setActionSuccessMessage("Obra retirada del catalogo correctamente.");
      setShowActionSuccessDialog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible retirar la obra del catalogo.");
    } finally {
      setActionId(null);
    }
  }

  async function handleDownloadWorkManuscript(workId: string) {
    const token = getStoredToken();
    if (!token) {
      setMessage("La sesion expiro.");
      return;
    }

    setMessage("");

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";

      const response = await fetch(`${apiBaseUrl}/works/${workId}/assets/manuscript`, {
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
      link.download = `obra-${workId}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible descargar el manuscrito.");
    }
  }

  function requestCancelPublishedWork(work: Work) {
    setPendingRemovalWork(work);
    setRemovalReason("");
    setShowRemovalWarning(true);
    setShowRemovalConfirm(false);
  }

  function closeRemovalDialogs() {
    setPendingRemovalWork(null);
    setRemovalReason("");
    setShowRemovalWarning(false);
    setShowRemovalConfirm(false);
  }

  function continueRemovalFlow() {
    if (!removalReason.trim()) {
      setMessage("Debes escribir un motivo breve para retirar la obra del catalogo.");
      return;
    }
    setShowRemovalWarning(false);
    setShowRemovalConfirm(true);
  }

  async function confirmCancelPublishedWork() {
    if (!pendingRemovalWork) {
      closeRemovalDialogs();
      return;
    }

    await cancelPublishedWork(pendingRemovalWork.id);
    closeRemovalDialogs();
  }

  function logout() {
    clearStoredToken();
    window.location.href = "/login";
  }

  function cancelAdminActionDialog() {
    setShowActionConfirmDialog(false);
    setPendingAction(null);
  }

  async function confirmPendingAction() {
    if (!pendingAction) {
      setShowActionConfirmDialog(false);
      return;
    }

    switch (pendingAction.type) {
      case "schedule-payout":
        await schedulePayoutRequest(pendingAction.id);
        break;
      case "mark-payout-paid":
        await markPayoutRequestPaid(pendingAction.id);
        break;
      case "fail-payout":
        await failPayoutRequest(pendingAction.id);
        break;
      case "retry-payout":
        await retryPayoutRequest(pendingAction.id);
        break;
      case "cancel-payout":
        await cancelPayoutRequest(pendingAction.id);
        break;
      case "approve-author":
        await confirmApprove(pendingAction.id);
        break;
      case "reject-author":
        await confirmReject(pendingAction.id);
        break;
      case "approve-work":
        await confirmApproveEditorialWork(pendingAction.id);
        break;
      case "reject-work":
        await confirmRejectEditorialWork(pendingAction.id);
        break;
      case "publish-work":
        await confirmPublishApprovedWork(pendingAction.id);
        break;
      case "logout":
        logout();
        break;
      default:
        setShowActionConfirmDialog(false);
        setPendingAction(null);
    }
  }

  function closeActionSuccessDialog() {
    setShowActionSuccessDialog(false);
    setActionSuccessMessage("");
    setPendingAction(null);
  }

  const totalInReview = applications.filter((item) => item.applicationStatus === "IN_REVIEW").length;
  const totalApproved = applications.filter((item) => item.applicationStatus === "APPROVED").length;
  const totalRejected = applications.filter((item) => item.applicationStatus === "REJECTED").length;
  const worksInReview = reviewWorks.filter((item) => item.status === "IN_REVIEW").length;
  const worksApproved = reviewWorks.filter((item) => item.status === "APPROVED").length;
  const worksPublished = reviewWorks.filter((item) => item.status === "PUBLISHED").length;
  const worksCancelled = reviewWorks.filter((item) => item.status === "CANCELLED").length;
  const favoredSocios = socios.filter((item) => item.favoredSocio.isFavored).length;
  const isPrimaryAdmin = Boolean(user?.roles.includes("ADMIN"));
  const royaltiesOverview = socios.reduce(
    (accumulator, socio) => {
      const summary = socio.collaboratorProfile?.royaltiesSummary ?? null;

      if (!summary) {
        return accumulator;
      }

      accumulator.sales += summary.confirmedSalesCount ?? 0;
      accumulator.generated += Number.parseFloat(summary.royaltyGeneratedAmount ?? "0") || 0;
      accumulator.available += Number.parseFloat(summary.availableRoyaltyAmount ?? "0") || 0;
      accumulator.paid += Number.parseFloat(summary.paidNetAmount ?? "0") || 0;
      return accumulator;
    },
    { sales: 0, generated: 0, available: 0, paid: 0 },
  );

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <SiteSectionHeader
        title="Panel administrativo"
        activeNav="admin"
        adminChips={buildAdminSectionChips("admin")}
        chips={[
          { label: "Regalias", href: "#regalias" },
          { label: "Moderación de obras", href: "#obras" },
        ]}
      />

      <SectionPageFrame
        sidebar={
          <>
            <SectionSidebarCard title="Resumen admin">
              <p style={sidebarTextStyle}>Panel: <strong>{loadState}</strong></p>
              <p style={sidebarTextStyle}>Socios favorecidos: <strong>{favoredSocios}</strong></p>
              <p style={sidebarTextStyle}>Obras en revision: <strong>{worksInReview}</strong></p>
              <p style={sidebarTextStyle}>Solicitudes de pago: <strong>{payoutRequests.length}</strong></p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Operacion">
              <p style={sidebarTextStyle}>Regalias generadas: <strong>{formatMxCurrency(royaltiesOverview.generated)}</strong></p>
              <p style={sidebarTextStyle}>Disponible estimado: <strong>{formatMxCurrency(royaltiesOverview.available)}</strong></p>
              <p style={sidebarTextStyle}>Pagado neto: <strong>{formatMxCurrency(royaltiesOverview.paid)}</strong></p>
              <p style={sidebarTextStyle}>Pendientes legacy: <strong>{applications.length}</strong></p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Guia rapida">
              <p style={sidebarTextStyle}>1. Atiende solicitudes de pago y revision.</p>
              <p style={sidebarTextStyle}>2. Usa Socios como modulo propio para revisar estatus relevantes.</p>
              <p style={sidebarTextStyle}>3. Publica, rechaza o retira obras desde moderacion.</p>
            </SectionSidebarCard>
          </>
        }
      >
        {message ? <div style={feedbackStyle(loadState === "error")}>{message}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px" }}>
          {[
            { label: "Estado del panel", value: loadState },
            { label: "Socios favorecidos", value: String(favoredSocios) },
            { label: "Pendientes legacy", value: String(applications.length) },
            { label: "Socios legacy en revision", value: String(totalInReview) },
            { label: "Obras en revision", value: String(worksInReview) },
            { label: "Obras publicadas", value: String(worksPublished) },
            { label: "Obras retiradas", value: String(worksCancelled) },
            { label: "Ventas confirmadas", value: String(royaltiesOverview.sales) },
            { label: "Regalias generadas", value: formatMxCurrency(royaltiesOverview.generated) },
            { label: "Disponible estimado", value: formatMxCurrency(royaltiesOverview.available) },
            { label: "Pagado neto", value: formatMxCurrency(royaltiesOverview.paid) },
          ].map((item) => (
            <div key={item.label} style={metricCardStyle}>
              <p style={{ color: "#93908B", fontSize: "12px", marginBottom: "8px" }}>{item.label}</p>
              <p style={{ color: "#013473", fontSize: "18px", fontWeight: "bold", lineHeight: "1.3" }}>{item.value}</p>
            </div>
          ))}
        </div>

        <AdminPrimaryAdminChangeCard isPrimaryAdmin={isPrimaryAdmin} />

        <section id="regalias" style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Solicitudes de pago de regalías</h2>
          </div>

          <div style={sectionBodyStyle}>
            {payoutRequests.length === 0 ? (
              <p style={emptyStyle}>Todavia no hay solicitudes de pago de regalías.</p>
            ) : (
              payoutRequests.map((request) => (
                <article key={request.id} style={articleStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                    <div>
                      <p style={articleTitleStyle}>{request.publicName ?? request.userEmail ?? "Socio"}</p>
                      <p style={articleMetaStyle}>Correo: {request.userEmail ?? "Sin correo"}</p>
                      <p style={articleMetaStyle}>
                        Solicitud: {formatMxCurrency(request.netAmount)} | Estado: {payoutStatusLabel(request.status)}
                      </p>
                      <p style={articleMetaStyle}>
                        Solicitado: {new Date(request.requestedAt).toLocaleString("es-MX")} | Viernes operativo: {request.cycleScheduledFor ? new Date(request.cycleScheduledFor).toLocaleString("es-MX") : "Pendiente"}
                      </p>
                      {request.providerReference ? (
                        <p style={articleMetaStyle}>Referencia de pago: {request.providerReference}</p>
                      ) : null}
                      {request.failedAt ? (
                        <p style={articleMetaStyle}>Fallido: {new Date(request.failedAt).toLocaleString("es-MX")}</p>
                      ) : null}
                      {request.paidAt ? (
                        <p style={articleMetaStyle}>Pagado: {new Date(request.paidAt).toLocaleString("es-MX")}</p>
                      ) : null}
                    </div>
                    <span style={workStatusBadgeStyle(
                      request.status === "PAID"
                        ? "PUBLISHED"
                        : request.status === "SCHEDULED"
                          ? "APPROVED"
                          : request.status === "FAILED"
                            ? "REJECTED"
                            : request.status === "CANCELLED"
                              ? "CANCELLED"
                              : "IN_REVIEW",
                    )}>
                      {request.status}
                    </span>
                  </div>

                  <p style={articleTextStyle}>
                    {request.isEligibleForCurrentFridayWindow
                      ? "Esta solicitud entro dentro del corte semanal vigente."
                      : "Esta solicitud quedo para el siguiente ciclo semanal de viernes."}
                  </p>
                  <p style={articleMetaStyle}>{payoutStatusDescription(request.status)}</p>

                  <textarea
                    rows={3}
                    value={payoutAdminNotes[request.id] ?? ""}
                    onChange={(event) =>
                      setPayoutAdminNotes((current) => ({
                        ...current,
                        [request.id]: event.target.value,
                      }))
                    }
                    placeholder="Notas administrativas para esta solicitud"
                    style={{ ...inputStyle, resize: "vertical" }}
                  />

                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    {request.status === "REQUESTED" ? (
                      <>
                        <button
                          onClick={() => requestSchedulePayout(request)}
                          disabled={actionId === request.id}
                          style={authorApproveButtonStyle(actionId === request.id)}
                        >
                          Programar pago
                        </button>
                        <button
                          onClick={() => requestCancelPayout(request)}
                          disabled={actionId === request.id}
                          style={authorRejectButtonStyle(actionId === request.id)}
                        >
                          Cancelar solicitud
                        </button>
                      </>
                    ) : null}
                    {request.status === "SCHEDULED" ? (
                      <>
                        <button
                          onClick={() => requestMarkPayoutPaid(request)}
                          disabled={actionId === request.id}
                          style={publishButtonStyle(actionId === request.id)}
                        >
                          Marcar como pagado
                        </button>
                        <button
                          onClick={() => requestFailPayout(request)}
                          disabled={actionId === request.id}
                          style={authorRejectButtonStyle(actionId === request.id)}
                        >
                          Marcar fallido
                        </button>
                        <button
                          onClick={() => requestCancelPayout(request)}
                          disabled={actionId === request.id}
                          style={authorRejectButtonStyle(actionId === request.id)}
                        >
                          Cancelar solicitud
                        </button>
                      </>
                    ) : null}
                    {request.status === "FAILED" ? (
                      <button
                        onClick={() => requestRetryPayout(request)}
                        disabled={actionId === request.id}
                        style={authorApproveButtonStyle(actionId === request.id)}
                      >
                        Reintentar pago
                      </button>
                    ) : null}
                  </div>

                  {request.notes ? (
                    <p style={articleMetaStyle}>Notas: {request.notes}</p>
                  ) : null}
                  </article>
                ))
              )}
          </div>
        </section>

        <section id="autores" style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Pendientes legacy de socios publicadores</h2>
          </div>

          <div style={sectionBodyStyle}>
            {applications.length === 0 ? (
              <p style={emptyStyle}>No hay pendientes legacy. Las cuentas nuevas ya nacen listas para comprar y publicar.</p>
            ) : (
              applications.map((application) => (
                <article key={application.id} style={articleStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                    <div>
                      <p style={articleTitleStyle}>{application.publicName}</p>
                      <p style={articleMetaStyle}>Socio: {application.userEmail ?? "Sin correo"}</p>
                      <p style={articleMetaStyle}>Etiqueta interna: Socio autor | Tipo: {application.authorProfileType} | Estado: {application.applicationStatus}</p>
                    </div>
                    <span style={authorStatusBadgeStyle(application.applicationStatus)}>{application.applicationStatus}</span>
                  </div>

                  <p style={articleTextStyle}>{application.bio || "Sin biografia cargada todavia."}</p>

                  {application.applicationStatus === "IN_REVIEW" ? (
                    <div style={{ display: "grid", gridTemplateColumns: "164px 104px minmax(260px, 1fr)", gap: "12px", alignItems: "center" }}>
                      <button onClick={() => approve(application.id)} disabled={actionId === application.id} style={authorApproveButtonStyle(actionId === application.id)}>
                          Aprobar
                      </button>
                      <button onClick={() => reject(application.id)} disabled={actionId === application.id} style={authorRejectButtonStyle(actionId === application.id)}>
                        Rechazar
                      </button>
                      <input
                        type="text"
                        value={authorRejections[application.id] ?? ""}
                        onChange={(event) => setAuthorRejections((current) => ({ ...current, [application.id]: event.target.value }))}
                        placeholder="Motivo de rechazo"
                        style={inputStyle}
                      />
                    </div>
                  ) : (
                    <div style={{ color: "#666666", fontSize: "13px" }}>
                      Motivo de rechazo: {application.rejectionReason ?? "No aplica"}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <section id="obras" style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Moderación de obras</h2>
              <p style={adminSectionCaptionStyle}>
                Listado operativo de obras recibidas para revisión, publicación o retiro, sin cambiar el flujo administrativo ya conectado.
              </p>
            </div>
          </div>

          <div style={sectionBodyStyle}>
            {reviewWorks.length === 0 ? (
              <p style={emptyStyle}>No hay obras en revision, aprobadas o publicadas pendientes de administracion.</p>
            ) : (
              <div style={adminWorkListStyle}>
              {reviewWorks.map((work) => (
                <article key={work.id} style={adminWorkListItemStyle}>
                  {(() => {
                    const metadata =
                      work.metadata && typeof work.metadata === "object" && !Array.isArray(work.metadata)
                        ? (work.metadata as Record<string, unknown>)
                        : null;
                    const rawPrice = metadata?.price;
                    const numericPrice =
                      typeof rawPrice === "number"
                        ? rawPrice
                        : typeof rawPrice === "string"
                          ? Number(rawPrice)
                          : null;

                    return (
                      <>
                  <div style={adminWorkCardLayoutStyle}>
                    <div style={adminWorkMainColumnStyle}>
                      <div style={compactHeaderRowStyle}>
                        <div style={{ minWidth: 0 }}>
                          <p style={articleTitleStyle}>{work.title}</p>
                          <p style={articleMetaStyle}>Autor: {work.authorPublicName ?? "Sin nombre publico"} | Usuario: {work.authorUserEmail ?? "Sin correo"}</p>
                          <p style={articleMetaStyle}>
                            Tipo: {work.publicationType} | Slug: {work.slug}
                            {numericPrice !== null && Number.isFinite(numericPrice)
                              ? ` | Precio: MXN ${numericPrice.toFixed(2)}`
                              : " | Precio: Pendiente"}
                          </p>
                        </div>
                        <span style={workStatusBadgeStyle(work.status)}>{work.status}</span>
                      </div>

                      <p style={compactDescriptionStyle}>{work.description || "Sin descripcion cargada todavia."}</p>

                      <div style={{ color: "#666666", fontSize: "11px" }}>
                        Creada: {new Date(work.createdAt).toLocaleString("es-MX")}
                        {work.publishedAt ? ` | Publicada: ${new Date(work.publishedAt).toLocaleString("es-MX")}` : ""}
                      </div>

                      {isPrimaryAdmin && work.editorial?.favoredEligible ? (
                        <div style={editorialLayerBoxStyle}>
                          <p style={editorialLayerTitleStyle}>Capa editorial favorecida</p>
                          <p style={editorialLayerTextStyle}>
                            Esta obra es elegible para impulso editorial porque pertenece al circuito de Socio_Favorecido.
                            Lo que captures aqui se mostrara publicamente como capa editorial explicita.
                          </p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <input
                              type="text"
                              value={editorialBadgeTexts[work.id] ?? work.editorial?.editorialBadgeText ?? ""}
                              onChange={(event) =>
                                setEditorialBadgeTexts((current) => ({ ...current, [work.id]: event.target.value }))
                              }
                              placeholder="Insignia editorial visible"
                              style={inputStyle}
                            />
                            <input
                              type="text"
                              value={editorialVisibleRatings[work.id] ?? (work.ratings?.visibleAverage?.toString() ?? "")}
                              onChange={(event) =>
                                setEditorialVisibleRatings((current) => ({ ...current, [work.id]: event.target.value }))
                              }
                              placeholder="Calificacion visible editorial (1.00 - 5.00)"
                              style={inputStyle}
                            />
                          </div>
                          <input
                            type="text"
                            value={editorialHeadlines[work.id] ?? work.editorial?.editorialHeadline ?? ""}
                            onChange={(event) =>
                              setEditorialHeadlines((current) => ({ ...current, [work.id]: event.target.value }))
                            }
                            placeholder="Titular editorial para catalogo o detalle"
                            style={inputStyle}
                          />
                          <textarea
                            rows={3}
                            value={editorialReviewNotes[work.id] ?? work.editorial?.featuredReviewNote ?? ""}
                            onChange={(event) =>
                              setEditorialReviewNotes((current) => ({ ...current, [work.id]: event.target.value }))
                            }
                            placeholder="Nota editorial destacada visible en la ficha publica"
                            style={{ ...inputStyle, resize: "vertical" }}
                          />
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => saveEditorialLayer(work)}
                              disabled={actionId === work.id}
                              style={publishButtonStyle(actionId === work.id)}
                            >
                              Guardar capa editorial
                            </button>
                            {work.editorial?.hasVisibleRatingOverride ? (
                              <span style={editorialStatePillStyle}>
                                Override activo: {work.ratings?.visibleAverage?.toFixed(2) ?? "--"}
                              </span>
                            ) : (
                              <span style={editorialStatePillStyle}>
                                Promedio organico actual: {work.ratings?.organicAverage?.toFixed(2) ?? "Sin reseñas"}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div style={adminWorkAsideStyle}>
                      <div style={adminAssetPreviewGridStyle}>
                    {work.assets.cover ? (
                      <Link
                        href={`/visor-archivo?url=${encodeURIComponent(work.assets.cover.url)}&label=${encodeURIComponent(`Portada - ${work.title}`)}&type=image`}
                        style={adminAssetPreviewCardStyle}
                      >
                        <img src={work.assets.cover.url} alt={`Portada de ${work.title}`} style={adminAssetPreviewImageStyle} />
                        <span style={adminAssetPreviewLabelStyle}>Portada</span>
                      </Link>
                    ) : (
                      <div style={adminAssetPreviewPlaceholderStyle}>Sin portada</div>
                    )}

                    {work.assets.backCover ? (
                      <Link
                        href={`/visor-archivo?url=${encodeURIComponent(work.assets.backCover.url)}&label=${encodeURIComponent(`Contraportada - ${work.title}`)}&type=image`}
                        style={adminAssetPreviewCardStyle}
                      >
                        <img src={work.assets.backCover.url} alt={`Contraportada de ${work.title}`} style={adminAssetPreviewImageStyle} />
                        <span style={adminAssetPreviewLabelStyle}>Contraportada</span>
                      </Link>
                    ) : (
                      <div style={adminAssetPreviewPlaceholderStyle}>Sin contraportada</div>
                    )}

                    {work.assets.manuscript ? (
                      <button
                        type="button"
                        onClick={() => handleDownloadWorkManuscript(work.id)}
                        style={adminAssetPreviewButtonStyle}
                      >
                        <div style={adminManuscriptThumbStyle}>
                          <span style={adminManuscriptTitleStyle}>Manuscrito</span>
                          <span style={adminManuscriptNameStyle}>{work.assets.manuscript.originalName}</span>
                        </div>
                        <span style={adminAssetPreviewLabelStyle}>Descargar manuscrito</span>
                      </button>
                    ) : (
                      <div style={adminAssetPreviewPlaceholderStyle}>Sin manuscrito</div>
                    )}
                      </div>

                      <div style={adminQuickLinksStyle}>
                        {work.assets.cover ? (
                          <Link
                            href={`/visor-archivo?url=${encodeURIComponent(work.assets.cover.url)}&label=${encodeURIComponent(`Portada - ${work.title}`)}&type=image`}
                            style={adminAssetLinkStyle}
                          >
                            Ver portada
                          </Link>
                        ) : (
                          <span style={missingAssetPillStyle}>Sin portada</span>
                        )}
                        {work.assets.backCover ? (
                          <Link
                            href={`/visor-archivo?url=${encodeURIComponent(work.assets.backCover.url)}&label=${encodeURIComponent(`Contraportada - ${work.title}`)}&type=image`}
                            style={adminAssetLinkStyle}
                          >
                            Ver contraportada
                          </Link>
                        ) : (
                          <span style={missingAssetPillStyle}>Sin contraportada</span>
                        )}
                        {work.assets.manuscript ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadWorkManuscript(work.id)}
                            style={adminAssetActionButtonStyle}
                          >
                            Descargar manuscrito
                          </button>
                        ) : (
                          <span style={missingAssetPillStyle}>Sin manuscrito</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {work.status === "IN_REVIEW" ? (
                    <div style={{ display: "grid", gap: "12px" }}>
                      <textarea
                        rows={3}
                        value={workApprovalNotes[work.id] ?? ""}
                        onChange={(event) =>
                          setWorkApprovalNotes((current) => ({
                            ...current,
                            [work.id]: event.target.value,
                          }))
                        }
                        placeholder="Observaciones editoriales de aprobacion (opcionales)"
                        style={{ ...inputStyle, resize: "vertical" }}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                        <input
                          type="text"
                          value={workRejections[work.id] ?? ""}
                          onChange={(event) => setWorkRejections((current) => ({ ...current, [work.id]: event.target.value }))}
                          placeholder="Motivo de rechazo editorial"
                          style={inputStyle}
                        />
                        <input
                          type="date"
                          value={workResubmitDates[work.id] ?? ""}
                          onChange={(event) => setWorkResubmitDates((current) => ({ ...current, [work.id]: event.target.value }))}
                          style={inputStyle}
                        />
                      </div>
                      <p style={{ color: "#666666", fontSize: "13px", margin: 0 }}>
                        Para aprobar, la obra debe tener portada, contraportada y manuscrito. Si rechazas la obra, debes indicar el motivo y la fecha desde la que el autor podra volver a solicitar revision.
                      </p>
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <button onClick={() => approveEditorialWork(work.id)} disabled={actionId === work.id} style={approveButtonStyle(actionId === work.id)}>Aprobar obra</button>
                        <button onClick={() => rejectEditorialWork(work.id)} disabled={actionId === work.id} style={rejectButtonStyle(actionId === work.id)}>Rechazar obra</button>
                      </div>
                    </div>
                  ) : null}

                  {work.status === "APPROVED" ? (
                    <div style={statusBoxStyle("approved")}>
                      <p style={statusBoxTitleStyle("approved")}>Aprobada y lista para publicacion</p>
                      <p style={statusBoxTextStyle("approved")}>Todavia no es publica. En cuanto la publiques, aparecera en el catalogo.</p>
                      {work.editorialNotes ? (
                        <p style={statusBoxTextStyle("approved")}>Observaciones editoriales: {work.editorialNotes}</p>
                      ) : null}
                      <button onClick={() => publishApprovedWork(work.id)} disabled={actionId === work.id} style={publishButtonStyle(actionId === work.id)}>Publicar obra</button>
                    </div>
                  ) : null}

                  {work.status === "PUBLISHED" ? (
                    <div style={statusBoxStyle("published")}>
                      <p style={statusBoxTitleStyle("published")}>Obra publicada</p>
                      <p style={statusBoxTextStyle("published")}>Esta obra ya esta visible en el catalogo publico. Si necesitas retirarla, usa la accion de abajo.</p>
                      {work.editorialNotes ? (
                        <p style={statusBoxTextStyle("published")}>Observaciones editoriales: {work.editorialNotes}</p>
                      ) : null}
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button disabled style={publishedDoneButtonStyle()}>Publicada</button>
                        <button onClick={() => requestCancelPublishedWork(work)} disabled={actionId === work.id} style={cancelButtonStyle(actionId === work.id)}>Retirar del catalogo</button>
                      </div>
                    </div>
                  ) : null}

                  {work.status === "CANCELLED" ? (
                    <div style={statusBoxStyle("cancelled")}>
                      <p style={statusBoxTitleStyle("cancelled")}>Obra retirada del catalogo</p>
                      <p style={statusBoxTextStyle("cancelled")}>
                        {work.cancellationReason
                          ? `Motivo del retiro: ${work.cancellationReason}`
                          : "Esta obra ya no se muestra en el catalogo publico."}
                      </p>
                      <p style={{ ...statusBoxTextStyle("cancelled"), marginTop: "-2px" }}>
                        {work.cancelledAt
                          ? `Retirada el ${new Date(work.cancelledAt).toLocaleString("es-MX")}.`
                          : "Retiro administrativo registrado."}
                      </p>
                    </div>
                  ) : null}
                      </>
                    );
                  })()}
                </article>
              ))}
              </div>
            )}
          </div>
        </section>

        <section style={{ backgroundColor: "#ffffff", borderRadius: "4px", padding: "20px 28px" }}>
          <h2 style={{ color: "#013473", fontSize: "18px", margin: "0 0 12px 0", fontFamily: "'Times New Roman', serif" }}>Resumen de decisiones</h2>
          <p style={{ color: "#666666", margin: "0 0 18px 0", lineHeight: "1.8" }}>
            Este bloque resume los pendientes legacy de socios publicadores y el estado editorial de las obras.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
            <div style={summaryCardStyle}>
              <p style={summaryCardLabelStyle}>Legacy aprobados</p>
              <p style={summaryCardValueStyle}>{totalApproved}</p>
            </div>
            <div style={summaryCardStyle}>
              <p style={summaryCardLabelStyle}>Legacy rechazados</p>
              <p style={summaryCardValueStyle}>{totalRejected}</p>
            </div>
            <div style={summaryCardStyle}>
              <p style={summaryCardLabelStyle}>Obras en revision</p>
              <p style={summaryCardValueStyle}>{worksInReview}</p>
            </div>
            <div style={summaryCardStyle}>
              <p style={summaryCardLabelStyle}>Obras listas para publicar</p>
              <p style={summaryCardValueStyle}>{worksApproved}</p>
            </div>
            <div style={summaryCardStyle}>
              <p style={summaryCardLabelStyle}>Obras publicadas</p>
              <p style={summaryCardValueStyle}>{worksPublished}</p>
            </div>
            <div style={summaryCardStyle}>
              <p style={summaryCardLabelStyle}>Obras retiradas</p>
              <p style={summaryCardValueStyle}>{worksCancelled}</p>
            </div>
          </div>
        </section>
      </SectionPageFrame>

      {showRemovalWarning && pendingRemovalWork ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <p style={modalEyebrowStyle}>Advertencia</p>
            <h3 style={modalTitleStyle}>Se solicita retirar una obra del catalogo</h3>
            <p style={modalTextStyle}>
              Estas a punto de retirar del catalogo la obra <strong>{pendingRemovalWork.title}</strong>. Si continuas, dejara de mostrarse publicamente.
            </p>
            <textarea
              rows={4}
              value={removalReason}
              onChange={(event) => setRemovalReason(event.target.value)}
              placeholder="Escribe un motivo breve para el retiro del catalogo"
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <div style={modalActionsStyle}>
              <button onClick={continueRemovalFlow} style={dangerConfirmButtonStyle}>
                Si, se va a retirar esta obra del catalogo, y continuar
              </button>
              <button onClick={closeRemovalDialogs} style={secondaryModalButtonStyle}>
                No, la obra no sera retirada, y regresar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRemovalConfirm && pendingRemovalWork ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <p style={modalEyebrowStyle}>Confirmacion final</p>
            <h3 style={modalTitleStyle}>Confirmar retiro del catalogo</h3>
            <p style={modalTextStyle}>
              Vas a retirar del catalogo la obra <strong>{pendingRemovalWork.title}</strong>. Esta accion la sacara del catalogo publico.
            </p>
            <div style={modalActionsStyle}>
              <button onClick={confirmCancelPublishedWork} style={dangerConfirmButtonStyle}>
                Si, retirar
              </button>
              <button onClick={closeRemovalDialogs} style={secondaryModalButtonStyle}>
                No, y regresar al panel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showActionConfirmDialog && pendingAction ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <p style={modalEyebrowStyle}>Confirmacion</p>
            <h3 style={modalTitleStyle}>Confirma esta accion</h3>
            <p style={modalTextStyle}>{pendingAction.text}</p>
            <div style={modalActionsStyle}>
              <button onClick={confirmPendingAction} style={dangerConfirmButtonStyle}>
                {pendingAction.label}
              </button>
              <button onClick={cancelAdminActionDialog} style={secondaryModalButtonStyle}>
                No continuar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showActionSuccessDialog ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <p style={{ ...modalEyebrowStyle, color: "#2E7D32" }}>Operacion completada</p>
            <h3 style={modalTitleStyle}>Cambio realizado correctamente</h3>
            <p style={modalTextStyle}>{actionSuccessMessage || "La accion se realizo correctamente."}</p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button onClick={closeActionSuccessDialog} style={secondaryModalButtonStyle}>
                Regresar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

const metricCardStyle: CSSProperties = { backgroundColor: "#ffffff", padding: "10px 12px", borderRadius: "4px", borderTop: "3px solid #013473" };
const sectionStyle: CSSProperties = { backgroundColor: "#ffffff", borderRadius: "4px", overflow: "hidden" };
const sectionHeaderStyle: CSSProperties = { padding: "10px 12px", borderBottom: "1px solid #e0e0e0" };
const sectionBodyStyle: CSSProperties = { padding: "10px 12px", display: "grid", gap: "9px" };
const sectionTitleStyle: CSSProperties = { color: "#013473", fontSize: "15px", margin: 0, fontFamily: "'Times New Roman', serif" };
const adminSectionCaptionStyle: CSSProperties = { color: "#5b6878", fontSize: "13px", margin: "6px 0 0 0", lineHeight: "1.5" };
const articleStyle: CSSProperties = { border: "1px solid #e0e0e0", borderRadius: "4px", padding: "9px 10px", display: "grid", gap: "7px" };
const articleTitleStyle: CSSProperties = { color: "#013473", fontSize: "14px", fontWeight: "bold", margin: "0 0 2px 0" };
const articleMetaStyle: CSSProperties = { color: "#444444", fontSize: "11px", margin: "0 0 1px 0", lineHeight: "1.45" };
const articleTextStyle: CSSProperties = { color: "#555555", fontSize: "12px", lineHeight: "1.55", margin: 0 };
const compactHeaderRowStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "start" };
const compactDescriptionStyle: CSSProperties = { color: "#555555", fontSize: "11px", lineHeight: "1.45", margin: 0, maxHeight: "58px", overflow: "hidden" };
const emptyStyle: CSSProperties = { color: "#666666", margin: 0, fontSize: "13px" };
const inputStyle: CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #e0e0e0", borderRadius: "4px", fontFamily: "Georgia, serif", fontSize: "12px", boxSizing: "border-box" };
const adminAssetLinkStyle: CSSProperties = { color: "#013473", backgroundColor: "#eef2f7", padding: "5px 9px", borderRadius: "999px", textDecoration: "none", fontSize: "11px" };
const adminAssetActionButtonStyle: CSSProperties = { color: "#013473", backgroundColor: "#eef2f7", padding: "5px 9px", borderRadius: "999px", fontSize: "11px", border: "none", cursor: "pointer", fontFamily: "Georgia, serif" };
const missingAssetPillStyle: CSSProperties = { color: "#7a7a7a", backgroundColor: "#f1f1f1", padding: "5px 9px", borderRadius: "999px", fontSize: "11px" };
const adminAssetPreviewGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 104px))", gap: "7px", alignItems: "start" };
const adminAssetPreviewCardStyle: CSSProperties = { display: "grid", gap: "6px", textDecoration: "none", color: "inherit" };
const adminAssetPreviewButtonStyle: CSSProperties = { display: "grid", gap: "6px", color: "inherit", border: "none", backgroundColor: "transparent", padding: 0, textAlign: "left", cursor: "pointer" };
const adminAssetPreviewPlaceholderStyle: CSSProperties = { minHeight: "104px", border: "1px dashed #cfd4dd", borderRadius: "4px", backgroundColor: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b9097", fontSize: "11px", padding: "8px", textAlign: "center" };
const adminAssetPreviewImageStyle: CSSProperties = { width: "100%", height: "104px", objectFit: "cover", borderRadius: "4px", border: "1px solid #e4e7ec", display: "block" };
const adminAssetPreviewLabelStyle: CSSProperties = { color: "#013473", fontSize: "11px", fontWeight: "bold" };
const adminManuscriptThumbStyle: CSSProperties = { minHeight: "104px", borderRadius: "4px", border: "1px solid #bfd7f1", backgroundColor: "#eef6ff", padding: "7px", display: "grid", alignContent: "center", gap: "4px" };
const adminManuscriptTitleStyle: CSSProperties = { color: "#013473", fontSize: "14px", fontWeight: "bold", lineHeight: "1.15" };
const adminManuscriptNameStyle: CSSProperties = { color: "#4f5b66", fontSize: "11px", lineHeight: "1.4", wordBreak: "break-word" };
const adminWorkCardLayoutStyle: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 220px", gap: "10px", alignItems: "start" };
const adminWorkListStyle: CSSProperties = { display: "grid", gap: "12px" };
const adminWorkListItemStyle: CSSProperties = { border: "1px solid #dbe4ee", borderRadius: "10px", padding: "14px", display: "grid", gap: "10px", backgroundColor: "#fbfdff" };
const adminWorkMainColumnStyle: CSSProperties = { display: "grid", gap: "8px", minWidth: 0 };
const adminWorkAsideStyle: CSSProperties = { display: "grid", gap: "8px", alignContent: "start" };
const adminQuickLinksStyle: CSSProperties = { display: "flex", gap: "8px", flexWrap: "wrap" };
const summaryCardStyle: CSSProperties = { backgroundColor: "#f8f9fa", border: "1px solid #e8e8e8", borderRadius: "4px", padding: "10px 12px" };
const summaryCardLabelStyle: CSSProperties = { color: "#666666", fontSize: "12px", margin: "0 0 6px 0" };
const summaryCardValueStyle: CSSProperties = { color: "#013473", fontSize: "18px", fontWeight: "bold", margin: 0 };
const modalOverlayStyle: CSSProperties = { position: "fixed", inset: 0, backgroundColor: "rgba(1, 22, 45, 0.58)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", zIndex: 1000 };
const modalCardStyle: CSSProperties = { width: "100%", maxWidth: "620px", backgroundColor: "#ffffff", borderRadius: "8px", padding: "24px 26px", boxShadow: "0 18px 50px rgba(0, 0, 0, 0.18)", display: "grid", gap: "14px" };
const modalEyebrowStyle: CSSProperties = { color: "#b71c1c", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 };
const modalTitleStyle: CSSProperties = { color: "#013473", fontSize: "24px", margin: 0, fontFamily: "'Times New Roman', serif" };
const modalTextStyle: CSSProperties = { color: "#444444", fontSize: "15px", lineHeight: "1.8", margin: 0 };
const modalActionsStyle: CSSProperties = { display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "6px" };
const dangerConfirmButtonStyle: CSSProperties = { backgroundColor: "#b71c1c", color: "#ffffff", border: "none", borderRadius: "4px", padding: "12px 16px", cursor: "pointer", fontFamily: "Georgia, serif" };
const secondaryModalButtonStyle: CSSProperties = { backgroundColor: "#f3f4f6", color: "#1f2937", border: "1px solid #d1d5db", borderRadius: "4px", padding: "12px 16px", cursor: "pointer", fontFamily: "Georgia, serif" };
const editorialLayerBoxStyle: CSSProperties = {
  backgroundColor: "#f8fbff",
  border: "1px solid #d6e4f5",
  borderRadius: "6px",
  padding: "12px",
  display: "grid",
  gap: "10px",
};
const editorialLayerTitleStyle: CSSProperties = {
  color: "#013473",
  fontSize: "14px",
  fontWeight: "bold",
  margin: 0,
};
const editorialLayerTextStyle: CSSProperties = {
  color: "#4b5563",
  fontSize: "12px",
  lineHeight: "1.55",
  margin: 0,
};
const editorialStatePillStyle: CSSProperties = {
  color: "#7a5600",
  backgroundColor: "#fff6dd",
  border: "1px solid #f2d589",
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "11px",
};
const sidebarTextStyle: CSSProperties = { margin: 0, color: "#4b5563", fontSize: "12px", lineHeight: "1.65" };

function feedbackStyle(isError: boolean): CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: "4px",
    backgroundColor: isError ? "#fdecea" : "#e8f5e9",
    color: isError ? "#b71c1c" : "#1b5e20",
    fontSize: "13px",
  };
}

function formatMxCurrency(value: string | number) {
  const numericValue =
    typeof value === "number"
      ? value
      : Number.parseFloat(typeof value === "string" ? value : "0");

  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;

  return `MXN ${safeValue.toFixed(2)}`;
}

function payoutStatusLabel(status: string) {
  switch (status) {
    case "REQUESTED":
      return "Solicitado";
    case "SCHEDULED":
      return "Programado";
    case "PAID":
      return "Pagado";
    case "FAILED":
      return "Fallido";
    case "CANCELLED":
      return "Cancelado";
    default:
      return status;
  }
}

function payoutStatusDescription(status: string) {
  switch (status) {
    case "REQUESTED":
      return "Quedo registrada y todavia puede programarse o cancelarse.";
    case "SCHEDULED":
      return "Ya quedo lista para ejecucion en la ventana operativa de pago.";
    case "PAID":
      return "Se registro como pagada y ya no requiere accion adicional.";
    case "FAILED":
      return "El intento de pago fallo y debe reintentarse o revisarse.";
    case "CANCELLED":
      return "La solicitud fue cancelada y el saldo ya no esta apartado.";
    default:
      return "Estado operativo sin descripcion adicional.";
  }
}

function authorStatusBadgeStyle(status: AuthorProfile["applicationStatus"]): CSSProperties {
  const palette = {
    APPROVED: { backgroundColor: "#E8F5E9", color: "#2E7D32" },
    REJECTED: { backgroundColor: "#fdecea", color: "#b71c1c" },
    IN_REVIEW: { backgroundColor: "#FFF8E1", color: "#F57F17" },
  };

  return { alignSelf: "start", padding: "5px 10px", borderRadius: "3px", fontSize: "12px", ...palette[status] };
}

function workStatusBadgeStyle(status: Work["status"]): CSSProperties {
  const palette: Record<Work["status"], { backgroundColor: string; color: string }> = {
    DRAFT: { backgroundColor: "#eef2f7", color: "#4f5b66" },
    IN_REVIEW: { backgroundColor: "#FFF8E1", color: "#F57F17" },
    APPROVED: { backgroundColor: "#e8f5e9", color: "#2E7D32" },
    REJECTED: { backgroundColor: "#fdecea", color: "#b71c1c" },
    PUBLISHED: { backgroundColor: "#E3F2FD", color: "#1565C0" },
    CANCELLED: { backgroundColor: "#f0f0f0", color: "#777777" },
  };

  return { alignSelf: "start", padding: "5px 10px", borderRadius: "3px", fontSize: "12px", ...palette[status] };
}

function statusBoxStyle(kind: "approved" | "published" | "cancelled"): CSSProperties {
  return {
    backgroundColor:
      kind === "approved" ? "#edf8ef" : kind === "published" ? "#eef6ff" : "#f3f4f6",
    border: `1px solid ${
      kind === "approved" ? "#b7d9be" : kind === "published" ? "#bfd7f1" : "#d1d5db"
    }`,
    borderRadius: "4px",
    padding: "12px 14px",
    display: "grid",
    gap: "10px",
  };
}

function statusBoxTitleStyle(kind: "approved" | "published" | "cancelled"): CSSProperties {
  return {
    color:
      kind === "approved" ? "#2E7D32" : kind === "published" ? "#1565C0" : "#4b5563",
    fontWeight: "bold",
    margin: 0,
  };
}

function statusBoxTextStyle(kind: "approved" | "published" | "cancelled"): CSSProperties {
  return {
    color:
      kind === "approved" ? "#2E7D32" : kind === "published" ? "#1565C0" : "#4b5563",
    fontSize: "13px",
    margin: 0,
  };
}

function approveButtonStyle(disabled: boolean): CSSProperties {
  return { backgroundColor: disabled ? "#8aa98c" : "#2E7D32", color: "#ffffff", border: "none", borderRadius: "4px", padding: "8px 12px", cursor: disabled ? "wait" : "pointer", fontSize: "12px" };
}

function rejectButtonStyle(disabled: boolean): CSSProperties {
  return { backgroundColor: disabled ? "#c78c8c" : "#b71c1c", color: "#ffffff", border: "none", borderRadius: "4px", padding: "8px 12px", cursor: disabled ? "wait" : "pointer", fontSize: "12px" };
}

function publishButtonStyle(disabled: boolean): CSSProperties {
  return { backgroundColor: disabled ? "#5c6f8f" : "#013473", color: "#ffffff", border: "none", borderRadius: "4px", padding: "8px 12px", cursor: disabled ? "wait" : "pointer", width: "fit-content", fontSize: "12px" };
}

function publishedDoneButtonStyle(): CSSProperties {
  return { backgroundColor: "#dbeafe", color: "#1565C0", border: "1px solid #bfd7f1", borderRadius: "4px", padding: "8px 12px", cursor: "default", fontSize: "12px" };
}

function cancelButtonStyle(disabled: boolean): CSSProperties {
  return { backgroundColor: disabled ? "#b8b8b8" : "#5f6368", color: "#ffffff", border: "none", borderRadius: "4px", padding: "8px 12px", cursor: disabled ? "wait" : "pointer", fontSize: "12px" };
}

function authorApproveButtonStyle(disabled: boolean): CSSProperties {
  return {
    backgroundColor: disabled ? "#7ca883" : "#2f7d32",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    padding: "9px 14px",
    cursor: disabled ? "wait" : "pointer",
    fontFamily: "Georgia, serif",
    fontSize: "13px",
    fontWeight: "bold",
  };
}

function authorRejectButtonStyle(disabled: boolean): CSSProperties {
  return {
    backgroundColor: disabled ? "#c88585" : "#c62828",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    padding: "9px 14px",
    cursor: disabled ? "wait" : "pointer",
    fontFamily: "Georgia, serif",
    fontSize: "13px",
    fontWeight: "bold",
  };
}
