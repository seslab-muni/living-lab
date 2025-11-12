'use client';

import { Alert, AlertColor, Snackbar } from '@mui/material';

type Props = {
  open: boolean;
  severity?: AlertColor;
  message: string;
  onClose: () => void;
  autoHideDuration?: number;
};

export default function SnackbarFeedback({
  open,
  severity = 'info',
  message,
  onClose,
  autoHideDuration = 4000,
}: Props) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
