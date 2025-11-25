'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '../../../lib/auth';
import { BACKEND_URL } from '../../../lib/constants';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Divider,
    InputAdornment,
    TextField,
    Typography,
    CircularProgress,
    Snackbar,
    Alert,
    Chip,
    Backdrop,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NextLink from 'next/link';
import ConfirmDialog from '../../organizations/components/ConfirmDialog';

type Organization = {
    id: number;
    name: string;
    slug: string;
    creatorName: string;
    createdAt: string;
    isActive: boolean;
};

export default function AdminOrganizationsPage() {
    const [organizations, setOrganizations] = useState<Organization[] | null>(
        null,
    );
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState({ filter: '' });
    const [processing, setProcessing] = useState<
        { id: number; action: 'archive' | 'restore' } | null
    >(null);
    const [archiveDialogOrg, setArchiveDialogOrg] = useState<Organization | null>(
        null,
    );
    const [restoreDialogOrg, setRestoreDialogOrg] = useState<Organization | null>(
        null,
    );
    const archiveLoading = processing?.action === 'archive';
    const restoreLoading = processing?.action === 'restore';
    const dialogClosing = processing !== null;
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const loadOrganizations = async () => {
        try {
            const res = await authFetch(
                `${BACKEND_URL}/organizations?includeInactive=true`,
            );

            if (!res.ok) {
                setError(`Failed to load organizations (HTTP ${res.status})`);
                return;
            }

            const data: Organization[] = await res.json();
            setOrganizations(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    };

    useEffect(() => {
        loadOrganizations();
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch({ filter: e.target.value });
    };

    const filteredOrgs = organizations
        ? organizations.filter((org) =>
            org.name.toLowerCase().includes(search.filter.toLowerCase()),
        )
        : [];

    const handleArchiveOrRestore = async (
        org: Organization,
        action: 'archive' | 'restore',
    ) => {
        if (processing !== null) return;
        setProcessing({ id: org.id, action });
        try {
            let res;
            if (action === 'archive') {
                res = await authFetch(`${BACKEND_URL}/organizations/${org.id}`, {
                    method: 'DELETE',
                });
            } else {
                res = await authFetch(
                    `${BACKEND_URL}/organizations/${org.id}/restore`,
                    {
                        method: 'PATCH',
                    },
                );
            }

            if (!res.ok) {
                setSnackbar({
                    open: true,
                    message: `Failed to ${action === 'archive' ? 'archive' : 'restore'} organization (HTTP ${res.status}).`,
                    severity: 'error',
                });
                return;
            }

            setSnackbar({
                open: true,
                message:
                    action === 'archive'
                        ? `Organization "${org.name}" archived successfully.`
                        : `Organization "${org.name}" restored successfully.`,
                severity: 'success',
            });
            await loadOrganizations();
        } catch (err) {
            console.error(err);
            setSnackbar({
                open: true,
                message: `Failed to ${action === 'archive' ? 'archive' : 'restore'} organization.`,
                severity: 'error',
            });
        } finally {
            setArchiveDialogOrg(null);
            setRestoreDialogOrg(null);
            setTimeout(() => setProcessing(null), 300);
        }
    };

    const openArchiveConfirm = (org: Organization) => setArchiveDialogOrg(org);
    const openRestoreConfirm = (org: Organization) => setRestoreDialogOrg(org);

    return (
        <Box display="flex" flexDirection="column">
            <Typography variant="h2">Organizations</Typography>
            {error && (
                <Typography color="error" sx={{ mb: 2 }}>
                    {error}
                </Typography>
            )}
            <Divider />

            <Box display="flex" alignItems="center">
                <TextField
                    name="filter"
                    value={search.filter}
                    onChange={handleSearch}
                    label="Search organization"
                    placeholder="Search by name..."
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchRoundedIcon />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ mr: 2, my: 2 }}
                />
                <Button
                    component={NextLink}
                    href="/auth/organizations/new"
                    variant="contained"
                    color="primary"
                >
                    Create Organization
                </Button>
            </Box>

            <Divider />

            {!organizations ? (
                <Box display="flex" justifyContent="center" mt={4}>
                    <CircularProgress />
                </Box>
            ) : filteredOrgs.length === 0 ? (
                <Typography sx={{ mt: 2 }}>No organizations found.</Typography>
            ) : (
                filteredOrgs.map((org) => (
                    <Accordion key={org.id}>
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls={`panel-${org.id}-content`}
                            id={`panel-${org.id}-header`}
                        >
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography
                                    sx={{
                                        color: org.isActive ? 'inherit' : 'text.secondary',
                                        fontWeight: 500,
                                    }}
                                >
                                    {org.name}
                                </Typography>

                                {!org.isActive && (
                                    <Chip
                                        label="Archived"
                                        size="small"
                                        color="default"
                                        sx={{
                                            backgroundColor: '#e0e0e0',
                                            color: 'text.secondary',
                                            height: 22,
                                        }}
                                    />
                                )}
                            </Box>
                        </AccordionSummary>

                        <AccordionDetails>
                            <Box
                                display="flex"
                                flexDirection="column"
                                gap={1}
                                alignItems="flex-start"
                            >
                                <Typography variant="body2" color="text.secondary">
                                    Creator: {org.creatorName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Created: {new Date(org.createdAt).toLocaleDateString()}
                                </Typography>

                                <Box display="flex" alignItems="center" gap={2} mt={1}>
                                    {org.isActive ? (
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="small"
                                            onClick={() => openArchiveConfirm(org)}
                                            disabled={processing?.id === org.id}
                                        >
                                            {processing?.id === org.id && processing.action === 'archive'
                                                ? 'Archiving…'
                                                : 'Archive'}
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outlined"
                                            color="success"
                                            size="small"
                                            onClick={() => openRestoreConfirm(org)}
                                            disabled={processing?.id === org.id}
                                        >
                                            {processing?.id === org.id && processing.action === 'restore'
                                                ? 'Restoring…'
                                                : 'Restore'}
                                        </Button>
                                    )}

                                    {org.isActive && (
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            size="small"
                                            component={NextLink}
                                            href={`/auth/organizations/${org.slug}`}
                                        >
                                            View Details
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ))
            )}

            <ConfirmDialog
                open={!!archiveDialogOrg}
                title="Archive organization?"
                description="Archiving hides this organization from regular users. You can restore it later."
                confirmLabel="Archive"
                confirmColor="error"
                loading={archiveLoading}
                onClose={() => {
                    if (processing) return;
                    setArchiveDialogOrg(null);
                }}
                onConfirm={() => {
                    if (archiveDialogOrg) {
                        void handleArchiveOrRestore(archiveDialogOrg, 'archive');
                    }
                }}
            />

            <ConfirmDialog
                open={!!restoreDialogOrg}
                title="Restore organization?"
                description="Restoring will make this organization visible to users again."
                confirmLabel="Restore"
                confirmColor="success"
                loading={restoreLoading}
                onClose={() => {
                    if (processing) return;
                    setRestoreDialogOrg(null);
                }}
                onConfirm={() => {
                    if (restoreDialogOrg) {
                        void handleArchiveOrRestore(restoreDialogOrg, 'restore');
                    }
                }}
            />

            {dialogClosing && (
                <Backdrop
                    open
                    sx={{
                        zIndex: (theme) => theme.zIndex.modal + 1,
                        bgcolor: 'transparent',
                    }}
                />
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
