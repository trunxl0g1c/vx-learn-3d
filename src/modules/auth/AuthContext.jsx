import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchMe } from "./api/me";

const AuthContext = createContext(null);

// Matches the key src/utils/authUser.js already reads — keeping it in sync
// here means every existing getCurrentUserName() call site (EditorTopBar,
// ProjectHubNavbar, useViewerProject) picks up the real logged-in user with
// no changes of its own.
const USER_STORAGE_KEY = "vx_user";

function persistUser(user) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    fetchMe()
      .then((currentUser) => {
        if (cancelled) return;

        setUser(currentUser);
        persistUser(currentUser);
        setStatus(currentUser ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (cancelled) return;

        setUser(null);
        persistUser(null);
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Login/register/logout mutations already hit the API themselves (via
  // useLogin/useRegister/useLogout) — this just syncs the resulting session
  // into context + localStorage afterward, instead of firing a second
  // redundant network call.
  const setSession = useCallback((sessionUser) => {
    setUser(sessionUser);
    persistUser(sessionUser);
    setStatus(sessionUser ? "authenticated" : "unauthenticated");
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: status === "authenticated",
      isLoading: status === "loading",
      setSession,
    }),
    [user, status, setSession],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
