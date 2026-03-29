import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Save, User, Phone, MapPin, Building2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

const Profile = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
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

  // ✅ FIX: Sync form correctly when profile loads
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        organization_name: profile.organization_name || '',
      });
    }
  }, [profile]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Loading...
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || !user) return <Navigate to="/login" />;

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar must be under 2MB');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let avatar_url = profile.avatar_url;

      // Upload avatar if selected
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `avatars/${user.id}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from('food-images')
          .upload(path, avatarFile, { upsert: true });

        if (uploadErr) {
          toast.error('Avatar upload failed');
          return;
        }

        const { data } = supabase.storage
          .from('food-images')
          .getPublicUrl(path);

        avatar_url = data.publicUrl;
      }

      // ✅ FIX: use UPSERT instead of update
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          ...form,
          avatar_url,
        });

      if (error) {
        toast.error('Failed to update profile');
        return;
      }

      toast.success('Profile updated!');
      await refreshProfile();
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const initials =
    profile.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-8">
          Profile Settings
        </h1>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading">Your Profile</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => fileRef.current?.click()}
                >
                  <Avatar className="h-20 w-20 border-2 border-border">
                    <AvatarImage
                      src={
                        avatarPreview ||
                        (profile?.avatar_url && profile.avatar_url.startsWith('http')
                          ? profile.avatar_url
                          : '/default-avatar.png')
                      }
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-heading">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-5 w-5 text-white" />
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </div>

                <div>
                  <p className="font-medium text-foreground">
                    {profile.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {profile.role}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Form */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Full Name
                  </Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({ ...form, full_name: e.target.value })
                    }
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </Label>
                  <Input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Address
                  </Label>
                  <Input
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> City
                  </Label>
                  <Input
                    value={form.city}
                    onChange={(e) =>
                      setForm({ ...form, city: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>

                {(profile.role === 'restaurant' ||
                  profile.role === 'ngo') && (
                  <div className="md:col-span-2">
                    <Label className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> Organization Name
                    </Label>
                    <Input
                      value={form.organization_name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          organization_name: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              <Button type="submit" variant="hero" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;