import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import StatBar from "../components/StatBar";
import AddMonitorForm from "../components/AddMonitorForm";
import MonitorCard from "../components/MonitorCard";
import MonitorDetailsModal from "../components/MonitorDetailsModal";
import Skeleton from "../components/Skeleton";
import AnalyticsSection from "../components/AnalyticsSection";
import ConfirmDialog from "../components/ConfirmDialog";
import ThemeToggle from "../components/ThemeToggle";
import StyleToggle from "../components/StyleToggle";
import { useToast } from "../context/ToastContext";
import { useSocketContext } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./Dashboard.css";

const MONITORS_PER_PAGE = 8;
const BILLING_POLL_ATTEMPTS = 5;
const BILLING_POLL_INTERVAL_MS = 2000;

const EmptyState = () => (
  <div className="empty-state">
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M32 10a22 22 0 1 0 22 22h-4a18 18 0 1 1-18-18V10Zm0 10a12 12 0 1 0 12 12h-4a8 8 0 1 1-8-8v-4Zm0 10a2 2 0 1 0 2 2 2 2 0 0 0-2-2Z"
        fill="currentColor"
      />
    </svg>
    <div className="empty-state__title">No monitors yet</div>
    <div className="empty-state__text">
      Add your first URL above to start monitoring.
    </div>
  </div>
);

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const { socket, isConnected, hasConnected } = useSocketContext();
  const [monitors, setMonitors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flashMap, setFlashMap] = useState({});
  const [networkError, setNetworkError] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonitorId, setSelectedMonitorId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    enabled: false,
    email: "",
  });
  const [alertHistory, setAlertHistory] = useState([]);
  const [isSavingAlerts, setIsSavingAlerts] = useState(false);
  const analyticsTimerRef = useRef(null);
  const alertHistoryTimerRef = useRef(null);

  const syncBillingPlan = async (sessionId) => {
    if (!sessionId) {
      return null;
    }

    try {
      const response = await api.get("/subscription/confirm", {
        params: { sessionId },
      });

      return response.data.subscription;
    } catch {
      return null;
    }
  };

  const loadMonitors = async (search = "") => {
    try {
      const response = await api.get("/monitors", {
        params: search ? { search } : {},
      });
      setMonitors(response.data.monitors);
      setNetworkError("");
    } catch (error) {
      setNetworkError(
        error.response?.data?.message || "Unable to load monitors",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await api.get("/analytics");
      setAnalytics(response.data.analytics);
      setNetworkError("");
    } catch (error) {
      setNetworkError(
        error.response?.data?.message || "Unable to load analytics",
      );
    }
  };

  const loadAlertSettings = async () => {
    try {
      const response = await api.get("/alerts/settings");
      setAlertSettings(response.data.settings);
    } catch (error) {
      addToast({
        type: "error",
        title: "Alert settings unavailable",
        message:
          error.response?.data?.message || "Unable to load alert settings",
      });
    }
  };

  const loadAlertHistory = async () => {
    try {
      const response = await api.get("/alerts/history");
      setAlertHistory(response.data.notifications);
    } catch (error) {
      addToast({
        type: "error",
        title: "Alert history unavailable",
        message:
          error.response?.data?.message || "Unable to load alert history",
      });
    }
  };

  useEffect(() => {
    let isMounted = true;
    const billingTimers = [];

    const pollBillingPlan = async () => {
      for (let attempt = 0; attempt < BILLING_POLL_ATTEMPTS; attempt += 1) {
        const nextUser = await refreshUser();

        if (!isMounted || nextUser?.plan === "PRO") {
          return;
        }

        await new Promise((resolve) => {
          const timerId = window.setTimeout(resolve, BILLING_POLL_INTERVAL_MS);
          billingTimers.push(timerId);
        });
      }
    };

    loadMonitors();
    loadAnalytics();
    loadAlertSettings();
    loadAlertHistory();

    const billingStatus = new URLSearchParams(window.location.search).get(
      "billing",
    );
    const sessionId = new URLSearchParams(window.location.search).get(
      "session_id",
    );

    if (billingStatus === "success") {
      Promise.resolve(syncBillingPlan(sessionId))
        .then((subscription) => {
          if (subscription?.plan === "PRO") {
            return refreshUser().then(() => {
              addToast({
                type: "success",
                title: "Upgrade complete",
                message: "Your PRO plan is now active.",
              });
            });
          }

          return pollBillingPlan().then(() => {
            addToast({
              type: "success",
              title: "Checkout complete",
              message:
                "Your subscription will update as soon as Stripe confirms it.",
            });
          });
        })
        .catch(() => {})
        .finally(() => {
          window.history.replaceState(null, "", window.location.pathname);
        });
    }

    if (billingStatus === "cancelled") {
      addToast({
        type: "info",
        title: "Checkout cancelled",
        message: "No subscription changes were made.",
      });
      window.history.replaceState(null, "", window.location.pathname);
    }

    return () => {
      isMounted = false;
      billingTimers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadMonitors(searchQuery);
      setCurrentPage(1);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (analyticsTimerRef.current) {
        window.clearTimeout(analyticsTimerRef.current);
      }
      if (alertHistoryTimerRef.current) {
        window.clearTimeout(alertHistoryTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleMonitorChecked = (payload) => {
      setMonitors((current) =>
        current.map((monitor) =>
          monitor.id === payload.id ? { ...monitor, ...payload } : monitor,
        ),
      );
      setFlashMap((current) => ({ ...current, [payload.id]: Date.now() }));

      if (analyticsTimerRef.current) {
        window.clearTimeout(analyticsTimerRef.current);
      }

      analyticsTimerRef.current = window.setTimeout(() => {
        loadAnalytics();
      }, 400);
    };

    const handleStatusChange = (payload) => {
      addToast({
        type: payload.status === "UP" ? "success" : "error",
        title:
          payload.status === "UP" ? "Monitor recovered" : "Monitor is down",
        message: payload.url,
      });

      if (alertHistoryTimerRef.current) {
        window.clearTimeout(alertHistoryTimerRef.current);
      }

      alertHistoryTimerRef.current = window.setTimeout(() => {
        loadAlertHistory();
      }, 600);
    };

    socket.on("monitor_checked", handleMonitorChecked);
    socket.on("status_change", handleStatusChange);

    return () => {
      socket.off("monitor_checked", handleMonitorChecked);
      socket.off("status_change", handleStatusChange);
    };
  }, [addToast, socket]);

  const handleCreateMonitor = async (payload) => {
    setIsSubmitting(true);

    try {
      const response = await api.post("/monitors", payload);
      await loadMonitors(searchQuery);
      addToast({
        type: "success",
        title: "Monitor added",
        message: response.data.monitor.url,
      });
      loadAnalytics();
    } catch (error) {
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMonitor = async (monitorId) => {
    try {
      const response = await api.delete(`/monitors/${monitorId}`);
      await loadMonitors(searchQuery);
      addToast({
        type: "info",
        title: "Monitor deleted",
        message: response.data.monitor.url,
      });
      if (selectedMonitorId === monitorId) {
        setSelectedMonitorId(null);
      }
      loadAnalytics();
    } catch (error) {
      addToast({
        type: "error",
        title: "Delete failed",
        message: error.response?.data?.message || "Unable to delete monitor",
      });
    }
  };

  const handleUpgrade = async () => {
    setIsBillingLoading(true);

    try {
      const response = await api.post("/subscription/checkout");
      window.location.href = response.data.url;
    } catch (error) {
      addToast({
        type: "error",
        title: "Checkout unavailable",
        message:
          error.response?.data?.message || "Unable to start Stripe checkout",
      });
      setIsBillingLoading(false);
    }
  };

  const handleSaveAlertSettings = async (event) => {
    event.preventDefault();
    setIsSavingAlerts(true);

    try {
      const response = await api.patch("/alerts/settings", alertSettings);
      setAlertSettings(response.data.settings);
      await refreshUser();
      addToast({
        type: "success",
        title: "Alert settings saved",
        message: response.data.settings.enabled
          ? "Email alerts are enabled."
          : "Email alerts are disabled.",
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Save failed",
        message:
          error.response?.data?.message || "Unable to update alert settings",
      });
    } finally {
      setIsSavingAlerts(false);
    }
  };

  const bannerMessage =
    networkError ||
    (hasConnected && !isConnected ? "Connection lost. Reconnecting..." : "");
  const totalPages = Math.max(
    1,
    Math.ceil(monitors.length / MONITORS_PER_PAGE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleMonitors = monitors.slice(
    (safeCurrentPage - 1) * MONITORS_PER_PAGE,
    safeCurrentPage * MONITORS_PER_PAGE,
  );

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-shell">
          <header className="dashboard-hero">
            <div>
              <div className="dashboard-hero__eyebrow">Uptime monitoring</div>
              <h1 className="dashboard-hero__title">
                Keep track of every endpoint from one clean workspace.
              </h1>
              <p className="dashboard-hero__text">
                Create monitors, watch response times, and catch outages in real
                time.
              </p>
            </div>
            <div className="dashboard-hero__meta">
              <div className="dashboard-hero__theme-toggle">
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <StyleToggle />
                  <ThemeToggle />
                </div>
              </div>
              <span
                className={`dashboard-hero__plan dashboard-hero__plan--${user?.plan?.toLowerCase()}`}
              >
                {user?.plan === "PRO" ? "PRO" : "FREE"}
              </span>
              {user?.plan !== "PRO" ? (
                <button
                  className="dashboard-hero__upgrade"
                  type="button"
                  onClick={handleUpgrade}
                  disabled={isBillingLoading}
                >
                  {isBillingLoading ? "Opening..." : "Upgrade"}
                </button>
              ) : null}
            </div>
          </header>

          <StatBar monitors={monitors} />

          {bannerMessage ? (
            <div className="dashboard-banner">{bannerMessage}</div>
          ) : null}

          <AddMonitorForm
            plan={user?.plan} 
            isSubmitting={isSubmitting}
            onSubmit={handleCreateMonitor}
          />

          <AnalyticsSection analytics={analytics} isLoading={isLoading} />

          <section
            className="dashboard-section dashboard-settings"
            id="notifications"
          >
            <div className="dashboard-settings__panel">
              <div>
                <div className="dashboard-section__heading">Email alerts</div>
                <p className="dashboard-settings__text">
                  Choose where outage and recovery alerts should be sent.
                </p>
              </div>
              <form
                className="dashboard-settings__form"
                onSubmit={handleSaveAlertSettings}
              >
                <label className="dashboard-settings__toggle">
                  <input
                    type="checkbox"
                    checked={alertSettings.enabled}
                    onChange={(event) =>
                      setAlertSettings((current) => ({
                        ...current,
                        enabled: event.target.checked,
                      }))
                    }
                  />
                  <span>Email alerts enabled</span>
                </label>
                <input
                  className="dashboard-settings__input"
                  type="email"
                  value={alertSettings.email}
                  onChange={(event) =>
                    setAlertSettings((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder={user?.email || "alerts@example.com"}
                />
                <button
                  className="dashboard-settings__button"
                  type="submit"
                  disabled={isSavingAlerts}
                >
                  {isSavingAlerts ? "Saving..." : "Save email"}
                </button>
              </form>
            </div>

            <div className="dashboard-settings__panel">
              <div className="dashboard-section__heading">
                Notification history
              </div>
              {alertHistory.length ? (
                <div className="dashboard-settings__history">
                  {alertHistory.slice(0, 3).map((notification) => (
                    <div
                      className="dashboard-settings__history-row"
                      key={notification.id}
                    >
                      <div>
                        <div
                          className="dashboard-settings__history-title"
                          title={notification.url}
                        >
                          {notification.url}
                        </div>
                        <div className="dashboard-settings__history-meta">
                          {notification.event} -{" "}
                          {notification.recipientEmail || "No recipient"}
                        </div>
                      </div>
                      <span
                        className={`dashboard-settings__history-status dashboard-settings__history-status--${notification.deliveryStatus}`}
                      >
                        {notification.deliveryStatus}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-settings__empty">
                  No email alert activity yet.
                </div>
              )}
            </div>
          </section>

          <section className="dashboard-section" id="monitors">
            <div className="dashboard-section__topbar">
              <div className="dashboard-section__heading">
                Monitors <span>({monitors.length})</span>
              </div>
              <input
                className="dashboard-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search monitors by URL"
              />
            </div>

            {isLoading ? (
              <div className="dashboard-list">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} />
                ))}
              </div>
            ) : monitors.length ? (
              <>
                <div className="dashboard-list">
                  {visibleMonitors.map((monitor) => (
                    <MonitorCard
                      key={monitor.id}
                      monitor={monitor}
                      flashKey={flashMap[monitor.id]}
                      onDelete={() => setDeleteTarget(monitor)}
                      onOpen={setSelectedMonitorId}
                    />
                  ))}
                </div>
                {totalPages > 1 ? (
                  <div className="dashboard-pagination">
                    <button
                      className="dashboard-pagination__button"
                      type="button"
                      disabled={safeCurrentPage === 1}
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                    >
                      Previous
                    </button>
                    <span className="dashboard-pagination__label">
                      Page {safeCurrentPage} of {totalPages}
                    </span>
                    <button
                      className="dashboard-pagination__button"
                      type="button"
                      disabled={safeCurrentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState />
            )}
          </section>

          {selectedMonitorId ? (
            <MonitorDetailsModal
              monitorId={selectedMonitorId}
              plan={user?.plan}
              socket={socket}
              onClose={() => setSelectedMonitorId(null)}
              onUpdated={() => {
                loadMonitors(searchQuery);
                loadAnalytics();
              }}
            />
          ) : null}

          {deleteTarget ? (
            <ConfirmDialog
              title="Delete monitor?"
              message={`This will remove ${deleteTarget.url} and its dashboard entry.`}
              confirmLabel="Delete"
              onCancel={() => setDeleteTarget(null)}
              onConfirm={() => {
                const targetId = deleteTarget.id;
                setDeleteTarget(null);
                handleDeleteMonitor(targetId);
              }}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
