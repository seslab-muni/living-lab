'use client';

import React, { useEffect, useState } from 'react';
import {Box, Typography, CircularProgress} from '@mui/material';
import OrganizationCard from './components/OrganizationCard';
import { authFetch } from '../../lib/auth';
import { BACKEND_URL } from '../../lib/constants';
import type { OrganizationDto } from './types';

export default function OrganizationsPage() {
    const [orgs, setOrgs] = useState<OrganizationDto[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        authFetch(`${BACKEND_URL}/organizations`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data: OrganizationDto[]) => setOrgs(data))
            .catch((err: Error) => setError(err.message));
    }, []);

    return (
        <Box p={{ xs: 4, md: 6 }}>
            <Typography variant="h4" gutterBottom sx={{textAlign: 'center'}}>
                Organizations
            </Typography>

            {error ? (
                <Box sx={{textAlign: 'center'}}>
                    <Typography variant="h6" color="error" gutterBottom>
                        Failed to load organizations
                    </Typography>
                    <Typography variant="body1">{error}</Typography>
                </Box>
            ) : orgs === null ? (
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            ) : orgs.length === 0 ? (
                <Typography variant="body1">No organizations found.</Typography>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: '1fr',
                        mx: { xs: 0, md: '25%' },
                        width: { xs: '100%', md: '50%'},
                    }}
                >
                    {orgs.map((org) => (
                        <OrganizationCard key={org.id} org={org} />
                    ))}
                </Box>
            )}
        </Box>
    );
}