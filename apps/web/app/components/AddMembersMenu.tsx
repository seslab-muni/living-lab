'use client';
import {
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { AVAILABLE_ROLES, BACKEND_URL } from '../lib/constants';
import { authFetch } from '../lib/auth';
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

export default function AddMembersMenu({ domainId, search }: MembersMenuProps) {
  const [notMembers, setNotMembers] = useState<UserAssignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    authFetch(`${BACKEND_URL}/domain/${domainId}/notmembers`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: UserAssignment[]) => setNotMembers(data))
      .catch((err) => setError(err.message));
  }, [domainId]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    setNotMembers((notMembers ?? []).filter(({ id }) => id !== userId));
    try {
      const res = await authFetch(
        `${BACKEND_URL}/domain/${domainId}/users/${userId}/role`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  function isNotFiltered(user: UserAssignment) {
    return (
      !search ||
      user.firstName.toLowerCase().includes(search.toLowerCase()) ||
      user.lastName.toLowerCase().includes(search.toLowerCase())
    );
  }

  return (
    <Box>
      <Divider />
      <FeedbackMessage error={error} />
      {!notMembers ? (
        <Typography>Loading users&hellip;</Typography>
      ) : (
        notMembers.map(
          (user) =>
            isNotFiltered(user) && (
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
                  <Box display="flex" alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
                      <InputLabel id={`role-label-${user.id}`}>Role</InputLabel>
                      <Select
                        inputRef={selectRef}
                        labelId={`role-label-${user.id}`}
                        defaultValue={user.role || 'Viewer'}
                        label="Role"
                      >
                        {AVAILABLE_ROLES.map((role) => (
                          <MenuItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() =>
                        handleRoleChange(user.id, selectRef.current!.value)
                      }
                    >
                      Add member
                    </Button>
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
