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
    const [companyName, setCompanyName] = useState('');
    const [errors, setErrors] = useState<{[k:string]:string}>({});
    const [submitting, setSubmitting] = useState(false);
    const [suggestions, setSuggestions] = useState<OrganizationDto[]>([]);
    const [loadingDupes, setLoadingDupes] = useState(false);

    useEffect(() => {
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
    }, [name, companyId, companyName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const fieldErrors: {[k:string]:string} = {};
        if (!name) fieldErrors.name = 'Required';
        if (!companyId) {
          fieldErrors.companyId = 'Required';
        } else if (!/^\d{8}$/.test(companyId)) {
          fieldErrors.companyId = 'IČO must be exactly 8 digits';
        }
        if (!companyName) fieldErrors.companyName = 'Required';
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
                    companyId: parseInt(companyId, 10),
                    companyName,
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
                            onChange={e => setName(e.target.value)}
                            error={!!errors.name}
                            helperText={errors.name}
                            required
                        />
                        <TextField
                            label="IČO"
                            placeholder="123456"
                            value={companyId}
                            onChange={e => setCompanyId(e.target.value)}
                            type="text"
                            inputProps={{ inputMode: 'numeric' }}
                            error={!!errors.companyId}
                            helperText={errors.companyId}
                            required
                        />
                        <TextField
                            label="Abbreviated Company Name"
                            placeholder="ABC Inc."
                            value={companyName}
                            onChange={e => setCompanyName(e.target.value)}
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