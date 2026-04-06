import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/NavLink';
import {
  Leaf, LogOut, MapPin, LayoutDashboard, BarChart3,
  MessageCircle, User, PhoneCall, Trophy, Users2,
  Settings, Shield, Package, ClipboardList, ChefHat,
  HandHeart, Building2, Crown, Utensils,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, SidebarHeader, useSidebar,
} from '@/components/ui/sidebar';

const ROLE_CONFIG: Record<string, { label: string; icon: typeof ChefHat; color: string; emoji: string }> = {
  restaurant: { label: 'Restaurant', icon: ChefHat,    color: 'text-orange-500', emoji: '🍽️' },
  ngo:        { label: 'NGO',        icon: Building2,  color: 'text-sky-500',    emoji: '🏢' },
  volunteer:  { label: 'Volunteer',  icon: HandHeart,  color: 'text-emerald-500', emoji: '🤝' },
  admin:      { label: 'Admin',      icon: Crown,      color: 'text-violet-500', emoji: '👑' },
};

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { t } = useTranslation();
  const isAdmin = profile?.role === 'admin';
  const rc = ROLE_CONFIG[profile?.role || 'volunteer'] ?? ROLE_CONFIG.volunteer;
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  // ✅ Common nav links for all roles
  const commonNavLinks = [
    { to: '/dashboard',    icon: LayoutDashboard, label: t('sidebar.dashboard') },
    { to: '/map',          icon: MapPin,           label: t('sidebar.map') },
    { to: '/leaderboard',  icon: Trophy,           label: t('sidebar.leaderboard') },
    { to: '/chat',         icon: MessageCircle,    label: t('sidebar.chat') },
    { to: '/call-history', icon: PhoneCall,        label: t('sidebar.calls') },
  ];

  // ✅ Role-specific nav links shown after dashboard
  const roleNavLinks: { to: string; icon: typeof LayoutDashboard; label: string }[] = 
    profile?.role === 'restaurant' ? [
      { to: '/dashboard', icon: Utensils, label: 'Donations' },
    ] : profile?.role === 'ngo' ? [
      { to: '/dashboard', icon: Package, label: 'Pickup Requests' },
    ] : profile?.role === 'volunteer' ? [
      { to: '/dashboard', icon: HandHeart, label: 'My Tasks' },
    ] : [];

  // Admin extra links
  const adminNavLinks = [
    { to: '/admin/users',         icon: Users2,        label: 'Users' },
    { to: '/admin/analytics',     icon: BarChart3,     label: 'Analytics' },
    { to: '/admin/food-listings', icon: Package,       label: 'Food Listings' },
    { to: '/admin/volunteers',    icon: ClipboardList, label: 'Volunteers' },
    { to: '/admin/settings',      icon: Settings,      label: 'Settings' },
  ];

  const navLinks = isAdmin
    ? [...commonNavLinks, ...adminNavLinks]
    : [...commonNavLinks];

  return (
    <Sidebar collapsible="icon">

      {/* ── Header / Logo ── */}
      <SidebarHeader className="border-b border-sidebar-border p-3 sm:p-4">
        <Link to="/" className="flex items-center gap-2.5 rounded-xl p-1 transition hover:bg-sidebar-accent/10">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && (
            <span className="text-base font-bold text-foreground">{t('brand')}</span>
          )}
        </Link>
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent className="px-2 py-3">

        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('sidebar.navigation')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navLinks.map(link => (
                <SidebarMenuItem key={`${link.to}-${link.label}`}>
                  <SidebarMenuButton asChild tooltip={link.label}>
                    <NavLink
                      to={link.to}
                      end
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <link.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span>{link.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin panel section */}
        {isAdmin && (
          <SidebarGroup className="mt-2">
            <SidebarGroupLabel className="flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-violet-500">
              <Shield className="h-3 w-3" />
              {!collapsed && 'Admin Panel'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Overview">
                    <NavLink
                      to="/admin/dashboard"
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-violet-500/10 hover:text-violet-500"
                      activeClassName="bg-violet-500/10 text-violet-500 font-semibold"
                    >
                      <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span>Overview</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Quick Actions */}
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('sidebar.quickActions')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('sidebar.profile')}>
                  <NavLink
                    to="/profile"
                    end
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
                    activeClassName="bg-primary/10 text-primary font-semibold"
                  >
                    <User className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && <span>{t('sidebar.profile')}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="space-y-2 border-t border-sidebar-border p-3">
        <LanguageSwitcher collapsed={collapsed} />
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ring-border ${rc.color} bg-muted`}>
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {profile?.full_name || 'User'}
              </p>
              <p className={`text-xs font-medium capitalize ${rc.color}`}>
                {rc.label} {rc.emoji}
              </p>
            </div>
          )}
          <div className="flex flex-shrink-0 items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              title={t('sidebar.signOut')}
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}