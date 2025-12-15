'use client';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import type { ReactNode } from 'react';

type Props = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?:
    | 'primary'
    | 'secondary'
    | 'error'
    | 'inherit'
    | 'success'
    | 'info'
    | 'warning';
  loading?: boolean;
  onConfirmAction: () => void;
  onCloseAction: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'error',
  loading = false,
  onConfirmAction,
  onCloseAction,
}: Props) {
  return (
    <Dialog open={open} onClose={onCloseAction}>
      <DialogTitle>{title}</DialogTitle>
      {description && (
        <DialogContent>
          <DialogContentText>{description}</DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={onCloseAction} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirmAction}
          color={confirmColor}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Please wait…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
