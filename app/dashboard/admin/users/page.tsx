'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Users as UsersIcon, Loader2, Search, Edit3, CheckCircle2, XCircle, Clock, ShieldCheck, IdCard } from 'lucide-react';
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
import { decideWriterAction, fetchWritersAction, openProofAction } from '@/app/actions/writer-actions';
import { WRITER_KIND_LABEL, type WriterForAdmin } from '@/lib/writers/shared';

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
  /** Their request to be verified as a case writer, if they have made one. */
  writer?: WriterForAdmin;
  isDeciding: boolean;
  onVerify: (userId: string, name: string, verify: boolean) => void;
}

/** May this person submit cases? Admins and faculty reviewers can by their role; an author once verified. */
function WriterCell({ user, writer, isDeciding, onVerify }: Pick<AdminUserRowProps, 'user' | 'writer' | 'isDeciding' | 'onVerify'>) {
  if (user.role !== 'author') return <span className="text-xs text-muted-foreground">Yes, by role</span>;
  const status = writer?.status;
  const label = status === 'verified' ? 'Verified' : status === 'pending' ? 'Waiting for you' : status === 'rejected' ? 'Turned down' : 'Not verified';
  const tone =
    status === 'verified'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
      : status === 'pending'
        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
        : 'bg-muted text-muted-foreground';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{label}</span>
      {status !== 'pending' && (
        <button
          type="button"
          disabled={isDeciding}
          onClick={() => onVerify(user.id, user.name, status !== 'verified')}
          className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
        >
          {status === 'verified' ? 'Undo' : 'Verify by hand'}
        </button>
      )}
    </div>
  );
}

const AdminUserRow = memo(function AdminUserRow({ user, isUpdating, onRoleChange, writer, isDeciding, onVerify }: AdminUserRowProps) {
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
      <td className="py-3 pr-3">
        <WriterCell user={user} writer={writer} isDeciding={isDeciding} onVerify={onVerify} />
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
              // the role they have now stays solid (not faded) so it reads as "this one"
              className={`capitalize min-h-[36px] ${user.role === option ? 'disabled:opacity-100' : ''}`}
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
  const [writers, setWriters] = useState<WriterForAdmin[]>([]);
  const [decidingWriterId, setDecidingWriterId] = useState<string | null>(null);
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
      const [allUsers, requests, writerList] = await Promise.all([
        fetchAllUsers(),
        fetchPendingNameChangeRequestsAction(),
        fetchWritersAction().catch(() => [] as WriterForAdmin[]),
      ]);
      setUsers(allUsers);
      setPendingRequests(requests);
      setWriters(writerList);
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

  // Verifying someone (from their request, or by hand for a person you know), turning a request down, or undoing it.
  const handleVerify = useCallback(async (userId: string, name: string, verify: boolean) => {
    let note = '';
    if (!verify) {
      const answer = prompt(`Why can ${name} not be verified? They will see this, so say what to correct.`);
      if (answer === null) return;
      note = answer;
    } else if (!confirm(`Verify ${name} as a case writer? They will be able to submit cases for review.`)) return;

    setDecidingWriterId(userId);
    try {
      const r = await decideWriterAction(userId, verify, note);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(verify ? `${name} is verified and has been told.` : `${name} has been told what to correct.`);
        await fetchUsersAndRequests();
      }
    } finally {
      setDecidingWriterId(null);
    }
  }, [fetchUsersAndRequests]);

  const handleOpenProof = async (userId: string) => {
    const r = await openProofAction(userId);
    if (!r.ok) toast.error(r.error);
    else window.open(r.url, '_blank', 'noopener,noreferrer');
  };

  const writerByUser = useMemo(() => new Map(writers.map((w) => [w.user_id, w])), [writers]);
  const waitingWriters = useMemo(() => writers.filter((w) => w.status === 'pending'), [writers]);

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
          Verify new case writers, manage roles, and approve or reject name change requests
        </p>
      </div>

      {/* People waiting to be verified as case writers */}
      {waitingWriters.length > 0 && (
        <Card className="border-2 border-primary/30 bg-brand-muted/40 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>Waiting to be verified ({waitingWriters.length})</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              New people who want to write cases. Check that the ID or registration number matches the name and college, then verify. Until you do,
              they can save drafts but not submit. The ID photo is deleted as soon as you decide.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {waitingWriters.map((w) => (
                <div key={w.user_id} className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <p className="font-semibold text-foreground">
                        {w.name} <span className="font-normal text-muted-foreground">· {w.email}</span>
                      </p>
                      <p className="text-sm text-foreground">
                        {[w.kind ? WRITER_KIND_LABEL[w.kind] : null, w.year_or_designation, w.institution, w.state].filter(Boolean).join(' · ')}
                      </p>
                      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-muted-foreground">
                        {w.registration_no && (
                          <div>
                            <dt className="inline">Registration: </dt>
                            <dd className="inline font-mono text-foreground">{w.registration_no}</dd>
                            {w.council && <dd className="inline"> ({w.council})</dd>}
                          </div>
                        )}
                        {w.phone && (
                          <div>
                            <dt className="inline">Mobile: </dt>
                            <dd className="inline text-foreground">{w.phone}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="inline">Asked on </dt>
                          <dd className="inline">{new Date(w.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</dd>
                        </div>
                      </dl>
                      {!w.has_proof && !w.registration_no && <p className="text-[13px] font-medium text-destructive">No ID photo and no registration number.</p>}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {w.has_proof && (
                        <Button size="sm" variant="outline" className="min-h-[36px]" onClick={() => handleOpenProof(w.user_id)}>
                          <IdCard className="w-4 h-4 mr-1.5" />
                          View ID
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[36px]"
                        disabled={decidingWriterId === w.user_id}
                        onClick={() => handleVerify(w.user_id, w.name, true)}
                      >
                        {decidingWriterId === w.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1.5" />Verify</>}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 min-h-[36px]"
                        disabled={decidingWriterId === w.user_id}
                        onClick={() => handleVerify(w.user_id, w.name, false)}
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Cannot verify
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                      Submitted on {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                    <th className="pb-3 font-medium">Can submit cases</th>
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
                      writer={writerByUser.get(u.id)}
                      isDeciding={decidingWriterId === u.id}
                      onVerify={handleVerify}
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
