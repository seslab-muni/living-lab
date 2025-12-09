'use client';

import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import type { OrganizationInvitationDto } from '../types';

export type InvitationHistoryDialogProps = {
  open: boolean;
  invites: OrganizationInvitationDto[];
  loading: boolean;
  closeAction: () => void;
  retryAction: () => void;
};

export default function InvitationHistoryDialog({
  open,
  invites,
  loading,
  closeAction,
  retryAction,
}: InvitationHistoryDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={closeAction}
      maxWidth="sm"
      fullWidth
      aria-labelledby="invitation-history-title"
    >
      <DialogTitle id="invitation-history-title">
        Invitation History
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ maxHeight: 360, overflowY: 'auto', p: 2 }}>
          {loading ? (
            <Box
              sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
              aria-busy="true"
            >
              <CircularProgress size={32} />
            </Box>
          ) : invites.length === 0 ? (
            <Typography color="text.secondary" align="center">
              No invitations have been sent yet.
            </Typography>
          ) : (
            <List dense disablePadding>
              {invites.map((invite) => (
                <ListItem key={invite.id} divider>
                  <ListItemText
                    primary={invite.email}
                    secondary={`Sent on ${new Date(invite.createdAt).toLocaleString()} • Expires on ${new Date(invite.expiresAt).toLocaleString()} • ${invite.status}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={retryAction} disabled={loading}>
          Refresh
        </Button>
        <Button onClick={closeAction}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
