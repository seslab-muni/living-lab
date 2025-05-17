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

    useEffect(() => {
        authFetch(
            `${BACKEND_URL}/organizations/${slug}/join-requests/${requestId}`
        )
            .then((res) => res.json())
            .then(setReq)
            .catch(() => router.push(`/auth/organizations/${slug}`));
    }, [slug, requestId, router]);

    if (!req) {
        return (
            <Box display="flex" justifyContent="center" p={6}>
                <CircularProgress />
            </Box>
        );
    }

    const handle = async (action: 'approve' | 'reject') => {
        await authFetch(
            `${BACKEND_URL}/organizations/${slug}/join-requests/${requestId}/${action}`,
            { method: 'PATCH' }
        );
        router.push(`/auth/organizations/${slug}`);
    };

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
                    {new Date(req.createdAt).toLocaleString(undefined, {
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
                <Stack direction="row" spacing={2} justifyContent="center" mt={4}>
                    <Button
                        variant="contained"
                        onClick={() => handle('approve')}
                    >
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
            </Box>
        </Box>
    );
}