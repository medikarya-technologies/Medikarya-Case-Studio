'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { User, NameChangeRequest } from '@/lib/types';
import {
  fetchCurrentUser,
  firstTimeEditNameAction,
  requestNameChangeAction,
  fetchMyNameChangeRequestAction,
} from '@/app/actions/case-actions';
import { Lock, Edit3, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [nameChangeReq, setNameChangeReq] = useState<NameChangeRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // First-time edit form state
  const [nameInput, setNameInput] = useState('');
  const [isSubmittingFirstEdit, setIsSubmittingFirstEdit] = useState(false);

  // Request dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestedNameInput, setRequestedNameInput] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [u, req] = await Promise.all([
        fetchCurrentUser(),
        fetchMyNameChangeRequestAction(),
      ]);
      setDbUser(u);
      setNameInput(u.name || clerkUser?.fullName || '');
      setNameChangeReq(req);
    } catch (e) {
      console.error('Error loading profile:', e);
      toast.error('Failed to load profile details');
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser]);

  useEffect(() => {
    if (!isClerkLoaded) return;
    loadData();
  }, [isClerkLoaded, loadData]);

  const handleFirstTimeSave = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      toast.error('Name cannot be empty');
      return;
    }
    setIsSubmittingFirstEdit(true);
    try {
      await firstTimeEditNameAction(trimmed);
      toast.success('Name updated successfully!');
      await loadData();
    } catch (e: any) {
      console.error('First time edit error:', e);
      toast.error(e.message || 'Failed to update name');
    } finally {
      setIsSubmittingFirstEdit(false);
    }
  };

  const handleRequestSubmit = async () => {
    const trimmed = requestedNameInput.trim();
    if (!trimmed) {
      setRequestError('Please enter a valid name.');
      return;
    }
    if (trimmed === dbUser?.name) {
      setRequestError('New name must be different from your current name.');
      return;
    }
    setIsSubmittingRequest(true);
    setRequestError('');
    try {
      await requestNameChangeAction(trimmed);
      toast.success('Name change request submitted for admin review!');
      setIsModalOpen(false);
      setRequestedNameInput('');
      await loadData();
    } catch (e: any) {
      console.error('Name change request error:', e);
      setRequestError(e.message || 'Failed to submit name change request.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  if (isLoading || !isClerkLoaded) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <Skeleton className="h-9 w-40 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const nameEditedOnce = !!dbUser?.name_edited_once;
  const isPending = nameChangeReq?.status === 'pending';
  const isApproved = nameChangeReq?.status === 'approved';
  const isRejected = nameChangeReq?.status === 'rejected';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your account information and preferences</p>
      </div>

      {/* Status Notification Banner for Name Change Requests */}
      {isPending && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Name Change Request Pending</p>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Requested name: &quot;<span className="font-bold">{nameChangeReq.requested_name}</span>&quot;. Awaiting admin approval.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-amber-200 text-amber-950 border-amber-400 font-medium shrink-0">
            Pending Admin Review
          </Badge>
        </div>
      )}

      {isApproved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-200 flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Name Change Request Approved</p>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Your name was updated to &quot;<span className="font-bold">{dbUser?.name}</span>&quot;.
            </p>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 dark:bg-red-950/60 dark:border-red-700 dark:text-red-200 flex items-center gap-3 shadow-xs">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Name Change Request Not Approved</p>
            <p className="text-xs text-red-800 dark:text-red-300">
              Your request for &quot;<span className="font-bold">{nameChangeReq.requested_name}</span>&quot; was not approved by admin.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <span>Account Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Name Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-muted-foreground">Full Name</Label>
                {nameEditedOnce && (
                  <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Locked (Requires Admin Approval)
                  </Badge>
                )}
              </div>

              {!nameEditedOnce ? (
                /* First-time editable state */
                <div className="space-y-3">
                  <Input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your real full name"
                    className="font-medium"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      * You get one free edit. Subsequent name edits will require admin approval.
                    </span>
                    <Button
                      size="sm"
                      onClick={handleFirstTimeSave}
                      disabled={isSubmittingFirstEdit || !nameInput.trim()}
                      className="shrink-0"
                    >
                      {isSubmittingFirstEdit ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Name'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Locked / Read-only state after 1st edit */
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <p className="text-base font-semibold text-foreground">{dbUser?.name || 'Not set'}</p>
                    {isPending ? (
                      <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">Request Pending</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRequestedNameInput('');
                          setRequestError('');
                          setIsModalOpen(true);
                        }}
                        className="text-xs gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Request Name Change
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-muted-foreground">Email Address</Label>
              <p className="text-base font-semibold text-foreground p-3 rounded-lg border bg-muted/20">
                {dbUser?.email || clerkUser?.emailAddresses[0]?.emailAddress || 'Not set'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Role & System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Current Platform Role</Label>
              <p className="text-base font-bold text-primary capitalize mt-1 p-3 rounded-lg border bg-primary/5">
                {dbUser?.role || 'Author'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Member Since</Label>
              <p className="text-sm text-foreground mt-1">
                {dbUser?.created_at
                  ? new Date(dbUser.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Name Change Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3 border-b pb-3">
              <div className="p-2.5 bg-primary/10 rounded-full text-primary shrink-0">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Request Name Change</h3>
                <p className="text-xs text-muted-foreground">
                  Submit a name change request for admin review & approval.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Current Name</Label>
                <p className="text-sm font-medium text-foreground p-2 rounded bg-muted/40 border">
                  {dbUser?.name}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">New Requested Name *</Label>
                <Input
                  placeholder="Enter desired new full name"
                  value={requestedNameInput}
                  onChange={(e) => {
                    setRequestedNameInput(e.target.value);
                    if (requestError) setRequestError('');
                  }}
                  className="text-sm"
                />
              </div>

              {requestError && (
                <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{requestError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmittingRequest}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleRequestSubmit}
                disabled={isSubmittingRequest || !requestedNameInput.trim()}
              >
                {isSubmittingRequest ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
