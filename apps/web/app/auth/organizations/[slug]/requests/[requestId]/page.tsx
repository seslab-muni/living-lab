'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
} from '@mui/material';
import { authFetch } from '../../../../../lib/auth';
import { BACKEND_URL } from '../../../../../lib/constants';
import type { JoinRequestDto } from '../../../types';

export default function ReviewJoinRequestPage() {
  const { slug, requestId } = useParams();
  const router = useRouter();
  const [req, setReq] = useState<JoinRequestDto | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRequest = async () => {
      try {
        const res = await authFetch(
          `${BACKEND_URL}/organizations/${slug}/join-requests/${requestId}`,
        );

        if (!res.ok) {
          if (res.status === 404) {
            setError('Join request not found.');
          } else if (res.status === 403) {
            setError('You are not authorized to view this request.');
          } else {
            setError(`Failed to load request (HTTP ${res.status}).`);
          }
          setReq(null);
          return;
        }

        const data: JoinRequestDto = await res.json().catch(() => null);
        if (!data) {
          setError('Invalid response from server.');
          setReq(null);
          return;
        }

        setReq(data);
      } catch (err: unknown) {
        if (err instanceof Response && err.status === 404) {
          setError('Join request not found.');
        } else if (
          err instanceof Error &&
          typeof err?.message === 'string' &&
          err.message.includes('404')
        ) {
          setError('Join request not found.');
        } else if (err instanceof Response && err.status === 403) {
          setError('You are not authorized to view this request.');
        } else if (
          err instanceof Error &&
          typeof err?.message === 'string' &&
          err.message.includes('403')
        ) {
          setError('You are not authorized to view this request.');
        } else {
          setError('Unable to load request.');
        }
        setReq(null);
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [slug, requestId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" mt={8}>
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Button
          variant="contained"
          onClick={() => router.push(`/auth/organizations/${slug}`)}
        >
          Back to Organization
        </Button>
      </Box>
    );
  }

  const handle = async (action: 'approve' | 'reject') => {
    await authFetch(
      `${BACKEND_URL}/organizations/${slug}/join-requests/${requestId}/${action}`,
      { method: 'PATCH' },
    );
    router.push(`/auth/organizations/${slug}`);
  };

  if (!req) {
    return null;
  }

  const isProcessed = req.status === 'APPROVED' || req.status === 'REJECTED';

  return (
    <Box p={{ xs: 4, md: 6 }} display="flex" justifyContent="center">
      <Box width={{ xs: '100%', md: '50%' }}>
        <Typography variant="h4" textAlign="center" gutterBottom>
          Review Join Request
        </Typography>
        <Typography variant="h6" textAlign="center" gutterBottom>
          {req.user.firstName} {req.user.lastName}
        </Typography>
        <Typography
          variant="caption"
          color="textSecondary"
          display="block"
          textAlign="center"
          gutterBottom
        >
          Requested on{' '}
          {new Date(req.createdAt).toLocaleString('cs-CZ', {
            timeZone: 'Europe/Bratislava',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {req.message ?? 'No message provided.'}
        </Typography>
        {isProcessed ? (
          <Box mt={4} textAlign="center">
            <Typography variant="h6" color="text.secondary">
              This request has already been {req.status.toLowerCase()}.
            </Typography>
            <Button
              sx={{ mt: 2 }}
              variant="contained"
              onClick={() => router.push(`/auth/organizations/${slug}`)}
            >
              Back to Organization
            </Button>
          </Box>
        ) : (
          <Stack direction="row" spacing={2} justifyContent="center" mt={4}>
            <Button variant="contained" onClick={() => handle('approve')}>
              Approve
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => handle('reject')}
            >
              Reject
            </Button>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
