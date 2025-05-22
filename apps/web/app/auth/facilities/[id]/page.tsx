'use client';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Divider,
  Toolbar,
  Typography,
} from '@mui/material';
import { getSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authFetch } from '../../../lib/auth';
import { BACKEND_URL } from '../../../lib/constants';
import { FeedbackMessage, MembersMenu } from '../../../components';
import { isAuthorized } from '../../../lib/isAuthorized';
import { Roles } from '../../../../types/next-auth';

export default function FacilityPage() {
  const { id } = useParams() as { id?: string };
  const [userId, setUserID] = useState('');
  const [roles, setRoles] = useState<{ domainId: string; role: Roles }[]>([]);
  const [data, setData] = useState<{
    facility: { id: string; name: string };
  } | null>();
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      setRoles(session?.user.roles ?? []);
      setUserID(session?.user.id ?? '');
    };
    fetchSession();
  }, [id]);

  useEffect(() => {
    authFetch(`${BACKEND_URL}/facilities/${id}`)
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
  });

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      width={{
        xs: '95%',
        sm: '85%',
        md: '75%',
        lg: '70%',
        xl: '60%',
      }}
      mx="auto"
    >
      <Toolbar />
      <FeedbackMessage error={error} />
      <Card sx={{ minWidth: 500 }}>
        <CardContent>
          {!data ? (
            <CircularProgress />
          ) : (
            <Typography variant="h2" sx={{ m: 4 }}>
              {data.facility.name}
            </Typography>
          )}
          {isAuthorized('Manager', id ?? '', roles) && (
            <>
              {' '}
              <Divider /> <MembersMenu domainId={id!} search={''} />{' '}
            </>
          )}
        </CardContent>
        <CardActions>
          {isAuthorized('Viewer', id ?? '', roles) && (
            <Button
              size="small"
              onClick={() =>
                authFetch(`${BACKEND_URL}/domain/${id}/user/${userId}/delete`)
              }
            >
              Leave Facility
            </Button>
          )}
          {!isAuthorized('Viewer', id ?? '', roles) && (
            <Button
              size="small"
              onClick={() =>
                authFetch(`${BACKEND_URL}/domain/${id}/user/${userId}/delete`)
              }
            >
              Request to Join
            </Button>
          )}
        </CardActions>
      </Card>
    </Box>
  );
}
