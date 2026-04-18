import { useMemo, useState } from "react";
import "./AddMonitorForm.css";

const INTERVAL_OPTIONS = [1, 2, 5, 10, 30];

export default function AddMonitorForm({ plan, isSubmitting, onSubmit }) {
  const [url, setUrl] = useState("");
  const [interval, setInterval] = useState("5");
  const [error, setError] = useState("");

  const allowedIntervals = useMemo(() => (plan === "PRO" ? INTERVAL_OPTIONS : [5, 10, 30]), [plan]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await onSubmit({ url, interval: Number(interval) });
      setUrl("");
      setInterval(String(allowedIntervals[0]));
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Unable to add monitor");
    }
  };

  return (
    <form className="add-monitor-card" onSubmit={handleSubmit}>
      <div className="add-monitor-row">
        <input
          className="add-monitor-input"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com"
          required
        />
        <select
          className="add-monitor-select"
          value={interval}
          onChange={(event) => setInterval(event.target.value)}
          title={plan !== "PRO" ? "Upgrade to PRO" : ""}
        >
          {INTERVAL_OPTIONS.map((value) => {
            const disabled = plan !== "PRO" && value < 5;

            return (
              <option
                key={value}
                value={value}
                disabled={disabled}
                title={disabled ? "Upgrade to PRO" : ""}
              >
                {value}m
              </option>
            );
          })}
        </select>
        <button className="add-monitor-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Monitor"}
        </button>
      </div>
      {error ? <div className="add-monitor-error">{error}</div> : null}
    </form>
  );
}
