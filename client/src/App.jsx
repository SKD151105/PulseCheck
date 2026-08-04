import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import StartupScreen from "./components/StartupScreen";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

const ProtectedRoute = ({ children }) => {
  const { user, isBootstrapping, bootstrapError } = useAuth();

  if (isBootstrapping || bootstrapError) {
    return null;
  }

  return user ? children : <Navigate to="/login" replace />;
};

const GuestRoute = ({ children }) => {
  const { user, isBootstrapping, bootstrapError } = useAuth();

  if (isBootstrapping || bootstrapError) {
    return null;
  }

  return user ? <Navigate to="/" replace /> : children;
};

export default function App() {
  const { isBootstrapping, bootstrapError, retryBootstrap } = useAuth();

  if (isBootstrapping) {
    return <StartupScreen />;
  }

  if (bootstrapError) {
    return (
      <StartupScreen
        mode="error"
        message={bootstrapError}
        onRetry={retryBootstrap}
      />
    );
  }

  return (
    <div className="app-shell">
      <Suspense fallback={<StartupScreen showSlowMessage={false} />}>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
