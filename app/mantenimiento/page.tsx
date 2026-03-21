"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import { SectionPageFrame, SectionSidebarCard } from "@/components/section-page-frame";
import { buildAdminSectionChips } from "@/components/admin-section-chips";
import { SiteSectionHeader } from "@/components/site-section-header";
import { fetchMe, getStoredToken, type AuthUser } from "@/lib/api";
import {
  bootstrapAdmins,
  cleanupOrphanedUploads,
  fetchMaintenanceOverview,
  runFactoryReset,
  runSoftClean,
  type MaintenanceActionResponse,
  type MaintenanceOverview,
} from "@/components/maintenance-api";

type LoadState = "loading" | "ready" | "error";

const SOFT_CLEAN_CONFIRMATION = "SOFT_CLEAN_DEV_DATA";
const FACTORY_RESET_CONFIRMATION = "FACTORY_RESET_DEV";
const BOOTSTRAP_ADMINS_CONFIRMATION = "BOOTSTRAP_ADMINS";

export default function MantenimientoPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [overview, setOverview] = useState<MaintenanceOverview | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState<MaintenanceActionResponse | null>(null);
  const [actionState, setActionState] = useState<string | null>(null);
  const [softCleanConfirm, setSoftCleanConfirm] = useState("");
  const [factoryResetConfirm, setFactoryResetConfirm] = useState("");
  const [adminBootstrapForm, setAdminBootstrapForm] = useState({
    admin2Email: "",
    admin2Password: "",
    admin2FirstName: "",
    admin2LastName: "",
    confirmationText: "",
  });

  async function loadMaintenance() {
    const token = getStoredToken();

    if (!token) {
      setLoadState("error");
      setMessage("No hay sesion activa para mantenimiento.");
      return;
    }

    try {
      const me = await fetchMe(token);

      if (!me.roles.includes("ADMIN") && !me.roles.includes("ADMIN_02")) {
        throw new Error("Tu cuenta no tiene permisos de mantenimiento.");
      }

      const nextOverview = await fetchMaintenanceOverview(token);
      setUser(me);
      setOverview(nextOverview);
      setLoadState("ready");
    } catch (error) {
      setLoadState("error");
      setMessage(error instanceof Error ? error.message : "No fue posible cargar mantenimiento.");
    }
  }

  useEffect(() => {
    void loadMaintenance();
  }, []);

  async function executeAction(actionKey: string, action: () => Promise<MaintenanceActionResponse>) {
    setActionState(actionKey);
    setMessage("");

    try {
      const response = await action();
      setLastResult(response);
      setMessage(`Operacion completada: ${response.action}.`);
      await loadMaintenance();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible ejecutar la accion.");
    } finally {
      setActionState(null);
    }
  }

  async function handleBootstrapAdmins(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getStoredToken();

    if (!token) {
      setMessage("La sesion expiro.");
      return;
    }

    await executeAction("bootstrap-admins", () =>
      bootstrapAdmins(token, {
        confirmationText: adminBootstrapForm.confirmationText,
        admin2Email: adminBootstrapForm.admin2Email || undefined,
        admin2Password: adminBootstrapForm.admin2Password || undefined,
        admin2FirstName: adminBootstrapForm.admin2FirstName || undefined,
        admin2LastName: adminBootstrapForm.admin2LastName || undefined,
      }),
    );
  }

  const token = typeof window !== "undefined" ? getStoredToken() : null;
  const destructiveAllowed = overview?.environment.allowDestructiveActions ?? false;

  return (
    <main style={pageStyle}>
      <SiteSectionHeader
        title="Mantenimiento"
        activeNav="mantenimiento"
        adminChips={buildAdminSectionChips("mantenimiento")}
        chips={[
          { label: "Diagnostico", href: "#diagnostico" },
          { label: "Limpieza", href: "#limpieza" },
          { label: "Admins", href: "#admins" },
          { label: "Critico", href: "#critico" },
        ]}
      />

      <SectionPageFrame
        maxWidth="1140px"
        sidebar={
          <>
            <SectionSidebarCard title="Resumen operativo">
              <p style={sidebarTextStyle}>Entorno: <strong>{overview?.environment.nodeEnv ?? "--"}</strong></p>
              <p style={sidebarTextStyle}>Acciones destructivas: <strong>{destructiveAllowed ? "Permitidas" : "Bloqueadas"}</strong></p>
              <p style={sidebarTextStyle}>Socios: <strong>{overview?.counts.socios ?? 0}</strong></p>
              <p style={sidebarTextStyle}>Obras: <strong>{overview?.counts.works ?? 0}</strong></p>
            </SectionSidebarCard>
            <SectionSidebarCard title="Guia de mantenimiento">
              <p style={sidebarTextStyle}>Usa primero simulaciones antes de ejecutar acciones reales.</p>
              <p style={sidebarTextStyle}>Reserva factory reset para desarrollo y con confirmacion explicita.</p>
              <p style={sidebarTextStyle}>Verifica siempre el resultado final en el diagnostico superior.</p>
            </SectionSidebarCard>
            {lastResult ? (
              <SectionSidebarCard title="Ultimo resultado">
                <p style={sidebarTextStyle}>Accion: <strong>{lastResult.action}</strong></p>
                <p style={sidebarTextStyle}>
                  Estado: <strong>{lastResult.ok ? "Completado" : "Con observaciones"}</strong>
                </p>
                {lastResult.warning ? (
                  <p style={sidebarTextStyle}>Nota: {lastResult.warning}</p>
                ) : null}
              </SectionSidebarCard>
            ) : null}
          </>
        }
      >
        {message ? <div style={feedbackStyle(loadState === "error")}>{message}</div> : null}
        {loadState === "loading" ? <div style={cardStyle}>Cargando mantenimiento...</div> : null}

        {loadState === "ready" && overview ? (
          <div style={{ display: "grid", gap: "24px" }}>
            <section id="diagnostico" style={cardStyle}>
              <h2 style={sectionTitleStyle}>Diagnostico</h2>
              <div style={metricsGridStyle}>
                {[
                  { label: "Entorno", value: overview.environment.nodeEnv },
                  { label: "Socios", value: String(overview.counts.socios) },
                  { label: "Admins", value: String(overview.counts.admins) },
                  { label: "Obras", value: String(overview.counts.works) },
                  { label: "Compras", value: String(overview.counts.purchases) },
                  { label: "Uploads", value: String(overview.counts.uploadFilesOnDisk) },
                ].map((item) => (
                  <div key={item.label} style={metricCardStyle}>
                    <p style={metricLabelStyle}>{item.label}</p>
                    <p style={metricValueStyle}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div style={infoBlockStyle}>
                <p><strong>Base URL backend:</strong> {overview.environment.backendPublicBaseUrl}</p>
                <p><strong>Ruta uploads:</strong> {overview.environment.uploadsRoot}</p>
                <p><strong>Acciones destructivas:</strong> {destructiveAllowed ? "Permitidas en este entorno" : "Bloqueadas"}</p>
                <p><strong>Usuario actual:</strong> {user?.email ?? "Sin usuario"}</p>
              </div>
            </section>

            <section style={cardStyle}>
              <h2 style={sectionTitleStyle}>Salud de socios y datos</h2>
              <div style={issueGridStyle}>
                {overview.breakdown.socioSegments.map((segment) => (
                  <article key={segment.label} style={issueCardStyle}>
                    <p style={metricLabelStyle}>{segment.label}</p>
                    <p style={issueValueStyle}>{segment.total}</p>
                    <p style={issueExampleStyle}>
                      Segmentacion administrativa derivada de actividad real dentro de la plataforma.
                    </p>
                  </article>
                ))}
              </div>
              <div style={issueGridStyle}>
                {[
                  { label: "Socios sin roles internos", data: overview.health.usersWithoutRoles },
                  { label: "Socio publicador sin perfil", data: overview.health.usersWithAuthorRoleWithoutProfile },
                  { label: "Socio aprobable sin rol interno", data: overview.health.approvedAuthorWithoutRole },
                  { label: "Obras sin assets requeridos", data: overview.health.worksMissingRequiredAssets },
                  { label: "Assets faltantes en disco", data: overview.health.fileAssetsMissingOnDisk },
                  { label: "Uploads no registrados", data: overview.health.uploadsNotTracked },
                ].map((item) => (
                  <article key={item.label} style={issueCardStyle}>
                    <p style={metricLabelStyle}>{item.label}</p>
                    <p style={issueValueStyle}>{item.data.total}</p>
                    <p style={issueExampleStyle}>
                      {item.data.examples.length > 0
                        ? JSON.stringify(item.data.examples.slice(0, 3))
                        : "Sin incidencias detectadas."}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section id="limpieza" style={cardStyle}>
              <h2 style={sectionTitleStyle}>Limpieza segura y reparacion</h2>
              <div style={actionGridStyle}>
                <article style={actionCardStyle}>
                  <p style={actionTagStyle}>Seguro</p>
                  <h3 style={actionTitleStyle}>Uploads huerfanos</h3>
                  <p style={actionTextStyle}>
                    Detecta y opcionalmente elimina archivos en disco que ya no estan registrados en la base de datos.
                  </p>
                  <div style={actionButtonsStyle}>
                    <button
                      type="button"
                      onClick={() =>
                        token &&
                        executeAction("simulate-orphans", () => cleanupOrphanedUploads(token, true))
                      }
                      disabled={!token || actionState !== null}
                      style={secondaryButtonStyle}
                    >
                      Simular
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        token &&
                        executeAction("execute-orphans", () => cleanupOrphanedUploads(token, false))
                      }
                      disabled={!token || actionState !== null}
                      style={primaryButtonStyle}
                    >
                      Ejecutar
                    </button>
                  </div>
                </article>

                <article style={actionCardStyle}>
                  <p style={actionTagStyle}>Reparacion</p>
                  <h3 style={actionTitleStyle}>Soft clean de desarrollo</h3>
                  <p style={actionTextStyle}>
                    Borra datos de prueba y preserva usuarios administradores. Requiere confirmacion escrita exacta.
                  </p>
                  <input
                    value={softCleanConfirm}
                    onChange={(event) => setSoftCleanConfirm(event.target.value)}
                    placeholder={SOFT_CLEAN_CONFIRMATION}
                    style={inputStyle}
                  />
                  <div style={actionButtonsStyle}>
                    <button
                      type="button"
                      onClick={() =>
                        token &&
                        executeAction("simulate-soft-clean", () =>
                          runSoftClean(token, {
                            confirmationText: softCleanConfirm,
                            simulate: true,
                            removeUploads: true,
                          }),
                        )
                      }
                      disabled={!token || actionState !== null || !destructiveAllowed}
                      style={secondaryButtonStyle}
                    >
                      Simular
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        token &&
                        executeAction("execute-soft-clean", () =>
                          runSoftClean(token, {
                            confirmationText: softCleanConfirm,
                            simulate: false,
                            removeUploads: true,
                          }),
                        )
                      }
                      disabled={!token || actionState !== null || !destructiveAllowed}
                      style={warningButtonStyle}
                    >
                      Ejecutar
                    </button>
                  </div>
                </article>
              </div>
            </section>

            <section id="admins" style={cardStyle}>
              <h2 style={sectionTitleStyle}>Administracion interna</h2>
              <div style={adminGridStyle}>
                <div style={subCardStyle}>
                  <h3 style={actionTitleStyle}>Socios con rol administrativo</h3>
                  <div style={{ display: "grid", gap: "12px" }}>
                    {overview.admins.length > 0 ? (
                      overview.admins.map((admin) => (
                        <div key={admin.id} style={rowCardStyle}>
                          <p style={metricValueStyle}>{admin.email}</p>
                          <p style={issueExampleStyle}>
                            {admin.socioCategory} | Roles internos: {admin.roles.join(", ")}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p style={issueExampleStyle}>No hay administradores cargados.</p>
                    )}
                  </div>
                </div>

                <form onSubmit={handleBootstrapAdmins} style={subCardStyle}>
                  <h3 style={actionTitleStyle}>Bootstrap de Admin_02</h3>
                  <p style={actionTextStyle}>
                    Crea o actualiza un socio con rol administrativo secundario sin salir del sistema.
                  </p>
                  <input
                    value={adminBootstrapForm.admin2Email}
                    onChange={(event) =>
                      setAdminBootstrapForm((current) => ({ ...current, admin2Email: event.target.value }))
                    }
                    placeholder="Correo Admin_02"
                    style={inputStyle}
                  />
                  <input
                    type="password"
                    value={adminBootstrapForm.admin2Password}
                    onChange={(event) =>
                      setAdminBootstrapForm((current) => ({ ...current, admin2Password: event.target.value }))
                    }
                    placeholder="Password Admin_02"
                    style={inputStyle}
                  />
                  <input
                    value={adminBootstrapForm.admin2FirstName}
                    onChange={(event) =>
                      setAdminBootstrapForm((current) => ({ ...current, admin2FirstName: event.target.value }))
                    }
                    placeholder="Nombre"
                    style={inputStyle}
                  />
                  <input
                    value={adminBootstrapForm.admin2LastName}
                    onChange={(event) =>
                      setAdminBootstrapForm((current) => ({ ...current, admin2LastName: event.target.value }))
                    }
                    placeholder="Apellidos"
                    style={inputStyle}
                  />
                  <input
                    value={adminBootstrapForm.confirmationText}
                    onChange={(event) =>
                      setAdminBootstrapForm((current) => ({ ...current, confirmationText: event.target.value }))
                    }
                    placeholder={BOOTSTRAP_ADMINS_CONFIRMATION}
                    style={inputStyle}
                  />
                  <button type="submit" disabled={!token || actionState !== null} style={primaryButtonStyle}>
                    Crear o actualizar Admin_02
                  </button>
                </form>
              </div>
            </section>

            <section id="critico" style={dangerSectionStyle}>
              <h2 style={dangerTitleStyle}>Operaciones criticas</h2>
              <p style={actionTextStyle}>
                Solo disponibles en desarrollo. Un factory reset elimina socios, perfiles colaborativos, obras, compras, assets y sesiones previas.
              </p>
              <input
                value={factoryResetConfirm}
                onChange={(event) => setFactoryResetConfirm(event.target.value)}
                placeholder={FACTORY_RESET_CONFIRMATION}
                style={inputStyle}
              />
              <div style={actionButtonsStyle}>
                <button
                  type="button"
                  onClick={() =>
                    token &&
                    executeAction("simulate-factory-reset", () =>
                      runFactoryReset(token, {
                        confirmationText: factoryResetConfirm,
                        simulate: true,
                        removeUploads: true,
                      }),
                    )
                  }
                  disabled={!token || actionState !== null || !destructiveAllowed}
                  style={secondaryButtonStyle}
                >
                  Simular reset
                </button>
                <button
                  type="button"
                  onClick={() =>
                    token &&
                    executeAction("execute-factory-reset", () =>
                      runFactoryReset(token, {
                        confirmationText: factoryResetConfirm,
                        simulate: false,
                        removeUploads: true,
                      }),
                    )
                  }
                  disabled={!token || actionState !== null || !destructiveAllowed}
                  style={dangerButtonStyle}
                >
                  Ejecutar factory reset
                </button>
              </div>
              {!destructiveAllowed ? (
                <p style={dangerNoteStyle}>Bloqueado en produccion o en entornos no habilitados.</p>
              ) : null}
            </section>

            {lastResult ? (
              <section style={cardStyle}>
                <h2 style={sectionTitleStyle}>Ultimo resultado</h2>
                <pre style={resultStyle}>{JSON.stringify(lastResult, null, 2)}</pre>
              </section>
            ) : null}
          </div>
        ) : null}
      </SectionPageFrame>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f8f9fa",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const cardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "10px",
  padding: "24px",
  boxShadow: "0 10px 24px rgba(16, 36, 61, 0.06)",
  display: "grid",
  gap: "16px",
};

const subCardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "18px",
  display: "grid",
  gap: "12px",
  alignContent: "start",
};

const metricsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "16px",
};

const metricCardStyle: CSSProperties = {
  borderTop: "4px solid #013473",
  backgroundColor: "#f9fbfd",
  borderRadius: "6px",
  padding: "16px",
};

const metricLabelStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0 0 8px 0",
};

const metricValueStyle: CSSProperties = {
  color: "#013473",
  fontSize: "20px",
  fontWeight: "bold",
  margin: 0,
  wordBreak: "break-word",
};

const sectionTitleStyle: CSSProperties = {
  color: "#013473",
  fontSize: "22px",
  margin: 0,
};

const infoBlockStyle: CSSProperties = {
  marginTop: "18px",
  color: "#4f5b66",
  fontSize: "13px",
  lineHeight: "1.8",
};

const issueGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "16px",
};

const issueCardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px",
  display: "grid",
  gap: "8px",
};

const issueValueStyle: CSSProperties = {
  color: "#9a3412",
  fontSize: "28px",
  fontWeight: "bold",
  margin: 0,
};

const issueExampleStyle: CSSProperties = {
  color: "#4b5563",
  fontSize: "12px",
  lineHeight: "1.7",
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const actionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px",
};

const actionCardStyle: CSSProperties = {
  border: "1px solid #dbe4ee",
  borderRadius: "8px",
  padding: "18px",
  display: "grid",
  gap: "12px",
};

const actionTagStyle: CSSProperties = {
  color: "#1565c0",
  fontSize: "11px",
  fontWeight: "bold",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  margin: 0,
};

const actionTitleStyle: CSSProperties = {
  color: "#013473",
  fontSize: "18px",
  margin: 0,
};

const actionTextStyle: CSSProperties = {
  color: "#4f5b66",
  fontSize: "14px",
  lineHeight: "1.8",
  margin: 0,
};

const actionButtonsStyle: CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const adminGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr",
  gap: "20px",
};

const rowCardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "12px 14px",
  display: "grid",
  gap: "6px",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "6px",
  border: "1px solid #d1d5db",
  fontFamily: "Georgia, 'Times New Roman', serif",
  boxSizing: "border-box",
};

const primaryButtonStyle: CSSProperties = {
  backgroundColor: "#013473",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  padding: "12px 16px",
  cursor: "pointer",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const secondaryButtonStyle: CSSProperties = {
  backgroundColor: "#eef2f7",
  color: "#013473",
  border: "1px solid #dbe4ee",
  borderRadius: "6px",
  padding: "12px 16px",
  cursor: "pointer",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const warningButtonStyle: CSSProperties = {
  backgroundColor: "#b45309",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  padding: "12px 16px",
  cursor: "pointer",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const dangerButtonStyle: CSSProperties = {
  backgroundColor: "#b91c1c",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  padding: "12px 16px",
  cursor: "pointer",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const dangerSectionStyle: CSSProperties = {
  backgroundColor: "#fff7f7",
  border: "1px solid #fecaca",
  borderRadius: "10px",
  padding: "24px",
  display: "grid",
  gap: "14px",
};

const dangerTitleStyle: CSSProperties = {
  color: "#991b1b",
  fontSize: "22px",
  margin: 0,
};

const dangerNoteStyle: CSSProperties = {
  color: "#991b1b",
  fontSize: "13px",
  margin: 0,
};

const resultStyle: CSSProperties = {
  margin: 0,
  backgroundColor: "#0f172a",
  color: "#dbeafe",
  borderRadius: "8px",
  padding: "16px",
  overflowX: "auto",
  fontSize: "12px",
  lineHeight: "1.7",
};
const sidebarTextStyle: CSSProperties = { margin: 0, color: "#4b5563", fontSize: "12px", lineHeight: "1.65" };

function feedbackStyle(isError: boolean): CSSProperties {
  return {
    padding: "14px 18px",
    borderRadius: "8px",
    backgroundColor: isError ? "#fdecea" : "#e8f5e9",
    color: isError ? "#b71c1c" : "#1b5e20",
    fontSize: "14px",
  };
}
