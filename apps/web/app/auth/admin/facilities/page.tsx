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
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NextLink from 'next/link';

type Facility = {
  id: number;
  name: string;
};

export default function AdminFacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState({ filter: '' });

  useEffect(() => {
    authFetch(`${BACKEND_URL}/facilities`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Facility[]) => {
        setFacilities(data);
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch({ filter: e.target.value });
  };

  const isFiltered = (facility: Facility) => {
    return search.filter
      ? !facility.name.toLowerCase().includes(search.filter.toLowerCase())
      : false;
  };

  return (
    <Box display="flex" flexDirection="column">
      <Typography variant="h2">Facilities</Typography>
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
          label="Search"
          placeholder="FI"
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
          href="/auth/admin/facilities/create"
          variant="contained"
          color="primary"
        >
          Create Facility
        </Button>
      </Box>

      <Divider />

      {!facilities ? (
        <Typography>Loading facilities&hellip;</Typography>
      ) : (
        facilities
          .filter((f) => !isFiltered(f))
          .map((facility) => (
            <Accordion key={facility.id}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`panel-${facility.id}-content`}
                id={`panel-${facility.id}-header`}
              >
                <Typography>{facility.name}</Typography>
              </AccordionSummary>

              <AccordionDetails>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="flex-start"
                  sx={{ mb: 1 }}
                >
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    sx={{ mr: 2 }}
                    onClick={() => {
                      setFacilities(
                        facilities.filter(({ id }) => id !== facility.id),
                      );
                      authFetch(
                        `${BACKEND_URL}/facilities/${facility.id}/delete`,
                        {
                          method: 'PUT',
                        },
                      );
                    }}
                  >
                    Delete facility
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    component={NextLink}
                    href={`/auth/admin/facilities/${facility.id}`}
                  >
                    Manage members
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))
      )}
    </Box>
  );
}
