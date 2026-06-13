import { useEffect, useState } from "react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import LineChart from "./LineChart";
import "./MonitorDetailsModal.css";
import CustomSelect from "./CustomSelect";

const INTERVAL_OPTIONS = [1, 2, 5, 10, 30];

const formatRelativeTime = (value) => {
  if (!value) {
    return "--";
  }

  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  return `${Math.floor(hours / 24)} day ago`;
};

const formatDuration = (value) => {
  if (!value) {
    return "--";
  }

  const minutes = Math.floor(value / 60000);

  if (minutes < 1) {
    return "<1 min";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const DetailMetric = ({ label, value }) => (
  <div className="monitor-modal__metric">
    <div className="monitor-modal__metric-label">{label}</div>
    <div className="monitor-modal__metric-value">{value}</div>
  </div>
);

export default function MonitorDetailsModal({
  monitorId,
  plan,
  socket,
  onClose,
  onUpdated,
}) {
  const { addToast } = useToast();
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ url: "", interval: "5" });
  const [error, setError] = useState("");

  const loadDetails = async () => {
    try {
      const response = await api.get(`/monitors/${monitorId}/details`);
      setDetails(response.data.details);
      setForm({
        url: response.data.details.monitor.url,
        interval: String(response.data.details.monitor.interval),
      });
      setError("");
    } catch (loadError) {
      setError(
        loadError.response?.data?.message || "Unable to load monitor details",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [monitorId]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleMonitorChecked = (payload) => {
      if (payload.id === monitorId) {
        loadDetails();
      }
    };

    socket.on("monitor_checked", handleMonitorChecked);

    return () => {
      socket.off("monitor_checked", handleMonitorChecked);
    };
  }, [monitorId, socket]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await api.patch(`/monitors/${monitorId}`, {
        url: form.url,
        interval: Number(form.interval),
      });

      addToast({
        type: "success",
        title: "Monitor updated",
        message: response.data.monitor.url,
      });

      setIsEditing(false);
      onUpdated(response.data.monitor);
      loadDetails();
    } catch (submitError) {
      setError(
        submitError.response?.data?.message || "Unable to update monitor",
      );
    }
  };

  if (!monitorId) {
    return null;
  }

  const allowedIntervals =
    plan === "PRO"
      ? INTERVAL_OPTIONS
      : INTERVAL_OPTIONS.filter((value) => value >= 5);

  return (
    <div className="monitor-modal" onClick={onClose}>
      <div
        className="monitor-modal__card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="monitor-modal__header">
          <div>
            <div className="monitor-modal__eyebrow">Monitor details</div>
            <h2 className="monitor-modal__title">
              {details?.monitor.url || "Loading monitor"}
            </h2>
          </div>
          <div className="monitor-modal__actions">
            <button
              className="monitor-modal__button"
              onClick={() => setIsEditing((current) => !current)}
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
            <button className="monitor-modal__button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="monitor-modal__empty">Loading monitor details...</div>
        ) : null}
        {!isLoading && error ? (
          <div className="monitor-modal__error">{error}</div>
        ) : null}

        {!isLoading && details ? (
          <>
            {isEditing ? (
              <form className="monitor-modal__edit" onSubmit={handleSubmit}>
                <input
                  className="monitor-modal__input"
                  type="url"
                  value={form.url}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      url: event.target.value,
                    }))
                  }
                  required
                />
                <CustomSelect
                  className="monitor-modal__input--select"
                  value={form.interval}
                  onChange={(val) =>
                    setForm((current) => ({ ...current, interval: val }))
                  }
                  options={INTERVAL_OPTIONS.map((value) => ({
                    value: String(value),
                    label: `${value}m`,
                    disabled: !allowedIntervals.includes(value),
                  }))}
                />  
                <button
                  className="monitor-modal__button monitor-modal__button--primary"
                  type="submit"
                >
                  Save changes
                </button>
              </form>
            ) : null}

            <div className="monitor-modal__metrics">
              <DetailMetric
                label="Uptime 24h"
                value={
                  details.summary.uptime24h !== null
                    ? `${details.summary.uptime24h}%`
                    : "--"
                }
              />
              <DetailMetric
                label="Uptime 7d"
                value={
                  details.summary.uptime7d !== null
                    ? `${details.summary.uptime7d}%`
                    : "--"
                }
              />
              <DetailMetric
                label="Avg response 24h"
                value={
                  details.summary.avgResponse24h !== null
                    ? `${details.summary.avgResponse24h}ms`
                    : "--"
                }
              />
              <DetailMetric
                label="Incidents"
                value={details.summary.incidentCount}
              />
            </div>

            <div className="monitor-modal__charts">
              <LineChart
                title="Response trend"
                subtitle="Last 24 hours"
                suffix="ms"
                points={details.trends.response24h.map((point) => ({
                  label: new Date(point.checkedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  value: point.responseTime,
                }))}
              />
              <LineChart
                title="Uptime trend"
                subtitle="Last 7 days"
                suffix="%"
                points={details.trends.uptime7d.map((point) => ({
                  label: point.label,
                  value: point.uptimePercentage,
                }))}
              />
            </div>

            <div className="monitor-modal__section">
              <div className="monitor-modal__section-title">
                Incident history
              </div>
              {details.incidents.length ? (
                <div className="monitor-modal__timeline">
                  {details.incidents.map((incident) => (
                    <div
                      className="monitor-modal__timeline-item"
                      key={incident.id}
                    >
                      <div>
                        <div className="monitor-modal__timeline-status">
                          {incident.isOpen
                            ? "Active outage"
                            : "Resolved outage"}
                        </div>
                        <div className="monitor-modal__timeline-meta">
                          Started {formatRelativeTime(incident.startedAt)}
                          {incident.resolvedAt
                            ? `, resolved ${formatRelativeTime(incident.resolvedAt)}`
                            : ""}
                        </div>
                      </div>
                      <div className="monitor-modal__timeline-duration">
                        {formatDuration(incident.durationMs)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="monitor-modal__empty">
                  No incidents recorded for this monitor yet.
                </div>
              )}
            </div>

            <div className="monitor-modal__section">
              <div className="monitor-modal__section-title">Recent checks</div>
              <div className="monitor-modal__checks">
                {details.recentChecks.map((check) => (
                  <div className="monitor-modal__check-row" key={check.id}>
                    <span
                      className={`monitor-modal__check-status monitor-modal__check-status--${check.status.toLowerCase()}`}
                    >
                      {check.status}
                    </span>
                    <span>
                      {check.responseTime !== null
                        ? `${check.responseTime}ms`
                        : "Failed"}
                    </span>
                    <span>{formatRelativeTime(check.checkedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
