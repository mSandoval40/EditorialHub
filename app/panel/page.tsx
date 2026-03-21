"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CSSProperties, FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import { buildAdminSectionChips } from "@/components/admin-section-chips";
import { PasswordField } from "@/components/password-field";
import { SectionPageFrame, SectionSidebarCard } from "@/components/section-page-frame";
import { SiteSectionHeader } from "@/components/site-section-header";
import {
  applyAuthor,
  changePassword,
  clearStoredToken,
  deleteWork,
  fetchMe,
  fetchMyAuthorProfile,
  fetchMyWorks,
  getStoredToken,
  submitWorkForReview,
  type AuthUser,
  type AuthorProfile,
  type Work,
} from "@/lib/api";

type LoadState = "loading" | "ready" | "error";
const TEMP_DRAFT_TITLE = "Borrador temporal";

type PanelPayoutRequest = {
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
};

type PanelPublishingCompliance = {
  hasFiscalData: boolean;
  hasBankingData: boolean;
  canPublish: boolean;
  missingFields: string[];
  bankValidationStatus: "MISSING" | "PENDING_VALIDATION" | "VALIDATED" | "REJECTED";
};

type PanelRoyaltySummary = {
  confirmedSalesCount: number;
  confirmedUnits: number;
  grossSalesAmount: string;
  royaltyGeneratedAmount: string;
  platformShareAmount: string;
  estimatedProcessorFeeAmount: string;
  platformNetAmount: string;
  authorParticipationPercent: string;
  platformParticipationPercent: string;
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
    folio: string;
    workId: string;
    workTitle: string;
    soldAt: string;
    unitPrice: string;
    royaltyRatePercent: string;
    royaltyAmount: string;
    authorNetAmount: string;
    platformAmount: string;
    estimatedProcessorFeeAmount: string;
    platformNetAmount: string;
    buyerEmail: string | null;
  }>;
  payoutHistory: Array<{
    id: string;
    status: string;
    grossAmount: string;
    commissionAmount: string;
    netAmount: string;
    currency: string;
    requestedAt: string;
    scheduledFor: string | null;
    paidAt: string | null;
    notes: string | null;
  }>;
};

type PanelAuthorProfile = AuthorProfile & {
  taxId?: string | null;
  taxIdDeclared?: string | null;
  taxIdSource?: string | null;
  curp?: string | null;
  dateOfBirth?: string | null;
  payoutMethod?: string | null;
  payoutAccountData?: Record<string, unknown> | null;
  bankValidationStatus?: string | null;
  latestBankValidationAttempt?: {
    status: string;
    amountMinor?: number;
    referenceHint?: string | null;
    notes?: string | null;
    expiresAt?: string | null;
  } | null;
  publishingCompliance?: PanelPublishingCompliance;
  royaltiesSummary?: PanelRoyaltySummary;
};

type PanelUserProfile = NonNullable<AuthUser["profile"]> & {
  publicBio?: string | null;
  publicPreferences?: string | null;
  showAvatar?: boolean;
  showPublicBio?: boolean;
  showPublicPreferences?: boolean;
};

type PanelAuthUser = AuthUser & {
  profile: PanelUserProfile | null;
};

export default function Panel() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Georgia, 'Times New Roman', serif", padding: "32px 40px" }}>Cargando panel...</main>}>
      <PanelContent />
    </Suspense>
  );
}

function PanelContent() {
  const searchParams = useSearchParams();
  const refreshKey = searchParams.toString();
  const [user, setUser] = useState<PanelAuthUser | null>(null);
  const [authorProfile, setAuthorProfile] = useState<PanelAuthorProfile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [submittingWorkId, setSubmittingWorkId] = useState<string | null>(null);
  const [pendingReviewWork, setPendingReviewWork] = useState<Work | null>(null);
  const [showReviewConfirmDialog, setShowReviewConfirmDialog] = useState(false);
  const [showReviewSuccessDialog, setShowReviewSuccessDialog] = useState(false);
  const [reviewDialogMessage, setReviewDialogMessage] = useState("");
  const [deletingWorkId, setDeletingWorkId] = useState<string | null>(null);
  const [pendingDeleteWork, setPendingDeleteWork] = useState<Work | null>(null);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showDeleteSuccessDialog, setShowDeleteSuccessDialog] = useState(false);
  const [deleteDialogMessage, setDeleteDialogMessage] = useState("");
  const [collaboratorForm, setCollaboratorForm] = useState({
    publicName: "",
    authorProfileType: "CERTIFIED" as "CERTIFIED" | "ANONYMOUS",
    legalName: "",
    taxIdLetters: "",
    taxIdDatePart: "",
    taxIdHomoclave: "",
    curp: "",
    dateOfBirth: "",
    payoutMethod: "BANK_TRANSFER_MX",
    accountHolder: "",
    bankName: "",
    clabe: "",
    accountNumber: "",
  });
  const [collaboratorActionState, setCollaboratorActionState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [collaboratorMessage, setCollaboratorMessage] = useState("");
  const [bankValidationActionState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bankValidationMessage] = useState("");
  const [microdepositForm, setMicrodepositForm] = useState({
    amount: "",
    referenceCode: "",
  });
  const [microdepositActionState, setMicrodepositActionState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [microdepositMessage, setMicrodepositMessage] = useState("");
  const [payoutRequests, setPayoutRequests] = useState<PanelPayoutRequest[]>([]);
  const [payoutActionState, setPayoutActionState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [payoutMessage, setPayoutMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordActionState, setPasswordActionState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [showPasswordConfirmDialog, setShowPasswordConfirmDialog] = useState(false);
  const [showPasswordSuccessDialog, setShowPasswordSuccessDialog] = useState(false);
  const [showLogoutConfirmDialog, setShowLogoutConfirmDialog] = useState(false);
  const [publicProfileForm, setPublicProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    country: "",
    publicBio: "",
    publicPreferences: "",
    showAvatar: false,
    showPublicBio: false,
    showPublicPreferences: false,
  });
  const [publicProfileActionState, setPublicProfileActionState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [publicProfileMessage, setPublicProfileMessage] = useState("");
  const [avatarUploadState, setAvatarUploadState] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    async function loadPanel() {
      const token = getStoredToken();

      if (!token) {
        setLoadState("error");
        setMessage("No hay sesion activa. Inicia sesion para ver tu panel.");
        return;
      }

      setLoadState("loading");

      try {
        const [me, author, workResponse] = await Promise.all([
          fetchMe(token),
          fetchMyAuthorProfile(token),
          fetchMyWorks(token),
        ]);
        const apiBaseUrl =
          process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";
        const payoutResponse = await fetch(`${apiBaseUrl}/royalties/me/payout-requests`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });
        const payoutPayload = (await payoutResponse.json().catch(() => null)) as
          | { items?: PanelPayoutRequest[]; message?: string | string[] }
          | null;

        setUser(me as PanelAuthUser);
        setPublicProfileForm(buildPublicProfileForm(me as PanelAuthUser));
        setAuthorProfile(author.authorProfile as PanelAuthorProfile | null);
        setCollaboratorForm(buildCollaboratorForm(author.authorProfile as PanelAuthorProfile | null));
        setWorks(workResponse.items);
        setPayoutRequests(Array.isArray(payoutPayload?.items) ? payoutPayload.items : []);
        setMessage("");

        setLoadState("ready");
      } catch (error) {
        const nextMessage = error instanceof Error ? error.message : "No fue posible cargar el panel.";
        const isAuthError = nextMessage.toLowerCase().includes("token") || nextMessage.toLowerCase().includes("sesion") || nextMessage.toLowerCase().includes("jwt") || nextMessage.toLowerCase().includes("unauthorized");

        if (isAuthError) {
          clearStoredToken();
        }

        setWorks([]);
        setLoadState("error");
        setMessage(nextMessage);
      }
    }

    loadPanel();
  }, [refreshKey]);

  async function reloadWorks() {
    const token = getStoredToken();
    if (!token) {
      return;
    }

    const response = await fetchMyWorks(token);
    setWorks(response.items);
  }

  function handleSubmitWorkForReview(work: Work) {
    setPendingReviewWork(work);
    setReviewDialogMessage("");
    setShowReviewConfirmDialog(true);
  }

  async function confirmSubmitWorkForReview() {
    const workId = pendingReviewWork?.id;
    const token = getStoredToken();

    if (!workId) {
      setShowReviewConfirmDialog(false);
      return;
    }

    if (!token) {
      setMessage("Tu sesion expiro. Inicia sesion de nuevo.");
      setShowReviewConfirmDialog(false);
      return;
    }

    setSubmittingWorkId(workId);
    setMessage("");

    try {
      const response = await submitWorkForReview(token, workId);
      setReviewDialogMessage(response.message);
      await reloadWorks();
      setShowReviewConfirmDialog(false);
      setShowReviewSuccessDialog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible enviar la obra a revision.");
      setShowReviewConfirmDialog(false);
    } finally {
      setSubmittingWorkId(null);
    }
  }

  function cancelSubmitWorkForReview() {
    setShowReviewConfirmDialog(false);
    setPendingReviewWork(null);
    setReviewDialogMessage("");
  }

  function closeReviewSuccessDialog() {
    setShowReviewSuccessDialog(false);
    setPendingReviewWork(null);
    setReviewDialogMessage("");
  }

  function handleDeleteWork(work: Work) {
    setPendingDeleteWork(work);
    setDeleteDialogMessage("");
    setShowDeleteConfirmDialog(true);
  }

  async function confirmDeleteWork() {
    const workId = pendingDeleteWork?.id;
    const token = getStoredToken();

    if (!workId) {
      setShowDeleteConfirmDialog(false);
      return;
    }

    if (!token) {
      setMessage("Tu sesion expiro. Inicia sesion de nuevo.");
      setShowDeleteConfirmDialog(false);
      return;
    }

    setDeletingWorkId(workId);
    setMessage("");

    try {
      const response = await deleteWork(token, workId);
      setDeleteDialogMessage(response.message);
      await reloadWorks();
      setShowDeleteConfirmDialog(false);
      setShowDeleteSuccessDialog(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible eliminar la obra.");
      setShowDeleteConfirmDialog(false);
    } finally {
      setDeletingWorkId(null);
    }
  }

  function cancelDeleteWork() {
    setShowDeleteConfirmDialog(false);
    setPendingDeleteWork(null);
    setDeleteDialogMessage("");
  }

  function closeDeleteSuccessDialog() {
    setShowDeleteSuccessDialog(false);
    setPendingDeleteWork(null);
    setDeleteDialogMessage("");
  }

  async function handleSaveCollaboratorProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!collaboratorForm.publicName.trim()) {
      setCollaboratorActionState("error");
      setCollaboratorMessage("Debes capturar tu nombre publico.");
      return;
    }

    if (!collaboratorForm.legalName.trim()) {
      setCollaboratorActionState("error");
      setCollaboratorMessage("Debes capturar tu nombre o razon social.");
      return;
    }

    const normalizedCurp = collaboratorForm.curp.trim().toUpperCase();
    if (!/^[A-Z]{4}[0-9]{6}[A-Z0-9]{8}$/.test(normalizedCurp)) {
      setCollaboratorActionState("error");
      setCollaboratorMessage("Captura una CURP valida de 18 caracteres.");
      return;
    }

    const normalizedDateOfBirth = parseDisplayedDateToIso(collaboratorForm.dateOfBirth);
    if (!normalizedDateOfBirth) {
      setCollaboratorActionState("error");
      setCollaboratorMessage("Debes capturar tu fecha de nacimiento con formato dd/mm/aaaa.");
      return;
    }

    if (!collaboratorForm.accountHolder.trim() || !collaboratorForm.bankName.trim()) {
      setCollaboratorActionState("error");
      setCollaboratorMessage("Completa el titular bancario y el nombre del banco.");
      return;
    }

    if (!/^[0-9]{18}$/.test(collaboratorForm.clabe.trim())) {
      setCollaboratorActionState("error");
      setCollaboratorMessage("La CLABE debe tener exactamente 18 digitos.");
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setCollaboratorActionState("error");
      setCollaboratorMessage("Tu sesion expiro. Inicia sesion de nuevo.");
      return;
    }

    setCollaboratorActionState("loading");
    setCollaboratorMessage("");

    try {
      const response = await applyAuthor(token, {
        publicName: collaboratorForm.publicName.trim(),
        authorProfileType: collaboratorForm.authorProfileType,
        legalName: collaboratorForm.legalName.trim(),
        taxIdLetters: collaboratorForm.taxIdLetters.trim().toUpperCase() || undefined,
        taxIdDatePart: collaboratorForm.taxIdDatePart.replace(/\D/g, "").slice(0, 6) || undefined,
        taxIdHomoclave: collaboratorForm.taxIdHomoclave.trim().toUpperCase() || undefined,
        curp: normalizedCurp,
        dateOfBirth: normalizedDateOfBirth,
        payoutMethod: collaboratorForm.payoutMethod,
        payoutAccountData: {
          accountHolder: collaboratorForm.accountHolder.trim(),
          bankName: collaboratorForm.bankName.trim(),
          clabe: collaboratorForm.clabe.trim(),
          accountNumber: collaboratorForm.accountNumber.trim(),
        },
      });

      setAuthorProfile(response.authorProfile as PanelAuthorProfile);
      setCollaboratorForm(buildCollaboratorForm(response.authorProfile as PanelAuthorProfile));
      setCollaboratorActionState("success");
      setCollaboratorMessage(response.message);
    } catch (error) {
      setCollaboratorActionState("error");
      setCollaboratorMessage(
        error instanceof Error ? error.message : "No fue posible actualizar tu perfil y datos bancarios.",
      );
    }
  }

  async function handleSavePublicProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getStoredToken();
    if (!token) {
      setPublicProfileActionState("error");
      setPublicProfileMessage("Tu sesion expiro. Inicia sesion de nuevo.");
      return;
    }

    setPublicProfileActionState("loading");
    setPublicProfileMessage("");

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";

      const response = await fetch(`${apiBaseUrl}/users/me/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: publicProfileForm.firstName.trim() || undefined,
          lastName: publicProfileForm.lastName.trim() || undefined,
          phone: publicProfileForm.phone.trim() || undefined,
          country: publicProfileForm.country.trim() || undefined,
          publicBio: publicProfileForm.publicBio.trim() || undefined,
          publicPreferences: publicProfileForm.publicPreferences.trim() || undefined,
          showAvatar: publicProfileForm.showAvatar,
          showPublicBio: publicProfileForm.showPublicBio,
          showPublicPreferences: publicProfileForm.showPublicPreferences,
        }),
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string | string[]; user?: PanelAuthUser }
        | null;
      const nextMessage = Array.isArray(payload?.message)
        ? payload.message.join(" ")
        : payload?.message ?? "No fue posible actualizar tu perfil publico.";

      if (!response.ok || !payload?.user) {
        throw new Error(nextMessage);
      }

      setUser(payload.user);
      setPublicProfileForm(buildPublicProfileForm(payload.user));

      const refreshedAuthorProfile = await fetchMyAuthorProfile(token);
      setAuthorProfile(refreshedAuthorProfile.authorProfile as PanelAuthorProfile | null);

      setPublicProfileActionState("success");
      setPublicProfileMessage(nextMessage);
    } catch (error) {
      setPublicProfileActionState("error");
      setPublicProfileMessage(
        error instanceof Error ? error.message : "No fue posible actualizar tu perfil publico.",
      );
    }
  }

  async function handleAvatarFileChange(file: File | null) {
    if (!file) {
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setPublicProfileActionState("error");
      setPublicProfileMessage("Tu sesion expiro. Inicia sesion de nuevo.");
      return;
    }

    setAvatarUploadState("loading");
    setPublicProfileActionState("idle");
    setPublicProfileMessage("");

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${apiBaseUrl}/users/me/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string | string[]; user?: PanelAuthUser }
        | null;
      const nextMessage = Array.isArray(payload?.message)
        ? payload.message.join(" ")
        : payload?.message ?? "No fue posible actualizar tu foto.";

      if (!response.ok || !payload?.user) {
        throw new Error(nextMessage);
      }

      setUser(payload.user);
      setPublicProfileForm(buildPublicProfileForm(payload.user));
      setAvatarUploadState("success");
      setPublicProfileActionState("success");
      setPublicProfileMessage(nextMessage);
    } catch (error) {
      setAvatarUploadState("error");
      setPublicProfileActionState("error");
      setPublicProfileMessage(
        error instanceof Error ? error.message : "No fue posible actualizar tu foto.",
      );
    }
  }

  async function handleDownloadWorkManuscript(workId: string) {
    const token = getStoredToken();
    if (!token) {
      setMessage("Tu sesion expiro. Inicia sesion de nuevo.");
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

  async function handleRequestRoyaltyPayout() {
    const token = getStoredToken();
    if (!token) {
      setPayoutActionState("error");
      setPayoutMessage("Tu sesion expiro. Inicia sesion de nuevo.");
      return;
    }

    setPayoutActionState("loading");
    setPayoutMessage("");

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";

      const response = await fetch(`${apiBaseUrl}/royalties/me/payout-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string | string[]; summary?: PanelRoyaltySummary; payoutRequest?: PanelPayoutRequest }
        | null;
      const nextMessage = Array.isArray(payload?.message)
        ? payload.message.join(" ")
        : payload?.message ?? "No fue posible solicitar el pago semanal de regalías.";

      if (!response.ok) {
        throw new Error(nextMessage);
      }

      const profileResponse = await fetchMyAuthorProfile(token);
      setAuthorProfile(profileResponse.authorProfile);

      const payoutListResponse = await fetch(`${apiBaseUrl}/royalties/me/payout-requests`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      const payoutListPayload = (await payoutListResponse.json().catch(() => null)) as
        | { items?: PanelPayoutRequest[] }
        | null;
      setPayoutRequests(Array.isArray(payoutListPayload?.items) ? payoutListPayload.items : []);

      setPayoutActionState("success");
      setPayoutMessage(nextMessage);
    } catch (error) {
      setPayoutActionState("error");
      setPayoutMessage(
        error instanceof Error ? error.message : "No fue posible solicitar el pago semanal de regalías.",
      );
    }
  }

  async function handleCancelRoyaltyPayout(payoutRequestId: string) {
    const token = getStoredToken();
    if (!token) {
      setPayoutActionState("error");
      setPayoutMessage("Tu sesion expiro. Inicia sesion de nuevo.");
      return;
    }

    setPayoutActionState("loading");
    setPayoutMessage("");

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";

      const response = await fetch(`${apiBaseUrl}/royalties/me/payout-requests/${payoutRequestId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string | string[] }
        | null;
      const nextMessage = Array.isArray(payload?.message)
        ? payload.message.join(" ")
        : payload?.message ?? "No fue posible cancelar la solicitud de pago.";

      if (!response.ok) {
        throw new Error(nextMessage);
      }

      const profileResponse = await fetchMyAuthorProfile(token);
      setAuthorProfile(profileResponse.authorProfile);

      const payoutListResponse = await fetch(`${apiBaseUrl}/royalties/me/payout-requests`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      const payoutListPayload = (await payoutListResponse.json().catch(() => null)) as
        | { items?: PanelPayoutRequest[] }
        | null;
      setPayoutRequests(Array.isArray(payoutListPayload?.items) ? payoutListPayload.items : []);

      setPayoutActionState("success");
      setPayoutMessage(nextMessage);
    } catch (error) {
      setPayoutActionState("error");
      setPayoutMessage(
        error instanceof Error ? error.message : "No fue posible cancelar la solicitud de pago.",
      );
    }
  }

  async function handleConfirmMicrodeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getStoredToken();
    if (!token) {
      setMicrodepositActionState("error");
      setMicrodepositMessage("Tu sesion expiro. Inicia sesion de nuevo.");
      return;
    }

    if (!microdepositForm.amount.trim() && !microdepositForm.referenceCode.trim()) {
      setMicrodepositActionState("error");
      setMicrodepositMessage("Captura el monto o la referencia del microdeposito.");
      return;
    }

    setMicrodepositActionState("loading");
    setMicrodepositMessage("");

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";

      const response = await fetch(
        `${apiBaseUrl}/authors/me/bank-validation/confirm-microdeposit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: microdepositForm.amount.trim() || undefined,
            referenceCode: microdepositForm.referenceCode.trim() || undefined,
          }),
          cache: "no-store",
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { message?: string | string[]; authorProfile?: AuthorProfile }
        | null;
      const nextMessage = Array.isArray(payload?.message)
        ? payload?.message.join(" ")
        : payload?.message ?? "No fue posible confirmar el microdeposito.";

      if (!response.ok) {
        throw new Error(nextMessage);
      }

      if (payload?.authorProfile) {
        setAuthorProfile(payload.authorProfile as PanelAuthorProfile);
        setCollaboratorForm(buildCollaboratorForm(payload.authorProfile as PanelAuthorProfile));
      }

      setMicrodepositActionState("success");
      setMicrodepositMessage(nextMessage);
      setMicrodepositForm({ amount: "", referenceCode: "" });
    } catch (error) {
      setMicrodepositActionState("error");
      setMicrodepositMessage(
        error instanceof Error ? error.message : "No fue posible confirmar el microdeposito.",
      );
    }
  }

  function logout() {
    clearStoredToken();
    window.location.href = "/login";
  }

  function cancelLogout() {
    setShowLogoutConfirmDialog(false);
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword) {
      setPasswordActionState("error");
      setPasswordMessage("Debes completar los tres campos para cambiar la contrasena.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordActionState("error");
      setPasswordMessage("La nueva contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordActionState("error");
      setPasswordMessage("La nueva contrasena y su confirmacion no coinciden.");
      return;
    }

    setPasswordActionState("idle");
    setPasswordMessage("");
    setShowPasswordConfirmDialog(true);
  }

  async function confirmChangePassword() {
    const token = getStoredToken();

    if (!token) {
      setPasswordActionState("error");
      setPasswordMessage("Tu sesion expiro. Inicia sesion de nuevo.");
      setShowPasswordConfirmDialog(false);
      return;
    }

    setPasswordActionState("loading");
    setPasswordMessage("");

    try {
      const response = await changePassword(token, passwordForm);
      setPasswordActionState("success");
      setPasswordMessage(response.message);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setShowPasswordConfirmDialog(false);
      setShowPasswordSuccessDialog(true);
    } catch (error) {
      setPasswordActionState("error");
      setPasswordMessage(error instanceof Error ? error.message : "No fue posible actualizar la contrasena.");
      setShowPasswordConfirmDialog(false);
    }
  }

  function cancelPasswordChange() {
    setShowPasswordConfirmDialog(false);
    setPasswordActionState("idle");
    setPasswordMessage("");
  }

  function closePasswordSuccessDialog() {
    setShowPasswordSuccessDialog(false);
    setPasswordActionState("idle");
    setPasswordMessage("");
  }

  const publishingCompliance: PanelPublishingCompliance =
    authorProfile?.publishingCompliance ?? buildPublishingCompliance(authorProfile);
  const royaltiesSummary: PanelRoyaltySummary =
    authorProfile?.royaltiesSummary ?? {
      confirmedSalesCount: 0,
      confirmedUnits: 0,
      grossSalesAmount: "0.00",
      royaltyGeneratedAmount: "0.00",
      platformShareAmount: "0.00",
      estimatedProcessorFeeAmount: "0.00",
      platformNetAmount: "0.00",
      authorParticipationPercent: "0.00",
      platformParticipationPercent: "0.00",
      reservedRoyaltyAmount: "0.00",
      paidRoyaltyAmount: "0.00",
      paidNetAmount: "0.00",
      availableRoyaltyAmount: "0.00",
      lastSaleAt: null,
      lastPayoutAt: null,
      economicOverview: {
        authorShareAmount: "0.00",
        platformShareAmount: "0.00",
        estimatedProcessorFeeAmount: "0.00",
        platformNetAmount: "0.00",
        authorParticipationPercent: "0.00",
        platformParticipationPercent: "0.00",
        processorFeeConfigured: false,
        processorFeePercent: "0.00",
        processorFeeFixedAmount: "0.00",
      },
      recentSales: [],
      payoutHistory: [],
    };
  const publishedWorks = works.filter((work) => work.status === "PUBLISHED").length;
  const editableWorks = works.filter((work) => work.status === "DRAFT" || work.status === "REJECTED").length;

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <SiteSectionHeader
        title="Mi panel"
        activeNav="panel"
        adminChips={buildAdminSectionChips("panel")}
        chips={[
          { label: "Mi cuenta", href: "#cuenta" },
          { label: "Perfil", href: "#perfil" },
          { label: "Regalias", href: "#regalias" },
          { label: "Mis obras", href: "#obras" },
        ]}
      />

      <SectionPageFrame
        sidebar={
          <>
            <SectionSidebarCard title="Resumen del panel">
              <p style={sidebarTextStyle}>Estado: <strong>{loadState === "loading" ? "Cargando" : loadState === "error" ? "Error" : "Listo"}</strong></p>
              <p style={sidebarTextStyle}>Correo verificado: <strong>{user?.emailVerifiedAt ? "Si" : "No"}</strong></p>
              <p style={sidebarTextStyle}>Perfil colaborador: <strong>{authorProfile ? "Activo" : "Preparando"}</strong></p>
              <p style={sidebarTextStyle}>Permiso para publicar: <strong>{publishingCompliance.canPublish ? "Habilitado" : "Pendiente"}</strong></p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Mi membresia">
              <div style={membershipSealStyle(authorProfile?.loyalty?.label ?? null)}>
                <span style={membershipSealLabelStyle}>Nivel actual</span>
                <strong style={membershipSealValueStyle}>
                  {authorProfile?.loyalty?.label ?? "Sin nivel"}{" "}
                  {authorProfile?.loyalty?.currentRatePercent ? `${authorProfile.loyalty.currentRatePercent}%` : ""}
                </strong>
                <p style={membershipSealMetaStyle}>
                  Puntos: <strong>{authorProfile?.loyalty?.points ?? 0}</strong>
                </p>
                <p style={membershipSealMetaStyle}>
                  {authorProfile?.loyalty?.nextLevelLabel
                    ? `Te faltan ${authorProfile.loyalty.pointsToNextLevel} puntos para ${authorProfile.loyalty.nextLevelLabel}.`
                    : "Ya estas en tu nivel maximo actual."}
                </p>
                <a href="#perfil-membresia" style={membershipSealLinkStyle}>
                  Ver detalle
                </a>
              </div>
            </SectionSidebarCard>
            <SectionSidebarCard title="Guia rapida">
              <p style={sidebarTextStyle}>1. Revisa tu cuenta y ajusta tu acceso.</p>
              <p style={sidebarTextStyle}>2. Completa tu perfil colaborador para vender.</p>
              <p style={sidebarTextStyle}>3. Sigue tus regalías y el estado de tus obras.</p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Resumen comercial">
              <p style={sidebarTextStyle}>Ventas confirmadas: <strong>{royaltiesSummary.confirmedSalesCount}</strong></p>
              <p style={sidebarTextStyle}>Regalias generadas: <strong>{formatMxCurrency(royaltiesSummary.royaltyGeneratedAmount)}</strong></p>
              <p style={sidebarTextStyle}>Disponible: <strong>{formatMxCurrency(royaltiesSummary.availableRoyaltyAmount)}</strong></p>
              <p style={sidebarTextStyle}>Obras publicadas: <strong>{publishedWorks}</strong></p>
            </SectionSidebarCard>
          </>
        }
      >
        {message ? <div style={feedbackStyle(loadState === "error")}>{message}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px" }}>
          {[
            { label: "Estado de carga", value: loadState === "loading" ? "Cargando" : loadState === "error" ? "Error" : "Listo" },
            { label: "Correo verificado", value: user?.emailVerifiedAt ? "Si" : "No" },
            { label: "Capacidades", value: user ? "Comprar y publicar" : "..." },
            { label: "Perfil colaborador", value: authorProfile ? "Activo" : "Preparando" },
          ].map((item) => (
            <div key={item.label} style={metricCardStyle}>
              <p style={{ color: "#93908B", fontSize: "12px", marginBottom: "8px" }}>{item.label}</p>
              <p style={{ color: "#013473", fontSize: "15px", fontWeight: "bold", lineHeight: "1.3" }}>{item.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px", alignItems: "start" }}>
          <section id="cuenta" style={{ ...cardStyle, order: 2 }}>
            <h2 style={cardTitleStyle}>Mi cuenta</h2>
            {user ? (
              <div style={{ display: "grid", gap: "16px", maxWidth: "620px" }}>
                <div style={{ color: "#333333", fontSize: "13px", lineHeight: "1.75" }}>
                  <p><strong>ID:</strong> {user.id}</p>
                  <p><strong>Correo:</strong> {user.email}</p>
                  <p><strong>Estatus:</strong> {user.status}</p>
                  <p><strong>Cuenta:</strong> {user.accountLabel}</p>
                  <p><strong>Etiqueta principal:</strong> {user.primaryAdministrativeLabel}</p>
                  <p><strong>Etiquetas administrativas:</strong> {user.administrativeLabels.join(", ")}</p>
                  <p><strong>Creado:</strong> {new Date(user.createdAt).toLocaleString("es-MX")}</p>
                </div>

                <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "14px" }}>
                  <div style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
                    <h3 style={{ color: "#013473", fontSize: "16px", margin: 0 }}>Cambiar contrasena</h3>
                    <p style={{ color: "#666666", fontSize: "12px", margin: 0, lineHeight: "1.65" }}>
                      Actualiza tu acceso desde aqui sin salir del panel.
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} style={{ display: "grid", gap: "10px", maxWidth: "560px" }}>
                    <PasswordField
                      placeholder="Contrasena actual"
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                      }
                      required
                      minLength={8}
                      autoComplete="current-password"
                      style={inputStyle}
                    />
                    <PasswordField
                      placeholder="Nueva contrasena"
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                      }
                      required
                      minLength={8}
                      autoComplete="new-password"
                      style={inputStyle}
                    />
                    <PasswordField
                      placeholder="Confirmar nueva contrasena"
                      value={passwordForm.confirmNewPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({ ...current, confirmNewPassword: event.target.value }))
                      }
                      required
                      minLength={8}
                      autoComplete="new-password"
                      style={inputStyle}
                    />
                    <button
                      type="submit"
                      disabled={passwordActionState === "loading"}
                      style={{
                        backgroundColor: passwordActionState === "loading" ? "#5c6f8f" : "#013473",
                        color: "#ffffff",
                        padding: "10px 16px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: passwordActionState === "loading" ? "wait" : "pointer",
                        fontFamily: "Georgia, serif",
                        width: "fit-content",
                      }}
                    >
                      {passwordActionState === "loading" ? "Actualizando..." : "Cambiar contrasena"}
                    </button>
                  </form>
                  {passwordMessage ? (
                    <div style={{ marginTop: "12px" }}>
                      <div style={feedbackStyle(passwordActionState === "error")}>{passwordMessage}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <p style={{ color: "#666666" }}>Cargando datos de la cuenta...</p>
            )}
          </section>

          <section id="perfil" style={{ ...cardStyle, order: 1 }}>
            <h2 style={cardTitleStyle}>Perfil colaborador</h2>
            {authorProfile ? (
              <div style={{ display: "grid", gap: "12px" }}>
                <p style={{ color: "#5f6368", margin: 0, fontSize: "13px", lineHeight: "1.75" }}>
                  Tu cuenta ya funciona como una sola figura para comprar y publicar. Antes de enviar obras a revision
                  debes tener completo tu perfil de colaborador, tus datos bancarios y la validacion bancaria aprobada.
                </p>

                <div style={{ ...miniMetricCardStyle, backgroundColor: "#f7f9fc", padding: "18px" }}>
                  <div style={{ display: "grid", gap: "8px", marginBottom: "14px" }}>
                    <h3 style={{ color: "#013473", fontSize: "18px", margin: 0 }}>Perfil publico</h3>
                    <p style={{ color: "#5f6368", margin: 0, fontSize: "13px", lineHeight: "1.7" }}>
                      Aqui decides que foto y que datos quieres mostrar en tu perfil. Esto aplica igual para socios y cuentas administrativas.
                    </p>
                  </div>

                  <form onSubmit={handleSavePublicProfile} style={{ display: "grid", gap: "14px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "180px minmax(0, 1fr)", gap: "18px", alignItems: "start" }}>
                      <div style={{ display: "grid", gap: "10px", justifyItems: "center" }}>
                        {user?.profile?.avatarUrl ? (
                          <img
                            src={user.profile.avatarUrl}
                            alt="Foto de perfil"
                            style={{ width: "136px", height: "136px", borderRadius: "50%", objectFit: "cover", border: "3px solid #d8e2ef" }}
                          />
                        ) : (
                          <div style={{ width: "136px", height: "136px", borderRadius: "50%", backgroundColor: "#013473", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "34px", fontWeight: "bold" }}>
                            {buildUserInitials(user)}
                          </div>
                        )}
                        <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", backgroundColor: avatarUploadState === "loading" ? "#5c6f8f" : "#013473", color: "#ffffff", borderRadius: "999px", padding: "10px 16px", cursor: avatarUploadState === "loading" ? "wait" : "pointer", fontSize: "13px" }}>
                          {avatarUploadState === "loading" ? "Subiendo foto..." : "Subir o cambiar foto"}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            disabled={avatarUploadState === "loading"}
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              void handleAvatarFileChange(file);
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                        <SwitchRow
                          label="Mostrar foto"
                          checked={publicProfileForm.showAvatar}
                          onChange={(checked) =>
                            setPublicProfileForm((current) => ({ ...current, showAvatar: checked }))
                          }
                        />
                      </div>

                      <div style={{ display: "grid", gap: "12px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <input
                            type="text"
                            placeholder="Nombre"
                            value={publicProfileForm.firstName}
                            onChange={(event) =>
                              setPublicProfileForm((current) => ({ ...current, firstName: event.target.value }))
                            }
                            style={inputStyle}
                          />
                          <input
                            type="text"
                            placeholder="Apellidos"
                            value={publicProfileForm.lastName}
                            onChange={(event) =>
                              setPublicProfileForm((current) => ({ ...current, lastName: event.target.value }))
                            }
                            style={inputStyle}
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <input
                            type="text"
                            placeholder="Telefono"
                            value={publicProfileForm.phone}
                            onChange={(event) =>
                              setPublicProfileForm((current) => ({ ...current, phone: event.target.value }))
                            }
                            style={inputStyle}
                          />
                          <input
                            type="text"
                            placeholder="Pais"
                            value={publicProfileForm.country}
                            onChange={(event) =>
                              setPublicProfileForm((current) => ({ ...current, country: event.target.value }))
                            }
                            style={inputStyle}
                          />
                        </div>

                        <textarea
                          placeholder="Biografia publica"
                          value={publicProfileForm.publicBio}
                          onChange={(event) =>
                            setPublicProfileForm((current) => ({ ...current, publicBio: event.target.value }))
                          }
                          style={{ ...textareaStyle, minHeight: "120px" }}
                        />
                        <SwitchRow
                          label="Mostrar biografia"
                          checked={publicProfileForm.showPublicBio}
                          onChange={(checked) =>
                            setPublicProfileForm((current) => ({ ...current, showPublicBio: checked }))
                          }
                        />

                        <textarea
                          placeholder="Gustos, preferencias u otros datos que quieras mostrar"
                          value={publicProfileForm.publicPreferences}
                          onChange={(event) =>
                            setPublicProfileForm((current) => ({ ...current, publicPreferences: event.target.value }))
                          }
                          style={{ ...textareaStyle, minHeight: "110px" }}
                        />
                        <SwitchRow
                          label="Mostrar gustos y preferencias"
                          checked={publicProfileForm.showPublicPreferences}
                          onChange={(checked) =>
                            setPublicProfileForm((current) => ({ ...current, showPublicPreferences: checked }))
                          }
                        />
                      </div>
                    </div>

                    <div style={{ ...miniMetricCardStyle, backgroundColor: "#ffffff" }}>
                      <p style={{ color: "#013473", margin: 0, fontSize: "13px", lineHeight: "1.7" }}>
                        Vista previa de visibilidad:
                        {" "}
                        foto {publicProfileForm.showAvatar ? "visible" : "oculta"},
                        {" "}
                        biografia {publicProfileForm.showPublicBio ? "visible" : "oculta"},
                        {" "}
                        preferencias {publicProfileForm.showPublicPreferences ? "visibles" : "ocultas"}.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={publicProfileActionState === "loading"}
                      style={{
                        backgroundColor: publicProfileActionState === "loading" ? "#5c6f8f" : "#013473",
                        color: "#ffffff",
                        padding: "10px 16px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: publicProfileActionState === "loading" ? "wait" : "pointer",
                        fontFamily: "Georgia, serif",
                        width: "fit-content",
                      }}
                    >
                      {publicProfileActionState === "loading" ? "Guardando perfil publico..." : "Guardar perfil publico"}
                    </button>

                    {publicProfileMessage ? (
                      <div style={feedbackStyle(publicProfileActionState === "error")}>{publicProfileMessage}</div>
                    ) : null}
                  </form>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px" }}>
                  <div style={miniMetricCardStyle}>
                    <p style={{ color: "#93908B", fontSize: "12px", marginBottom: "8px" }}>Datos del perfil</p>
                    <p style={{ color: publishingCompliance.hasFiscalData ? "#2E7D32" : "#b71c1c", fontSize: "16px", fontWeight: "bold", margin: 0 }}>
                      {publishingCompliance.hasFiscalData ? "Validados" : "Pendientes"}
                    </p>
                  </div>
                  <div style={miniMetricCardStyle}>
                    <p style={{ color: "#93908B", fontSize: "12px", marginBottom: "8px" }}>Cuenta bancaria</p>
                    <p style={{ color: publishingCompliance.hasBankingData ? "#2E7D32" : "#b71c1c", fontSize: "16px", fontWeight: "bold", margin: 0 }}>
                      {publishingCompliance.hasBankingData ? "Capturada" : "Pendiente"}
                    </p>
                  </div>
                  <div style={miniMetricCardStyle}>
                    <p style={{ color: "#93908B", fontSize: "12px", marginBottom: "8px" }}>Permiso para publicar</p>
                    <p style={{ color: publishingCompliance.canPublish ? "#2E7D32" : "#b71c1c", fontSize: "16px", fontWeight: "bold", margin: 0 }}>
                      {publishingCompliance.canPublish ? "Habilitado" : "Bloqueado"}
                    </p>
                  </div>
                  <div style={miniMetricCardStyle}>
                    <p style={{ color: "#93908B", fontSize: "12px", marginBottom: "8px" }}>Validacion bancaria</p>
                    <p style={{ color: bankValidationStatusColor(publishingCompliance.bankValidationStatus), fontSize: "16px", fontWeight: "bold", margin: 0 }}>
                      {formatPanelBankValidationStatus(publishingCompliance.bankValidationStatus)}
                    </p>
                  </div>
                </div>

                {!publishingCompliance.canPublish ? (
                  <div style={rejectedBoxStyle}>
                    <p style={{ color: "#b71c1c", fontWeight: "bold", margin: "0 0 6px 0" }}>
                      Para poder vender, falta completar tu perfil y datos bancarios
                    </p>
                    <p style={{ color: "#7a2d2d", margin: 0, fontSize: "12px", lineHeight: "1.65" }}>
                      Completa estos datos para poder enviar obras a revision y permitir su publicacion:
                      {" "}
                      {publishingCompliance.missingFields.join(", ")}.
                    </p>
                  </div>
                ) : (
                  <div style={approvedBoxStyle}>
                    <p style={{ color: "#2E7D32", fontWeight: "bold", margin: "0 0 6px 0" }}>
                      Perfil y datos bancarios listos
                    </p>
                    <p style={{ color: "#2E7D32", margin: 0, fontSize: "12px", lineHeight: "1.65" }}>
                      Ya puedes enviar obras a revision. La validacion bancaria formal queda lista para una etapa futura, pero por ahora no bloquea tu operacion.
                    </p>
                  </div>
                )}

                <div style={{ ...miniMetricCardStyle, backgroundColor: "#f5f8ff" }}>
                  <p style={{ color: "#013473", margin: 0, fontSize: "12px", lineHeight: "1.7" }}>
                    La CURP y la fecha de nacimiento son obligatorias para vender. El RFC es opcional: si no lo capturas,
                    el sistema conserva una referencia derivada interna mientras completas tu perfil.
                  </p>
                </div>

                {publishingCompliance.hasBankingData ? (
                  <div style={{ ...miniMetricCardStyle, backgroundColor: "#fffdf3" }}>
                    {(() => {
                      const latestAttempt = authorProfile?.latestBankValidationAttempt;
                      const latestAttemptExpiresAt = latestAttempt?.expiresAt ?? null;
                      const microdepositSent = latestAttempt?.status === "MICRODEPOSIT_SENT";
                      return (
                        <>
                    <p style={{ color: "#7a5600", margin: "0 0 8px 0", fontSize: "12px", lineHeight: "1.7" }}>
                      {publishingCompliance.bankValidationStatus === "VALIDATED"
                        ? "Tus datos bancarios ya quedaron listos. Por ahora la plataforma toma esta cuenta como validada en automatico y deja la validacion formal para una etapa futura."
                        : publishingCompliance.bankValidationStatus === "PENDING_VALIDATION"
                          ? "Tu validacion bancaria esta en proceso. Si ya recibiste el microdeposito, confirma el monto o la referencia aqui mismo."
                          : publishingCompliance.bankValidationStatus === "REJECTED"
                            ? "La validacion bancaria fue rechazada. Revisa tus datos, ajustalos si hace falta y vuelve a solicitar la revision."
                            : "Tus datos bancarios ya quedaron capturados. Ahora puedes solicitar la validacion bancaria para que administracion revise o inicie el microdeposito."}
                    </p>
                    {microdepositSent ? (
                      <div style={{ display: "grid", gap: "12px", marginBottom: "12px" }}>
                        <div style={{ color: "#7a5600", fontSize: "13px", lineHeight: "1.8" }}>
                          <p style={{ margin: 0 }}>
                            Referencia del intento: <strong>{latestAttempt?.referenceHint ?? "Sin referencia"}</strong>
                          </p>
                          <p style={{ margin: "4px 0 0 0" }}>
                            Revisa tu banca y localiza el microdeposito recibido para confirmar el monto o la referencia.
                          </p>
                          <p style={{ margin: "4px 0 0 0" }}>
                            Vence:{" "}
                            <strong>
                              {latestAttemptExpiresAt
                                ? new Date(String(latestAttemptExpiresAt)).toLocaleString("es-MX")
                                : "sin fecha"}
                            </strong>
                          </p>
                        </div>

                        <form onSubmit={handleConfirmMicrodeposit} style={{ display: "grid", gap: "12px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <input
                              type="text"
                              placeholder="Monto recibido, por ejemplo 0.34"
                              value={microdepositForm.amount}
                              onChange={(event) =>
                                setMicrodepositForm((current) => ({ ...current, amount: event.target.value }))
                              }
                              style={inputStyle}
                            />
                            <input
                              type="text"
                              placeholder="Referencia recibida"
                              value={microdepositForm.referenceCode}
                              onChange={(event) =>
                                setMicrodepositForm((current) => ({
                                  ...current,
                                  referenceCode: event.target.value.toUpperCase(),
                                }))
                              }
                              style={inputStyle}
                            />
                          </div>
                          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                            <button
                              type="submit"
                              disabled={microdepositActionState === "loading"}
                              style={{
                                backgroundColor: microdepositActionState === "loading" ? "#b59b4b" : "#9a7b17",
                                color: "#ffffff",
                                padding: "10px 16px",
                                border: "none",
                                borderRadius: "4px",
                                cursor: microdepositActionState === "loading" ? "wait" : "pointer",
                                fontFamily: "Georgia, serif",
                              }}
                            >
                              {microdepositActionState === "loading" ? "Confirmando..." : "Confirmar microdeposito"}
                            </button>
                            <span style={{ color: "#7a5600", fontSize: "12px" }}>
                              Puedes confirmar con el monto o con la referencia.
                            </span>
                          </div>
                        </form>
                        {microdepositMessage ? (
                          <div style={feedbackStyle(microdepositActionState === "error")}>{microdepositMessage}</div>
                        ) : null}
                      </div>
                    ) : null}
                    {bankValidationMessage ? (
                      <div style={{ marginTop: "12px" }}>
                        <div style={feedbackStyle(bankValidationActionState === "error")}>{bankValidationMessage}</div>
                      </div>
                    ) : null}
                        </>
                      );
                    })()}
                  </div>
                ) : null}

                <form onSubmit={handleSaveCollaboratorProfile} style={{ display: "grid", gap: "10px", maxWidth: "720px" }}>
                  <div style={{ maxWidth: "280px" }}>
                    <input
                      type="text"
                      placeholder="Nombre publico"
                      value={collaboratorForm.publicName}
                      onChange={(event) =>
                        setCollaboratorForm((current) => ({ ...current, publicName: event.target.value }))
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                    <input
                      type="text"
                      placeholder="Nombre o razon social"
                      value={collaboratorForm.legalName}
                      onChange={(event) =>
                        setCollaboratorForm((current) => ({ ...current, legalName: event.target.value }))
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                    <input
                      type="text"
                      placeholder="CURP"
                      value={collaboratorForm.curp}
                      onChange={(event) =>
                        setCollaboratorForm((current) => ({ ...current, curp: event.target.value.toUpperCase() }))
                      }
                      style={inputStyle}
                      maxLength={18}
                    />
                  </div>

                  <div style={{ maxWidth: "280px" }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="dd/mm/aaaa"
                      value={collaboratorForm.dateOfBirth}
                      onChange={(event) =>
                        setCollaboratorForm((current) => ({
                          ...current,
                          dateOfBirth: normalizeDisplayedDateInput(event.target.value),
                        }))
                      }
                      style={inputStyle}
                      maxLength={10}
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 88px 124px 110px",
                      gap: "8px",
                      alignItems: "center",
                      justifyContent: "start",
                    }}
                  >
                    <div style={{ color: "#111111", fontSize: "15px", whiteSpace: "nowrap" }}>R.F.C.</div>
                    <input
                      type="text"
                      placeholder="letras"
                      value={collaboratorForm.taxIdLetters}
                      onChange={(event) =>
                        setCollaboratorForm((current) => ({
                          ...current,
                          taxIdLetters: event.target.value.toUpperCase().replace(/[^A-Z&Ñ]/g, "").slice(0, 4),
                        }))
                      }
                      style={inputStyle}
                      maxLength={4}
                    />
                    <input
                      type="text"
                      placeholder="AAMMDD"
                      value={collaboratorForm.taxIdDatePart}
                      onChange={(event) =>
                        setCollaboratorForm((current) => ({
                          ...current,
                          taxIdDatePart: event.target.value.replace(/\D/g, "").slice(0, 6),
                        }))
                      }
                      style={inputStyle}
                      maxLength={6}
                    />
                    <input
                      type="text"
                      placeholder="Homoclave"
                      value={collaboratorForm.taxIdHomoclave}
                      onChange={(event) =>
                        setCollaboratorForm((current) => ({
                          ...current,
                          taxIdHomoclave: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3),
                        }))
                      }
                      style={inputStyle}
                      maxLength={3}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 240px", gap: "10px" }}>
                    <input
                      type="text"
                      placeholder="Metodo de pago"
                      value="Transferencia bancaria MX"
                      disabled
                      style={{ ...inputStyle, backgroundColor: "#f8f9fa", color: "#666666" }}
                    />
                    <div style={{ ...inputStyle, backgroundColor: "#f8f9fa", color: "#666666", display: "flex", alignItems: "center" }}>
                      RFC capturado: {buildDisplayedTaxId(collaboratorForm) || "pendiente"}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <input
                      type="text"
                      placeholder="Titular de la cuenta"
                      value={collaboratorForm.accountHolder}
                      onChange={(event) =>
                        setCollaboratorForm((current) => ({ ...current, accountHolder: event.target.value }))
                      }
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      placeholder="Banco"
                      value={collaboratorForm.bankName}
                      onChange={(event) =>
                        setCollaboratorForm((current) => ({ ...current, bankName: event.target.value }))
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <input
                      type="text"
                      placeholder="CLABE (18 digitos)"
                      value={collaboratorForm.clabe}
                      onChange={(event) =>
                        setCollaboratorForm((current) => ({
                          ...current,
                          clabe: event.target.value.replace(/\D/g, "").slice(0, 18),
                        }))
                      }
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      placeholder="Numero de cuenta (opcional)"
                      value={collaboratorForm.accountNumber}
                      onChange={(event) =>
                        setCollaboratorForm((current) => ({ ...current, accountNumber: event.target.value }))
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ color: "#333333", fontSize: "13px", lineHeight: "1.7" }}>
                    <p><strong>Tipo de perfil:</strong> {authorProfile.authorProfileType}</p>
                    <p><strong>Estado interno:</strong> {authorProfile.applicationStatus}</p>
                    <p><strong>RFC activo:</strong> {authorProfile?.taxId ?? "Sin RFC capturado"}</p>
                    <p><strong>Origen RFC:</strong> {taxIdSourceLabel(authorProfile?.taxIdSource)}</p>
                    <p><strong>Estado bancario:</strong> {publishingCompliance.hasBankingData ? "Capturada" : "Pendiente"}</p>
                    <p><strong>Validacion bancaria:</strong> {formatPanelBankValidationStatus(publishingCompliance.bankValidationStatus)}</p>
                    <p><strong>Comision actual:</strong> {authorProfile.royaltyRatePercent ?? "0.00"}%</p>
                    <p><strong>Correo vinculado:</strong> {authorProfile.userEmail ?? user?.email ?? "Sin correo"}</p>
                  </div>

                  <div id="perfil-membresia" style={membershipDetailBoxStyle}>
                    <p style={membershipDetailTitleStyle}>Detalle de membresia</p>
                    <p style={membershipDetailTextStyle}>
                      <strong>Nivel actual:</strong> {authorProfile?.loyalty?.label ?? "Sin nivel"}
                    </p>
                    <p style={membershipDetailTextStyle}>
                      <strong>Porcentaje asociado:</strong> {authorProfile?.loyalty?.currentRatePercent ? `${authorProfile.loyalty.currentRatePercent}%` : "No definido"}
                    </p>
                    <p style={membershipDetailTextStyle}>
                      <strong>Puntos acumulados:</strong> {authorProfile?.loyalty?.points ?? 0}
                    </p>
                    <p style={membershipDetailTextStyle}>
                      <strong>Siguiente categoria:</strong> {authorProfile?.loyalty?.nextLevelLabel ?? "Maximo actual"}
                    </p>
                    <p style={membershipDetailTextStyle}>
                      <strong>Puntos faltantes:</strong> {authorProfile?.loyalty?.nextLevelLabel ? authorProfile.loyalty.pointsToNextLevel : 0}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={collaboratorActionState === "loading"}
                    style={{
                      backgroundColor: collaboratorActionState === "loading" ? "#5c6f8f" : "#013473",
                      color: "#ffffff",
                      padding: "10px 16px",
                      border: "none",
                      borderRadius: "4px",
                      cursor: collaboratorActionState === "loading" ? "wait" : "pointer",
                      fontFamily: "Georgia, serif",
                      width: "fit-content",
                    }}
                  >
                    {collaboratorActionState === "loading"
                      ? "Guardando datos..."
                      : "Guardar perfil y datos bancarios"}
                  </button>

                  {collaboratorMessage ? (
                    <div style={feedbackStyle(collaboratorActionState === "error")}>{collaboratorMessage}</div>
                  ) : null}
                </form>
              </div>
            ) : (
              <p style={{ color: "#666666", fontSize: "14px", lineHeight: "1.8", margin: 0 }}>
                Estamos preparando tu perfil colaborador. Recarga el panel en unos segundos si acabas de crear tu cuenta.
              </p>
            )}
          </section>
        </div>

        <section id="regalias" style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", flexWrap: "wrap", marginBottom: "16px" }}>
            <div>
              <h2 style={cardTitleStyle}>Economia del autor</h2>
              <p style={{ color: "#666666", margin: 0, lineHeight: "1.65", fontSize: "13px" }}>
                Aqui ves la foto economica de tus ventas: cuanto entra, cuanto corresponde a tu regalia, cuanto retiene EditorialHub y cual es el costo estimado del procesador cuando exista configuracion.
              </p>
            </div>
            <div style={royaltySummaryPillStyle}>
              Tasa actual: {authorProfile?.royaltyRatePercent ?? "0.00"}%
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "10px", marginBottom: "18px" }}>
            {[
              { label: "Ventas confirmadas", value: String(royaltiesSummary.confirmedSalesCount) },
              { label: "Ingresos brutos", value: formatMxCurrency(royaltiesSummary.grossSalesAmount) },
              { label: "Parte del autor", value: formatMxCurrency(royaltiesSummary.economicOverview.authorShareAmount) },
              { label: "Parte EditorialHub", value: formatMxCurrency(royaltiesSummary.economicOverview.platformShareAmount) },
              { label: "Procesador estimado", value: formatMxCurrency(royaltiesSummary.economicOverview.estimatedProcessorFeeAmount) },
              { label: "Disponible", value: formatMxCurrency(royaltiesSummary.availableRoyaltyAmount) },
            ].map((item) => (
              <div key={item.label} style={miniMetricCardStyle}>
                <p style={{ color: "#93908B", fontSize: "12px", marginBottom: "8px" }}>{item.label}</p>
                <p style={{ color: "#013473", fontSize: "18px", fontWeight: "bold", margin: 0 }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)", gap: "16px" }}>
            <div style={royaltyBoxStyle}>
              <h3 style={royaltyBoxTitleStyle}>Ventas recientes</h3>
              {royaltiesSummary.recentSales.length === 0 ? (
                <p style={royaltyEmptyStyle}>Todavia no tienes ventas confirmadas. Cuando empiecen a entrar compras, aqui veras el detalle.</p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {royaltiesSummary.recentSales.map((sale) => (
                    <div key={sale.purchaseId} style={royaltyEntryStyle}>
                      <p style={royaltyEntryTitleStyle}>{sale.workTitle}</p>
                      <p style={royaltyEntryMetaStyle}>
                        Folio {sale.folio} | Vendida el {new Date(sale.soldAt).toLocaleString("es-MX")}
                      </p>
                      <p style={royaltyEntryMetaStyle}>
                        Venta: {formatMxCurrency(sale.unitPrice)} | Autor: {formatMxCurrency(sale.authorNetAmount)} ({sale.royaltyRatePercent}%)
                      </p>
                      <p style={royaltyEntryMetaStyle}>
                        EditorialHub: {formatMxCurrency(sale.platformAmount)} | Procesador estimado: {formatMxCurrency(sale.estimatedProcessorFeeAmount)}
                      </p>
                      <p style={royaltyEntryMetaStyle}>
                        Margen plataforma estimado: {formatMxCurrency(sale.platformNetAmount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={royaltyBoxStyle}>
              <h3 style={royaltyBoxTitleStyle}>Lectura economica y pagos</h3>
              <div style={{ display: "grid", gap: "10px" }}>
                <p style={royaltyStatusLineStyle}>
                  <strong>Participacion autor:</strong> {royaltiesSummary.economicOverview.authorParticipationPercent}%
                </p>
                <p style={royaltyStatusLineStyle}>
                  <strong>Participacion EditorialHub:</strong> {royaltiesSummary.economicOverview.platformParticipationPercent}%
                </p>
                <p style={royaltyStatusLineStyle}>
                  <strong>Margen plataforma estimado:</strong> {formatMxCurrency(royaltiesSummary.economicOverview.platformNetAmount)}
                </p>
                <p style={royaltyStatusLineStyle}>
                  <strong>Apartado/solicitado:</strong> {formatMxCurrency(royaltiesSummary.reservedRoyaltyAmount)}
                </p>
                <p style={royaltyStatusLineStyle}>
                  <strong>Pagado bruto:</strong> {formatMxCurrency(royaltiesSummary.paidRoyaltyAmount)}
                </p>
                <p style={royaltyStatusLineStyle}>
                  <strong>Pagado neto:</strong> {formatMxCurrency(royaltiesSummary.paidNetAmount)}
                </p>
                <p style={royaltyStatusLineStyle}>
                  <strong>Ultima venta:</strong> {royaltiesSummary.lastSaleAt ? new Date(royaltiesSummary.lastSaleAt).toLocaleString("es-MX") : "Sin ventas todavia"}
                </p>
                <p style={royaltyStatusLineStyle}>
                  <strong>Ultimo pago:</strong> {royaltiesSummary.lastPayoutAt ? new Date(royaltiesSummary.lastPayoutAt).toLocaleString("es-MX") : "Sin pagos registrados"}
                </p>
              </div>

              <div style={{ ...miniMetricCardStyle, backgroundColor: "#f5f8ff", marginTop: "6px" }}>
                <p style={{ color: "#013473", margin: 0, fontSize: "13px", lineHeight: "1.8" }}>
                  {royaltiesSummary.economicOverview.processorFeeConfigured
                    ? `Costo de procesador estimado con regla activa: ${royaltiesSummary.economicOverview.processorFeePercent}% + MXN ${royaltiesSummary.economicOverview.processorFeeFixedAmount} por operacion.`
                    : "El costo de procesador aun no tiene una regla configurada en entorno, asi que por ahora este estimado aparece en cero y debe tomarse como referencia pendiente de afinar."}
                </p>
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handleRequestRoyaltyPayout}
                  disabled={payoutActionState === "loading" || Number.parseFloat(royaltiesSummary.availableRoyaltyAmount) <= 0 || payoutRequests.some((item) => item.status === "REQUESTED" || item.status === "SCHEDULED")}
                  style={royaltyPrimaryButtonStyle(
                    payoutActionState === "loading" || Number.parseFloat(royaltiesSummary.availableRoyaltyAmount) <= 0 || payoutRequests.some((item) => item.status === "REQUESTED" || item.status === "SCHEDULED"),
                  )}
                >
                  {payoutActionState === "loading" ? "Solicitando..." : "Solicitar pago semanal"}
                </button>
                <span style={{ color: "#6b7280", fontSize: "12px", lineHeight: "1.6" }}>
                  Corte: jueves 23:59:59. Pago operativo: viernes después de las 12:00.
                </span>
              </div>
              {payoutMessage ? <div style={feedbackStyle(payoutActionState === "error")}>{payoutMessage}</div> : null}
            </div>
          </div>

          <div style={{ ...royaltyBoxStyle, marginTop: "16px" }}>
            <h3 style={royaltyBoxTitleStyle}>Solicitudes de pago</h3>
            {payoutRequests.length === 0 ? (
              <p style={royaltyEmptyStyle}>Todavia no has solicitado pagos de regalías.</p>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {payoutRequests.map((request) => (
                  <div key={request.id} style={royaltyEntryStyle}>
                    <p style={royaltyEntryTitleStyle}>
                      {formatMxCurrency(request.netAmount)} | {payoutStatusLabel(request.status)}
                    </p>
                    <p style={royaltyEntryMetaStyle}>
                      Solicitado: {new Date(request.requestedAt).toLocaleString("es-MX")}
                      {request.scheduledFor ? ` | Programado: ${new Date(request.scheduledFor).toLocaleString("es-MX")}` : ""}
                      {request.paidAt ? ` | Pagado: ${new Date(request.paidAt).toLocaleString("es-MX")}` : ""}
                    </p>
                    <p style={royaltyEntryMetaStyle}>{payoutStatusDescription(request.status)}</p>
                    {request.providerReference ? (
                      <p style={royaltyEntryMetaStyle}>Referencia operativa: {request.providerReference}</p>
                    ) : null}
                    {request.notes ? <p style={royaltyEntryMetaStyle}>Notas: {request.notes}</p> : null}
                    {request.status === "REQUESTED" ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => handleCancelRoyaltyPayout(request.id)}
                          disabled={payoutActionState === "loading"}
                          style={royaltySecondaryButtonStyle(payoutActionState === "loading")}
                        >
                          Cancelar solicitud
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="obras" style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
            <div>
              <h2 style={cardTitleStyle}>Mis obras</h2>
              <p style={{ color: "#666666", margin: 0 }}>Ahora se listan borradores, revisiones y publicaciones reales.</p>
            </div>
            <Link href="/publicar" style={{ backgroundColor: "#013473", color: "#ffffff", padding: "10px 18px", borderRadius: "4px", textDecoration: "none", fontSize: "13px" }}>
              + Nueva obra
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px", marginBottom: "18px" }}>
            {[
              { label: "Total obras", value: String(works.length) },
              { label: "Borradores/corregibles", value: String(editableWorks) },
              { label: "Publicadas", value: String(publishedWorks) },
            ].map((item) => (
              <div key={item.label} style={miniMetricCardStyle}>
                <p style={{ color: "#93908B", fontSize: "12px", marginBottom: "8px" }}>{item.label}</p>
                <p style={{ color: "#013473", fontSize: "24px", fontWeight: "bold", margin: 0 }}>{item.value}</p>
              </div>
            ))}
          </div>

          {!publishingCompliance.canPublish ? (
            <div style={{ ...rejectedBoxStyle, marginBottom: "20px" }}>
              <p style={{ color: "#b71c1c", fontWeight: "bold", margin: "0 0 6px 0" }}>
                Envio a revision bloqueado
              </p>
              <p style={{ color: "#7a2d2d", margin: 0, fontSize: "13px", lineHeight: "1.7" }}>
                Puedes preparar borradores, pero no enviar obras a revision hasta completar tu perfil y datos bancarios.
              </p>
            </div>
          ) : null}

          {works.length === 0 ? (
            <p style={{ color: "#666666", margin: 0 }}>Todavia no tienes obras creadas. Ve a Publicar para crear tu primer borrador.</p>
          ) : (
            <div style={{ display: "grid", gap: "16px" }}>
              {works.map((work) => (
                <article key={work.id} style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "14px 16px", display: "grid", gap: "10px" }}>
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
                    const isUntitledDraft = work.title === TEMP_DRAFT_TITLE;
                    const displayTitle = isUntitledDraft ? "Borrador sin titulo" : work.title;

                    return (
                      <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <div>
                      <p style={{ color: "#013473", fontSize: "18px", fontWeight: "bold", margin: "0 0 4px 0" }}>{displayTitle}</p>
                      <p style={{ color: "#666666", fontSize: "13px", margin: 0 }}>
                        {isUntitledDraft ? "Completa el titulo para generar la ficha final." : `Slug: ${work.slug}`} | Tipo: {work.publicationType}
                        {numericPrice !== null && Number.isFinite(numericPrice)
                          ? ` | Precio: MXN ${numericPrice.toFixed(2)}`
                          : " | Precio: Pendiente"}
                      </p>
                    </div>
                    <span style={statusBadgeStyle(work.status)}>{work.status}</span>
                  </div>

                  <p style={{ color: "#444444", fontSize: "14px", lineHeight: "1.7", margin: 0 }}>{work.description ?? "Sin descripcion cargada."}</p>

                  <div style={assetPreviewGridStyle}>
                    {work.assets.cover ? (
                      <Link
                        href={`/visor-archivo?url=${encodeURIComponent(work.assets.cover.url)}&label=${encodeURIComponent(`Portada - ${displayTitle}`)}&type=image`}
                        style={assetPreviewCardStyle}
                      >
                        <img src={work.assets.cover.url} alt={`Portada de ${displayTitle}`} style={assetPreviewImageStyle} />
                        <span style={assetPreviewLabelStyle}>Portada</span>
                      </Link>
                    ) : (
                      <div style={assetPreviewPlaceholderStyle}>Sin portada</div>
                    )}

                    {work.assets.backCover ? (
                      <Link
                        href={`/visor-archivo?url=${encodeURIComponent(work.assets.backCover.url)}&label=${encodeURIComponent(`Contraportada - ${displayTitle}`)}&type=image`}
                        style={assetPreviewCardStyle}
                      >
                        <img src={work.assets.backCover.url} alt={`Contraportada de ${displayTitle}`} style={assetPreviewImageStyle} />
                        <span style={assetPreviewLabelStyle}>Contraportada</span>
                      </Link>
                    ) : (
                      <div style={assetPreviewPlaceholderStyle}>Sin contraportada</div>
                    )}

                    {work.assets.manuscript ? (
                      <button
                        type="button"
                        onClick={() => handleDownloadWorkManuscript(work.id)}
                        style={assetPreviewButtonStyle}
                      >
                        <div style={manuscriptThumbStyle}>
                          <span style={manuscriptThumbTitleStyle}>Manuscrito</span>
                          <span style={manuscriptThumbNameStyle}>{work.assets.manuscript.originalName}</span>
                        </div>
                        <span style={assetPreviewLabelStyle}>Descargar manuscrito</span>
                      </button>
                    ) : (
                      <div style={assetPreviewPlaceholderStyle}>Sin manuscrito</div>
                    )}
                  </div>

                  <div style={{ color: "#666666", fontSize: "13px" }}>
                    Creada: {new Date(work.createdAt).toLocaleString("es-MX")}
                    {work.rejectionReason ? ` | Motivo de rechazo: ${work.rejectionReason}` : ""}
                  </div>

                  {work.status === "DRAFT" ? (
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      <Link
                        href={`/publicar?workId=${work.id}`}
                        style={secondaryActionLinkStyle}
                      >
                        Editar obra
                      </Link>
                      <button
                        onClick={() => handleSubmitWorkForReview(work)}
                        disabled={submittingWorkId === work.id || !publishingCompliance.canPublish}
                        style={{ backgroundColor: submittingWorkId === work.id || !publishingCompliance.canPublish ? "#5c6f8f" : "#013473", color: "#ffffff", padding: "10px 16px", border: "none", borderRadius: "4px", cursor: submittingWorkId === work.id || !publishingCompliance.canPublish ? "not-allowed" : "pointer", fontFamily: "Georgia, serif" }}
                      >
                        {submittingWorkId === work.id ? "Enviando..." : "Enviar a revision"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWork(work)}
                        disabled={deletingWorkId === work.id}
                        style={{ backgroundColor: deletingWorkId === work.id ? "#d6b4b4" : "#c62828", color: "#ffffff", padding: "10px 16px", border: "none", borderRadius: "4px", cursor: deletingWorkId === work.id ? "wait" : "pointer", fontFamily: "Georgia, serif" }}
                      >
                        {deletingWorkId === work.id ? "Eliminando..." : "Eliminar obra"}
                      </button>
                    </div>
                  ) : null}

                  {work.status === "IN_REVIEW" ? (
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      <span style={disabledActionPillStyle}>
                        Editar obra deshabilitado durante revision
                      </span>
                    </div>
                  ) : null}

                  {work.status === "REJECTED" ? (
                    <div style={rejectedBoxStyle}>
                      <p style={{ color: "#b71c1c", fontWeight: "bold", margin: "0 0 6px 0" }}>Obra rechazada para correccion</p>
                      <p style={{ color: "#7a2d2d", margin: "0 0 6px 0", fontSize: "13px", lineHeight: "1.7" }}>
                        Debes corregir la obra antes de volver a solicitar revision.
                      </p>
                      <p style={{ color: "#7a2d2d", margin: 0, fontSize: "13px", lineHeight: "1.7" }}>
                        {work.resubmittableAfter
                          ? `Podras reenviarla a revision a partir del ${new Date(work.resubmittableAfter).toLocaleDateString("es-MX")}.`
                          : "La fecha de nueva revision sera definida por administracion en los siguientes rechazos."}
                      </p>
                      <div style={{ marginTop: "12px" }}>
                        <Link href={`/publicar?workId=${work.id}`} style={rejectedActionLinkStyle}>
                          Corregir obra
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  {work.status === "APPROVED" ? (
                    <div style={approvedBoxStyle}>
                      <p style={{ color: "#2E7D32", fontWeight: "bold", margin: "0 0 6px 0" }}>Obra aprobada editorialmente</p>
                      <p style={{ color: "#2E7D32", margin: 0, fontSize: "13px" }}>Queda lista para la publicacion administrativa.</p>
                      {work.editorialNotes ? (
                        <p style={{ color: "#2E7D32", margin: "6px 0 0 0", fontSize: "13px", lineHeight: "1.7" }}>
                          Observaciones editoriales: {work.editorialNotes}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {work.status === "PUBLISHED" ? (
                    <div style={publishedBoxStyle}>
                      <p style={{ color: "#1565C0", fontWeight: "bold", margin: "0 0 6px 0" }}>Obra publicada</p>
                      <p style={{ color: "#1565C0", margin: 0, fontSize: "13px" }}>
                        {work.publishedAt ? `Publicada el ${new Date(work.publishedAt).toLocaleString("es-MX")}.` : "Disponible para lectores."}
                      </p>
                      {work.editorialNotes ? (
                        <p style={{ color: "#1565C0", margin: "6px 0 0 0", fontSize: "13px", lineHeight: "1.7" }}>
                          Observaciones editoriales: {work.editorialNotes}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {work.status === "CANCELLED" ? (
                    <div style={cancelledBoxStyle}>
                      <p style={{ color: "#5f6368", fontWeight: "bold", margin: "0 0 6px 0" }}>Obra retirada del catalogo</p>
                      <p style={{ color: "#5f6368", margin: "0 0 6px 0", fontSize: "13px", lineHeight: "1.7" }}>
                        Esta obra fue retirada del catalogo publico por administracion.
                      </p>
                      <p style={{ color: "#5f6368", margin: "0 0 6px 0", fontSize: "13px", lineHeight: "1.7" }}>
                        {work.cancellationReason
                          ? `Motivo del retiro: ${work.cancellationReason}`
                          : "No se registro un motivo especifico para el retiro."}
                      </p>
                      <p style={{ color: "#5f6368", margin: 0, fontSize: "13px", lineHeight: "1.7" }}>
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
        </section>
      </SectionPageFrame>

      {showPasswordConfirmDialog ? (
        <div style={dialogOverlayStyle}>
          <div style={dialogCardStyle}>
            <h3 style={dialogTitleStyle}>Confirmar cambio de contrasena</h3>
            <p style={dialogTextStyle}>
              Estas a punto de cambiar tu contrasena de acceso. Si confirmas, el sistema aplicara la nueva contrasena que capturaste.
            </p>
            <div style={dialogActionsStyle}>
              <button
                type="button"
                onClick={confirmChangePassword}
                disabled={passwordActionState === "loading"}
                style={{
                  ...dialogPrimaryButtonStyle,
                  opacity: passwordActionState === "loading" ? 0.7 : 1,
                  cursor: passwordActionState === "loading" ? "wait" : "pointer",
                }}
              >
                {passwordActionState === "loading" ? "Cambiando..." : "Si cambiar contrasena"}
              </button>
              <button type="button" onClick={cancelPasswordChange} style={dialogSecondaryButtonStyle}>
                No cambiar contrasena
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPasswordSuccessDialog ? (
        <div style={dialogOverlayStyle}>
          <div style={dialogCardStyle}>
            <h3 style={dialogTitleStyle}>Contrasena cambiada correctamente</h3>
            <p style={dialogTextStyle}>
              El cambio se realizo correctamente. Ya puedes seguir usando tu panel con la nueva contrasena.
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button type="button" onClick={closePasswordSuccessDialog} style={dialogPrimaryButtonStyle}>
                Regresar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showReviewConfirmDialog ? (
        <div style={dialogOverlayStyle}>
          <div style={dialogCardStyle}>
            <h3 style={dialogTitleStyle}>Confirmar envio a revision</h3>
            <p style={dialogTextStyle}>
              {pendingReviewWork
                ? `La obra "${pendingReviewWork.title}" se enviara a revision editorial y dejara de estar en modo borrador para este ciclo.`
                : "La obra seleccionada se enviara a revision editorial."}
            </p>
            <div style={dialogActionsStyle}>
              <button
                type="button"
                onClick={confirmSubmitWorkForReview}
                disabled={submittingWorkId === pendingReviewWork?.id}
                style={{
                  ...dialogPrimaryButtonStyle,
                  opacity: submittingWorkId === pendingReviewWork?.id ? 0.7 : 1,
                  cursor: submittingWorkId === pendingReviewWork?.id ? "wait" : "pointer",
                }}
              >
                {submittingWorkId === pendingReviewWork?.id ? "Enviando..." : "Si enviar a revision"}
              </button>
              <button type="button" onClick={cancelSubmitWorkForReview} style={dialogSecondaryButtonStyle}>
                No enviar a revision
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showReviewSuccessDialog ? (
        <div style={dialogOverlayStyle}>
          <div style={dialogCardStyle}>
            <h3 style={dialogTitleStyle}>Obra enviada a revision</h3>
            <p style={dialogTextStyle}>
              {reviewDialogMessage || "La obra fue enviada correctamente a revision editorial."}
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button type="button" onClick={closeReviewSuccessDialog} style={dialogPrimaryButtonStyle}>
                Regresar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteConfirmDialog ? (
        <div style={dialogOverlayStyle}>
          <div style={dialogCardStyle}>
            <h3 style={dialogTitleStyle}>Confirmar eliminacion de obra</h3>
            <p style={dialogTextStyle}>
              {pendingDeleteWork
                ? `La obra "${pendingDeleteWork.title === TEMP_DRAFT_TITLE ? "Borrador sin titulo" : pendingDeleteWork.title}" se eliminara por completo mientras siga en borrador.`
                : "La obra seleccionada se eliminara por completo."}
            </p>
            <div style={dialogActionsStyle}>
              <button
                type="button"
                onClick={confirmDeleteWork}
                disabled={deletingWorkId === pendingDeleteWork?.id}
                style={{
                  ...dangerDialogButtonStyle,
                  opacity: deletingWorkId === pendingDeleteWork?.id ? 0.7 : 1,
                  cursor: deletingWorkId === pendingDeleteWork?.id ? "wait" : "pointer",
                }}
              >
                {deletingWorkId === pendingDeleteWork?.id ? "Eliminando..." : "Si eliminar obra"}
              </button>
              <button type="button" onClick={cancelDeleteWork} style={dialogSecondaryButtonStyle}>
                No eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteSuccessDialog ? (
        <div style={dialogOverlayStyle}>
          <div style={dialogCardStyle}>
            <h3 style={dialogTitleStyle}>Obra eliminada</h3>
            <p style={dialogTextStyle}>
              {deleteDialogMessage || "La obra en borrador fue eliminada correctamente."}
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button type="button" onClick={closeDeleteSuccessDialog} style={dialogPrimaryButtonStyle}>
                Regresar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showLogoutConfirmDialog ? (
        <div style={dialogOverlayStyle}>
          <div style={dialogCardStyle}>
            <h3 style={dialogTitleStyle}>Confirmar cierre de sesion</h3>
            <p style={dialogTextStyle}>
              Estas a punto de cerrar tu sesion actual y volver a la pantalla de acceso.
            </p>
            <div style={dialogActionsStyle}>
              <button type="button" onClick={logout} style={dialogPrimaryButtonStyle}>
                Si cerrar sesion
              </button>
              <button type="button" onClick={cancelLogout} style={dialogSecondaryButtonStyle}>
                No cerrar sesion
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

const metricCardStyle: CSSProperties = { backgroundColor: "#ffffff", padding: "10px 12px", borderRadius: "4px", borderTop: "3px solid #013473" };
const miniMetricCardStyle: CSSProperties = { backgroundColor: "#f8f9fa", padding: "9px 11px", borderRadius: "4px" };
const cardStyle: CSSProperties = { backgroundColor: "#ffffff", borderRadius: "4px", padding: "12px 14px" };
const cardTitleStyle: CSSProperties = { color: "#013473", fontSize: "15px", margin: "0 0 10px 0", fontFamily: "'Times New Roman', serif" };
const inputStyle: CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #e0e0e0", borderRadius: "4px", fontFamily: "Georgia, serif", fontSize: "12px", boxSizing: "border-box" };
const textareaStyle: CSSProperties = { ...inputStyle, resize: "vertical" };
const rejectedBoxStyle: CSSProperties = { backgroundColor: "#fff4f3", border: "1px solid #f1c9c6", borderRadius: "4px", padding: "12px 14px" };
const approvedBoxStyle: CSSProperties = { backgroundColor: "#edf8ef", border: "1px solid #b7d9be", borderRadius: "4px", padding: "12px 14px" };
const publishedBoxStyle: CSSProperties = { backgroundColor: "#eef6ff", border: "1px solid #bfd7f1", borderRadius: "4px", padding: "12px 14px" };
const cancelledBoxStyle: CSSProperties = { backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", padding: "12px 14px" };
const assetPreviewGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 124px))", gap: "8px", alignItems: "start" };
const assetPreviewCardStyle: CSSProperties = { display: "grid", gap: "6px", textDecoration: "none", color: "inherit" };
const assetPreviewButtonStyle: CSSProperties = { display: "grid", gap: "6px", textDecoration: "none", color: "inherit", border: "none", backgroundColor: "transparent", padding: 0, textAlign: "left", cursor: "pointer" };
const assetPreviewPlaceholderStyle: CSSProperties = { minHeight: "122px", border: "1px dashed #cfd4dd", borderRadius: "4px", backgroundColor: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b9097", fontSize: "11px", padding: "8px", textAlign: "center" };
const assetPreviewImageStyle: CSSProperties = { width: "100%", height: "122px", objectFit: "cover", borderRadius: "4px", border: "1px solid #e4e7ec", display: "block" };
const assetPreviewLabelStyle: CSSProperties = { color: "#013473", fontSize: "11px", fontWeight: "bold" };
const manuscriptThumbStyle: CSSProperties = { minHeight: "122px", borderRadius: "4px", border: "1px solid #bfd7f1", backgroundColor: "#eef6ff", padding: "8px", display: "grid", alignContent: "center", gap: "5px" };
const manuscriptThumbTitleStyle: CSSProperties = { color: "#013473", fontSize: "14px", fontWeight: "bold", lineHeight: "1.2" };
const manuscriptThumbNameStyle: CSSProperties = { color: "#4f5b66", fontSize: "11px", lineHeight: "1.45", wordBreak: "break-word" };
const secondaryActionLinkStyle: CSSProperties = { color: "#013473", backgroundColor: "#eef2f7", padding: "8px 12px", borderRadius: "4px", textDecoration: "none", fontSize: "12px" };
const rejectedActionLinkStyle: CSSProperties = { color: "#b71c1c", backgroundColor: "#ffffff", border: "1px solid #e5aaaa", padding: "8px 12px", borderRadius: "4px", textDecoration: "none", fontSize: "12px", display: "inline-block" };
const disabledActionPillStyle: CSSProperties = { color: "#6b7280", backgroundColor: "#eef2f7", border: "1px solid #d7dfe8", padding: "8px 12px", borderRadius: "4px", fontSize: "12px" };
const royaltySummaryPillStyle: CSSProperties = { color: "#7a5600", backgroundColor: "#fff6dd", border: "1px solid #f2d589", padding: "8px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "bold" };
const royaltyBoxStyle: CSSProperties = { border: "1px solid #e0e6ef", borderRadius: "6px", padding: "12px 14px", display: "grid", gap: "10px", backgroundColor: "#fbfdff" };
const royaltyBoxTitleStyle: CSSProperties = { color: "#013473", fontSize: "15px", margin: 0, fontFamily: "'Times New Roman', serif" };
const royaltyEmptyStyle: CSSProperties = { color: "#666666", margin: 0, lineHeight: "1.65", fontSize: "13px" };
const royaltyEntryStyle: CSSProperties = { border: "1px solid #e8edf4", borderRadius: "6px", padding: "12px 14px", display: "grid", gap: "4px", backgroundColor: "#ffffff" };
const royaltyEntryTitleStyle: CSSProperties = { color: "#013473", fontSize: "13px", fontWeight: "bold", margin: 0 };
const royaltyEntryMetaStyle: CSSProperties = { color: "#555555", fontSize: "12px", lineHeight: "1.6", margin: 0 };
const royaltyStatusLineStyle: CSSProperties = { color: "#333333", fontSize: "12px", lineHeight: "1.65", margin: 0 };
const royaltyPrimaryButtonStyle = (disabled: boolean): CSSProperties => ({
  backgroundColor: disabled ? "#98a7bf" : "#013473",
  color: "#ffffff",
  border: "none",
  borderRadius: "4px",
  padding: "10px 14px",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: "Georgia, serif",
});
const royaltySecondaryButtonStyle = (disabled: boolean): CSSProperties => ({
  backgroundColor: "#ffffff",
  color: disabled ? "#8a97ab" : "#013473",
  border: "1px solid #c9d5e5",
  borderRadius: "4px",
  padding: "9px 12px",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: "Georgia, serif",
});
const dialogOverlayStyle: CSSProperties = { position: "fixed", inset: 0, backgroundColor: "rgba(1, 21, 52, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", zIndex: 1000 };
const dialogCardStyle: CSSProperties = { width: "100%", maxWidth: "520px", backgroundColor: "#ffffff", borderRadius: "8px", padding: "28px", boxShadow: "0 24px 60px rgba(1, 21, 52, 0.2)", display: "grid", gap: "18px" };
const dialogTitleStyle: CSSProperties = { margin: 0, color: "#013473", fontSize: "24px", fontFamily: "'Times New Roman', serif", textAlign: "center" };
const dialogTextStyle: CSSProperties = { margin: 0, color: "#444444", fontSize: "14px", lineHeight: "1.8", textAlign: "center" };
const dialogActionsStyle: CSSProperties = { display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" };
const dialogPrimaryButtonStyle: CSSProperties = { backgroundColor: "#013473", color: "#ffffff", padding: "12px 18px", border: "none", borderRadius: "4px", fontFamily: "Georgia, serif", fontSize: "14px", cursor: "pointer" };
const dangerDialogButtonStyle: CSSProperties = { backgroundColor: "#c62828", color: "#ffffff", padding: "12px 18px", border: "none", borderRadius: "4px", fontFamily: "Georgia, serif", fontSize: "14px", cursor: "pointer" };
const dialogSecondaryButtonStyle: CSSProperties = { backgroundColor: "#eef2f7", color: "#013473", padding: "12px 18px", border: "1px solid #d7dfe8", borderRadius: "4px", fontFamily: "Georgia, serif", fontSize: "14px", cursor: "pointer" };
const sidebarTextStyle: CSSProperties = { margin: 0, color: "#4b5563", fontSize: "12px", lineHeight: "1.65" };

function membershipSealStyle(level: string | null): CSSProperties {
  const normalized = level?.trim().toLowerCase() ?? "";

  if (normalized === "bronce") {
    return {
      borderRadius: "14px",
      padding: "14px 12px",
      background: "linear-gradient(135deg, #f0c29b 0%, #c97b42 100%)",
      border: "1px solid rgba(109, 57, 20, 0.18)",
      display: "grid",
      gap: "4px",
      textAlign: "center",
      boxShadow: "0 10px 24px rgba(83, 46, 19, 0.14)",
    };
  }

  if (normalized === "plata") {
    return {
      borderRadius: "14px",
      padding: "14px 12px",
      background: "linear-gradient(135deg, #eef2f6 0%, #c4ccd6 100%)",
      border: "1px solid rgba(83, 95, 108, 0.18)",
      display: "grid",
      gap: "4px",
      textAlign: "center",
      boxShadow: "0 10px 24px rgba(83, 95, 108, 0.12)",
    };
  }

  if (normalized === "oro") {
    return {
      borderRadius: "14px",
      padding: "14px 12px",
      background: "linear-gradient(135deg, #ffe08a 0%, #e0af17 100%)",
      border: "1px solid rgba(117, 84, 0, 0.18)",
      display: "grid",
      gap: "4px",
      textAlign: "center",
      boxShadow: "0 10px 24px rgba(117, 84, 0, 0.14)",
    };
  }

  if (normalized === "platino") {
    return {
      borderRadius: "14px",
      padding: "14px 12px",
      background: "linear-gradient(135deg, #d7f4ee 0%, #7fcfc1 100%)",
      border: "1px solid rgba(16, 90, 80, 0.16)",
      display: "grid",
      gap: "4px",
      textAlign: "center",
      boxShadow: "0 10px 24px rgba(16, 90, 80, 0.12)",
    };
  }

  if (normalized === "diamante") {
    return {
      borderRadius: "14px",
      padding: "14px 12px",
      background: "linear-gradient(135deg, #ffe6f0 0%, #f2a6c2 100%)",
      border: "1px solid rgba(126, 31, 70, 0.16)",
      display: "grid",
      gap: "4px",
      textAlign: "center",
      boxShadow: "0 10px 24px rgba(126, 31, 70, 0.12)",
    };
  }

  return {
    borderRadius: "14px",
    padding: "14px 12px",
    background: "linear-gradient(135deg, #f7f9fc 0%, #e2e8f0 100%)",
    border: "1px solid #d7dee8",
    display: "grid",
    gap: "4px",
    textAlign: "center",
  };
}

const membershipSealLabelStyle: CSSProperties = {
  color: "rgba(26, 37, 51, 0.72)",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const membershipSealValueStyle: CSSProperties = {
  color: "#17324f",
  fontSize: "20px",
  lineHeight: 1.1,
};

const membershipSealMetaStyle: CSSProperties = {
  margin: 0,
  color: "#17324f",
  fontSize: "12px",
  lineHeight: 1.45,
};

const membershipSealLinkStyle: CSSProperties = {
  color: "#17324f",
  fontSize: "12px",
  fontWeight: 700,
  textDecoration: "underline",
};

const membershipDetailBoxStyle: CSSProperties = {
  borderRadius: "10px",
  border: "1px solid #dde6f1",
  backgroundColor: "#f8fbfe",
  padding: "12px 14px",
  display: "grid",
  gap: "6px",
};

const membershipDetailTitleStyle: CSSProperties = {
  margin: 0,
  color: "#013473",
  fontSize: "14px",
  fontWeight: 700,
};

const membershipDetailTextStyle: CSSProperties = {
  margin: 0,
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.55,
};

function buildCollaboratorForm(authorProfile: PanelAuthorProfile | null) {
  const payoutAccountData =
    authorProfile && typeof authorProfile.payoutAccountData === "object" && authorProfile.payoutAccountData
      ? authorProfile.payoutAccountData
      : {};
  const taxIdParts = extractDisplayedTaxIdParts(authorProfile);

  return {
    publicName: authorProfile?.publicName ?? "",
    authorProfileType: authorProfile?.authorProfileType ?? "CERTIFIED",
    legalName: authorProfile?.legalName ?? "",
    taxIdLetters: taxIdParts.letters,
    taxIdDatePart: taxIdParts.datePart,
    taxIdHomoclave: taxIdParts.homoclave,
    curp: (authorProfile?.curp ?? "").toUpperCase(),
    dateOfBirth: formatDisplayedDate(authorProfile?.dateOfBirth),
    payoutMethod: authorProfile?.payoutMethod ?? "BANK_TRANSFER_MX",
    accountHolder: typeof payoutAccountData.accountHolder === "string" ? payoutAccountData.accountHolder : "",
    bankName: typeof payoutAccountData.bankName === "string" ? payoutAccountData.bankName : "",
    clabe: typeof payoutAccountData.clabe === "string" ? payoutAccountData.clabe : "",
    accountNumber: typeof payoutAccountData.accountNumber === "string" ? payoutAccountData.accountNumber : "",
  };
}

function buildPublicProfileForm(user: PanelAuthUser | null) {
  return {
    firstName: user?.profile?.firstName ?? "",
    lastName: user?.profile?.lastName ?? "",
    phone: user?.profile?.phone ?? "",
    country: user?.profile?.country ?? "",
    publicBio: user?.profile?.publicBio ?? "",
    publicPreferences: user?.profile?.publicPreferences ?? "",
    showAvatar: user?.profile?.showAvatar ?? false,
    showPublicBio: user?.profile?.showPublicBio ?? false,
    showPublicPreferences: user?.profile?.showPublicPreferences ?? false,
  };
}

function buildUserInitials(user: PanelAuthUser | null) {
  const parts = [user?.profile?.firstName, user?.profile?.lastName]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim());

  if (parts.length === 0) {
    return (user?.email ?? "U").slice(0, 1).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", border: "1px solid #d8e2ef", borderRadius: "12px", padding: "10px 12px", backgroundColor: "#ffffff" }}>
      <span style={{ color: "#173a67", fontSize: "13px" }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: checked ? "flex-end" : "flex-start",
          width: "62px",
          padding: "4px",
          borderRadius: "999px",
          border: "none",
          backgroundColor: checked ? "#0f6a3d" : "#8a97a7",
          cursor: "pointer",
        }}
      >
        <span style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#ffffff", display: "block" }} />
      </button>
    </label>
  );
}

function extractDisplayedTaxIdParts(authorProfile: PanelAuthorProfile | null) {
  const taxId =
    (((authorProfile?.taxIdDeclared ??
      authorProfile?.taxId ??
      "") as string)
      .toUpperCase()
      .replace(/[^A-Z0-9&Ñ]/g, ""));

  return {
    letters: taxId.slice(0, 4),
    datePart: taxId.slice(4, 10),
    homoclave: taxId.slice(10, 13),
  };
}

function buildDisplayedTaxId(form: {
  taxIdLetters: string;
  taxIdDatePart: string;
  taxIdHomoclave: string;
}) {
  const letters = form.taxIdLetters.trim().toUpperCase();
  const datePart = form.taxIdDatePart.replace(/\D/g, "").slice(0, 6);
  const homoclave = form.taxIdHomoclave.trim().toUpperCase();

  if (!letters && !datePart && !homoclave) {
    return "";
  }

  return `${letters}${datePart}${homoclave || "___"}`;
}

function buildPublishingCompliance(authorProfile: PanelAuthorProfile | null): PanelPublishingCompliance {
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
  const bankValidationStatus = normalizeBankValidationStatus(authorProfile?.bankValidationStatus, {
    accountHolder,
    bankName,
    clabe,
  });
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
    bankValidationStatus,
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

function formatDisplayedDate(value: unknown) {
  const isoValue = normalizeDateInputValue(value);
  if (!isoValue) {
    return "";
  }

  const [year, month, day] = isoValue.split("-");
  return `${day}/${month}/${year}`;
}

function normalizeDisplayedDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDisplayedDateToIso(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(`${iso}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return iso;
}

function normalizeBankValidationStatus(
  value: unknown,
  payoutAccountData: { accountHolder: string; bankName: string; clabe: string },
): "MISSING" | "PENDING_VALIDATION" | "VALIDATED" | "REJECTED" {
  const hasCompleteBankData =
    Boolean(payoutAccountData.accountHolder) &&
    Boolean(payoutAccountData.bankName) &&
    /^[0-9]{18}$/.test(payoutAccountData.clabe);

  if (!hasCompleteBankData) {
    return "MISSING" as const;
  }

  return value === "VALIDATED" || value === "REJECTED" || value === "PENDING_VALIDATION"
    ? "VALIDATED"
    : ("VALIDATED" as const);
}

function formatPanelBankValidationStatus(
  value: "MISSING" | "PENDING_VALIDATION" | "VALIDATED" | "REJECTED",
) {
  switch (value) {
    case "PENDING_VALIDATION":
      return "En revision";
    case "VALIDATED":
      return "Validada";
    case "REJECTED":
      return "Rechazada";
    case "MISSING":
    default:
      return "Sin solicitar";
  }
}

function bankValidationStatusColor(
  value: "MISSING" | "PENDING_VALIDATION" | "VALIDATED" | "REJECTED",
) {
  switch (value) {
    case "PENDING_VALIDATION":
      return "#9a7b17";
    case "VALIDATED":
      return "#2E7D32";
    case "REJECTED":
      return "#b71c1c";
    case "MISSING":
    default:
      return "#8a6d3b";
  }
}

function taxIdSourceLabel(source: unknown) {
  switch (source) {
    case "DECLARED":
      return "Declarado por el socio";
    case "DERIVED":
      return "Derivado internamente";
    default:
      return "No disponible";
  }
}

function feedbackStyle(isError: boolean): CSSProperties {
  return {
    padding: "14px 18px",
    borderRadius: "4px",
    backgroundColor: isError ? "#fdecea" : "#e8f5e9",
    color: isError ? "#b71c1c" : "#1b5e20",
    fontSize: "14px",
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
      return "Tu solicitud ya entro al sistema y espera corte o programacion administrativa.";
    case "SCHEDULED":
      return "La solicitud ya quedo en cola de pago para el viernes operativo correspondiente.";
    case "PAID":
      return "El pago ya fue registrado como ejecutado.";
    case "FAILED":
      return "El pago tuvo una incidencia y queda pendiente de reintento administrativo.";
    case "CANCELLED":
      return "La solicitud fue cancelada y el saldo volvio a quedar disponible.";
    default:
      return "Estado operativo sin descripcion adicional.";
  }
}

function statusBadgeStyle(status: Work["status"]): CSSProperties {
  const palette: Record<Work["status"], { background: string; color: string }> = {
    DRAFT: { background: "#eef2f7", color: "#4f5b66" },
    IN_REVIEW: { background: "#FFF8E1", color: "#F57F17" },
    APPROVED: { background: "#e8f5e9", color: "#2E7D32" },
    REJECTED: { background: "#fdecea", color: "#b71c1c" },
    PUBLISHED: { background: "#E3F2FD", color: "#1565C0" },
    CANCELLED: { background: "#f0f0f0", color: "#777777" },
  };

  return {
    backgroundColor: palette[status].background,
    color: palette[status].color,
    padding: "5px 10px",
    borderRadius: "3px",
    fontSize: "12px",
  };
}

