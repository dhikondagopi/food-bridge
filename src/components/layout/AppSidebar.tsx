import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/NavLink';
import {
  Leaf, LogOut, MapPin, LayoutDashboard, BarChart3,
  MessageCircle, User, PhoneCall, Trophy,
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

  const navLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('sidebar.dashboard') },
    { to: '/map', icon: MapPin, label: t('sidebar.map') },
    { to: '/analytics', icon: BarChart3, label: t('sidebar.analytics') },
    { to: '/leaderboard', icon: Trophy, label: t('sidebar.leaderboard') },
    { to: '/chat', icon: MessageCircle, label: t('sidebar.chat') },
    { to: '/call-history', icon: PhoneCall, label: t('sidebar.calls') },
  ];


  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link to="/" className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && (
            <span className="font-heading text-lg font-bold text-foreground">{t('brand')}</span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('sidebar.navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navLinks.map(link => (
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

        <SidebarGroup>
          <SidebarGroupLabel>{t('sidebar.quickActions')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>

              {/* Profile */}
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
              <div className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name}</div>
              <div className="text-xs text-muted-foreground capitalize">{profile?.role}</div>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleSignOut} title={t('sidebar.signOut')} className="shrink-0">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
