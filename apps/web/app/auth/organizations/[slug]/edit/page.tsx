'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  CircularProgress,
  IconButton,
  Switch,
  FormControlLabel,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { authFetch } from '../../../../lib/auth';
import { BACKEND_URL, FRONTEND_URL } from '../../../../lib/constants';
import type { OrganizationDto, OrganizationInvitationDto } from '../../types';
import InvitationForm from '../../components/InvitationForm';
import PendingInvitesTable from '../../components/PendingInvitesTable';
import InvitationHistoryDialog from '../../components/InvitationHistoryDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import SnackbarFeedback from '../../components/SnackbarFeedback';
import DuplicateSuggestions from '../../components/DuplicateSuggestions';
import { useDuplicateSuggestions } from '../../components/useDuplicateSuggestions';
import {
  validateOrgName,
  validateOrgAlias,
  validateICO,
} from '../../validation';

export default function EditOrganizationPage() {
  const { slug } = useParams();
  const router = useRouter();

  const [org, setOrg] = useState<OrganizationDto | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [organizationAlias, setOrganizationAlias] = useState('');
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { suggestions, loading: loadingDupes } = useDuplicateSuggestions({
    name,
    companyId,
    organizationAlias,
    excludeId: org?.id ?? null,
  });
  const [members, setMembers] = useState(org?.members ?? []);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<
    OrganizationInvitationDto[]
  >([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyInvites, setHistoryInvites] = useState<
    OrganizationInvitationDto[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'warning' | 'error'
  >('success');
  const [editedRoles, setEditedRoles] = useState<
    Record<string, 'Owner' | 'Manager' | 'Viewer'>
  >({});
  const [userRole, setUserRole] = useState<
    'Owner' | 'Manager' | 'Viewer' | 'Admin' | null
  >(null);
  const [authChecked, setAuthChecked] = useState(false);
  const isPlatformAdmin = org?.isAdmin ?? false;
  const canEditInfo = userRole === 'Owner' || isPlatformAdmin;
  const canManageRoles = userRole === 'Owner' || userRole === 'Manager';
  const canManageInvites =
    userRole === 'Owner' || userRole === 'Manager' || isPlatformAdmin;
  const canDeleteOrganization = userRole === 'Owner' || isPlatformAdmin;
  const [slugPreview, setSlugPreview] = useState('');
  const [slugLoading, setSlugLoading] = useState(false);

  const refreshPendingInvites = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await authFetch(
        `${BACKEND_URL}/organizations/${slug}/invitations`,
      );
      if (!res.ok) {
        setPendingInvites([]);
        return;
      }
      const data = (await res.json()) as OrganizationInvitationDto[];
      setPendingInvites(data);
    } catch {
      setPendingInvites([]);
    }
  }, [slug]);

  const fetchInvitationHistory = useCallback(async () => {
    if (!slug) return;
    setHistoryLoading(true);
    try {
      const res = await authFetch(
        `${BACKEND_URL}/organizations/${slug}/invitations/history`,
      );
      if (!res.ok) {
        setHistoryInvites([]);
        setSnackbarMessage(
          'Unable to load invitation history. Please try again.',
        );
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
      const data = (await res.json()) as OrganizationInvitationDto[];
      setHistoryInvites(data);
    } catch {
      setHistoryInvites([]);
      setSnackbarMessage(
        'Unable to load invitation history. Please try again.',
      );
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setHistoryLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    const loadOrganization = async () => {
      setFatalError(null);
      setLoading(true);
      setAuthChecked(false);
      setErrors({});

      try {
        const res = await authFetch(`${BACKEND_URL}/organizations/${slug}`);

        if (!res.ok) {
          if (res.status === 404) {
            setFatalError('Organization not found.');
          } else if (res.status === 403) {
            setFatalError('You are not authorized to edit this organization.');
          } else {
            setFatalError(`Failed to load organization (HTTP ${res.status}).`);
          }
          setLoading(false);
          setAuthChecked(true);
          return;
        }

        const data: OrganizationDto = await res.json();
        setOrg(data);
        setName(data.name);
        setDescription(data.description?.trim() || '');
        setCompanyId(data.companyId?.toString() ?? '');
        setOrganizationAlias(data.organizationAlias);
        setIsPrivate(data.isPrivate);

        const role: 'Owner' | 'Manager' | 'Viewer' | 'Admin' | null =
          (data.currentUserRole as never) ?? (data.isAdmin ? 'Admin' : null);
        setUserRole(role);

        if (role !== 'Owner' && role !== 'Manager' && role !== 'Admin') {
          setFatalError(
            'You do not have permission to edit this organization.',
          );
          setLoading(false);
          setAuthChecked(true);
          return;
        }

        try {
          const rolesRes = await authFetch(
            `${BACKEND_URL}/domain/${data.id}/users`,
          );
          if (rolesRes.ok) {
            const withRoles = await rolesRes.json();
            const merged = data.members.map((m) => {
              const found = withRoles.find(
                (u: {
                  id: string;
                  role?: 'Owner' | 'Manager' | 'Viewer' | 'Moderator';
                }) => u.id === m.id,
              );
              return { ...m, role: found?.role ?? 'Viewer' };
            });
            setMembers(merged);
          } else {
            setMembers(data.members.map((m) => ({ ...m, role: 'Viewer' })));
          }
        } catch {
          setMembers(data.members.map((m) => ({ ...m, role: 'Viewer' })));
        }

        setErrors({});
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.includes('Organization not found.') ||
            err.message.includes('Failed to load organization'))
        ) {
          setFatalError('Organization not found.');
        } else {
          setFatalError('There was a problem when loading page.');
        }
      } finally {
        setLoading(false);
        setAuthChecked(true);
      }
    };

    loadOrganization();
  }, [slug]);

  useEffect(() => {
    if (!org) return;
    void refreshPendingInvites();
  }, [org, refreshPendingInvites]);

  useEffect(() => {
    if (errors.form) {
      setSnackbarMessage(errors.form);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [errors.form]);

  useEffect(() => {
    const alias = organizationAlias.trim();

    const aliasError = validateOrgAlias(alias);
    if (!alias || aliasError) {
      setSlugPreview('');
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setSlugLoading(true);
        const res = await authFetch(
          `${BACKEND_URL}/organizations/slug-preview?alias=${encodeURIComponent(alias)}&excludeId=${org?.id ?? ''}`,
          { signal: controller.signal },
        );
        if (res.ok) {
          const data = await res.json();
          setSlugPreview(
            `${FRONTEND_URL.replace(/\/$/, '')}/auth/organizations/${data.slug}`,
          );
        } else {
          setSlugPreview('');
        }
      } catch {
        setSlugPreview('');
      } finally {
        setSlugLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [org?.id, organizationAlias]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const f: { [k: string]: string } = {};
    const nameErr = validateOrgName(name);
    if (nameErr) f.name = nameErr;

    const aliasErr = validateOrgAlias(organizationAlias);
    if (aliasErr) f.organizationAlias = aliasErr;
    const icoErr = validateICO(companyId);
    if (icoErr) f.companyId = icoErr;
    setErrors(f);
    if (Object.keys(f).length) return;

    setSaving(true);
    try {
      const res = await authFetch(`${BACKEND_URL}/organizations/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          companyId: companyId.trim(),
          organizationAlias: organizationAlias.trim(),
          isPrivate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrors({ form: data.message ?? 'Update failed' });
        setSaving(false);
        return;
      }

      if (org?.id && Object.keys(editedRoles).length > 0) {
        await Promise.all(
          Object.entries(editedRoles).map(([userId, role]) =>
            authFetch(`${BACKEND_URL}/domain/${org.id}/users/${userId}/role`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role }),
            }),
          ),
        );
        setEditedRoles({});
      }
      const targetSlug =
        data.newSlug && data.newSlug !== slug ? data.newSlug : slug;
      router.push(`/auth/organizations/${targetSlug}?saved=true`);
    } catch (err: unknown) {
      let msg = 'Unexpected error';

      if (err instanceof Error) {
        if (err.message.includes('Managers cannot assign')) {
          msg = 'You cannot assign a higher role than your own.';
        } else if (err.message.includes('At least one Owner must remain')) {
          msg = 'At least one Owner must remain in the organization.';
        } else if (
          err.message.includes('cannot demote the last remaining Owner')
        ) {
          msg = 'You cannot change the role of the last remaining Owner.';
        } else if (
          err.message.includes('must be a member of this organization')
        ) {
          msg = 'You must be part of this organization to assign roles.';
        } else if (
          err.message.includes('You cannot assign a higher role than your own')
        ) {
          msg = 'You cannot assign a higher role than your own.';
        } else {
          msg = err.message;
        }
      }
      setErrors({ form: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    try {
      await authFetch(`${BACKEND_URL}/organizations/${slug}`, {
        method: 'DELETE',
      });
      router.push('/auth/organizations');
    } catch {
      // intentionally left blank
    }
  };

  if (fatalError) {
    return (
      <Box textAlign="center" mt={8}>
        <Typography variant="h6" color="error" gutterBottom>
          {fatalError}
        </Typography>
        <Button
          variant="contained"
          onClick={() => router.push(`/auth/organizations/${slug}`)}
        >
          Back to Organization
        </Button>
      </Box>
    );
  }

  if (!authChecked) {
    return (
      <Box display="flex" justifyContent="center" p={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (loading || !org) {
    return (
      <Box display="flex" justifyContent="center" p={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (
    errors.form &&
    (!org ||
      errors.form.includes('not found') ||
      errors.form.includes('authorized'))
  ) {
    return (
      <Box textAlign="center" mt={8}>
        <Typography variant="h6" color="error" gutterBottom>
          {errors.form}
        </Typography>
        <Button
          variant="contained"
          onClick={() => router.push('/auth/organizations')}
        >
          Back to Organizations
        </Button>
      </Box>
    );
  }

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    setRemoving(true);

    try {
      const res = await authFetch(
        `${BACKEND_URL}/organizations/${slug}/members/${removeTarget}`,
        { method: 'DELETE' },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          data?.message || `Failed to remove member (HTTP ${res.status}).`;

        setSnackbarMessage(message);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setRemoveTarget(null);
        return;
      }

      setMembers((ms) => ms.filter((m) => m.id !== removeTarget));
      setSnackbarMessage('Member removed successfully.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err: unknown) {
      let message = 'Network error while removing member.';

      if (err instanceof Error && err.message) {
        try {
          const match = err.message.match(/\{.*}$/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (parsed?.message) {
              message = parsed.message;
            }
          } else if (!err.message.startsWith('Fetch error')) {
            message = err.message;
          }
        } catch {
          // Ignore parsing errors and keep default message
        }
      }
      setSnackbarMessage(message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
    }
  };

  const handleSendInvites = async () => {
    setInviteError('');

    if (!inviteEmails.trim()) {
      setInviteError('Please enter at least one email address.');
      return;
    }

    const emailsArray = inviteEmails
      .split(/[\s,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    const duplicates = emailsArray.filter(
      (email, index) => emailsArray.indexOf(email) !== index,
    );

    if (duplicates.length > 0) {
      setInviteError(`Duplicate email(s): ${duplicates.join(', ')}`);
      return;
    }

    const invalidEmails = emailsArray.filter(
      (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    );
    if (invalidEmails.length > 0) {
      setInviteError(`Invalid email(s): ${invalidEmails.join(', ')}`);
      return;
    }

    setSendingInvites(true);
    try {
      const res = await authFetch(
        `${BACKEND_URL}/organizations/${slug}/invitations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: emailsArray.join(', ') }),
        },
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data.message ?? 'Failed to send invitations.';
        setSnackbarMessage(message);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setSendingInvites(false);
        return;
      }

      const sentCount = data.sent?.length || 0;
      const skippedCount = data.skipped?.length || 0;
      const skippedSummary =
        data.skipped
          ?.map(
            (s: { email: string; reason: string }) =>
              `${s.email} (${s.reason})`,
          )
          .join(', ') || '';

      if (sentCount > 0 && skippedCount === 0) {
        setSnackbarMessage(`${sentCount} invitation(s) sent successfully.`);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      }

      if (sentCount > 0 && skippedCount > 0) {
        setSnackbarMessage(
          `${sentCount} invitation(s) sent. Skipped: ${skippedSummary}`,
        );
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
      }

      if (sentCount === 0 && skippedCount > 0) {
        setSnackbarMessage(`No invitations sent. Skipped: ${skippedSummary}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      if (sentCount === 0 && skippedCount > 0) {
        setInviteError(
          'All provided emails were skipped. No invitations sent.',
        );
        return;
      }

      await refreshPendingInvites();
      if (historyOpen) {
        void fetchInvitationHistory();
      }
      setInviteEmails('');
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      let message = error.message || 'Unexpected error.';
      if (
        message.includes('cannot send invitations') ||
        message.includes('cannot revoke invitations')
      ) {
        message = 'You do not have permission to manage invitations.';
      } else if (message.includes('Forbidden')) {
        message = 'You are not authorized to send invitations.';
      }
      setSnackbarMessage(message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSendingInvites(false);
    }
  };

  const handleRevokeInvite = async (inviteId: number) => {
    try {
      await authFetch(
        `${BACKEND_URL}/organizations/${slug}/invitations/${inviteId}`,
        { method: 'DELETE' },
      );
      setPendingInvites((invites) => invites.filter((i) => i.id !== inviteId));
      if (historyOpen) {
        void fetchInvitationHistory();
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      let message = error.message || 'Failed to revoke invitation.';

      if (
        message.includes('cannot revoke invitations') ||
        message.includes('cannot send invitations')
      ) {
        message = 'You do not have permission to manage invitations.';
      }

      setSnackbarMessage(message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleOpenHistory = () => {
    setHistoryOpen(true);
    void fetchInvitationHistory();
  };

  const handleCloseHistory = () => {
    setHistoryOpen(false);
  };

  if (loading || !org) {
    return <CircularProgress />;
  }

  return (
    <Box p={{ xs: 4, md: 6 }} display="flex" justifyContent="center">
      <Box width={{ xs: '100%', md: '50%' }}>
        <Typography variant="h4" textAlign="center" gutterBottom>
          Edit Organization
        </Typography>
        {userRole && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mb: 2 }}
          >
            You are logged in as: <strong>{userRole}</strong>
          </Typography>
        )}
        <Box>
          <Stack spacing={3}>
            <TextField
              label="Organization name"
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                setErrors((prev) => ({ ...prev, name: validateOrgName(v) }));
              }}
              error={!!errors.name}
              helperText={errors.name}
              required
              disabled={!canEditInfo}
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="Description"
              value={description}
              placeholder="Add a short description about your organization..."
              multiline
              minRows={3}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEditInfo}
            />
            <TextField
              label="IČO"
              value={companyId}
              inputProps={{ inputMode: 'numeric', maxLength: 8 }}
              onChange={(e) => {
                const v = e.target.value;
                setCompanyId(v);
                setErrors((prev) => ({ ...prev, companyId: validateICO(v) }));
              }}
              error={!!errors.companyId}
              helperText={errors.companyId}
              required
              disabled={!canEditInfo}
            />
            <TextField
              label="Organization Alias"
              placeholder="e.g. SmartLab, BVV, BLL"
              value={organizationAlias}
              onChange={(e) => {
                const v = e.target.value;
                setOrganizationAlias(v);
                setErrors((prev) => ({
                  ...prev,
                  organizationAlias: validateOrgAlias(v),
                }));
              }}
              error={!!errors.organizationAlias}
              helperText={
                errors.organizationAlias ||
                'Used as part of the organization URL.'
              }
              required
              disabled={!canEditInfo}
              inputProps={{ maxLength: 50 }}
            />
            <Box mt={1}>
              {slugLoading ? (
                <Typography variant="caption" color="text.secondary">
                  Checking slug availability…
                </Typography>
              ) : slugPreview ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block' }}
                >
                  <strong>Final URL:</strong>{' '}
                  <span style={{ fontWeight: 600, color: '#1976d2' }}>
                    {slugPreview}
                  </span>
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Enter correct organization alias to see final URL
                </Typography>
              )}
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  color="primary"
                  disabled={!canEditInfo}
                />
              }
              label={
                isPrivate
                  ? 'Private organization (joining disabled)'
                  : 'Public organization (anyone can request to join)'
              }
            />
            <DuplicateSuggestions
              suggestions={suggestions}
              loading={loadingDupes}
            />

            <Box my={4}>
              <Typography variant="h6">Members</Typography>
              <Box component="ul" sx={{ m: 0, p: 0, pl: 2, listStyle: 'none' }}>
                {members.map((m) => (
                  <Box
                    key={m.id}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    mb={0.5}
                  >
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {m.firstName} {m.lastName}
                    </Typography>

                    {(() => {
                      const isHigherRole =
                        ['Viewer', 'Manager', 'Owner', 'Admin'].indexOf(
                          m.role ?? 'Viewer',
                        ) >
                        ['Viewer', 'Manager', 'Owner', 'Admin'].indexOf(
                          userRole ?? 'Viewer',
                        );

                      if (isHigherRole && userRole !== 'Admin') {
                        return (
                          <Typography
                            variant="body2"
                            sx={{ width: 120, mr: 1, textAlign: 'center' }}
                          >
                            {m.role ?? 'Viewer'}
                          </Typography>
                        );
                      }

                      return (
                        <FormControl size="small" sx={{ minWidth: 120, mr: 1 }}>
                          <InputLabel id={`role-${m.id}`}>Role</InputLabel>
                          <Select
                            labelId={`role-${m.id}`}
                            value={editedRoles[m.id] ?? m.role ?? 'Viewer'}
                            label="Role"
                            onChange={(e) => {
                              const val = e.target.value as
                                | 'Owner'
                                | 'Manager'
                                | 'Viewer';
                              setEditedRoles((prev) => ({
                                ...prev,
                                [m.id]: val,
                              }));
                            }}
                            disabled={!canManageRoles}
                          >
                            {['Owner', 'Manager', 'Moderator', 'Viewer']
                              .filter((role) => {
                                if (userRole === 'Admin') return true;
                                if (userRole === 'Owner') return true;
                                if (userRole === 'Manager')
                                  return role !== 'Owner';
                                return false;
                              })
                              .map((role) => (
                                <MenuItem key={role} value={role}>
                                  {role}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                      );
                    })()}

                    <Box sx={{ width: 36, textAlign: 'center' }}>
                    {canManageRoles &&
                        org.currentUserId &&
                        (() => {
                          const hierarchy = [
                            'Viewer',
                            'Manager',
                            'Owner',
                            'Admin',
                          ];
                          const roleRank = (r: string | null | undefined) =>
                            hierarchy.indexOf(r ?? 'Viewer');

                          const currentRank = roleRank(userRole);
                          const memberRank = roleRank(m.role);

                          const isSelf = m.id === org.currentUserId;
                          const canDeleteThisMember =
                            !isSelf && currentRank >= memberRank;

                          return canDeleteThisMember ? (
                            <IconButton
                              size="small"
                              onClick={() => setRemoveTarget(m.id)}
                            >
                              <DeleteIcon fontSize="small" color="error" />
                            </IconButton>
                          ) : null;
                        })()}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box my={4}>
              <PendingInvitesTable
                invites={pendingInvites}
                onRevoke={handleRevokeInvite}
              />
              <Box mt={2} textAlign="right">
                <Button
                  variant="text"
                  onClick={handleOpenHistory}
                  disabled={!canManageInvites}
                >
                  View invitation history
                </Button>
              </Box>
            </Box>

            {canManageInvites && (
              <InvitationForm
                value={inviteEmails}
                error={inviteError}
                sending={sendingInvites}
                onChange={setInviteEmails}
                onSubmit={handleSendInvites}
              />
            )}
            <Box display="flex" justifyContent="space-between" mt={2}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setConfirmOpen(true)}
                disabled={saving || !canDeleteOrganization}
              >
                Delete Organization
              </Button>

              <Button
                variant="contained"
                disabled={saving}
                onClick={handleSave}
                sx={{ minWidth: 180 }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove this member?"
        confirmLabel="Yes, remove"
        loading={removing}
        onConfirm={handleRemoveMember}
        onClose={() => {
          if (!removing) {
            setRemoveTarget(null);
          }
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={`Are you sure you want to delete “${org.name}”?`}
        description="This organization will be archived and can be restored later by an administrator."
        confirmLabel="Yes, delete"
        onConfirm={handleDelete}
        onClose={() => setConfirmOpen(false)}
      />
      <SnackbarFeedback
        open={snackbarOpen}
        severity={snackbarSeverity}
        message={snackbarMessage}
        onClose={() => {
          setSnackbarOpen(false);
          setErrors((prev) => ({ ...prev, form: '' }));
        }}
      />
      <InvitationHistoryDialog
        open={historyOpen}
        invites={historyInvites}
        loading={historyLoading}
        closeAction={handleCloseHistory}
        retryAction={fetchInvitationHistory}
      />
    </Box>
  );
}
