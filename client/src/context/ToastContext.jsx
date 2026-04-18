import { createContext, useContext, useState } from "react";
import Toast from "../components/Toast";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const addToast = (payload) => {
    const id = crypto.randomUUID();
    const toast = { id, duration: 4000, ...payload };

    setToasts((current) => [...current, toast]);

    window.setTimeout(() => {
      removeToast(id);
    }, toast.duration);
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
