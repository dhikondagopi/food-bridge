import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Utensils, Users, Heart, TrendingUp, Shield,
  Ban, CheckCircle, Search, X, ChevronLeft,
  ChevronRight, Download, Camera, Building2,
  RefreshCw,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PhotoModeration from '@/components/admin/PhotoModeration';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  organization_name: string | null;
  created_at: string;
  is_blocked?: boolean;
}

const ROLES = ['restaurant', 'ngo', 'volunteer', 'admin'];
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
const DEFAULT_PAGE_SIZE = 10;

const ROLE_COLORS: Record<string, string> = {
  restaurant: 'text-orange-600 dark:text-orange-400',
  ngo: 'text-sky-600 dark:text-sky-400',
  volunteer: 'text-emerald-600 dark:text-emerald-400',
  admin: 'text-violet-600 dark:text-violet-400',
};

const AdminPage = () => {
  const { user, profile, loading: authLoading } = useAuth();

  const [stats, setStats] = useState({
    donations: 0, restaurants: 0, ngos: 0,
    volunteers: 0, delivered: 0, meals: 0,
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({ open: false, title: '', description: '', action: async () => {} });

  // ✅ useCallback to avoid re-render loops
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoadingData(true);
    else setRefreshing(true);
    try {
      const [donationsRes, restaurantsRes, ngosRes, volunteersRes, deliveredRes, usersRes] = await Promise.all([
        supabase.from('food_donations').select('id, quantity'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'restaurant'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'ngo'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'volunteer'),
        supabase.from('food_donations').select('id', { count: 'exact' }).eq('status', 'delivered'),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      ]);

      // ✅ parseInt prevents string concatenation bug
      const totalMeals = (donationsRes.data || []).reduce(
        (sum: number, d: any) => sum + (parseInt(d.quantity) || 0), 0
      );

      setStats({
        donations: donationsRes.data?.length || 0,
        restaurants: restaurantsRes.count || 0,
        ngos: ngosRes.count || 0,
        volunteers: volunteersRes.count || 0,
        delivered: deliveredRes.count || 0,
        meals: totalMeals,
      });

      setUsers((usersRes.data as UserProfile[]) || []);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (profile?.role === 'admin') fetchData();
  }, [profile, fetchData]);

  // ── Filters ──
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = q === '' ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.organization_name?.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && !u.is_blocked) ||
        (statusFilter === 'blocked' && u.is_blocked);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // ✅ Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, roleFilter, statusFilter, pageSize]);

  const clearFilters = () => { setSearchQuery(''); setRoleFilter('all'); setStatusFilter('all'); };
  const hasActiveFilters = searchQuery !== '' || roleFilter !== 'all' || statusFilter !== 'all';

  // ── Role change ──
  const executeRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      // ✅ Optimistic update
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Role updated successfully');
      fetchData(true); // background refresh
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally { setActionLoading(null); }
  };

  // ── Block/unblock ──
  const executeToggleBlock = async (userId: string, currentlyBlocked: boolean) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase.from('profiles').update({ is_blocked: !currentlyBlocked }).eq('id', userId);
      if (error) throw error;
      // ✅ Optimistic update
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: !currentlyBlocked } : u));
      toast.success(currentlyBlocked ? 'Account enabled' : 'Account blocked');
      fetchData(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update account');
    } finally { setActionLoading(null); }
  };

  // ✅ FIXED: handleRoleChange was missing before
  const handleRoleChange = (userId: string, newRole: string, userName: string, currentRole: string) => {
    if (userId === user?.id) { toast.error("You can't change your own role"); return; }
    if (newRole === currentRole) return;
    setConfirmDialog({
      open: true,
      title: 'Change User Role',
      description: `Change ${userName || 'this user'}'s role from "${currentRole}" to "${newRole}"?`,
      action: () => executeRoleChange(userId, newRole),
    });
  };

  // ✅ FIXED: handleToggleBlock was missing before
  const handleToggleBlock = (userId: string, currentlyBlocked: boolean, userName: string) => {
    if (userId === user?.id) { toast.error("You can't block your own account"); return; }
    setConfirmDialog({
      open: true,
      title: currentlyBlocked ? 'Unblock Account' : 'Block Account',
      description: currentlyBlocked
        ? `Re-enable ${userName || 'this user'}'s account? They will be able to log in again.`
        : `Block ${userName || 'this user'}'s account? They won't be able to log in.`,
      action: () => executeToggleBlock(userId, currentlyBlocked),
    });
  };

  // ✅ FIXED: exportCSV was missing before
  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Organization', 'Joined', 'Status'];
    const rows = filteredUsers.map(u => [
      u.full_name || '',
      u.email || '',
      u.role,
      u.organization_name || '',
      new Date(u.created_at).toLocaleDateString(),
      u.is_blocked ? 'Blocked' : 'Active',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredUsers.length} users`);
  };

  // ── Guards ──
  if (authLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Shield className="h-12 w-12 text-destructive/50" />
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Only administrators can access this page.
        </p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Donations', value: stats.donations,   icon: Utensils,    bg: 'bg-orange-50 dark:bg-orange-500/10',  iconBg: 'bg-orange-500' },
    { label: 'Meals Saved',     value: stats.meals,        icon: TrendingUp,  bg: 'bg-emerald-50 dark:bg-emerald-500/10', iconBg: 'bg-emerald-500' },
    { label: 'Restaurants',     value: stats.restaurants,  icon: Utensils,    bg: 'bg-amber-50 dark:bg-amber-500/10',    iconBg: 'bg-amber-500' },
    { label: 'NGOs',            value: stats.ngos,         icon: Building2,   bg: 'bg-sky-50 dark:bg-sky-500/10',        iconBg: 'bg-sky-500' },
    { label: 'Volunteers',      value: stats.volunteers,   icon: Heart,       bg: 'bg-violet-50 dark:bg-violet-500/10',  iconBg: 'bg-violet-500' },
    { label: 'Delivered',       value: stats.delivered,    icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-500/10',    iconBg: 'bg-green-500' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-5 shadow-lg sm:p-6"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-white/80">Administrator</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-white/70">System overview · user management · moderation</p>
          </div>
          <Button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="h-9 gap-2 rounded-xl bg-white/20 px-4 text-sm font-medium text-white hover:bg-white/30 sm:h-10"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      {loadingData ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          {statCards.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3, scale: 1.01 }}
              className={`relative overflow-hidden rounded-2xl border border-border/60 ${c.bg} p-4 shadow-sm`}
            >
              <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${c.iconBg}`}>
                <c.icon className="h-4 w-4 text-white" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">{c.value.toLocaleString()}</div>
              <div className="mt-0.5 text-[10px] font-medium text-muted-foreground sm:text-xs">{c.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <Tabs defaultValue="users">
        <TabsList className="mb-4 rounded-xl">
          <TabsTrigger value="users" className="gap-2 rounded-lg">
            <Users className="h-4 w-4" /> User Management
          </TabsTrigger>
          <TabsTrigger value="photos" className="gap-2 rounded-lg">
            <Camera className="h-4 w-4" /> Photo Moderation
          </TabsTrigger>
        </TabsList>

        {/* Photo Moderation Tab */}
        <TabsContent value="photos">
          <PhotoModeration />
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="h-5 w-5" />
                  Users ({filteredUsers.length}
                  {filteredUsers.length !== users.length ? ` of ${users.length}` : ''})
                </CardTitle>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                      <X className="h-3 w-3 mr-1" /> Clear
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={exportCSV} className="rounded-xl text-xs">
                    <Download className="h-3 w-3 mr-1" /> Export CSV
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search name, email or org..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="rounded-xl pl-9 h-9 text-sm"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-9 w-full rounded-xl text-xs sm:w-36">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {ROLES.map(r => (
                      <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-full rounded-xl text-xs sm:w-36">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              {loadingData ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="mx-auto mb-3 h-10 w-10 opacity-30" />
                  <p className="font-medium">{hasActiveFilters ? 'No users match your filters.' : 'No users found.'}</p>
                  {hasActiveFilters && (
                    <Button variant="link" onClick={clearFilters} className="mt-2 text-xs">
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground">Role</th>
                        <th className="hidden px-2 py-3 text-left text-xs font-medium text-muted-foreground md:table-cell">Email</th>
                        <th className="hidden px-2 py-3 text-left text-xs font-medium text-muted-foreground lg:table-cell">Joined</th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map(u => (
                        <tr
                          key={u.id}
                          className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${u.is_blocked ? 'opacity-60' : ''}`}
                        >
                          {/* Name */}
                          <td className="px-2 py-3 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                                {(u.full_name?.[0] || '?').toUpperCase()}
                              </div>
                              <span className="max-w-[80px] truncate sm:max-w-[140px]">
                                {u.full_name || '—'}
                              </span>
                              {u.id === user?.id && (
                                <span className="hidden text-xs text-muted-foreground sm:inline">(you)</span>
                              )}
                            </div>
                          </td>

                          {/* Role dropdown */}
                          <td className="px-2 py-3">
                            <Select
                              value={u.role}
                              onValueChange={val => handleRoleChange(u.id, val, u.full_name, u.role)}
                              disabled={actionLoading === u.id || u.id === user?.id}
                            >
                              <SelectTrigger className={`h-7 w-28 rounded-xl text-xs font-medium ${ROLE_COLORS[u.role] || ''}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map(r => (
                                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Email */}
                          <td className="hidden px-2 py-3 text-xs text-muted-foreground md:table-cell">
                            {u.email || '—'}
                          </td>

                          {/* Joined */}
                          <td className="hidden px-2 py-3 text-xs text-muted-foreground lg:table-cell">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>

                          {/* Status badge */}
                          <td className="px-2 py-3">
                            <Badge
                              variant={u.is_blocked ? 'destructive' : 'outline'}
                              className="text-xs"
                            >
                              {u.is_blocked ? 'Blocked' : 'Active'}
                            </Badge>
                          </td>

                          {/* Block/Unblock action */}
                          <td className="px-2 py-3 text-right">
                            <Button
                              variant={u.is_blocked ? 'outline' : 'destructive'}
                              size="sm"
                              disabled={actionLoading === u.id || u.id === user?.id}
                              onClick={() => handleToggleBlock(u.id, !!u.is_blocked, u.full_name)}
                              className="h-7 rounded-xl text-xs"
                            >
                              {actionLoading === u.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : u.is_blocked ? (
                                <><CheckCircle className="mr-1 h-3 w-3" />Enable</>
                              ) : (
                                <><Ban className="mr-1 h-3 w-3" />Block</>
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ✅ FIXED: Pagination only shows when there are users */}
              {filteredUsers.length > 0 && (
                <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Rows:</span>
                    <Select value={pageSize.toString()} onValueChange={v => setPageSize(Number(v))}>
                      <SelectTrigger className="h-7 w-16 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map(s => (
                          <SelectItem key={s} value={s.toString()}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {Math.min((currentPage - 1) * pageSize + 1, filteredUsers.length)}–
                    {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="h-7 rounded-lg px-2 text-xs">First</Button>
                    <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-7 rounded-lg px-1.5">
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="px-2 text-xs text-foreground">{currentPage}/{totalPages}</span>
                    <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-7 rounded-lg px-1.5">
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)} className="h-7 rounded-lg px-2 text-xs">Last</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ✅ FIXED: Confirm Dialog properly closes before executing action */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl"
              onClick={async () => {
                setConfirmDialog(prev => ({ ...prev, open: false }));
                await confirmDialog.action();
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPage;