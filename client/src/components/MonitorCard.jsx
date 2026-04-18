import { useEffect, useState } from "react";
import "./MonitorCard.css";

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v7h-2v-7Zm4 0h2v7h-2v-7ZM7 10h2v7H7v-7Zm-1 10h12l1-12H5l1 12Z"
      fill="currentColor"
    />
  </svg>
);

const formatLastChecked = (value) => {
  if (!value) {
    return "Never checked";
  }

  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);

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

  const days = Math.floor(hours / 24);
  return `${days} day ago`;
};

export default function MonitorCard({ monitor, flashKey, onDelete }) {
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (!flashKey) {
      return undefined;
    }

    setIsFlashing(true);
    const timeoutId = window.setTimeout(() => setIsFlashing(false), 500);

    return () => window.clearTimeout(timeoutId);
  }, [flashKey]);

  return (
    <div className="monitor-card">
      <div className="monitor-card__left">
        <span className={`monitor-card__dot monitor-card__dot--${monitor.status.toLowerCase()}`} />
        <span className="monitor-card__url" title={monitor.url}>
          {monitor.url}
        </span>
      </div>

      <div className="monitor-card__center">
        <span className={`monitor-card__response ${isFlashing ? "monitor-card__response--flash" : ""}`}>
          {typeof monitor.lastResponseTime === "number" ? `${monitor.lastResponseTime}ms` : "—"}
        </span>
        <span className="monitor-card__interval">every {monitor.interval}m</span>
      </div>

      <div className="monitor-card__right">
        <span className={`monitor-card__badge monitor-card__badge--${monitor.status.toLowerCase()}`}>
          {monitor.status}
        </span>
        <span className="monitor-card__checked">{formatLastChecked(monitor.lastCheckedAt)}</span>
        <button className="monitor-card__delete" onClick={() => onDelete(monitor.id)} aria-label="Delete monitor">
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
