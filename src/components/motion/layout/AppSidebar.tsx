import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/NavLink';
import {
  Leaf, LogOut, MapPin, LayoutDashboard, BarChart3,
  MessageCircle, User, PhoneCall, Trophy, Users2,
  Settings, Shield, Package, ClipboardList,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { user, profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { t } = useTranslation();
  const isAdmin = profile?.role === 'admin';

  // ✅ ROLE-BASED NAVIGATION
  const userNavLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('sidebar.dashboard') },
    { to: '/map', icon: MapPin, label: t('sidebar.map') },
    { to: '/leaderboard', icon: Trophy, label: t('sidebar.leaderboard') },
    { to: '/chat', icon: MessageCircle, label: t('sidebar.chat') },
    { to: '/call-history', icon: PhoneCall, label: t('sidebar.calls') },
  ];

  const adminNavLinks = [
    { to: '/admin/users', icon: Users2, label: 'Users' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/food-listings', icon: Package, label: 'Food Listings' },
    { to: '/admin/volunteers', icon: ClipboardList, label: 'Volunteers' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  const allNavLinks = isAdmin ? [...userNavLinks, ...adminNavLinks] : userNavLinks;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link to="/" className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && (
            <span className="font-heading text-lg font-bold text-foreground">
              {t('brand')}
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* ✅ MAIN NAVIGATION */}
        <SidebarGroup>
          <SidebarGroupLabel>{t('sidebar.navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allNavLinks.map((link) => (
                <SidebarMenuItem key={link.to}>
                  <SidebarMenuButton asChild tooltip={link.label}>
                    <NavLink
                      to={link.to}
                      end
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground transition-colors"
                      activeClassName="bg-sidebar-primary/15 text-sidebar-primary font-semibold"
                    >
                      <link.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{link.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ✅ ADMIN SECTION (Only for admins) */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-500" />
              Admin Panel
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Dashboard Overview">
                    <NavLink
                      to="/admin/dashboard"
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground/70 hover:bg-orange-500/10 hover:text-orange-500 transition-colors"
                      activeClassName="bg-orange-500/20 text-orange-500 font-semibold border-r-2 border-orange-500"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      {!collapsed && <span>Overview</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ✅ QUICK ACTIONS */}
        <SidebarGroup>
          <SidebarGroupLabel>{t('sidebar.quickActions')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('sidebar.profile')}>
                  <NavLink
                    to="/profile"
                    end
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground transition-colors"
                    activeClassName="bg-sidebar-primary/15 text-sidebar-primary font-semibold"
                  >
                    <User className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{t('sidebar.profile')}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border space-y-2">
        <LanguageSwitcher collapsed={collapsed} />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-sidebar-foreground truncate">
                {profile?.full_name || 'User'}
              </div>
              <div className="text-xs text-muted-foreground capitalize">
                {profile?.role || 'guest'}
                {isAdmin && ' 👑'}
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            title={t('sidebar.signOut')}
            className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}