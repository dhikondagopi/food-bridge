import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Leaf, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/';
import ThemeToggle from '@/components/ThemeToggle';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Also check hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <Leaf className="h-8 w-8 text-primary" />
            <span className="font-heading text-2xl font-bold text-foreground">FoodBridge</span>
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
          {success ? (
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-7 w-7 text-primary" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Password Reset!</h1>
              <p className="text-muted-foreground text-sm mb-6">
                Your password has been updated. Redirecting you to sign in...
              </p>
              <Link to="/login">
                <Button className="w-full">Go to Sign In</Button>
              </Link>
            </div>
          ) : !isRecovery ? (
            <div className="text-center">
              <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Invalid Link</h1>
              <p className="text-muted-foreground text-sm mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link to="/forgot-password">
                <Button className="w-full">Request New Link</Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-heading text-2xl font-bold text-foreground text-center mb-1">Set New Password</h1>
              <p className="text-muted-foreground text-center text-sm mb-6">
                Enter your new password below.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password" className="text-sm">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="mt-1.5 h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="mt-1.5 h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
