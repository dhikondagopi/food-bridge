import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/motion/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Camera, Save, User, Phone, MapPin, Building2, Mail, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate, useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    address: '',
    city: '',
    organization_name: '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [localLoading, setLocalLoading] = useState(true);

  // Load profile data with fallback
  useEffect(() => {
    if (!loading) {
      setLocalLoading(false);
      if (profile) {
        setForm({
          full_name: profile.full_name || '',
          phone: profile.phone || '',
          address: profile.address || '',
          city: profile.city || '',
          organization_name: profile.organization_name || '',
        });
      }
    }
  }, [profile, loading]);

  // Show loading while auth is checking
  if (loading || localLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Redirect if no user (but don't use Navigate directly to avoid hydration issues)
  if (!user) {
    toast.error('Please log in to view your profile');
    navigate('/login', { replace: true });
    return null;
  }

  // Show message if profile doesn't exist yet
  if (!profile) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground mb-6">
            Your profile hasn't been created yet. Please complete your registration.
          </p>
          <Button onClick={() => navigate('/login')} className="w-full">
            Go to Login
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!form.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }
    
    if (form.phone && !/^\+?[\d\s-()]{10,}$/.test(form.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar must be under 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    setAvatarFile(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !validateForm()) return;

    try {
      setSaving(true);
      
      // Handle avatar upload first
      let avatar_url = profile.avatar_url;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `avatars/${user.id}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('food-images')
          .upload(path, avatarFile, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from('food-images').getPublicUrl(path);
          avatar_url = data.publicUrl;
        }
      }

      // Update profile - EXACTLY like your original working code
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          organization_name: form.organization_name.trim() || null,
          avatar_url: avatar_url,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Update error:', error);
        throw new Error(error.message);
      }

      toast.success('Profile updated successfully!');
      window.location.reload(); // Same as your original

    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      address: profile.address || '',
      city: profile.city || '',
      organization_name: profile.organization_name || '',
    });
    setAvatarFile(null);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    setFormErrors({});
    toast.success('Form reset to original values');
  };

  const initials = profile.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase().slice(0, 2) || 'UN';

  const showOrganizationField = profile.role === 'restaurant' || profile.role === 'ngo';

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl p-6 md:p-8">
        <h1 className="mb-8 text-3xl font-bold text-foreground font-heading">
          Profile Settings
        </h1>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Your Profile</CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <div 
                  className="relative cursor-pointer group"
                  onClick={() => fileRef.current?.click()}
                >
                  <Avatar className="h-24 w-24 border-4 border-border shadow-lg">
                    <AvatarImage
                      src={
                        avatarPreview ||
                        (profile.avatar_url && profile.avatar_url.startsWith('http')
                          ? profile.avatar_url
                          : undefined)
                      }
                    />
                    <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-all">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </div>

                <div className="flex-1">
                  <p className="text-xl font-semibold text-foreground">{profile.full_name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{profile.role || 'User'}</p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Form Fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name
                  </Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => {
                      setForm({ ...form, full_name: e.target.value });
                      if (formErrors.full_name) setFormErrors({});
                    }}
                    className={formErrors.full_name ? 'border-destructive' : ''}
                    required
                  />
                  {formErrors.full_name && (
                    <p className="text-xs text-destructive">{formErrors.full_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => {
                      setForm({ ...form, phone: e.target.value });
                      if (formErrors.phone) setFormErrors({});
                    }}
                    className={formErrors.phone ? 'border-destructive' : ''}
                  />
                  {formErrors.phone && (
                    <p className="text-xs text-destructive">{formErrors.phone}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address
                  </Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Enter your full address"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    City
                  </Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Enter your city"
                  />
                </div>

                {showOrganizationField && (
                  <div className="md:col-span-2 space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Organization Name
                    </Label>
                    <Input
                      value={form.organization_name}
                      onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
                      placeholder="Enter organization name"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 h-12 font-semibold"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={saving}
                  className="h-12"
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;