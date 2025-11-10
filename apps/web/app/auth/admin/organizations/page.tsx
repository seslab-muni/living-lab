'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '../../../lib/auth';
import { BACKEND_URL } from '../../../lib/constants';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  InputAdornment,
  TextField,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NextLink from 'next/link';

type Organization = {
  id: number;
  name: string;
  slug: string;
  creatorName: string;
  createdAt: string;
  isActive: boolean;
};

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState({ filter: '' });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadOrganizations = () => {
    authFetch(`${BACKEND_URL}/organizations?includeInactive=true`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Organization[]) => setOrganizations(data))
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch({ filter: e.target.value });
  };

  const filteredOrgs = organizations
    ? organizations.filter((org) =>
      org.name.toLowerCase().includes(search.filter.toLowerCase()),
    )
    : [];

  const handleArchiveOrRestore = async (org: Organization) => {
    try {
      let res;
      if (org.isActive) {
        res = await authFetch(`${BACKEND_URL}/organizations/${org.id}`, {
          method: 'DELETE',
        });
      } else {
        res = await authFetch(`${BACKEND_URL}/organizations/${org.id}/restore`, {
          method: 'PATCH',
        });
      }

      if (!res.ok) {
          setSnackbar({
              open: true,
              message: `Failed to ${org.isActive ? 'archive' : 'restore'} organization (HTTP ${res.status}).`,
              severity: 'error',
          });
          return;
      }

      setSnackbar({
        open: true,
        message: org.isActive
          ? `Organization "${org.name}" archived successfully.`
          : `Organization "${org.name}" restored successfully.`,
        severity: 'success',
      });

      loadOrganizations();
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: `Failed to ${org.isActive ? 'archive' : 'restore'} organization.`,
        severity: 'error',
      });
    }
  };

  return (
    <Box display="flex" flexDirection="column">
      <Typography variant="h2">Organizations</Typography>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <Divider />

      <Box display="flex" alignItems="center">
        <TextField
          name="filter"
          value={search.filter}
          onChange={handleSearch}
          label="Search organization"
          placeholder="Search by name..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mr: 2, my: 2 }}
        />
        <Button
          component={NextLink}
          href="/auth/organizations/new"
          variant="contained"
          color="primary"
        >
          Create Organization
        </Button>
      </Box>

      <Divider />

      {!organizations ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : filteredOrgs.length === 0 ? (
        <Typography sx={{ mt: 2 }}>No organizations found.</Typography>
      ) : (
        filteredOrgs.map((org) => (
          <Accordion key={org.id}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`panel-${org.id}-content`}
              id={`panel-${org.id}-header`}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <Typography
                  sx={{
                    color: org.isActive ? 'inherit' : 'text.secondary',
                    fontWeight: 500,
                  }}
                >
                  {org.name}
                </Typography>

                {!org.isActive && (
                  <Chip
                    label="Archived"
                    size="small"
                    color="default"
                    sx={{
                      backgroundColor: '#e0e0e0',
                      color: 'text.secondary',
                      height: 22,
                    }}
                  />
                )}
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <Box
                display="flex"
                flexDirection="column"
                gap={1}
                alignItems="flex-start"
              >
                <Typography variant="body2" color="text.secondary">
                  Creator: {org.creatorName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Created: {new Date(org.createdAt).toLocaleDateString()}
                </Typography>

                <Box display="flex" alignItems="center" gap={2} mt={1}>
                  <Button
                    variant="outlined"
                    color={org.isActive ? 'error' : 'success'}
                    size="small"
                    onClick={() => handleArchiveOrRestore(org)}
                  >
                    {org.isActive ? 'Archive' : 'Restore'}
                  </Button>

                  {org.isActive && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      component={NextLink}
                      href={`/auth/organizations/${org.slug}`}
                    >
                      View Details
                    </Button>
                  )}
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
