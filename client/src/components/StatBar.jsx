import "./StatBar.css";

export default function StatBar({ monitors }) {
  const total = monitors.length;
  const up = monitors.filter((monitor) => monitor.status === "UP").length;
  const down = monitors.filter((monitor) => monitor.status === "DOWN").length;

  return (
    <div className="stat-bar">
      <div className="stat-card">
        <div className="stat-card__label">Total Monitors</div>
        <div className="stat-card__value">{total}</div>
      </div>
      <div className="stat-card">
        <div className="stat-card__label">Monitors Up</div>
        <div className="stat-card__value stat-card__value--up">{up}</div>
      </div>
      <div className="stat-card">
        <div className="stat-card__label">Monitors Down</div>
        <div className="stat-card__value stat-card__value--down">{down}</div>
      </div>
    </div>
  );
}
