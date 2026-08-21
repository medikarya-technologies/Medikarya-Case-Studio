'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Users as UsersIcon, Loader2, Search, Edit3, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { User, NameChangeRequest } from '@/lib/types';
import {
  fetchAllUsers,
  updateUserRoleAction,
  fetchPendingNameChangeRequestsAction,
  resolveNameChangeRequestAction,
} from '@/app/actions/case-actions';
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
  const [pendingRequests, setPendingRequests] = useState<NameChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [resolvingRequestId, setResolvingRequestId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const fetchUsersAndRequests = useCallback(async (retryCount = 0) => {
    setIsLoading(true);
    setUsersError(null);
    try {
      const [allUsers, requests] = await Promise.all([
        fetchAllUsers(),
        fetchPendingNameChangeRequestsAction(),
      ]);
      setUsers(allUsers);
      setPendingRequests(requests);
    } catch (e) {
      console.error('Error fetching users/requests:', e);
      if (retryCount < 2) {
        setTimeout(() => fetchUsersAndRequests(retryCount + 1), 700);
        return;
      }
      setUsersError('Could not load user management data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetchUsersAndRequests();
  }, [isLoaded, isSignedIn, fetchUsersAndRequests]);

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
      await fetchUsersAndRequests();
    } catch (e) {
      console.error('Error updating user role:', e);
      toast.error('Failed to update role');
    } finally {
      setUpdatingUserId(null);
    }
  }, [fetchUsersAndRequests]);

  const handleResolveNameRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    setResolvingRequestId(requestId);
    try {
      await resolveNameChangeRequestAction(requestId, status);
      toast.success(
        status === 'approved'
          ? 'Name change request approved successfully!'
          : 'Name change request rejected.'
      );
      await fetchUsersAndRequests();
    } catch (e: any) {
      console.error('Error resolving request:', e);
      toast.error(e.message || 'Failed to process name change request');
    } finally {
      setResolvingRequestId(null);
    }
  };

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
          Manage user roles and approve or reject profile name change requests
        </p>
      </div>

      {/* Pending Name Change Requests Section */}
      {pendingRequests.length > 0 && (
        <Card className="border-2 border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg text-amber-950 dark:text-amber-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>Pending Name Change Requests ({pendingRequests.length})</span>
              </div>
              <Badge variant="outline" className="bg-amber-200 text-amber-950 border-amber-400 font-medium">
                Requires Admin Action
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl bg-card border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Current:</span>
                      <span className="font-semibold text-sm text-foreground">{req.user?.name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">({req.user?.email})</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Requested Name:</span>
                      <span className="font-bold text-base text-amber-950 dark:text-amber-100 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                        {req.requested_name}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-1">
                      Submitted on {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[36px]"
                      onClick={() => handleResolveNameRequest(req.id, 'approved')}
                      disabled={resolvingRequestId === req.id}
                    >
                      {resolvingRequestId === req.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Approve
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 min-h-[36px]"
                      onClick={() => handleResolveNameRequest(req.id, 'rejected')}
                      disabled={resolvingRequestId === req.id}
                    >
                      {resolvingRequestId === req.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-1.5" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Directory Section */}
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
          <Button variant="outline" size="sm" onClick={() => fetchUsersAndRequests()}>
            Retry
          </Button>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <UsersIcon className="w-5 h-5 text-primary" />
            All Platform Users ({filteredUsers.length})
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
