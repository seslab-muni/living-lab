'use client';

import {
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { OrganizationInvitationDto } from '../types';

type Props = {
  invites: OrganizationInvitationDto[];
  onRevoke: (id: number) => void;
  canRevoke?: boolean;
};

export default function PendingInvitesTable({
  invites,
  onRevoke,
  canRevoke = false,
}: Props) {
  return (
    <div>
      <Typography variant="h6">Pending Invitations</Typography>
      {invites.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No pending invitations.
        </Typography>
      ) : (
        <List dense disablePadding>
          {invites.map((inv) => (
            <ListItem
              key={inv.id}
              secondaryAction={
                canRevoke ? (
                  <IconButton
                    edge="end"
                    color="error"
                    onClick={() => onRevoke(inv.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                ) : null
              }
            >
              <ListItemText
                primary={inv.email}
                secondary={`Sent on ${new Date(inv.createdAt).toLocaleDateString()} • Expires on ${new Date(inv.expiresAt).toLocaleDateString()} • ${inv.status}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
}
