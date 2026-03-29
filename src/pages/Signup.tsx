import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PrefetchLink from '@/components/PrefetchLink';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Leaf, Utensils, Users, Heart, Mail } from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

type Role = 'restaurant' | 'ngo' | 'volunteer';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [role, setRole] = useState<Role>('restaurant');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const roles: { value: Role; label: string; icon: any; desc: string }[] = [
    { value: 'restaurant', label: t('signup.restaurant'), icon: Utensils, desc: t('signup.restaurantDesc') },
    { value: 'ngo', label: t('signup.ngo'), icon: Users, desc: t('signup.ngoDesc') },
    { value: 'volunteer', label: t('signup.volunteer'), icon: Heart, desc: t('signup.volunteerDesc') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await signUp(email, password, {
        full_name: fullName,
        role,
        organization_name: orgName || undefined,
        phone: phone || undefined,
        city: city || undefined,
      });
      toast.success('Account created! Check your email to confirm.');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error('Google sign-in failed');
      }
    } catch {
      toast.error('Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="w-28">
          <LanguageSwitcher />
        </div>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <PrefetchLink to="/" className="inline-flex items-center gap-2.5">
            <Leaf className="h-8 w-8 text-primary" />
            <span className="font-heading text-2xl font-bold text-foreground">{t('brand')}</span>
          </PrefetchLink>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
          <h1 className="font-heading text-2xl font-bold text-foreground text-center mb-1">{t('signup.createAccount')}</h1>
          <p className="text-muted-foreground text-center text-sm mb-6">{t('signup.chooseRole')}</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {roles.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  role === r.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:border-primary/30'
                }`}
              >
                <r.icon className={`h-5 w-5 mx-auto mb-1.5 ${role === r.value ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className={`text-xs font-semibold ${role === r.value ? 'text-primary' : 'text-muted-foreground'}`}>{r.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{r.desc}</div>
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full mb-4 h-11 gap-3 text-sm font-medium"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {googleLoading ? t('signup.connecting') : t('signup.continueGoogle')}
          </Button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('signup.or')}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fullName" className="text-sm">{t('signup.fullName')}</Label>
                <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" required className="mt-1 h-10" />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm">{t('signup.phone')} <span className="text-muted-foreground">({t('signup.optional')})</span></Label>
                <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className="mt-1 h-10" />
              </div>
            </div>

            {(role === 'restaurant' || role === 'ngo') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="orgName" className="text-sm">{t('signup.organization')}</Label>
                  <Input id="orgName" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Your organization" className="mt-1 h-10" />
                </div>
                <div>
                  <Label htmlFor="city" className="text-sm">{t('signup.city')} <span className="text-muted-foreground">({t('signup.optional')})</span></Label>
                  <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="Your city" className="mt-1 h-10" />
                </div>
              </div>
            )}

            {role === 'volunteer' && (
              <div>
                <Label htmlFor="city" className="text-sm">{t('signup.city')} <span className="text-muted-foreground">({t('signup.optional')})</span></Label>
                <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="Your city" className="mt-1 h-10" />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-sm">{t('signup.email')}</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="mt-1 h-10" />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm">{t('signup.password')}</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="mt-1 h-10" />
            </div>
            <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium" disabled={loading}>
              <Mail className="h-4 w-4 mr-2" />
              {loading ? t('signup.creating') : t('signup.createBtn')}
            </Button>
          </form>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-6">
          {t('signup.alreadyHave')}{' '}
          <PrefetchLink to="/login" className="text-primary font-medium hover:underline">{t('signup.signIn')}</PrefetchLink>
        </p>
      </div>
    </div>
  );
};

export default Signup;
