import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);

const TOKEN_KEY = "pulsecheck_token";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const persistSession = (nextToken, nextUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    connectSocket(nextToken);
  };

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
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

  const logout = () => {
    clearSession();
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        connectSocket(token);
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
