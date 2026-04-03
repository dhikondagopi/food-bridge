import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

type LocationState = {
  from?: { pathname: string };
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading } = useAuth();
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    if (loading) return;

    // AuthContext has finished session recovery
    setRedirecting(false);

    // Use location state from ProtectedRoute first
    const state = location.state as LocationState | null;
    const from = state?.from?.pathname;
    
    if (from && from !== "/auth/callback" && from !== "/login") {
      navigate(from, { replace: true });
      return;
    }

    // Default to dashboard (AuthContext already has role info)
    navigate("/dashboard", { replace: true });
  }, [loading, location.state, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-lg font-medium text-white">
          {redirecting ? "Logging you in..." : "Redirecting..."}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;