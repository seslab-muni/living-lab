'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { authFetch } from '../../../../lib/auth';
import { BACKEND_URL } from '../../../../lib/constants';
import type { OrganizationDto } from '../../types';

export default function EditOrganizationPage() {
    const { slug } = useParams();
    const router = useRouter();

    const [org, setOrg] = useState<OrganizationDto | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [errors, setErrors] = useState<{[k:string]:string}>({});
    const [fatalError, setFatalError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<OrganizationDto[]>([]);
    const [loadingDupes, setLoadingDupes] = useState(false);
    const [hasFocused, setHasFocused] = useState(false);
    const [members, setMembers] = useState(org?.members ?? []);
    const [removeTarget, setRemoveTarget] = useState<string | null>(null);
    const [inviteEmails, setInviteEmails] = useState('');
    const [inviteError, setInviteError] = useState('');
    const [sendingInvites, setSendingInvites] = useState(false);
    const [pendingInvites, setPendingInvites] = useState<{ id: number; email: string; createdAt: string }[]>([]);
    const [isPrivate, setIsPrivate] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] =
      useState<'success' | 'warning' | 'error'>('success');
    const [editedRoles, setEditedRoles] = useState<Record<string, 'Owner'|'Manager'|'Viewer'>>({});
    const [userRole, setUserRole] = useState<'Owner' | 'Manager' | 'Viewer' | 'Admin' | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const canEditInfo = userRole === 'Owner' || userRole === 'Admin';
    const canManageRoles = userRole === 'Owner' || userRole === 'Manager' || userRole === 'Admin';
    const canInviteMembers = canManageRoles;
    const canDeleteOrganization = userRole === 'Owner' || userRole === 'Admin';

    useEffect(() => {
      const loadOrganization = async () => {
        setFatalError(null)
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
          setCompanyName(data.companyName);
          setIsPrivate(data.isPrivate);

          const role: 'Owner' | 'Manager' | 'Viewer' | 'Admin' | null =
            (data.currentUserRole as never) ?? (data.isAdmin ? 'Admin' : null);
          setUserRole(role);

          if (role !== 'Owner' && role !== 'Manager' && role !== 'Admin') {
            setFatalError('You do not have permission to edit this organization.');
            setLoading(false);
            setAuthChecked(true);
            return;
          }

          try {
            const rolesRes = await authFetch(`${BACKEND_URL}/domain/${data.id}/users`);
            if (rolesRes.ok) {
              const withRoles = await rolesRes.json();
              const merged = data.members.map((m) => {
                const found = withRoles.find((u: any) => u.id === m.id);
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
          setFatalError('Unable to connect to server.');
        } finally {
          setLoading(false);
          setAuthChecked(true);
        }
      };

      loadOrganization();
    }, [slug]);

    useEffect(() => {
        if (!hasFocused) {
            setSuggestions([]);
            return;
        }
        if (!name && !companyId && !companyName) {
            setSuggestions([]);
            return;
        }

        const t = setTimeout(async () => {
          setLoadingDupes(true);
          try {
            const params = new URLSearchParams();
            if (name)        params.set('name', name);
            if (companyId)   params.set('companyId', companyId);
            if (companyName) params.set('companyName', companyName);
            if (org?.id)     params.set('excludeId', String(org.id));

            const res = await authFetch(
              `${BACKEND_URL}/organizations/duplicates?${params.toString()}`
            );
            const data: OrganizationDto[] = await res.json();
            setSuggestions(data);
          } catch {
            setSuggestions([]);
          } finally {
            setLoadingDupes(false);
          }
        }, 300);

        return () => clearTimeout(t);
    }, [name, companyId, companyName, hasFocused, org?.id]);

    useEffect(() => {
      if (!org) return;
      authFetch(`${BACKEND_URL}/organizations/${slug}/invitations`)
        .then(r => r.ok ? r.json() : [])
        .then(setPendingInvites)
        .catch(() => setPendingInvites([]));
    }, [org, slug]);

    useEffect(() => {
      if (errors.form) {
        setSnackbarMessage(errors.form);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    }, [errors.form]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const f: { [k: string]: string } = {};
    if (!name.trim()) f.name = 'Required';
    if (!companyId) {
      f.companyId = 'Required';
    } else if (!/^\d{8}$/.test(companyId)) {
      f.companyId = 'IČO must be exactly 8 digits';
    }
    if (!companyName.trim()) f.companyName = 'Required';
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
            companyName: companyName.trim(),
          isPrivate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');

      if (org?.id && Object.keys(editedRoles).length > 0) {
        await Promise.all(
          Object.entries(editedRoles).map(([userId, role]) =>
            authFetch(`${BACKEND_URL}/domain/${org.id}/users/${userId}/role`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role }),
            })
          )
        );
        setEditedRoles({});
      }
      const targetSlug = data.newSlug && data.newSlug !== slug ? data.newSlug : slug;
      router.push(`/auth/organizations/${targetSlug}?saved=true`);
    } catch (err: unknown) {
        let msg = 'Unexpected error';

        if (err instanceof Error) {
            if (err.message.includes('Managers cannot assign')) {
                msg = 'You cannot assign a higher role than your own.';
            } else if (err.message.includes('At least one Owner must remain')) {
                msg = 'At least one Owner must remain in the organization.';
            } else if (err.message.includes('cannot demote the last remaining Owner')) {
                msg = 'You cannot change the role of the last remaining Owner.';
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

    if (errors.form && (!org || errors.form.includes('not found') || errors.form.includes('authorized'))) {
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
                { method: 'DELETE' }
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
        } catch (err: any) {
            let message = 'Network error while removing member.';

            if (err instanceof Error && err.message) {
                try {
                    const match = err.message.match(/\{.*\}$/);
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
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0);

      const duplicates = emailsArray.filter(
        (email, index) => emailsArray.indexOf(email) !== index
      );

      if (duplicates.length > 0) {
        setInviteError(`Duplicate email(s): ${duplicates.join(', ')}`);
        return;
      }

      const invalidEmails = emailsArray.filter(
        (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      );
      if (invalidEmails.length > 0) {
        setInviteError(`Invalid email(s): ${invalidEmails.join(', ')}`);
        return;
      }

      setSendingInvites(true);
      try {
        const res = await authFetch(`${BACKEND_URL}/organizations/${slug}/invitations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: emailsArray.join(', ') }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'Failed to send invitations.');
        }

        const sentCount = data.sent?.length || 0;
        const skippedCount = data.skipped?.length || 0;
        const skippedSummary =
          data.skipped
            ?.map((s: any) => `${s.email} (${s.reason})`)
            .join(', ') || '';

        if (sentCount > 0 && skippedCount === 0) {
          setSnackbarMessage(`${sentCount} invitation(s) sent successfully.`);
          setSnackbarSeverity('success');
          setSnackbarOpen(true);
        }

        if (sentCount > 0 && skippedCount > 0) {
          setSnackbarMessage(
            `${sentCount} invitation(s) sent. Skipped: ${skippedSummary}`
          );
          setSnackbarSeverity('warning');
          setSnackbarOpen(true);
        }

        if (sentCount === 0 && skippedCount > 0) {
          setSnackbarMessage(
            `No invitations sent. Skipped: ${skippedSummary}`
          );
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }

        if (sentCount === 0 && skippedCount > 0) {
          setInviteError('All provided emails were skipped. No invitations sent.');
          return;
        }

        await authFetch(`${BACKEND_URL}/organizations/${slug}/invitations`)
          .then((r) => (r.ok ? r.json() : []))
          .then(setPendingInvites)
          .catch(() => {});

        setInviteEmails('');
      } catch (err: any) {
        console.error(err);
        setInviteError(err.message || 'Unexpected error.');
      } finally {
        setSendingInvites(false);
      }
    };

    const handleRevokeInvite = async (inviteId: number) => {
      try {
        await authFetch(
          `${BACKEND_URL}/organizations/${slug}/invitations/${inviteId}`,
          { method: 'DELETE' }
        );
        setPendingInvites(invites => invites.filter(i => i.id !== inviteId));
      } catch {
        alert('Failed to revoke invitation.');
      }
    };

    if (loading || !org) {
      return <CircularProgress />;
    }

    return (
        <Box p={{ xs:4, md:6 }} display="flex" justifyContent="center">
            <Box width={{ xs:'100%', md:'50%' }}>
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
                            label="Name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onFocus={() => setHasFocused(true)}
                            error={!!errors.name}
                            helperText={errors.name}
                            required
                            disabled={!canEditInfo}
                        />
                        <TextField
                            label="Description"
                            value={description}
                            placeholder="Add a short description about your organization..."
                            multiline
                            minRows={3}
                            onChange={e => setDescription(e.target.value)}
                            disabled={!canEditInfo}
                        />
                        <TextField
                            label="IČO"
                            value={companyId}
                            inputProps={{ inputMode:'numeric' }}
                            onChange={e => setCompanyId(e.target.value)}
                            onFocus={() => setHasFocused(true)}
                            error={!!errors.companyId}
                            helperText={errors.companyId}
                            required
                            disabled={!canEditInfo}
                        />
                        <TextField
                            label="Company Name"
                            value={companyName}
                            onChange={e => setCompanyName(e.target.value)}
                            onFocus={() => setHasFocused(true)}
                            error={!!errors.companyName}
                            helperText={errors.companyName}
                            required
                            disabled={!canEditInfo}
                        />
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
                        {loadingDupes ? (
                            <Box display="flex" justifyContent="center" py={2}>
                                <CircularProgress size={24} />
                            </Box>
                        ) : suggestions.length > 0 ? (
                            <Box py={2}>
                                <Typography variant="subtitle1" color="error" gutterBottom>
                                    Possible duplicates found:
                                </Typography>
                                <List dense disablePadding>
                                    {suggestions.map(s => (
                                        <ListItem key={s.id} disableGutters>
                                            <ListItemText
                                                primary={s.name}
                                                secondary={`IČO: ${s.companyId} — ${s.companyName}`}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        ) : null}

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
                                    ['Viewer', 'Manager', 'Owner', 'Admin'].indexOf(m.role ?? 'Viewer') >
                                    ['Viewer', 'Manager', 'Owner', 'Admin'].indexOf(userRole ?? 'Viewer');

                            if (isHigherRole && userRole !== 'Admin') {
                                return (
                                    <Typography variant="body2" sx={{ width: 120, mr: 1, textAlign: 'center' }}>
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
                                            const val = e.target.value as 'Owner' | 'Manager' | 'Viewer';
                                            setEditedRoles((prev) => ({ ...prev, [m.id]: val }));
                                        }}
                                        disabled={!canManageRoles}
                                    >
                                        {['Owner', 'Manager', 'Viewer']
                                            .filter((role) => {
                                                if (userRole === 'Admin') return true;
                                                if (userRole === 'Owner') return true;
                                                if (userRole === 'Manager') return role !== 'Owner';
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
                                {canManageRoles && org.currentUserId && (() => {
                                  const hierarchy = ['Viewer', 'Manager', 'Owner', 'Admin'];
                                  const roleRank = (r: string | null | undefined) =>
                                    hierarchy.indexOf(r ?? 'Viewer');

                                  const currentRank = roleRank(userRole);
                                  const memberRank = roleRank(m.role);


                                  const isSelf = m.id === org.currentUserId;
                                  const canDeleteThisMember =
                                    !isSelf && currentRank >= memberRank;

                                  return canDeleteThisMember ? (
                                    <IconButton size="small" onClick={() => setRemoveTarget(m.id)}>
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
                          <Typography variant="h6">Pending Invitations</Typography>
                          {pendingInvites.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              No pending invitations.
                            </Typography>
                          ) : (
                            <List dense disablePadding>
                              {pendingInvites.map(inv => (
                                <ListItem
                                  key={inv.id}
                                  secondaryAction={
                                    <IconButton edge="end" color="error" onClick={() => handleRevokeInvite(inv.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  }
                                >
                                  <ListItemText
                                    primary={inv.email}
                                    secondary={`Sent on ${new Date(inv.createdAt).toLocaleDateString()}`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          )}
                        </Box>

                        {canInviteMembers && (
                        <Box my={4}>
                          <Typography variant="h6" gutterBottom>
                            Invite New Members
                          </Typography>

                          <Box sx={{ mt: 1, pl: 0 }}>
                            <TextField
                              label="Email addresses"
                              placeholder="example1@email.com, example2@email.com"
                              fullWidth
                              multiline
                              minRows={2}
                              value={inviteEmails}
                              onChange={(e) => setInviteEmails(e.target.value)}
                              helperText='Separate emails by ", " (comma and space).'
                              error={!!inviteError}
                              sx={{
                                mt: 1,
                                ml: 0,
                                '& .MuiFormHelperText-root': {
                                  pl: 0,
                                  ml: 0,
                                  textAlign: 'left',
                                },
                              }}
                            />
                          </Box>
                          {inviteError && (
                            <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                              {inviteError}
                            </Typography>
                          )}

                          <Box display="flex" justifyContent="flex-end" mt={1}>
                            <Button
                              variant="contained"
                              disabled={sendingInvites}
                              onClick={handleSendInvites}
                              sx={{ minWidth: 180 }}
                            >
                              {sendingInvites ? 'Sending…' : 'Send Invitations'}
                            </Button>
                          </Box>
                        </Box>
                        )}
                        <Box
                            display="flex"
                            justifyContent="space-between"
                            mt={2}
                        >
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

            <Dialog
                open={Boolean(removeTarget)}
                onClose={() => !removing && setRemoveTarget(null)}
            >
                <DialogTitle>
                    Remove this member?
                </DialogTitle>
                <DialogActions>
                    <Button onClick={() => setRemoveTarget(null)} disabled={removing}>
                        Cancel
                    </Button>
                    <Button
                        color="error"
                        onClick={handleRemoveMember}
                        disabled={removing}
                    >
                        {removing ? 'Removing…' : 'Yes, remove'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
            >
                <DialogTitle>
                    Are you sure you want to delete “{org.name}”?
                </DialogTitle>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>
                        Cancel
                    </Button>
                    <Button color="error" onClick={handleDelete}>
                        Yes, delete
                    </Button>
                </DialogActions>
            </Dialog>
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={4000}
            onClose={() => {
              setSnackbarOpen(false);
              setErrors((prev) => ({ ...prev, form: '' }));
            }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              onClose={() => {
                setSnackbarOpen(false);
                setErrors((prev) => ({ ...prev, form: '' }));
              }}
              severity={snackbarSeverity}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </Box>
    );
}
