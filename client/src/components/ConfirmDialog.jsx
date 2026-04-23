import "./ConfirmDialog.css";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onCancel,
  onConfirm,
}) {
  return (
    <div className="confirm-dialog" onClick={onCancel}>
      <div
        className="confirm-dialog__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="confirm-dialog__title" id="confirm-dialog-title">
          {title}
        </h2>
        <p className="confirm-dialog__text">{message}</p>
        <div className="confirm-dialog__actions">
          <button className="confirm-dialog__button confirm-dialog__button--secondary" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="confirm-dialog__button confirm-dialog__button--danger" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
