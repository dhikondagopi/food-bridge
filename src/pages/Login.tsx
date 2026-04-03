import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PrefetchLink from "@/components/PrefetchLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Leaf, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { signIn, user, profile, loading } = useAuth();

  // Redirect based on user role after successful login
  useEffect(() => {
    if (loading) return;
    
    if (user && profile) {
      const state = location.state as LocationState | null;
      const from = state?.from?.pathname;
      
      // If redirecting from a protected route, honor that
      if (from && from !== "/login" && from !== "/signup") {
        navigate(from, { replace: true });
        return;
      }

      // Otherwise, route based on user role
      let dashboardPath = "/dashboard";
      
      switch (profile.role) {
        case "restaurant":
          dashboardPath = "/restaurant-dashboard";
          break;
        case "ngo":
          dashboardPath = "/ngo-dashboard";
          break;
        case "volunteer":
          dashboardPath = "/volunteer-dashboard";
          break;
        case "admin":
          dashboardPath = "/admin";
          break;
        default:
          dashboardPath = "/dashboard";
      }
      
      navigate(dashboardPath, { replace: true });
    }
  }, [user, profile, loading, location.state, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter email and password");
      return;
    }

    try {
      await signIn(email, password);
      // Don't toast here - AuthContext already handles success toast
      // Navigation happens via useEffect based on profile.role
    } catch (error: unknown) {
      // Check specifically for email not confirmed error
      if (error instanceof Error) {
        if (error.message.includes("Email not confirmed")) {
          toast.error("Please verify your email before logging in. Check your inbox for the confirmation link.");
        } else if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        }
        // Other errors already handled by AuthContext
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectUrl = import.meta.env.VITE_SITE_URL || `${fallbackOrigin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Google sign-in failed";
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.08),_transparent_30%)]" />

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <div className="w-32">
          <LanguageSwitcher />
        </div>
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <PrefetchLink to="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-white/10 backdrop-blur">
                <Leaf className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xl font-bold tracking-tight">{t("brand")}</p>
                <p className="text-sm text-slate-400">
                  Food rescue management platform
                </p>
              </div>
            </PrefetchLink>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="mb-6 space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("login.welcomeBack")}
              </h1>
              <p className="text-sm text-slate-400">{t("login.signInDesc")}</p>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={handleGoogleSignIn}
              className="h-11 w-full bg-white text-slate-900 hover:bg-slate-100"
            >
              {t("login.continueGoogle")}
            </Button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                or continue with email
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-slate-200">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 border-white/10 bg-slate-900/60 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm text-slate-200">
                    Password
                  </Label>
                  <PrefetchLink
                    to="/forgot-password"
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    Forgot password?
                  </PrefetchLink>
                </div>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-white/10 bg-slate-900/60 pr-11 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-primary text-white hover:bg-primary/90"
              >
                Sign In
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              Don't have an account?{" "}
              <PrefetchLink
                to="/signup"
                className="font-medium text-primary hover:text-primary/80"
              >
                Create one
              </PrefetchLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;