'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Stack,
} from '@mui/material';
import { authFetch } from '../../../lib/auth';
import { BACKEND_URL } from '../../../lib/constants';
import type { OrganizationDto } from '../types';

export default function OrganizationDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();

    const [org, setOrg] = useState<OrganizationDto | null>(null);
    const [isMember, setIsMember] = useState(false);
    const [memberCount, setMemberCount] = useState(0);
    const [isOwner, setIsOwner] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        authFetch(`${BACKEND_URL}/organizations/${id}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data: OrganizationDto) => {
                setOrg(data);
                setIsMember(data.isMember);
                setMemberCount(data.memberCount);
                if (session?.user?.id === data.ownerId) setIsOwner(true);
            })
            .catch(err => setError(err.message));
    }, [id, session]);

    const handleJoin = () => {
        authFetch(`${BACKEND_URL}/organizations/${id}/join`, { method: 'POST' })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                setIsMember(true);
                setMemberCount(c => c + 1);
            })
            .catch(err => setError(err.message));
    };

    const handleLeave = () => {
        authFetch(`${BACKEND_URL}/organizations/${id}/leave`, { method: 'POST' })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                setIsMember(false);
                setMemberCount(c => Math.max(c - 1, 0));
            })
            .catch(err => setError(err.message));
    };

    if (error) {
        return (
            <Box textAlign="center" mt={4}>
                <Typography color="error">Error: {error}</Typography>
            </Box>
        );
    }

    if (!org) {
        return (
            <Box display="flex" justifyContent="center" mt={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box display="flex" justifyContent="center" p={{ xs: 4, md: 6 }}>
            <Box width={{ xs: '100%', md: '50%' }}>
                <Stack spacing={2}>
                    <Typography variant="h4" textAlign="center">
                        {org.name}
                    </Typography>
                    <Typography variant="body1">{org.description}</Typography>
                    <Box height={50}></Box>
                    <Typography variant="caption" color="text.secondary">
                        Company: {org.companyName} (IČO: {org.companyId})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Last updated: {new Date(org.lastEdit).toLocaleString()}
                    </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Owner of organization: {org.ownerName}
                  </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Members: {memberCount}
                    </Typography>

                    <Box display="flex" justifyContent="center" gap={2} mt={2}>
                      {!isOwner && (
                      isMember ? (
                        <Button variant="outlined" color="error" onClick={handleLeave}>
                          Leave
                        </Button>
                      ) : (
                      <Button variant="contained" onClick={handleJoin}>
                        Join
                      </Button>
                      )
                      )}
                      {isOwner && (
                        <Button variant="outlined" onClick={() => router.push(`/auth/organizations/${id}/edit`)}>
                          Edit Organization
                        </Button>
                      )}
                    </Box>
                </Stack>
            </Box>
        </Box>
    );
}