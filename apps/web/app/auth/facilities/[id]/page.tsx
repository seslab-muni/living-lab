'use client';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Divider,
  Typography,
} from '@mui/material';
import { getSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authFetch } from '../../../lib/auth';
import { BACKEND_URL } from '../../../lib/constants';
import { FeedbackMessage, MembersMenu } from '../../../components';

export default function FacilityPage() {
  const { id } = useParams() as { id?: string };
  const [userId, setUserID] = useState('');
  const [role, setRole] = useState('');
  const [data, setData] = useState<{
    facility: { id: string; name: string };
  } | null>();
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      const role =
        session?.user.roles.find((r: { domainId: string }) => r.domainId === id)
          ?.role ?? '';
      setRole(role);
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
        console.log(data);
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
      <FeedbackMessage error={error} />
      <Card>
        <CardContent>
          {!data ? (
            <CircularProgress />
          ) : (
            <Typography variant="h2" sx={{ m: 4 }}>
              {data.facility.name}
            </Typography>
          )}
          {['Owner', 'Manager'].includes(role) && (
            <>
              {' '}
              <Divider /> <MembersMenu domainId={id!} search={''} />{' '}
            </>
          )}
        </CardContent>
        <CardActions>
          {['Owner', 'Manager', 'Moderator', 'Viewer'].includes(role) && (
            <Button
              size="small"
              onClick={() =>
                authFetch(`${BACKEND_URL}/domain/${id}/user/${userId}/delete`)
              }
            >
              Leave Facility
            </Button>
          )}
          {role === '' && (
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
