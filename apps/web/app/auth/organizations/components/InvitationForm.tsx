'use client';

import { Box, Button, TextField, Typography } from '@mui/material';

type Props = {
  value: string;
  error?: string;
  sending: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export default function InvitationForm({
  value,
  error,
  sending,
  onChange,
  onSubmit,
}: Props) {
  return (
    <Box my={4}>
      <Typography variant="h6" gutterBottom>
        Invite New Members
      </Typography>

      <Box sx={{ mt: 1, pl: 0 }}>
        <TextField
          label="Email addresses"
          placeholder="example1@email.com example2@email.com"
          fullWidth
          multiline
          minRows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          helperText='Separate emails by "," (comma) or space.'
          error={!!error}
          sx={{
            mt: 1,
            ml: 0,
            '& .MuiFormHelperText-root': {
              pl: 0,
              ml: 0,
              textAlign: 'left',
            },
          }}
        />
      </Box>
      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
          {error}
        </Typography>
      )}

      <Box display="flex" justifyContent="flex-end" mt={1}>
        <Button
          variant="contained"
          disabled={sending}
          onClick={onSubmit}
          sx={{ minWidth: 180 }}
        >
          {sending ? 'Sending…' : 'Send Invitations'}
        </Button>
      </Box>
    </Box>
  );
}
