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
import PaginationControl from './components/PaginationControl';

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<OrganizationDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMine, setShowMine] = useState(false);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'asc' | 'desc'>('newest');
  const [loading, setLoading] = useState(false);
  const [debouncedSearch] = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 10;

  const fetchOrganizations = useCallback(
    async (
      searchTerm: string,
      sortOrder: 'newest' | 'asc' | 'desc',
      pageNumber: number,
      filterMine: boolean,
    ) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (searchTerm) params.set('q', searchTerm);
        params.set('sort', sortOrder);
        params.set('page', pageNumber.toString());
        params.set('limit', LIMIT.toString());
        if (filterMine) params.set('filterMine', 'true');

        const endpoint = `${BACKEND_URL}/organizations/search?${params.toString()}`;
        const res = await authFetch(endpoint);

        if (!res.ok) {
          throw new Error(`Failed to fetch organizations (HTTP ${res.status})`);
        }

        const json = await res.json();
        if (Array.isArray(json)) {
          setOrgs(json);
          setTotalPages(1);
        } else {
          setOrgs(json.data);
          setTotalPages(json.meta.totalPages);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const prevFilters = React.useRef({
    search: debouncedSearch,
    sort,
    showMine,
  });

  useEffect(() => {
    const filtersChanged =
      debouncedSearch !== prevFilters.current.search ||
      sort !== prevFilters.current.sort ||
      showMine !== prevFilters.current.showMine;

    if (filtersChanged) {
      prevFilters.current = {
        search: debouncedSearch,
        sort,
        showMine,
      };
      setPage(1);
      if (page !== 1) {
        return;
      }
    }

    void fetchOrganizations(debouncedSearch, sort, page, showMine);
  }, [debouncedSearch, sort, page, showMine, fetchOrganizations]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    await fetchOrganizations(search, sort, 1, showMine);
  };

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number,
  ) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      ) : loading || orgs === null ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : !orgs || orgs.length === 0 ? (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body1">No organizations found.</Typography>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: '1fr',
              mx: { xs: 0, md: '25%' },
              width: { xs: '100%', md: '50%' },
            }}
          >
            {orgs.map((org) => (
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
          <PaginationControl
            count={totalPages}
            page={page}
            onChange={handlePageChange}
          />
        </>
      )}
    </Box>
  );
}
