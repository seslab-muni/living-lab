'use client';
import {
  Box,
  CircularProgress,
  Divider,
  InputAdornment,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  AddMembersMenu,
  FeedbackMessage,
  MembersMenu,
} from '../../../../components';
import { authFetch } from '../../../../lib/auth';
import { BACKEND_URL } from '../../../../lib/constants';
import { useEffect, useState } from 'react';
import React from 'react';
import { useParams } from 'next/navigation';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

export default function ManageMembersAdminPage() {
  const { id } = useParams() as { id?: string };
  const [data, setData] = useState<{
    facility: { id: string; name: string };
  } | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<number>(0);
  const [search, setSearch] = useState('');

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setSearch(value);
  };

  useEffect(() => {
    authFetch(BACKEND_URL + '/facilities/' + id)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json: { facility: { id: string; name: string } }) => {
        setData(json);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {});
  }, [id]);

  if (!id) {
    return <Typography>Loading facility …</Typography>;
  }

  return (
    <Box>
      <Typography variant="h2">
        {data ? data.facility.name : <CircularProgress size={24} />}
      </Typography>
      <FeedbackMessage error={error} />
      <Divider />

      <Box display="flex" flexDirection="row" justifyItems="flex-start" gap="2">
        <TextField
          name="filter"
          value={search}
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
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="Manage members tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Members" value={0} sx={{ mt: 3 }} />
          <Tab label="Not members" value={1} sx={{ mt: 3 }} />
        </Tabs>
      </Box>

      <Box>
        {activeTab === 0 ? (
          <MembersMenu domainId={id} search={search} />
        ) : (
          <AddMembersMenu domainId={id} search={search} />
        )}
      </Box>
    </Box>
  );
}
