'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { Box, CircularProgress, Typography } from '@mui/material';
import OrganizationCard from './components/OrganizationCard';
import CreateOrganizationButton from './components/CreateOrganizationButton';
import { authFetch } from '../../lib/auth';
import { BACKEND_URL } from '../../lib/constants';
import type { OrganizationDto } from './types';
import OrganizationFiltersPanel from './components/OrganizationFiltersPanel';

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<OrganizationDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMine, setShowMine] = useState(false);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'asc' | 'desc'>('newest');
  const [loading, setLoading] = useState(false);
  const [debouncedSearch] = useDebounce(search, 400);

  const displayOrgs = orgs?.filter((o) => !showMine || o.isMember) ?? null;

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
    },
    [],
  );

  useEffect(() => {
    void fetchOrganizations(debouncedSearch, sort);
  }, [debouncedSearch, sort, fetchOrganizations]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchOrganizations(search, sort);
  };

  return (
    <Box p={{ xs: 4, md: 6 }}>
      <Typography variant="h4" gutterBottom sx={{ textAlign: 'center' }}>
        Organizations
      </Typography>
      <Box
        sx={{
          mx: { xs: 0, md: '25%' },
          pb: 2,
          pt: 2,
          width: { xs: '100%', md: '50%' },
        }}
      >
        <CreateOrganizationButton />
      </Box>
      <Box
        sx={{
          mx: { xs: 0, md: '25%' },
          pb: 4,
          pt: 2,
          width: { xs: '100%', md: '50%' },
        }}
      >
        <OrganizationFiltersPanel
          search={search}
          sort={sort}
          showMine={showMine}
          onSearchChange={setSearch}
          onSortChange={(value) => setSort(value)}
          onToggleMine={() => setShowMine((s) => !s)}
          onSubmit={handleSearchSubmit}
        />
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
                        o.id === id ? { ...o, isMember, memberCount } : o,
                      )
                    : null,
                );
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
