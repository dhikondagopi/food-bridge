import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Utensils, Users, Heart, TrendingUp, Shield, ShieldCheck, Ban, CheckCircle, Search, X, ChevronLeft, ChevronRight, Download, Camera } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PhotoModeration from '@/components/admin/PhotoModeration';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';


interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  organization_name: string | null;
  created_at: string;
  disabled: boolean;
  isAdmin?: boolean;
}

const ROLES = ['restaurant', 'ngo', 'volunteer'];
const STATUS_OPTIONS = ['all', 'active', 'disabled'];
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
const DEFAULT_PAGE_SIZE = 10;

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ donations: 0, restaurants: 0, ngos: 0, volunteers: 0, delivered: 0, meals: 0 });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({ open: false, title: '', description: '', action: async () => {} });

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    if (user) checkAdmin();
  }, [user]);

  const fetchData = async () => {
    const [donationsRes, restaurantsRes, ngosRes, volunteersRes, deliveredRes, usersRes, adminRolesRes] = await Promise.all([
      supabase.from('food_donations').select('id, quantity', { count: 'exact' }),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'restaurant'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'ngo'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'volunteer'),
      supabase.from('food_donations').select('id, quantity', { count: 'exact' }).eq('status', 'delivered'),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id').eq('role', 'admin'),
    ]);
    const totalMeals = (donationsRes.data || []).reduce((sum: number, d: any) => sum + (d.quantity || 0), 0);
    setStats({
      donations: donationsRes.count || 0,
      restaurants: restaurantsRes.count || 0,
      ngos: ngosRes.count || 0,
      volunteers: volunteersRes.count || 0,
      delivered: deliveredRes.count || 0,
      meals: totalMeals,
    });
    const adminUserIds = new Set((adminRolesRes.data || []).map((r: any) => r.user_id));
    setUsers(((usersRes.data as UserProfile[]) || []).map(u => ({ ...u, isAdmin: adminUserIds.has(u.id) })));
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (isAdmin === null) return;
    fetchData();
  }, [isAdmin]);

  // Filtered users based on search and filters
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = searchQuery === '' || 
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.organization_name && u.organization_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && !u.disabled) || 
        (statusFilter === 'disabled' && u.disabled);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Paginated users
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter, pageSize]);

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery !== '' || roleFilter !== 'all' || statusFilter !== 'all';

  const callAdminFunction = async (body: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('admin-manage-user', { body });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  };

  const executeRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      await callAdminFunction({ action: 'changeRole', userId, role: newRole });
      toast.success('Role updated successfully');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setActionLoading(null);
    }
  };

  const executeToggleDisable = async (userId: string, currentlyDisabled: boolean) => {
    setActionLoading(userId);
    try {
      await callAdminFunction({ action: 'toggleDisable', userId, disabled: !currentlyDisabled });
      toast.success(currentlyDisabled ? 'Account enabled' : 'Account disabled');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update account');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = (userId: string, newRole: string, userName: string, currentRole: string) => {
    setConfirmDialog({
      open: true,
      title: 'Change User Role',
      description: `Are you sure you want to change ${userName}'s role from "${currentRole}" to "${newRole}"?`,
      action: () => executeRoleChange(userId, newRole),
    });
  };

  const handleToggleDisable = (userId: string, currentlyDisabled: boolean, userName: string) => {
    if (userId === user?.id) {
      toast.error("You can't disable your own account");
      return;
    }
    setConfirmDialog({
      open: true,
      title: currentlyDisabled ? 'Enable Account' : 'Disable Account',
      description: currentlyDisabled
        ? `Are you sure you want to re-enable ${userName}'s account?`
        : `Are you sure you want to disable ${userName}'s account? They will no longer be able to log in.`,
      action: () => executeToggleDisable(userId, currentlyDisabled),
    });
  };

  const executeToggleAdmin = async (userId: string) => {
    setActionLoading(userId);
    try {
      await callAdminFunction({ action: 'toggleAdmin', userId });
      toast.success('Admin role updated');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update admin role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAdmin = (userId: string, isCurrentlyAdmin: boolean, userName: string) => {
    if (userId === user?.id) {
      toast.error("You can't modify your own admin role");
      return;
    }
    setConfirmDialog({
      open: true,
      title: isCurrentlyAdmin ? 'Remove Admin Role' : 'Grant Admin Role',
      description: isCurrentlyAdmin
        ? `Are you sure you want to remove admin privileges from ${userName}?`
        : `Are you sure you want to grant admin privileges to ${userName}? They will be able to manage all users and settings.`,
      action: () => executeToggleAdmin(userId),
    });
  };

  if (authLoading || isAdmin === null) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Shield className="h-12 w-12 text-destructive/50" />
          <h2 className="font-heading text-xl font-semibold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground text-center max-w-md">
            You don't have permission to view this page. Only administrators can access the admin dashboard.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    { label: 'Total Donations', value: stats.donations, icon: Utensils, accent: 'bg-primary/10 text-primary' },
    { label: 'Meals Saved', value: stats.meals, icon: TrendingUp, accent: 'bg-success/10 text-success' },
    { label: 'Restaurants', value: stats.restaurants, icon: Utensils, accent: 'bg-warning/10 text-warning' },
    { label: 'NGOs', value: stats.ngos, icon: Users, accent: 'bg-primary/10 text-primary' },
    { label: 'Volunteers', value: stats.volunteers, icon: Heart, accent: 'bg-destructive/10 text-destructive' },
    { label: 'Delivered', value: stats.delivered, icon: TrendingUp, accent: 'bg-success/10 text-success' },
  ];

  const roleColor = (role: string) => {
    switch (role) {
      case 'restaurant': return 'default';
      case 'ngo': return 'secondary';
      case 'volunteer': return 'outline';
      default: return 'default';
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Role', 'Organization', 'Joined', 'Status', 'Admin'];
    const rows = filteredUsers.map(u => [
      u.full_name,
      u.role,
      u.organization_name || '',
      new Date(u.created_at).toLocaleDateString(),
      u.disabled ? 'Disabled' : 'Active',
      u.isAdmin ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredUsers.length} users to CSV`);
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="h-7 w-7 text-primary" />
          <h1 className="font-heading text-3xl font-bold text-foreground">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground mt-1">System overview, analytics, and user management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {statCards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="shadow-card hover-lift group">
              <CardContent className="p-6 text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${c.accent} mx-auto mb-3 transition-transform duration-300 group-hover:scale-110`}>
                  <c.icon className="h-6 w-6" />
                </div>
                <div className="font-heading text-3xl font-bold text-foreground">{c.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="users" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> User Management</TabsTrigger>
          <TabsTrigger value="photos" className="gap-2"><Camera className="h-4 w-4" /> Photo Moderation</TabsTrigger>
        </TabsList>

        <TabsContent value="photos">
          <PhotoModeration />
        </TabsContent>

        <TabsContent value="users">
      {/* Users Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="font-heading flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management ({filteredUsers.length}{filteredUsers.length !== users.length ? ` of ${users.length}` : ''})
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                  <X className="h-3 w-3 mr-1" /> Clear filters
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs">
                <Download className="h-3 w-3 mr-1" /> Export CSV
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or organization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map(r => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters ? 'No users match your filters.' : 'No users found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Role</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Organization</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Joined</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map(u => (
                    <tr key={u.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${u.disabled ? 'opacity-60' : ''}`}>
                      <td className="py-3 px-2 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {u.full_name}
                          {u.id === user?.id && <span className="text-xs text-muted-foreground">(you)</span>}
                          {u.isAdmin && (
                            <Badge variant="default" className="text-xs bg-primary/20 text-primary border-primary/30">
                              <ShieldCheck className="h-3 w-3 mr-1" /> Admin
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Select
                          value={u.role}
                          onValueChange={(val) => handleRoleChange(u.id, val, u.full_name, u.role)}
                          disabled={!isAdmin || actionLoading === u.id || u.id === user?.id}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map(r => (
                              <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">{u.organization_name || '—'}</td>
                      <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={u.disabled ? 'destructive' : 'outline'} className="text-xs">
                          {u.disabled ? 'Disabled' : 'Active'}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant={u.isAdmin ? 'secondary' : 'outline'}
                            size="sm"
                            disabled={!isAdmin || actionLoading === u.id || u.id === user?.id}
                            onClick={() => handleToggleAdmin(u.id, !!u.isAdmin, u.full_name)}
                            className="text-xs"
                          >
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            {u.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                          </Button>
                          <Button
                            variant={u.disabled ? 'outline' : 'destructive'}
                            size="sm"
                            disabled={!isAdmin || actionLoading === u.id || u.id === user?.id}
                            onClick={() => handleToggleDisable(u.id, u.disabled, u.full_name)}
                            className="text-xs"
                          >
                            {u.disabled ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Enable</>
                            ) : (
                              <><Ban className="h-3 w-3 mr-1" /> Disable</>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {filteredUsers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page:</span>
                <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
                  <SelectTrigger className="w-[70px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="h-8 px-2"
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-sm text-foreground">
                  {currentPage} / {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="h-8 px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="h-8 px-2"
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              setConfirmDialog(prev => ({ ...prev, open: false }));
              await confirmDialog.action();
            }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default AdminPage;
