import { useEffect, useState } from "react";
import "./StartupScreen.css";

const SLOW_MESSAGE_DELAY_MS = 6000;

export default function StartupScreen({
  mode = "loading",
  message = "",
  onRetry,
  showSlowMessage = true,
}) {
  const [showWakeMessage, setShowWakeMessage] = useState(false);

  useEffect(() => {
    if (mode !== "loading" || !showSlowMessage) {
      setShowWakeMessage(false);
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setShowWakeMessage(true);
    }, SLOW_MESSAGE_DELAY_MS);

    return () => window.clearTimeout(timerId);
  }, [mode, showSlowMessage]);

  const description =
    mode === "error"
      ? message || "Unable to reach PulseCheck right now."
      : showWakeMessage
        ? "Waking up the server - this can take up to a minute on first load."
        : "Loading...";

  return (
    <div className="startup-screen">
      <div className="startup-screen__card">
        <div className="startup-screen__brand">
          <div className="startup-screen__pulse" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <div className="startup-screen__eyebrow">Uptime monitoring</div>
            <div className="startup-screen__name">PulseCheck</div>
          </div>
        </div>

        <div className="startup-screen__body">
          <div className="startup-screen__status" aria-live="polite">
            {description}
          </div>

          {mode === "loading" ? (
            <div className="startup-screen__spinner" aria-hidden="true" />
          ) : (
            <button
              className="startup-screen__retry"
              type="button"
              onClick={onRetry}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
