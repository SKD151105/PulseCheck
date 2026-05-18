import "./AnalyticsSection.css";

const formatValue = (value, suffix = "") => {
  if (value === null || value === undefined) {
    return "--";
  }

  return `${value}${suffix}`;
};

const formatRelativeTime = (value) => {
  if (!value) {
    return "--";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

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

const toHostname = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const InsightCard = ({ label, value, tone, meta }) => (
  <div className="analytics-card">
    <div className="analytics-card__label">{label}</div>
    <div className={`analytics-card__value analytics-card__value--${tone || "default"}`}>{value}</div>
    {meta ? <div className="analytics-card__meta">{meta}</div> : null}
  </div>
);

export default function AnalyticsSection({ analytics, isLoading }) {
  if (isLoading || !analytics) {
    return null;
  }

  const { overview, highlights, topReliable, unstableMonitors, recentIncidents, monitorPerformance } = analytics;

  return (
    <section className="analytics" id="analytics">
      <div className="dashboard-section__heading">
        Analytics <span>({monitorPerformance.length} monitors)</span>
      </div>

      <div className="analytics-grid">
        <InsightCard
          label="7d Uptime"
          value={formatValue(overview.uptimePercentage7d, "%")}
          tone="up"
          meta={`${overview.activeIncidents} active incidents`}
        />
        <InsightCard
          label="Avg Response"
          value={formatValue(overview.avgResponseTime7d, "ms")}
          meta="Average over the last 7 days"
        />
        <InsightCard
          label="Checks Today"
          value={formatValue(overview.checksToday)}
          meta={`${overview.pendingMonitors} pending monitors`}
        />
        <InsightCard
          label="Most Unstable"
          value={highlights.unstableMonitor?.url ? toHostname(highlights.unstableMonitor.url) : "--"}
          tone={highlights.unstableMonitor ? "down" : "default"}
          meta={
            highlights.unstableMonitor
              ? `${highlights.unstableMonitor.downChecks} failures in 7d`
              : "No recent failures"
          }
        />
      </div>

      <div className="analytics-panels">
        <div className="analytics-panel">
          <div className="analytics-panel__title">Reliable monitors</div>
          {topReliable.length ? (
            <div className="analytics-list">
              {topReliable.map((item) => (
                <div className="analytics-list__item" key={item.monitorId}>
                  <div>
                    <div className="analytics-list__primary" title={item.url}>
                      {item.url}
                    </div>
                    <div className="analytics-list__secondary">
                      {formatValue(item.uptimePercentage, "%")} uptime
                    </div>
                  </div>
                  <div className="analytics-list__metric">{formatValue(item.avgResponseTime, "ms")}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="analytics-panel__empty">Not enough check history yet.</div>
          )}
        </div>

        <div className="analytics-panel">
          <div className="analytics-panel__title">Recent incidents</div>
          {recentIncidents.length ? (
            <div className="analytics-list">
              {recentIncidents.map((incident, index) => (
                <div className="analytics-list__item" key={`${incident.monitorId}-${incident.checkedAt}-${index}`}>
                  <div>
                    <div className="analytics-list__primary" title={incident.url}>
                      {incident.url}
                    </div>
                    <div className="analytics-list__secondary">{formatRelativeTime(incident.checkedAt)}</div>
                  </div>
                  <div className="analytics-list__metric analytics-list__metric--down">
                    {incident.responseTime !== null ? `${incident.responseTime}ms` : "Failed"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="analytics-panel__empty">No downtime signals in the last 7 days.</div>
          )}
        </div>
      </div>

      <div className="analytics-panel analytics-panel--table">
        <div className="analytics-panel__title">Monitor performance</div>
        <div className="analytics-table">
          <div className="analytics-table__head">
            <span>Monitor</span>
            <span>Uptime</span>
            <span>Avg Response</span>
            <span>Failures</span>
            <span>Last incident</span>
          </div>
          <div className="analytics-table__body">
            {monitorPerformance.map((item) => (
              <div className="analytics-table__row" key={item.monitorId}>
                <span title={item.url}>{item.url}</span>
                <span>{formatValue(item.uptimePercentage, "%")}</span>
                <span>{formatValue(item.avgResponseTime, "ms")}</span>
                <span className={item.downChecks ? "analytics-table__danger" : ""}>{item.downChecks}</span>
                <span>{formatRelativeTime(item.lastIncidentAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {unstableMonitors.length ? (
        <div className="analytics-panel analytics-panel--stacked">
          <div className="analytics-panel__title">Needs attention</div>
          <div className="analytics-list">
            {unstableMonitors.map((item) => (
              <div className="analytics-list__item" key={item.monitorId}>
                <div>
                  <div className="analytics-list__primary" title={item.url}>
                    {item.url}
                  </div>
                  <div className="analytics-list__secondary">
                    {item.downChecks} failures, {formatValue(item.uptimePercentage, "%")} uptime
                  </div>
                </div>
                <div className="analytics-list__metric analytics-list__metric--down">
                  {formatRelativeTime(item.lastIncidentAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
