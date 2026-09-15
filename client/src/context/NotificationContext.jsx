import { createContext, useCallback, useContext, useRef, useState } from "react";

const NotificationContext = createContext();

let idCounter = 0;

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const resolverRef = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    const id = ++idCounter;
    setToasts((current) => [...current, { id, message, type }]);

    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const showSuccess = useCallback(
    (message) => showToast(message, "success"),
    [showToast]
  );

  const showError = useCallback(
    (message) => showToast(message, "error"),
    [showToast]
  );

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfirmState({
        message,
        confirmLabel: options.confirmLabel || "Delete",
        cancelLabel: options.cancelLabel || "Cancel",
        danger: options.danger !== false,
      });
    });
  }, []);

  const handleConfirmResolve = (result) => {
    setConfirmState(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  };

  return (
    <NotificationContext.Provider
      value={{ showToast, showSuccess, showError, confirm }}
    >
      {children}

      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <p>{confirmState.message}</p>
            <div className="confirm-actions">
              <button
                className="confirm-cancel-btn"
                onClick={() => handleConfirmResolve(false)}
              >
                {confirmState.cancelLabel}
              </button>
              <button
                className={
                  confirmState.danger
                    ? "confirm-danger-btn"
                    : "confirm-ok-btn"
                }
                onClick={() => handleConfirmResolve(true)}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
