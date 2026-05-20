import { createContext, useContext, useEffect, useRef, useState } from "react";
import api, { TOKEN_KEY, setStoredToken } from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const logoutRequestedRef = useRef(false);

  const persistSession = (nextToken, nextUser) => {
    logoutRequestedRef.current = false;
    setStoredToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    connectSocket(nextToken);
  };

  const clearSession = () => {
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
    const bootstrap = async () => {
      try {
        if (logoutRequestedRef.current) {
          return;
        }
        const activeToken = token || (await api.post("/auth/refresh")).data.token;
        setStoredToken(activeToken);
        setToken(activeToken);
        connectSocket(activeToken);
        await refreshUser();
      } catch {
        clearSession();
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isBootstrapping,
        register,
        login,
        googleAuth,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
