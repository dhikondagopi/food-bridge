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

const Signup = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const { signUp, user, loading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"restaurant" | "ngo" | "volunteer">("ngo");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Redirect after login/signup
  useEffect(() => {
    if (loading) return;

    if (user) {
      const from = (location.state as any)?.from?.pathname;
      navigate(from && from !== "/signup" ? from : "/dashboard", {
        replace: true,
      });
    }
  }, [user, loading]);

  // ✅ CLEAN handleSubmit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast.error("Please fill all fields");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error("Invalid email format");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setSubmitting(true);

      const result = await signUp(email, password, role, fullName);

      if (result?.requiresEmailConfirmation) {
        toast.success("Check your email for verification");
        navigate("/login", { replace: true });
        return;
      }

      toast.success("Signup successful");
      navigate("/dashboard", { replace: true });

    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Signup failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
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
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-semibold">Create account</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Input
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="role" className="text-white/90 mb-2 block">
                  Select your role
                </Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "restaurant" | "ngo" | "volunteer")
                  }
                  className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="restaurant" className="bg-slate-800">Restaurant</option>
                  <option value="ngo" className="bg-slate-800">NGO</option>
                  <option value="volunteer" className="bg-slate-800">Volunteer</option>
                </select>
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Creating..." : "Create account"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <PrefetchLink
                to="/login"
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </PrefetchLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;