import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import AlertModal from "./AlertModal";

const AlertContext = createContext(null);

const INITIAL_ALERT = {
  open: false,
  title: "Notification",
  message: "",
  type: "info",
  confirmText: "OK",
  showCloseButton: true,
  closeOnBackdrop: true,
  onConfirm: null,
};

export function AlertProvider({ children }) {
  const [alert, setAlert] = useState(INITIAL_ALERT);

  const hideAlert = useCallback(() => {
    setAlert(INITIAL_ALERT);
  }, []);

  const showAlert = useCallback((options) => {
    if (typeof options === "string") {
      setAlert({
        ...INITIAL_ALERT,
        open: true,
        message: options,
      });

      return;
    }

    setAlert({
      ...INITIAL_ALERT,
      ...options,
      open: true,
    });
  }, []);

  const value = useMemo(
    () => ({
      showAlert,
      hideAlert,
    }),
    [showAlert, hideAlert],
  );

  return (
    <AlertContext.Provider value={value}>
      {children}

      <AlertModal
        open={alert.open}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        confirmText={alert.confirmText}
        showCloseButton={alert.showCloseButton}
        closeOnBackdrop={alert.closeOnBackdrop}
        onConfirm={alert.onConfirm}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);

  if (!context) {
    throw new Error("useAlert harus digunakan di dalam AlertProvider");
  }

  return context;
}
