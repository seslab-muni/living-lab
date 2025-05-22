'use client';
import {
  Box,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { AVAILABLE_ROLES, BACKEND_URL } from '../lib/constants';
import { authFetch } from '../lib/auth';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import FeedbackMessage from './FeedbackMessage';

type UserAssignment = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
};

interface MembersMenuProps {
  domainId: string;
  search: string;
}

export default function MembersMenu({ domainId, search }: MembersMenuProps) {
  const [users, setUsers] = useState<UserAssignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch(`${BACKEND_URL}/domain/${domainId}/users`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: UserAssignment[]) => setUsers(data))
      .catch((err) => setError(err.message));
  }, [domainId]);

  const handleRoleChange =
    (userId: number) => (event: SelectChangeEvent<string>) => {
      const newRole = event.target.value;
      authFetch(`${BACKEND_URL}/domain/${domainId}/users/${userId}/role`, {
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

  function isNotFiltered(user: UserAssignment) {
    return (
      !search ||
      user.firstName.toLowerCase().includes(search.toLowerCase()) ||
      user.lastName.toLowerCase().includes(search.toLowerCase()) ||
      user.role.toLowerCase().includes(search.toLowerCase())
    );
  }

  return (
    <Box>
      <Divider />
      <FeedbackMessage error={error} />
      {!users ? (
        <Typography>Loading users&hellip;</Typography>
      ) : (
        users.map(
          (user) =>
            isNotFiltered(user) && (
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
                        setUsers(users.filter(({ id }) => id !== user.id));
                        authFetch(
                          `${BACKEND_URL}/domain/${domainId}/users/${user.id}/delete`,
                          { method: 'PUT' },
                        );
                      }}
                    >
                      <DeleteRoundedIcon color="error" />
                    </IconButton>
                  </Box>
                </Box>
                <Divider />
              </Box>
            ),
        )
      )}
    </Box>
  );
}
