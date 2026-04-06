import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Camera, Save, User, Phone, MapPin, Building2, Mail,
  Shield, ChefHat, HandHeart, Lock, Trash2, Bell,
  BellOff, Package, Truck, CheckCircle, Upload, Crown,
  Eye, EyeOff, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

const ROLE_CONFIG: Record<string, { label: string; icon: typeof ChefHat; color: string; bg: string; gradient: string }> = {
  restaurant: { label: 'Restaurant', icon: ChefHat,    color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10',  gradient: 'from-orange-500 via-amber-500 to-yellow-400' },
  ngo:        { label: 'NGO',        icon: Building2,  color: 'text-sky-600 dark:text-sky-400',       bg: 'bg-sky-50 dark:bg-sky-500/10',         gradient: 'from-sky-500 via-blue-500 to-indigo-500' },
  volunteer:  { label: 'Volunteer',  icon: HandHeart,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', gradient: 'from-emerald-500 via-green-500 to-teal-500' },
  admin:      { label: 'Admin',      icon: Crown,      color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10',   gradient: 'from-violet-600 via-purple-600 to-indigo-600' },
};

const Profile = () => {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Form state
  const [form, setForm] = useState({
    full_name: '', phone: '', address: '', city: '', organization_name: '',
  });

  // Password state
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [changingPassword, setChangingPassword] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState({
    email_donations: true,
    email_pickups: true,
    push_donations: true,
    push_pickups: true,
  });

  // Activity stats
  const [stats, setStats] = useState({ donations: 0, pickups: 0, delivered: 0 });

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteZone, setShowDeleteZone] = useState(false);

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

  // Fetch activity stats
  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [donRes, pickRes, delRes] = await Promise.all([
        supabase.from('food_donations').select('id', { count: 'exact' }).eq('restaurant_id', user.id),
        supabase.from('pickup_requests').select('id', { count: 'exact' }).eq('volunteer_id', user.id),
        supabase.from('pickup_requests').select('id', { count: 'exact' }).eq('volunteer_id', user.id).eq('status', 'delivered'),
      ]);
      setStats({
        donations: donRes.count || 0,
        pickups: pickRes.count || 0,
        delivered: delRes.count || 0,
      });
    };
    fetchStats();
  }, [user]);

  // Drag and drop avatar
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) processAvatarFile(file);
  }, []);

  const processAvatarFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processAvatarFile(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let avatar_url = profile?.avatar_url;
      if (avatarFile && user) {
        const ext = avatarFile.name.split('.').pop();
        const path = `avatars/${user.id}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('food-images').upload(path, avatarFile, { upsert: true });
        if (uploadErr) { toast.error('Avatar upload failed'); return; }
        const { data } = supabase.storage.from('food-images').getPublicUrl(path);
        avatar_url = data.publicUrl;
      }
      const { error } = await supabase.from('profiles').upsert({ id: user!.id, email: user!.email, ...form, avatar_url });
      if (error) { toast.error('Failed to update profile'); return; }
      toast.success('Profile updated!');
      setAvatarFile(null);
      await refreshProfile();
    } catch { toast.error('Something went wrong'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) { toast.error('Passwords do not match'); return; }
    if (passwordForm.newPass.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
      if (error) throw error;
      toast.success('Password changed successfully!');
      setPasswordForm({ current: '', newPass: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally { setChangingPassword(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') { toast.error('Please type DELETE to confirm'); return; }
    setDeletingAccount(true);
    try {
      await supabase.from('profiles').delete().eq('id', user!.id);
      await signOut();
      navigate('/');
      toast.success('Account deleted');
    } catch { toast.error('Failed to delete account'); setDeletingAccount(false); }
  };

  if (loading) return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );

  if (!profile || !user) return <Navigate to="/login" />;

  const rc = ROLE_CONFIG[profile.role] ?? ROLE_CONFIG.volunteer;
  const RoleIcon = rc.icon;
  const initials = profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">

      {/* ── Profile Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${rc.gradient} p-5 shadow-lg sm:p-6`}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">

          {/* Drag & Drop Avatar */}
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileRef.current?.click()}
            className={`relative flex-shrink-0 cursor-pointer group transition-all ${isDragging ? 'scale-105' : ''}`}
          >
            <Avatar className={`h-20 w-20 border-2 shadow-lg sm:h-24 sm:w-24 transition-all ${isDragging ? 'border-white' : 'border-white/30'}`}>
              <AvatarImage src={avatarPreview || profile.avatar_url || undefined} />
              <AvatarFallback className="bg-white/20 text-xl font-bold text-white sm:text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Upload className="h-5 w-5 text-white" />
              <span className="mt-1 text-[10px] text-white">Drop or click</span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white sm:text-2xl">{profile.full_name || 'User'}</h1>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur">
                <RoleIcon className="h-3 w-3" />{rc.label}
              </span>
              {profile.organization_name && (
                <span className="text-xs text-white/70">{profile.organization_name}</span>
              )}
            </div>
            <p className="mt-1.5 flex items-center justify-center gap-1 text-xs text-white/60 sm:justify-start">
              <Mail className="h-3 w-3" />{user.email}
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
          >
            <Camera className="h-3.5 w-3.5" /> Change Photo
          </button>
        </div>

        {/* Drag hint */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-dashed border-white/60 bg-black/30">
            <p className="text-white font-medium">Drop image here</p>
          </div>
        )}
      </motion.div>

      {/* ── Activity Stats ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { label: 'Donations', value: stats.donations, icon: Package, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
          { label: 'Pickups',   value: stats.pickups,   icon: Truck,   color: 'text-sky-500',    bg: 'bg-sky-50 dark:bg-sky-500/10' },
          { label: 'Delivered', value: stats.delivered, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border border-border/60 ${s.bg} p-4 text-center shadow-sm`}>
            <s.icon className={`mx-auto mb-1.5 h-5 w-5 ${s.color}`} />
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-[10px] font-medium text-muted-foreground sm:text-xs">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* ── Personal Info Form ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6"
      >
        <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
          <User className="h-4 w-4 text-muted-foreground" /> Personal Information
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs sm:text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name
              </Label>
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Your full name" className="rounded-xl h-10 text-sm" required />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone
              </Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 00000 00000" className="rounded-xl h-10 text-sm" type="tel" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs sm:text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Address
              </Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address" className="rounded-xl h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs sm:text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> City
              </Label>
              <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Your city" className="rounded-xl h-10 text-sm" />
            </div>
            {(profile.role === 'restaurant' || profile.role === 'ngo') && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Organization Name
                </Label>
                <Input value={form.organization_name} onChange={e => setForm({ ...form, organization_name: e.target.value })} placeholder="Your organization name" className="rounded-xl h-10 text-sm" />
              </div>
            )}
          </div>
          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={saving} className="h-10 gap-2 rounded-xl px-6 sm:h-11">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </motion.div>

      {/* ── Change Password ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6"
      >
        <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
          <Lock className="h-4 w-4 text-muted-foreground" /> Change Password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {[
            { key: 'newPass', label: 'New Password',     placeholder: 'Min 6 characters',   showKey: 'new' as const },
            { key: 'confirm', label: 'Confirm Password', placeholder: 'Repeat new password', showKey: 'confirm' as const },
          ].map(field => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{field.label}</Label>
              <div className="relative">
                <Input
                  type={showPasswords[field.showKey] ? 'text' : 'password'}
                  value={passwordForm[field.key as keyof typeof passwordForm]}
                  onChange={e => setPasswordForm({ ...passwordForm, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="rounded-xl h-10 pr-10 text-sm"
                />
                <button type="button" onClick={() => setShowPasswords(p => ({ ...p, [field.showKey]: !p[field.showKey] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords[field.showKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}

          {/* Password match indicator */}
          {passwordForm.newPass && passwordForm.confirm && (
            <p className={`text-xs ${passwordForm.newPass === passwordForm.confirm ? 'text-emerald-500' : 'text-red-500'}`}>
              {passwordForm.newPass === passwordForm.confirm ? '✅ Passwords match' : '❌ Passwords do not match'}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={changingPassword || !passwordForm.newPass || !passwordForm.confirm} variant="outline" className="h-10 gap-2 rounded-xl px-6">
              <Lock className="h-4 w-4" />
              {changingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </motion.div>

      {/* ── Notification Preferences ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6"
      >
        <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
          <Bell className="h-4 w-4 text-muted-foreground" /> Notification Preferences
        </h2>
        <div className="space-y-4">
          {[
            { key: 'email_donations', label: 'Email — New Donations',    desc: 'Get notified when new food donations are posted', icon: Mail },
            { key: 'email_pickups',   label: 'Email — Pickup Updates',   desc: 'Get notified when pickup status changes',          icon: Mail },
            { key: 'push_donations',  label: 'Push — New Donations',     desc: 'Browser notifications for new donations',          icon: Bell },
            { key: 'push_pickups',    label: 'Push — Pickup Updates',    desc: 'Browser notifications for pickup updates',         icon: Bell },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                  {notifications[n.key as keyof typeof notifications]
                    ? <n.icon className="h-4 w-4 text-primary" />
                    : <BellOff className="h-4 w-4 text-muted-foreground" />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{n.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{n.desc}</p>
                </div>
              </div>
              <Switch
                checked={notifications[n.key as keyof typeof notifications]}
                onCheckedChange={val => setNotifications(prev => ({ ...prev, [n.key]: val }))}
              />
            </div>
          ))}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-xl px-6"
              onClick={() => toast.success('Notification preferences saved!')}
            >
              <Bell className="h-4 w-4" />
              Save Preferences
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Account Info ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6"
      >
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
          <Shield className="h-4 w-4 text-muted-foreground" /> Account Details
        </h2>
        <div className="space-y-2.5">
          {[
            { label: 'Email',        value: user.email,                   icon: Mail },
            { label: 'Role',         value: rc.label,                     icon: RoleIcon, valueColor: rc.color },
            { label: 'Member since', value: profile.created_at ? new Date(profile.created_at).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }) : '—', icon: User },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <item.icon className="h-4 w-4" /> {item.label}
              </div>
              <span className={`text-sm font-medium truncate ml-4 max-w-[200px] ${item.valueColor || 'text-foreground'}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Danger Zone ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm dark:border-red-500/20 dark:bg-red-500/5 sm:p-6"
      >
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-red-600 dark:text-red-400 sm:text-lg">
          <AlertTriangle className="h-4 w-4" /> Danger Zone
        </h2>
        <p className="mb-4 text-xs text-red-500/80 dark:text-red-400/60 sm:text-sm">
          Once you delete your account, all data will be permanently removed and cannot be recovered.
        </p>

        {!showDeleteZone ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDeleteZone(true)}
            className="h-10 gap-2 rounded-xl border-red-300 text-red-600 hover:bg-red-100 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" /> Delete My Account
          </Button>
        ) : (
          <div className="space-y-3 rounded-xl border border-red-200 bg-white p-4 dark:border-red-500/20 dark:bg-red-500/5">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Type <strong>DELETE</strong> to confirm account deletion:
            </p>
            <Input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE here"
              className="rounded-xl border-red-200 h-10 text-sm focus-visible:ring-red-400"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirm !== 'DELETE'}
                className="h-10 gap-2 rounded-xl bg-red-600 px-5 text-white hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                {deletingAccount ? 'Deleting...' : 'Permanently Delete'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowDeleteZone(false); setDeleteConfirm(''); }}
                className="h-10 rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Profile;