import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";  // CORRECT ✅
import { useNavigate } from 'react-router-dom';
import PrefetchLink from '@/components/PrefetchLink';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Leaf, Mail } from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signIn, profile } = useAuth();

  // ✅ ROLE-BASED REDIRECT
  useEffect(() => {
    if (!profile) return;

    // Use a switch statement for cleaner role routing
    switch (profile.role) {
      case 'restaurant':
        navigate('/restaurant-dashboard');
        break;
      case 'ngo':
        navigate('/dashboard');
        break;
      case 'volunteer':
        navigate('/volunteer-dashboard');
        break;
      default:
        navigate('/dashboard');
    }
  }, [profile, navigate]); // Added navigate to the dependency array

  // ✅ EMAIL LOGIN
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      toast.success('Logged in successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ✅ GOOGLE LOGIN
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin, 
        },
      });

      if (error) throw error; // Let the catch block handle the toast

    } catch (error) {
      console.error("Google Auth Error:", error);
      toast.error('Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Top right controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="w-28">
          <LanguageSwitcher />
        </div>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <PrefetchLink to="/" className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <Leaf className="h-8 w-8 text-primary" />
            <span className="font-heading text-2xl font-bold text-foreground">{t('brand')}</span>
          </PrefetchLink>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
          <h1 className="font-heading text-2xl font-bold text-foreground text-center mb-1">
            {t('login.welcomeBack')}
          </h1>

          <p className="text-muted-foreground text-center text-sm mb-6">
            {t('login.signInDesc')}
          </p>

          {/* Google Auth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 gap-3 text-sm font-medium"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
          >
            <Mail className="h-4 w-4" />
            {googleLoading ? t('login.connecting') : t('login.continueGoogle')}
          </Button>

          {/* Visual Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading || googleLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading || googleLoading}
              />
            </div>

            <Button type="submit" className="w-full h-11 mt-2" disabled={loading || googleLoading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>

        {/* Sign Up Link */}
        <p className="text-sm text-center mt-6 text-muted-foreground">
          Don’t have an account?{" "}
          <PrefetchLink to="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </PrefetchLink>
        </p>
      </div>
    </div>
  );
};

export default Login;