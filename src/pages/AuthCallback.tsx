import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogin = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Login error:", error);
        navigate("/login");
      } else {
        navigate("/dashboard");
      }
    };

    handleLogin();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg font-medium">Logging you in...</p>
    </div>
  );
};

export default AuthCallback;