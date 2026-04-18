import "./LineChart.css";

const toChartPoints = (points, width, height) => {
  if (!points.length) {
    return "";
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point.value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
};

export default function LineChart({ title, subtitle, points, suffix = "" }) {
  const validPoints = points.filter((point) => typeof point.value === "number");

  if (!validPoints.length) {
    return (
      <div className="line-chart">
        <div className="line-chart__header">
          <div className="line-chart__title">{title}</div>
          <div className="line-chart__subtitle">{subtitle}</div>
        </div>
        <div className="line-chart__empty">Not enough data yet.</div>
      </div>
    );
  }

  const polyline = toChartPoints(validPoints, 100, 56);
  const latest = validPoints[validPoints.length - 1];

  return (
    <div className="line-chart">
      <div className="line-chart__header">
        <div className="line-chart__title">{title}</div>
        <div className="line-chart__subtitle">{subtitle}</div>
      </div>

      <div className="line-chart__value">
        {latest.value}
        {suffix}
      </div>

      <svg className="line-chart__svg" viewBox="0 0 100 56" preserveAspectRatio="none" aria-hidden="true">
        <polyline className="line-chart__line" points={polyline} />
      </svg>

      <div className="line-chart__labels">
        <span>{validPoints[0].label}</span>
        <span>{latest.label}</span>
      </div>
    </div>
  );
}
