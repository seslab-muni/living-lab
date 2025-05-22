'use client';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { authFetch } from '../../lib/auth';
import { useEffect, useState } from 'react';
import { BACKEND_URL } from '../../lib/constants';
import FeedbackMessage from '../../components/FeedbackMessage';

type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState({
    filter: '',
    isAdmin: false,
  });

  useEffect(() => {
    authFetch(BACKEND_URL + '/users')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json: User[]) => {
        setUsers(json);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSearch((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  function onToggleAdmin(id: number): void {
    setUsers(
      (users ?? []).map((user) => {
        if (user.id != id) {
          return user;
        } else {
          return { ...user, isAdmin: !user.isAdmin };
        }
      }),
    );
    authFetch(BACKEND_URL + '/users/edit-admin/' + id, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {});
  }

  function onDelete(userId: number): void {
    setUsers((users ?? []).filter(({ id }) => id !== userId));
    authFetch(BACKEND_URL + '/users/delete/' + userId, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {});
  }

  function isUserFiltered(user: User) {
    if (search.filter == '' && !search.isAdmin) {
      return false;
    }
    if (search.isAdmin && !user.isAdmin) {
      return true;
    }
    if (user.firstName.toLowerCase().includes(search.filter.toLowerCase())) {
      return false;
    }
    if (user.lastName.toLowerCase().includes(search.filter.toLowerCase())) {
      return false;
    }
    return true;
  }

  return (
    <Box display="flex" flexDirection="column">
      <Typography variant="h2">Users</Typography>
      <FeedbackMessage error={error} />
      <Divider />
      <Box display="flex" alignItems="center" justifyContent="flex-start">
        <TextField
          name="filter"
          value={search.filter}
          onChange={handleChange}
          label="Search"
          placeholder="Jan"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mr: 2, my: 2 }}
        />

        <FormControlLabel
          control={
            <Checkbox
              name="isAdmin"
              checked={search.isAdmin}
              color="secondary"
              onChange={handleChange}
            />
          }
          label="Admins"
        />
      </Box>
      <Divider />
      {!users ? (
        <Typography>Loading users&hellip;</Typography>
      ) : (
        users.map(
          (user) =>
            !isUserFiltered(user) && (
              <Accordion key={user.id}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`panel-${user.id}-content`}
                  id={`panel-${user.id}-header`}
                >
                  <Typography component="span">
                    {user.firstName} {user.lastName}
                    {user.isAdmin && (
                      <Typography
                        component="span"
                        sx={{
                          ml: 1,
                          color: 'secondary.main',
                          fontWeight: 'bold',
                        }}
                      >
                        (Admin)
                      </Typography>
                    )}
                  </Typography>
                </AccordionSummary>

                <AccordionDetails>
                  <Box
                    display="flex"
                    flexDirection="row"
                    gap="2"
                    justifyContent="left"
                  >
                    <Typography sx={{ mr: 4 }}>{user.email}</Typography>
                    <Button
                      sx={{ mr: 4 }}
                      variant="outlined"
                      color={user.isAdmin ? 'error' : 'secondary'}
                      size="small"
                      onClick={() => {
                        onToggleAdmin(user.id);
                      }}
                    >
                      {user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => {
                        onDelete(user.id);
                      }}
                    >
                      Delete user
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ),
        )
      )}
    </Box>
  );
}
