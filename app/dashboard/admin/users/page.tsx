'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Users as UsersIcon, Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User } from '@/lib/types';
import { fetchAllUsers, updateUserRoleAction } from '@/app/actions/case-actions';
import { useAuth } from '@clerk/nextjs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const ROLE_OPTIONS: Array<'author' | 'reviewer' | 'admin'> = ['author', 'reviewer', 'admin'];

function roleBadgeClasses(role: string) {
  switch (role) {
    case 'admin':
      return 'bg-sidebar text-white';
    case 'reviewer':
      return 'bg-secondary text-white';
    default:
      return 'bg-brand-muted text-primary';
  }
}

interface AdminUserRowProps {
  user: User;
  isUpdating: boolean;
  onRoleChange: (user: User, newRole: 'author' | 'reviewer' | 'admin') => void;
}

const AdminUserRow = memo(function AdminUserRow({ user, isUpdating, onRoleChange }: AdminUserRowProps) {
  return (
    <tr className="border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 font-medium">{user.name}</td>
      <td className="py-3 text-sm text-muted-foreground hidden sm:table-cell">
        {user.email}
      </td>
      <td className="py-3">
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${roleBadgeClasses(user.role)}`}
        >
          {user.role}
        </span>
      </td>
      <td className="py-3">
        <div className="flex gap-1.5 flex-wrap">
          {ROLE_OPTIONS.map((option) => (
            <Button
              key={option}
              size="sm"
              variant={user.role === option ? 'default' : 'outline'}
              disabled={user.role === option || isUpdating}
              onClick={() => onRoleChange(user, option)}
              className="capitalize min-h-[36px]"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                option
              )}
            </Button>
          ))}
        </div>
      </td>
    </tr>
  );
});

export default function AdminUsersPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const fetchUsers = useCallback(async (retryCount = 0) => {
    setIsLoading(true);
    setUsersError(null);
    try {
      const allUsers = await fetchAllUsers();
      setUsers(allUsers);
    } catch (e) {
      console.error('Error fetching users:', e);
      if (retryCount < 2) {
        setTimeout(() => fetchUsers(retryCount + 1), 700);
        return;
      }
      setUsersError('Could not load users. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetchUsers();
  }, [isLoaded, isSignedIn, fetchUsers]);

  const handleRoleChange = useCallback(async (targetUser: User, newRole: 'author' | 'reviewer' | 'admin') => {
    if (targetUser.role === newRole) return;
    const confirmed = confirm(
      `Are you sure you want to change ${targetUser.name}'s role to "${newRole}"?`
    );
    if (!confirmed) return;

    setUpdatingUserId(targetUser.id);
    try {
      await updateUserRoleAction(targetUser.id, newRole);
      toast.success('User role updated successfully');
      await fetchUsers();
    } catch (e) {
      console.error('Error updating user role:', e);
      toast.error('Failed to update role');
    } finally {
      setUpdatingUserId(null);
    }
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <Card>
          <CardContent className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>Manage Users</h1>
        <p className="text-muted-foreground mt-2">
          Change any user&apos;s role. Changes take effect on their next page load.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
        >
          <option value="all">All roles</option>
          <option value="author">Author</option>
          <option value="reviewer">Reviewer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {usersError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{usersError}</span>
          <Button variant="outline" size="sm" onClick={() => fetchUsers()}>
            Retry
          </Button>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <UsersIcon className="w-5 h-5 text-primary" />
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium hidden sm:table-cell">Email</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Change Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <AdminUserRow
                      key={u.id}
                      user={u}
                      isUpdating={updatingUserId === u.id}
                      onRoleChange={handleRoleChange}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
