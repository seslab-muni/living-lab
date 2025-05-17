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

    useEffect(() => {
        authFetch(`${BACKEND_URL}/organizations/${slug}`)
            .then(r => r.json())
            .then((data: OrganizationDto) => {
                setOrg(data);
                setMembers(data.members);
                setName(data.name);
                setDescription(data.description ?? '');
                setCompanyId(String(data.companyId));
                setCompanyName(data.companyName);
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
    }, [name, companyId, companyName, hasFocused]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const f: {[k:string]:string} = {};
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
            await authFetch(`${BACKEND_URL}/organizations/${slug}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim(),
                    companyId: parseInt(companyId, 10),
                    companyName: companyName.trim(),
                }),
            });
            router.push(`/auth/organizations/${slug}`);
        } catch (err: any) {
            setErrors({ form: err.message });
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
                          <Box component="ul" sx={{ m:0, p:0, pl:2, listStyle:'disc' }}>
                            {members.map((m) => (
                              <Box
                                key={m.id}
                                component="li"
                                sx={{ display:'flex', alignItems:'center', mb:0.5 }}
                              >
                                <Typography variant="body2" sx={{ flexGrow:1, m:0 }}>
                                  {m.firstName} {m.lastName}
                                </Typography>
                                {m.id !== org.ownerId && (
                                  <IconButton
                                    size="small"
                                    onClick={() => setRemoveTarget(m.id)}
                                  >
                                    <DeleteIcon fontSize="small" color="error" />
                                  </IconButton>
                                )}
                              </Box>
                            ))}
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
        </Box>
    );
}
