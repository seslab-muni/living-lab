'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { authFetch } from '../../../lib/auth';
import { BACKEND_URL } from '../../../lib/constants';
import type { OrganizationDto } from '../types';

export default function CreateOrganizationPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [organizationAlias, setOrganizationAlias] = useState('');
    const [errors, setErrors] = useState<{[k:string]:string}>({});
    const [submitting, setSubmitting] = useState(false);
    const [suggestions, setSuggestions] = useState<OrganizationDto[]>([]);
    const [loadingDupes, setLoadingDupes] = useState(false);

    const validateOrgName = (v: string) => {
      const s = v.trim();
      if (!s) return 'Required';
      if (/^\d/.test(s)) return 'Cannot start with a number';
      if (s.length < 2) return 'Must be at least 2 characters';
      if (s.length > 100) return 'Must be at most 100 characters';
      if (!/^[A-Za-z0-9\s-]+$/.test(s))
        return 'Only letters, numbers, spaces, and "-" are allowed';
      return '';
    };

    const validateOrgAlias = (v: string) => {
      const s = v.trim();
      if (!s) return 'Required';
      if (/^\d/.test(s)) return 'Cannot start with a number';
      if (s.length < 2) return 'Must be at least 2 characters';
      if (s.length > 50) return 'Must be at most 50 characters';
      if (!/^[A-Za-z0-9\s-]+$/.test(s))
        return 'Only letters, numbers, spaces, and "-" are allowed';
      return '';
    };

    const validateICO = (v: string) => {
      const s = v.trim();
      if (!s) return 'Required';
      if (!/^\d{8}$/.test(s)) return 'Must be exactly 8 digits';
      return '';
    };

    useEffect(() => {
      if (!name && !companyId && !organizationAlias) {
        setSuggestions([]);
        return;
      }

      const t = setTimeout(async () => {
        setLoadingDupes(true);
        try {
          const params = new URLSearchParams();
          if (name)        params.set('name', name);
          if (companyId)   params.set('companyId', companyId);
          if (organizationAlias) params.set('organizationAlias', organizationAlias);

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
    }, [name, companyId, organizationAlias]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const fieldErrors: {[k:string]:string} = {};

        const nameErr = validateOrgName(name);
        if (nameErr) fieldErrors.name = nameErr;

        const aliasErr = validateOrgAlias(organizationAlias);
        if (aliasErr) fieldErrors.organizationAlias = aliasErr;
        const icoErr = validateICO(companyId);
        if (icoErr) fieldErrors.companyId = icoErr;
        setErrors(fieldErrors);
        if (Object.keys(fieldErrors).length) return;

        setSubmitting(true);
        try {
            const res = await authFetch(`${BACKEND_URL}/organizations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name,
                    companyId: companyId.trim(),
                    organizationAlias,
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const created: OrganizationDto = await res.json();
            await router.push(`/auth/organizations/${created.slug}`);
        } catch (err: any) {
            setErrors({ form: err.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box p={{ xs: 4, md: 6 }} display="flex" justifyContent="center">
            <Box width={{ xs: '100%', md: '50%' }}>
                <Typography variant="h4" textAlign="center" gutterBottom>
                    Create Organization
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Stack spacing={3}>
                        <TextField
                            label="Organization Name"
                            placeholder="My Organization"
                            value={name}
                            onChange={(e) => {
                              const v = e.target.value;
                              setName(v);
                              setErrors((prev) => ({ ...prev, name: validateOrgName(v) }));
                            }}
                            error={!!errors.name}
                            helperText={errors.name}
                            required
                            inputProps={{ maxLength: 100 }}
                        />
                        <TextField
                          label="IČO"
                          placeholder="12345678"
                          value={companyId}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCompanyId(v);
                            setErrors((prev) => ({ ...prev, companyId: validateICO(v) }));
                          }}
                          inputProps={{ inputMode: 'numeric', maxLength: 8 }}
                          error={!!errors.companyId}
                          helperText={errors.companyId}
                          required
                        />
                        <TextField
                          label="Organization Alias"
                          placeholder="e.g. SmartLab, BVV, BLL"
                          helperText={errors.organizationAlias || 'Used as part of the organization URL.'}
                          value={organizationAlias}
                          onChange={(e) => {
                            const v = e.target.value;
                            setOrganizationAlias(v);
                            setErrors((prev) => ({ ...prev, organizationAlias: validateOrgAlias(v) }));
                          }}
                          error={!!errors.organizationAlias}
                          required
                          inputProps={{ maxLength: 50 }}
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
                                    secondary={`IČO: ${s.companyId} — ${s.organizationAlias}`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        ) : null}

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={submitting}
                        >
                            {submitting ? 'Creating…' : 'Create Organization'}
                        </Button>
                    </Stack>
                </Box>
            </Box>
        </Box>
    );
}