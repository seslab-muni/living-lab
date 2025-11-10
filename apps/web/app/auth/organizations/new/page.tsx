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
  Divider,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { authFetch } from '../../../lib/auth';
import { BACKEND_URL, FRONTEND_URL } from '../../../lib/constants';
import type { OrganizationDto } from '../types';

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [organizationAlias, setOrganizationAlias] = useState('');
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<OrganizationDto[]>([]);
  const [loadingDupes, setLoadingDupes] = useState(false);
  const [aliasManuallyEdited, setAliasManuallyEdited] = useState(false);
  const [slugPreview, setSlugPreview] = useState('');
  const [slugLoading, setSlugLoading] = useState(false);

  const validateOrgName = (v: string) => {
    const s = v.trim();
    if (!s) return 'Required';
    if (!/^[A-Za-z]/.test(s)) return 'Must start with a letter (A–Z)';
    if (s.length < 2) return 'Must be at least 2 characters';
    if (s.length > 100) return 'Must be at most 100 characters';
    if (!/^[A-Za-z0-9\s-]+$/.test(s))
      return 'Only letters, numbers, spaces, and "-" are allowed';
    return '';
  };

  const validateOrgAlias = (v: string) => {
    const s = v.trim();
    if (!s) return 'Required';
    if (!/^[A-Za-z]/.test(s)) return 'Must start with a letter (A–Z)';
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

  /**
   * Generates an uppercase abbreviation alias from the organization name.
   * Example: "Faculty of Informatics" -> "FI", "Masaryk" -> "MK".
   */
  function generateAliasFromName(name: string): string {
    if (!name) return '';

    const s = name.trim();

    if (/^\d/.test(s)) return '';
    if (!/^[A-Za-z0-9\s-]+$/.test(s)) return '';
    if (s.length < 2) return '';

    const words = s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);

    const skip = [
      'of',
      'for',
      'the',
      'and',
      'at',
      'by',
      'in',
      'on',
      'to',
      'a',
      'v',
      'na',
      'pro',
      'do',
    ];
    const significant = words.filter((w) => !skip.includes(w.toLowerCase()));

    const getAbbrevForSingleWord = (word?: string): string => {
      if (!word) return '';
      if (word.length >= 2)
        return (word.charAt(0) + word.charAt(word.length - 1)).toUpperCase();
      return (word.charAt(0) + word.charAt(0)).toUpperCase(); // pad if 1 char
    };

    let alias = '';

    if (significant.length >= 2) {
      alias = significant.map((w) => w.charAt(0).toUpperCase()).join('');
    } else if (significant.length === 1) {
      alias = getAbbrevForSingleWord(significant[0]);
    } else if (words.length === 1) {
      alias = getAbbrevForSingleWord(words[0]);
    }

    alias = alias.replace(/[^A-Z0-9-]/g, '');

    if (alias.length < 2) alias = alias.padEnd(2, alias.charAt(0) || 'A');
    if (alias.length > 50) alias = alias.slice(0, 50);

    return alias;
  }

  useEffect(() => {
    if (!name && !companyId && !organizationAlias) {
      setSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      setLoadingDupes(true);
      try {
        const params = new URLSearchParams();
        if (name) params.set('name', name);
        if (companyId) params.set('companyId', companyId);
        if (organizationAlias)
          params.set('organizationAlias', organizationAlias);

        const res = await authFetch(
          `${BACKEND_URL}/organizations/duplicates?${params.toString()}`,
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

  useEffect(() => {
    if (!aliasManuallyEdited) {
      const autoAlias = generateAliasFromName(name);
      setOrganizationAlias(autoAlias);
    }

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
          `${BACKEND_URL}/organizations/slug-preview?alias=${encodeURIComponent(alias)}`,
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
  }, [name, organizationAlias, aliasManuallyEdited]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors: { [k: string]: string } = {};

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
          organizationAlias: organizationAlias.trim(),
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
              placeholder="Auto-generated (you can edit)"
              helperText={
                errors.organizationAlias ||
                'Used as part of the organization URL (must be between 2–50 characters).'
              }
              value={organizationAlias}
              onChange={(e) => {
                const v = e.target.value;
                setOrganizationAlias(v);
                setAliasManuallyEdited(true);
                const err = validateOrgAlias(v);
                setErrors((prev) => ({ ...prev, organizationAlias: err }));
              }}
              error={!!errors.organizationAlias}
              required
              inputProps={{ maxLength: 50 }}
              fullWidth
            />
            {aliasManuallyEdited && (
              <Box mt={1}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const newAlias = generateAliasFromName(name);
                    setOrganizationAlias(newAlias);
                    setAliasManuallyEdited(false);
                  }}
                >
                  Regenerate from name
                </Button>
              </Box>
            )}
            {errors.form && (
              <Typography color="error">{errors.form}</Typography>
            )}
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
                  Enter correct organization name or alias to see final URL
                </Typography>
              )}
            </Box>
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
                  {suggestions.map((s) => (
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

            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Organization'}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
