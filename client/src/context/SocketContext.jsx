import { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../services/socket";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [hasConnected, setHasConnected] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      setIsConnected(false);
      setHasConnected(false);
      return undefined;
    }

    const handleConnect = () => {
      setIsConnected(true);
      setHasConnected(true);
    };
    const handleDisconnect = () => setIsConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    setIsConnected(socket.connected);
    setHasConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [token, user]);

  return <SocketContext.Provider value={{ socket, isConnected, hasConnected }}>{children}</SocketContext.Provider>;
};

export const useSocketContext = () => useContext(SocketContext);
