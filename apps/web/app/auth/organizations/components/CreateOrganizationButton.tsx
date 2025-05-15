'use client';

import React from 'react';
import { Box, Button } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function CreateOrganizationButton() {
    const router = useRouter();
    return (
        <Box>
            <Button
                fullWidth
                variant="contained"
                onClick={() => router.push('/auth/organizations/new')}
            >
                Create Organization
            </Button>
        </Box>
    );
}