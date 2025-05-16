'use client';
import { useEffect, useState } from 'react';
import { authFetch } from '../../../lib/auth';
import { AVAILABLE_ROLES, BACKEND_URL } from '../../../lib/constants';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NextLink from 'next/link';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';

type Facility = {
  id: number;
  name: string;
};

type UserAssignment = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
};

function FacilityAccordion({ facility }: { facility: Facility }) {
  const [users, setUsers] = useState<UserAssignment[] | null>(null);
  const [notMembers, setNotMembers] = useState<UserAssignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch(`${BACKEND_URL}/domain/${facility.id}/users`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: UserAssignment[]) => setUsers(data))
      .catch((err) => setError(err.message));

    authFetch(`${BACKEND_URL}/domain/${facility.id}/notmembers`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: UserAssignment[]) => setNotMembers(data))
      .catch((err) => setError(err.message));
  }, [facility.id]);

  const handleRoleChange =
    (userId: number) => (event: SelectChangeEvent<string>) => {
      const newRole = event.target.value;
      authFetch(`${BACKEND_URL}/domain/${facility.id}/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setUsers((prev) =>
            prev
              ? prev.map((user) =>
                  user.id === userId ? { ...user, role: newRole } : user,
                )
              : prev,
          );
        })
        .catch((err) => setError(err.message));
    };

  return (
    <Accordion>
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
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => {
              authFetch(`${BACKEND_URL}/facilities/delete/${facility.id}`, {
                method: 'PUT',
              });
              window.location.reload();
            }}
          >
            Delete facility
          </Button>
        </Box>
        <Divider />
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        {!users ? (
          <Typography>Loading users&hellip;</Typography>
        ) : (
          users.map((user) => (
            <Box flexDirection="column" key={user.id} display="flex">
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography>
                  {user.firstName} {user.lastName}
                </Typography>
                <Box display="flex" alignItems="center">
                  <FormControl
                    size="small"
                    sx={{ minWidth: 120, mt: 1, mb: 1 }}
                  >
                    <InputLabel id={`role-label-${user.id}`}>Role</InputLabel>
                    <Select
                      labelId={`role-label-${user.id}`}
                      value={user.role}
                      label="Role"
                      onChange={handleRoleChange(user.id)}
                    >
                      {AVAILABLE_ROLES.map((role) => (
                        <MenuItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <IconButton
                    size="small"
                    onClick={() => {
                      authFetch(
                        `${BACKEND_URL}/domain/${facility.id}/users/${user.id}/delete`,
                        { method: 'PUT' },
                      );
                      window.location.reload();
                    }}
                  >
                    <DeleteRoundedIcon color="error" />
                  </IconButton>
                </Box>
              </Box>
              <Divider />
            </Box>
          ))
        )}
        {!notMembers ? (
          <></>
        ) : (
          notMembers.map((user) => (
            <Box flexDirection="column" key={user.id} display="flex">
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1, mt: 1 }}
              >
                <Typography>
                  {user.firstName} {user.lastName}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    authFetch(
                      `${BACKEND_URL}/domain/${facility.id}/users/${user.id}/role`,
                      {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ role: 'Viewer' }),
                      },
                    );
                    window.location.reload();
                  }}
                >
                  Add member
                </Button>
              </Box>
              <Divider />
            </Box>
          ))
        )}
      </AccordionDetails>
    </Accordion>
  );
}

export default function AdminFacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState({ filter: '' });

  useEffect(() => {
    authFetch(`${BACKEND_URL}/facilities`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Facility[]) => {
        console.log('Fetched facilities:', data);
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
      <Typography variant="h2" sx={{ mb: 2 }}>
        Facilities
      </Typography>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <Divider />

      <Box display="flex" alignItems="center" sx={{ mt: 2, mb: 2 }}>
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
          sx={{ mr: 2 }}
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

      {facilities
        .filter((f) => !isFiltered(f))
        .map((facility) => (
          <FacilityAccordion key={facility.id} facility={facility} />
        ))}
    </Box>
  );
}
