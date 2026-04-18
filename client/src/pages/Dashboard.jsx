import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import StatBar from "../components/StatBar";
import AddMonitorForm from "../components/AddMonitorForm";
import MonitorCard from "../components/MonitorCard";
import MonitorDetailsModal from "../components/MonitorDetailsModal";
import Skeleton from "../components/Skeleton";
import AnalyticsSection from "../components/AnalyticsSection";
import { useToast } from "../context/ToastContext";
import { useSocketContext } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./Dashboard.css";

const EmptyState = () => (
  <div className="empty-state">
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M32 10a22 22 0 1 0 22 22h-4a18 18 0 1 1-18-18V10Zm0 10a12 12 0 1 0 12 12h-4a8 8 0 1 1-8-8v-4Zm0 10a2 2 0 1 0 2 2 2 2 0 0 0-2-2Z"
        fill="currentColor"
      />
    </svg>
    <div className="empty-state__title">No monitors yet</div>
    <div className="empty-state__text">Add your first URL above to start monitoring.</div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
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
  const analyticsTimerRef = useRef(null);

  const loadMonitors = async (search = "") => {
    try {
      const response = await api.get("/monitors", {
        params: search ? { search } : {},
      });
      setMonitors(response.data.monitors);
      setNetworkError("");
    } catch (error) {
      setNetworkError(error.response?.data?.message || "Unable to load monitors");
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
      setNetworkError(error.response?.data?.message || "Unable to load analytics");
    }
  };

  useEffect(() => {
    loadMonitors();
    loadAnalytics();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadMonitors(searchQuery);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (analyticsTimerRef.current) {
        window.clearTimeout(analyticsTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleMonitorChecked = (payload) => {
      setMonitors((current) =>
        current.map((monitor) => (monitor.id === payload.id ? { ...monitor, ...payload } : monitor))
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
        title: payload.status === "UP" ? "Monitor recovered" : "Monitor is down",
        message: payload.url,
      });
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

  const bannerMessage = networkError || (hasConnected && !isConnected ? "Connection lost. Reconnecting..." : "");

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-shell">
          <header className="dashboard-hero">
            <div>
              <div className="dashboard-hero__eyebrow">Uptime monitoring</div>
              <h1 className="dashboard-hero__title">Keep track of every endpoint from one clean workspace.</h1>
              <p className="dashboard-hero__text">
                Create monitors, watch response times, and catch outages in real time.
              </p>
            </div>
            <div className="dashboard-hero__meta">
              <span className={`dashboard-hero__plan dashboard-hero__plan--${user?.plan?.toLowerCase()}`}>
                {user?.plan} plan
              </span>
            </div>
          </header>

          <StatBar monitors={monitors} />

          {bannerMessage ? <div className="dashboard-banner">{bannerMessage}</div> : null}

          <AddMonitorForm plan={user?.plan} isSubmitting={isSubmitting} onSubmit={handleCreateMonitor} />

          <AnalyticsSection analytics={analytics} isLoading={isLoading} />

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
              <div className="dashboard-list">
                {monitors.map((monitor) => (
                  <MonitorCard
                    key={monitor.id}
                    monitor={monitor}
                    flashKey={flashMap[monitor.id]}
                    onDelete={handleDeleteMonitor}
                    onOpen={setSelectedMonitorId}
                  />
                ))}
              </div>
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
        </div>
      </main>
    </div>
  );
}
