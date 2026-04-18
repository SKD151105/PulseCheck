import "./Toast.css";

export default function Toast({ toast, onClose }) {
  return (
    <div className={`toast toast--${toast.type || "info"}`}>
      <div>
        <div className="toast__title">{toast.title}</div>
        {toast.message ? <div className="toast__message">{toast.message}</div> : null}
      </div>
      <button className="toast__close" onClick={() => onClose(toast.id)} aria-label="Close toast">
        ×
      </button>
    </div>
  );
}
