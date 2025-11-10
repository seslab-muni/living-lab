'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import OrganizationCard from './components/OrganizationCard';
import OrganizationsFilter from './components/OrganizationFilter';
import CreateOrganizationButton from './components/CreateOrganizationButton';
import { authFetch } from '../../lib/auth';
import { BACKEND_URL } from '../../lib/constants';
import type { OrganizationDto } from './types';

export default function OrganizationsPage() {
    const [orgs, setOrgs] = useState<OrganizationDto[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showMine, setShowMine] = useState(false);

    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<'newest' | 'asc' | 'desc'>('newest');
    const [loading, setLoading] = useState(false);
    const [debouncedSearch] = useDebounce(search, 400);

    const displayOrgs = orgs?.filter(o => !showMine || o.isMember) ?? null;

  const fetchOrganizations = useCallback(
    async (searchTerm: string, sortOrder: 'newest' | 'asc' | 'desc') => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (searchTerm) params.set('q', searchTerm);
        params.set('sort', sortOrder);

        const endpoint = `${BACKEND_URL}/organizations/search?${params.toString()}`;
        const res = await authFetch(endpoint);

        if (!res.ok) {
          throw new Error(`Failed to fetch organizations (HTTP ${res.status})`);
        }

        const data: OrganizationDto[] = await res.json();
        setOrgs(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      void fetchOrganizations(debouncedSearch, sort);
    }, [debouncedSearch, sort, fetchOrganizations]);

    const handleSearchSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await fetchOrganizations(search, sort);
    };

    return (
        <Box p={{ xs: 4, md: 6 }}>
            <Typography variant="h4" gutterBottom sx={{textAlign: 'center'}}>
                Organizations
            </Typography>
            <Box sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: '1fr',
              mx: { xs: 0, md: '25%' },
              pb: 4,
              pt: 2,
              width: { xs: '100%', md: '50%'},
            }}>
              <CreateOrganizationButton />
              <OrganizationsFilter showMine={showMine} onToggle={() => setShowMine(s => !s)} />
            </Box>
            <Box
              component="form"
              onSubmit={handleSearchSubmit}
              sx={{
                display: 'grid',
                gap: 2,
                alignItems: 'center',
                gridTemplateColumns: { xs: '1fr', md: '2fr 1fr auto' },
                mx: { xs: 0, md: '25%' },
                pb: 4,
                pt: 2,
                width: { xs: '100%', md: '50%' },
              }}
            >
              <TextField
                label="Search organizations"
                variant="outlined"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                sx={{
                  flexGrow: 1,
                  ml: -0.1,
                }}
              />

              <FormControl size="small">
                <InputLabel id="sort-label">Sort</InputLabel>
                <Select
                  labelId="sort-label"
                  value={sort}
                  label="Sort"
                  onChange={(e) => setSort(e.target.value as 'newest' | 'asc' | 'desc')}
                >
                  <MenuItem value="newest">Newest</MenuItem>
                  <MenuItem value="asc">A–Z</MenuItem>
                  <MenuItem value="desc">Z–A</MenuItem>
                </Select>
              </FormControl>

              <Button type="submit" variant="contained">
                Search
              </Button>
            </Box>
            {error ? (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="error" gutterBottom>
                  Failed to load organizations
                </Typography>
                <Typography variant="body1">{error}</Typography>
              </Box>
            ) : loading || displayOrgs === null ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : displayOrgs.length === 0 ? (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body1">No organizations found.</Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: '1fr',
                  mx: { xs: 0, md: '25%' },
                  width: { xs: '100%', md: '50%' },
                }}
              >
                {displayOrgs.map((org) => (
                  <OrganizationCard
                    key={org.id}
                    org={org}
                    onMembershipChange={(id, isMember, memberCount) => {
                      setOrgs((current) =>
                        current
                          ? current.map((o) =>
                            o.id === id ? { ...o, isMember, memberCount } : o
                          )
                          : null
                      );
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
      );
}