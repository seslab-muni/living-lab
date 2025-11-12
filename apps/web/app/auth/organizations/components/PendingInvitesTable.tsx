'use client';

import {
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

type PendingInvite = { id: number; email: string; createdAt: string };

type Props = {
  invites: PendingInvite[];
  onRevoke: (id: number) => void;
};

export default function PendingInvitesTable({ invites, onRevoke }: Props) {
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
                <IconButton
                  edge="end"
                  color="error"
                  onClick={() => onRevoke(inv.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText
                primary={inv.email}
                secondary={`Sent on ${new Date(inv.createdAt).toLocaleDateString()}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
}
