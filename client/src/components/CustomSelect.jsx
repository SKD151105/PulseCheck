import { useEffect, useRef, useState } from "react";
import "./CustomSelect.css";

export default function CustomSelect({
  value,
  onChange,
  options,
  title = "",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find(
    (option) => String(option.value) === String(value),
  );

  const handleSelect = (option) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  return (
    <div
      className={`custom-select ${open ? "open" : ""} ${className}`}
      ref={containerRef}
      title={title}
    >
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((prev) => !prev);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="custom-select-value">
          {selected ? selected.label : ""}
        </span>
        <svg
          className="custom-select-chevron"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul className="custom-select-menu" role="listbox">
          {options.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={String(option.value) === String(value)}
              aria-disabled={option.disabled || undefined}
              title={option.title}
              className={[
                "custom-select-option",
                String(option.value) === String(value) ? "selected" : "",
                option.disabled ? "disabled" : "",
              ]
                .join(" ")
                .trim()}
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
