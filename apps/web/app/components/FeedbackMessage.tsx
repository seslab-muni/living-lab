'use client';
import React from 'react';
import { Alert, SxProps, Theme } from '@mui/material';

interface FeedbackMessageProps {
  error?: string | null;
  ok?: string | null;
  m?: number;
  sx?: SxProps<Theme>;
}

const FeedbackMessage: React.FC<FeedbackMessageProps> = ({
  error,
  ok,
  m = 0,
  sx = {},
}) => {
  if (!error && !ok) return null;

  return error ? (
    <Alert severity="error" sx={{ m, ...sx }}>
      {error}
    </Alert>
  ) : (
    <Alert severity="success" sx={{ m, ...sx }}>
      {ok}
    </Alert>
  );
};

export default FeedbackMessage;
