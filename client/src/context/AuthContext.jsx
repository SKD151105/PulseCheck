import { createContext, useContext, useEffect, useRef, useState } from "react";
import api, { TOKEN_KEY, setStoredToken } from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);
const BOOTSTRAP_TIMEOUT_MS = 65000;

const isAuthFailure = (error) => {
  const status = error?.response?.status;
  return status === 401 || status === 403;
};

const getBootstrapErrorMessage = (error) => {
  if (error?.code === "ECONNABORTED") {
    return "The server is taking longer than expected to respond. Please try again.";
  }

  return (
    error?.response?.data?.message ||
    "Unable to reach PulseCheck right now. Please retry."
  );
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const logoutRequestedRef = useRef(false);
  const bootstrapRequestIdRef = useRef(0);

  const persistSession = (nextToken, nextUser) => {
    logoutRequestedRef.current = false;
    setBootstrapError("");
    setStoredToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    connectSocket(nextToken);
  };

  const clearSession = () => {
    setBootstrapError("");
    setStoredToken(null);
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  const refreshUser = async () => {
    const response = await api.get("/auth/me");
    setUser(response.data.user);
    return response.data.user;
  };

  const register = async (payload) => {
    const response = await api.post("/auth/register", payload);
    persistSession(response.data.token, response.data.user);
    return response.data.user;
  };

  const login = async (payload) => {
    const response = await api.post("/auth/login", payload);
    persistSession(response.data.token, response.data.user);
    return response.data.user;
  };

  const googleAuth = async (credential) => {
    const response = await api.post("/auth/google", { credential });
    persistSession(response.data.token, response.data.user);
    return response.data.user;
  };

  const logout = async () => {
    logoutRequestedRef.current = true;
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore network/logout failures, local session is cleared regardless.
    } finally {
      clearSession();
      setIsBootstrapping(false);
    }
  };

  useEffect(() => {
    let isCurrentRequest = true;
    const requestId = bootstrapRequestIdRef.current + 1;
    bootstrapRequestIdRef.current = requestId;

    const bootstrap = async () => {
      setBootstrapError("");
      setIsBootstrapping(true);

      try {
        if (logoutRequestedRef.current) {
          return;
        }

        let activeToken = token;

        if (!activeToken) {
          const refreshResponse = await api.post(
            "/auth/refresh",
            {},
            { timeout: BOOTSTRAP_TIMEOUT_MS },
          );
          activeToken = refreshResponse.data.token;
        }

        if (!activeToken) {
          clearSession();
          return;
        }

        setStoredToken(activeToken);
        setToken(activeToken);
        connectSocket(activeToken);

        const response = await api.get("/auth/me", {
          timeout: BOOTSTRAP_TIMEOUT_MS,
        });

        if (!isCurrentRequest || bootstrapRequestIdRef.current !== requestId) {
          return;
        }

        setUser(response.data.user);
      } catch (error) {
        if (!isCurrentRequest || bootstrapRequestIdRef.current !== requestId) {
          return;
        }

        if (isAuthFailure(error)) {
          clearSession();
          return;
        }

        disconnectSocket();
        setBootstrapError(getBootstrapErrorMessage(error));
      } finally {
        if (isCurrentRequest && bootstrapRequestIdRef.current === requestId) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrap();

    return () => {
      isCurrentRequest = false;
    };
  }, [bootstrapAttempt]);

  const retryBootstrap = () => {
    logoutRequestedRef.current = false;
    setBootstrapError("");
    setBootstrapAttempt((current) => current + 1);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isBootstrapping,
        bootstrapError,
        register,
        login,
        googleAuth,
        logout,
        refreshUser,
        retryBootstrap,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
