import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, User, Shield, Mail, Phone, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type UserRole = "restaurant" | "ngo" | "volunteer" | "admin";
type UserStatus = "active" | "inactive" | "pending" | "blocked";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  city?: string;
  role: UserRole;
  is_active?: boolean;
  is_approved?: boolean;
  is_blocked?: boolean;
  created_at: string;
}

const AdminUsers = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"approve" | "block" | "delete" | "">("");

  const USERS_PER_PAGE = 10;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, email, full_name, phone, city, role, 
          is_active, is_approved, is_blocked, created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUsers((data as Profile[]) ?? []);
    } catch (error) {
      console.error("fetchUsers:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());

      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      const status: UserStatus =
        user.is_blocked
          ? "blocked"
          : !user.is_active
          ? "inactive"
          : !user.is_approved
          ? "pending"
          : "active";

      const matchesStatus = statusFilter === "all" || status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    const end = start + USERS_PER_PAGE;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.size === 0) return;

    try {
      const updates = selectedUsers;

      if (bulkAction === "approve") {
        const { error } = await supabase
          .from("profiles")
          .update({ is_approved: true })
          .in("id", Array.from(updates));
        if (error) throw error;
        toast.success(`${selectedUsers.size} users approved`);
      } else if (bulkAction === "block") {
        const { error } = await supabase
          .from("profiles")
          .update({ is_blocked: true, is_active: false })
          .in("id", Array.from(updates));
        if (error) throw error;
        toast.success(`${selectedUsers.size} users blocked`);
      }

      setSelectedUsers(new Set());
      setBulkAction("");
      fetchUsers();
    } catch (error) {
      toast.error("Bulk action failed");
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleAllUsers = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      const newSelected = new Set(
        Array.from(selectedUsers).filter(
          (id) => !paginatedUsers.some((user) => user.id === id)
        )
      );
      setSelectedUsers(newSelected);
    } else {
      const newSelected = new Set(selectedUsers);
      paginatedUsers.forEach((user) => newSelected.add(user.id));
      setSelectedUsers(newSelected);
    }
  };

  const getStatusBadge = (user: Profile): UserStatus => {
    if (user.is_blocked) return "blocked";
    if (!user.is_active) return "inactive";
    if (!user.is_approved) return "pending";
    return "active";
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
          <p className="text-muted-foreground">
            Manage {filteredUsers.length} users • Page {currentPage} of {totalPages}
          </p>
        </div>
        {selectedUsers.size > 0 && (
          <div className="flex items-center gap-2">
            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Bulk action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="block">Block</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleBulkAction}
              disabled={!bulkAction}
              variant="destructive"
            >
              Apply to {selectedUsers.size}
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>

        <Select value={roleFilter} onValueChange={(value) => {
          setRoleFilter(value as UserRole | "all");
          setCurrentPage(1);
        }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="restaurant">Restaurants</SelectItem>
            <SelectItem value="ngo">NGOs</SelectItem>
            <SelectItem value="volunteer">Volunteers</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value) => {
          setStatusFilter(value as UserStatus | "all");
          setCurrentPage(1);
        }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedUsers.size === paginatedUsers.length &&
                    paginatedUsers.length > 0
                  }
                  onCheckedChange={toggleAllUsers}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => {
              const status = getStatusBadge(user);
              return (
                <TableRow key={user.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      <Shield className="mr-1 h-3 w-3" />
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        status === "active"
                          ? "default"
                          : status === "pending"
                          ? "outline"
                          : status === "blocked"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.phone || "-"}</TableCell>
                  <TableCell>{user.city || "-"}</TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * USERS_PER_PAGE + 1)} to{" "}
            {Math.min(currentPage * USERS_PER_PAGE, filteredUsers.length)} of{" "}
            {filteredUsers.length} users
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;