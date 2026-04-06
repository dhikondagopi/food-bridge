import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PrefetchLink from '@/components/PrefetchLink';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { Leaf, Eye, EyeOff, ArrowRight, ChefHat, Building2, HandHeart, Check } from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

type Role = 'restaurant' | 'ngo' | 'volunteer';

const ROLES: { value: Role; icon: typeof ChefHat; label: string; desc: string; color: string; bg: string; ring: string }[] = [
  {
    value: 'restaurant',
    icon: ChefHat,
    label: 'Restaurant',
    desc: 'Donate surplus food',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    ring: 'ring-orange-500',
  },
  {
    value: 'ngo',
    icon: Building2,
    label: 'NGO',
    desc: 'Coordinate pickups',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    ring: 'ring-sky-500',
  },
  {
    value: 'volunteer',
    icon: HandHeart,
    label: 'Volunteer',
    desc: 'Deliver food',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500',
  },
];

const Signup = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, user, loading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('ngo');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (loading) return;
    if (user) {
      const from = (location.state as any)?.from?.pathname;
      navigate(from && from !== '/signup' ? from : '/dashboard', { replace: true });
    }
  }, [user, loading]);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { toast.error('Please enter your full name'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { toast.error('Invalid email format'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      await signUp(email, password, role, fullName);
      toast.success('Account created! Check your email if confirmation is required.');
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Signup failed');
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
    </div>
  );

  const selectedRole = ROLES.find(r => r.value === role)!;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.10),transparent_50%)]" />
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

            {/* Header + Step indicator */}
            <div className="mb-6 text-center">
              <div className="mb-4 flex items-center justify-center gap-2">
                {[1, 2].map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      step === s ? 'bg-primary text-white' :
                      step > s ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'
                    }`}>
                      {step > s ? <Check className="h-3.5 w-3.5" /> : s}
                    </div>
                    {s < 2 && <div className={`h-px w-8 transition-all ${step > s ? 'bg-emerald-500' : 'bg-white/10'}`} />}
                  </div>
                ))}
              </div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                {step === 1 ? 'Create your account' : 'Choose your role'}
              </h1>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                {step === 1 ? 'Join the food rescue movement today' : 'How will you contribute?'}
              </p>
            </div>

            {/* Step 1: Account details */}
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={handleNext}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 sm:text-sm">Full Name</label>
                  <Input
                    placeholder="Your full name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-slate-900/60 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-primary"
                    autoComplete="name"
                  />
                </div>

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
                  <label className="text-xs font-medium text-slate-300 sm:text-sm">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-11 rounded-xl border-white/10 bg-slate-900/60 pr-11 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-primary"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {/* Password strength */}
                  {password.length > 0 && (
                    <div className="flex gap-1 pt-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                          password.length >= i * 2
                            ? password.length >= 10 ? 'bg-emerald-500'
                            : password.length >= 6 ? 'bg-amber-500'
                            : 'bg-red-500'
                            : 'bg-white/10'
                        }`} />
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 sm:h-12"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </motion.form>
            )}

            {/* Step 2: Role selection */}
            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Role cards */}
                <div className="grid gap-3">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                        role === r.value
                          ? `border-transparent ${r.ring} ring-2 bg-white/8`
                          : 'border-white/10 bg-white/3 hover:bg-white/6'
                      }`}
                    >
                      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${r.bg}`}>
                        <r.icon className={`h-5 w-5 ${r.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white">{r.label}</p>
                        <p className="text-xs text-slate-400">{r.desc}</p>
                      </div>
                      {role === r.value && (
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Selected role summary */}
                <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-xs text-slate-400">
                  Creating account as <span className={`font-semibold ${selectedRole.color}`}>{selectedRole.label}</span> · {email}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="h-11 flex-1 rounded-xl border border-white/10 text-sm font-medium text-slate-300 transition hover:bg-white/8"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    {submitting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>Create Account <ArrowRight className="h-4 w-4" /></>
                    )}
                  </button>
                </div>
              </motion.form>
            )}

            {/* Footer */}
            <p className="mt-5 text-center text-xs text-slate-400 sm:text-sm">
              Already have an account?{' '}
              <PrefetchLink to="/login" className="font-semibold text-primary hover:text-primary/80">
                Sign in
              </PrefetchLink>
            </p>
          </div>

          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-center">
            {['🔒 Secure & Private', '🌱 100% Free', '🤝 Community Driven'].map(badge => (
              <span key={badge} className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[10px] text-slate-400 backdrop-blur sm:text-xs">
                {badge}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;