import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import PrefetchLink from '@/components/PrefetchLink';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { Leaf, Eye, EyeOff, ArrowRight, ChefHat, Building2, HandHeart } from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const FEATURES = [
  { icon: ChefHat,   color: 'bg-orange-500', label: 'Restaurants donate surplus food' },
  { icon: Building2, color: 'bg-sky-500',    label: 'NGOs coordinate pickups' },
  { icon: HandHeart, color: 'bg-emerald-500', label: 'Volunteers deliver to those in need' },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signIn, profile, user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && profile) navigate('/dashboard', { replace: true });
  }, [user, profile, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please enter email and password'); return; }
    try {
      setLoadingEmail(true);
      await signIn(email, password);
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally { setLoadingEmail(false); }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error?.message || 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  if (authLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.10),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.05),transparent_70%)]" />
      </div>

      {/* Top bar */}
      <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4">
        <div className="w-28 sm:w-32"><LanguageSwitcher /></div>
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm sm:max-w-md"
        >
          {/* Logo */}
          <div className="mb-8 text-center">
            <PrefetchLink to="/" className="inline-flex items-center gap-3 group">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-white/10 backdrop-blur transition group-hover:bg-primary/25 sm:h-12 sm:w-12">
                <Leaf className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold tracking-tight sm:text-xl">{t('brand')}</p>
                <p className="text-xs text-slate-400 sm:text-sm">Food rescue management platform</p>
              </div>
            </PrefetchLink>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5 shadow-2xl backdrop-blur-2xl sm:rounded-3xl sm:p-8">

            {/* Header */}
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t('login.welcomeBack')}</h1>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">{t('login.signInDesc')}</p>
            </div>

            {/* Google button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="flex h-11 w-full items-center justify-center gap-3 rounded-xl bg-white text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 disabled:opacity-60 sm:h-12"
            >
              {googleLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-slate-800" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {googleLoading ? 'Signing in...' : t('login.continueGoogle')}
            </button>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/8" />
              <span className="text-[10px] uppercase tracking-widest text-slate-500 sm:text-xs">or with email</span>
              <div className="h-px flex-1 bg-white/8" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 sm:text-sm">Email address</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-11 rounded-xl border-white/10 bg-slate-900/60 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-primary"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 sm:text-sm">Password</label>
                  <PrefetchLink to="/forgot-password" className="text-xs text-primary hover:text-primary/80 sm:text-sm">
                    Forgot password?
                  </PrefetchLink>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-slate-900/60 pr-11 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-primary"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingEmail}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-60 sm:h-12"
              >
                {loadingEmail ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>Sign In <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="mt-5 text-center text-xs text-slate-400 sm:text-sm">
              Don't have an account?{' '}
              <PrefetchLink to="/signup" className="font-semibold text-primary hover:text-primary/80">
                Create one free
              </PrefetchLink>
            </p>
          </div>

          {/* Feature pills */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {FEATURES.map(f => (
              <div key={f.label} className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-3 py-1.5 backdrop-blur">
                <div className={`flex h-4 w-4 items-center justify-center rounded-full ${f.color}`}>
                  <f.icon className="h-2.5 w-2.5 text-white" />
                </div>
                <span className="text-[10px] text-slate-400 sm:text-xs">{f.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;