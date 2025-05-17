// apps/web/app/auth/organizations/[slug]/join/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box,
    Typography,
    TextField,
    Button,
    Stack,
    CircularProgress,
} from '@mui/material';
import { authFetch } from '../../../../lib/auth';
import { BACKEND_URL } from '../../../../lib/constants';
import type { OrganizationDto } from '../../types';

export default function JoinRequestPage() {
    const { slug } = useParams();
    const router = useRouter();

    const [orgName, setOrgName] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Fetch the organization to get its name
    useEffect(() => {
        authFetch(`${BACKEND_URL}/organizations/${slug}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data: OrganizationDto) => {
                setOrgName(data.name);
            })
            .catch(() => {
                // If org not found, redirect back
                router.push('/auth/organizations');
            });
    }, [slug, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await authFetch(
                `${BACKEND_URL}/organizations/${slug}/join-requests`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message.trim() || undefined }),
                }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            router.push(`/auth/organizations/${slug}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (orgName === null) {
        // still loading the organization name
        return (
            <Box display="flex" justifyContent="center" p={6}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={{ xs: 4, md: 6 }} display="flex" justifyContent="center">
            <Box width={{ xs: '100%', md: '50%' }}>
                <Typography variant="h4" textAlign="center" gutterBottom>
                    Request to join {orgName} organization
                </Typography>
                <Typography
                    variant="subtitle1"
                    textAlign="center"
                    color="textSecondary"
                    gutterBottom
                >
                    Tell us why you would like to join this organization (optional)
                </Typography>

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Stack spacing={3}>
                        <TextField
                            label="Message"
                            placeholder="Your message..."
                            multiline
                            minRows={3}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                        />

                        {error && (
                            <Typography color="error" variant="body2">
                                {error}
                            </Typography>
                        )}

                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={submitting}
                        >
                            {submitting ? 'Sending…' : 'Send Request'}
                        </Button>
                    </Stack>
                </Box>
            </Box>
        </Box>
    );
}