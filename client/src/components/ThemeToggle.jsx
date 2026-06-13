import { useId } from "react";
import { useTheme } from "../context/ThemeContext";
import "./ThemeToggle.css";

const MoonIcon = () => {
  const maskId = useId();

  return (
    <svg className="theme-toggle__moon" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <mask id={maskId}>
          <rect width="24" height="24" fill="white" />
          <circle cx="15" cy="9" r="7" fill="black" />
        </mask>
      </defs>
      <circle cx="12" cy="12" r="8" fill="currentColor" stroke="none" mask={`url(#${maskId})`} />
    </svg>
  );
};

const SunIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      className="theme-toggle"
      type="button"
      onMouseUp={e => e.currentTarget.blur()}
      style={{ outline: "none" }}
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
