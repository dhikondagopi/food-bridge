import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import PushNotificationPrompt from '@/components/PushNotificationPrompt';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { User, Settings, ShieldCheck, LogOut, ChefHat, Building2, HandHeart, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface DashboardLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof ChefHat; color: string; bg: string; border: string }> = {
  restaurant: {
    label: 'Restaurant',
    icon: ChefHat,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-500/20',
  },
  ngo: {
    label: 'NGO',
    icon: Building2,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-500/10',
    border: 'border-sky-200 dark:border-sky-500/20',
  },
  volunteer: {
    label: 'Volunteer',
    icon: HandHeart,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/20',
  },
  admin: {
    label: 'Admin',
    icon: Crown,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    border: 'border-violet-200 dark:border-violet-500/20',
  },
};

const DashboardLayout = ({ children, showSidebar = true }: DashboardLayoutProps) => {
  const { user, profile, signOut, refreshProfile } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      toast.error('Logout failed');
    }
  };

  const handleRefreshProfile = () => {
    refreshProfile();
  };

  if (!user) return null;

  const role = profile?.role ?? 'volunteer';
  const rc = ROLE_CONFIG[role] ?? ROLE_CONFIG.volunteer;
  const RoleIcon = rc.icon;

  const initials =
    profile?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {showSidebar && <AppSidebar />}

        <div className="flex min-w-0 flex-1 flex-col">

          {/* ── Top Header ── */}
          <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/60 bg-card/90 px-4 shadow-sm backdrop-blur-xl">

            {/* Left: sidebar trigger + title + role badge */}
            <div className="flex items-center gap-3">
              <SidebarTrigger className="lg:hidden" />

              <div className="flex items-center gap-3">
                {/* Role badge */}
                <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${rc.bg} ${rc.color} ${rc.border}`}>
                  <RoleIcon className="h-3.5 w-3.5" />
                  {rc.label}
                </span>
              </div>
            </div>

            {/* Right: notifications + profile */}
            <div className="flex items-center gap-2">
              <NotificationBell />
              <PushNotificationPrompt />

              {/* Profile dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-muted/60">
                  {/* Avatar */}
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="h-9 w-9 rounded-full object-cover ring-2 ring-border transition group-hover:ring-primary/40"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ring-2 ring-border transition group-hover:ring-primary/40 ${rc.bg} ${rc.color}`}>
                      {initials}
                    </div>
                  )}

                  {/* Name + role (desktop) */}
                  <div className="hidden text-left md:block">
                    <p className="max-w-[120px] truncate text-sm font-semibold text-foreground">
                      {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className={`text-xs font-medium ${rc.color}`}>{rc.label}</p>
                  </div>
                </button>

                {/* Dropdown */}
                <div className="invisible absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border/60 bg-card opacity-0 shadow-2xl transition-all duration-200 group-hover:visible group-hover:opacity-100">

                  {/* User info header */}
                  <div className="border-b border-border/60 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <Link
                      to="/profile"
                      onClick={handleRefreshProfile}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      My Profile
                    </Link>

                    <Link
                      to="/settings"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Settings
                    </Link>

                    {profile?.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-600 transition hover:bg-violet-100 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400 dark:hover:bg-violet-500/20"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-border/60 p-1.5">
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/8"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* ── Page Content ── */}
          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-7xl p-4 md:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;