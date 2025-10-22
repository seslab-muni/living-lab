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
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] =
      useState<'success' | 'warning' | 'error'>('success');
    const [editedRoles, setEditedRoles] = useState<Record<string, 'Owner'|'Manager'|'Viewer'>>({});

    useEffect(() => {
      authFetch(`${BACKEND_URL}/organizations/${slug}`)
        .then((r) => r.json())
        .then(async (data: OrganizationDto) => {
          setOrg(data);
          setName(data.name);
          setDescription(data.description ?? '');
          setCompanyId(String(data.companyId));
          setCompanyName(data.companyName);
          setIsPrivate(data.isPrivate);
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
        })
        .catch(() => router.push('/auth/organizations'))
        .finally(() => setLoading(false));
    }, [router, slug]);

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
          companyId: parseInt(companyId, 10),
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
    } catch (err: any) {
      console.error(err);
      setErrors({ form: err.message || 'Unexpected error' });
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

    if (loading || !org) {
        return (
            <Box display="flex" justifyContent="center" p={6}>
                <CircularProgress />
            </Box>
        );
    }

    const handleRemoveMember = async () => {
      if (!removeTarget) return;
      await authFetch(
        `${BACKEND_URL}/organizations/${slug}/members/${removeTarget}`,
        { method: 'DELETE' }
      );
      setMembers(ms => ms.filter(m => m.id !== removeTarget));
      setRemoveTarget(null);
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
                        />
                        <TextField
                            label="Description"
                            value={description}
                            multiline
                            minRows={3}
                            onChange={e => setDescription(e.target.value)}
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
                        />
                        <TextField
                            label="Company Name"
                            value={companyName}
                            onChange={e => setCompanyName(e.target.value)}
                            onFocus={() => setHasFocused(true)}
                            error={!!errors.companyName}
                            helperText={errors.companyName}
                            required
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={isPrivate}
                              onChange={(e) => setIsPrivate(e.target.checked)}
                              color="primary"
                            />
                          }
                          label={
                            isPrivate
                              ? 'Private organization (joining disabled)'
                              : 'Public organization (anyone can request to join)'
                          }
                        />
                        {errors.form && (
                            <Typography color="error">{errors.form}</Typography>
                        )}
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
                                >
                                  {['Owner', 'Manager', 'Viewer'].map((role) => (
                                    <MenuItem key={role} value={role}>
                                      {role}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>

                              <Box sx={{ width: 36, textAlign: 'center' }}>
                                {m.id !== org.creatorId && (
                                  <IconButton size="small" onClick={() => setRemoveTarget(m.id)}>
                                    <DeleteIcon fontSize="small" color="error" />
                                  </IconButton>
                                )}
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

                        <Box
                            display="flex"
                            justifyContent="space-between"
                            mt={2}
                        >
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => setConfirmOpen(true)}
                                disabled={saving}
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
              onClose={() => setRemoveTarget(null)}
            >
              <DialogTitle>
                Remove this member?
              </DialogTitle>
              <DialogActions>
                <Button onClick={() => setRemoveTarget(null)}>
                  Cancel
                </Button>
                <Button color="error" onClick={handleRemoveMember}>
                  Yes, remove
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
              onClose={() => setSnackbarOpen(false)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Alert
                onClose={() => setSnackbarOpen(false)}
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
