import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Leaf, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import ThemeToggle from '@/components/ThemeToggle';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success('Password reset link sent! Check your email.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset link');
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
          {sent ? (
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Check Your Email</h1>
              <p className="text-muted-foreground text-sm mb-6">
                We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>. Click the link in the email to reset your password.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                Send another link
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-heading text-2xl font-bold text-foreground text-center mb-1">Forgot Password?</h1>
              <p className="text-muted-foreground text-center text-sm mb-6">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="mt-1.5 h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-sm text-muted-foreground text-center mt-6">
          <Link to="/login" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
