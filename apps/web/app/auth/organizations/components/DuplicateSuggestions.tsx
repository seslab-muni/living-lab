'use client';

import { Box, CircularProgress, List, ListItem, ListItemText, Typography } from '@mui/material';
import type { OrganizationDto } from '../types';

type Props = {
  suggestions: OrganizationDto[];
  loading: boolean;
};

export default function DuplicateSuggestions({ suggestions, loading }: Props) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={2}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Box py={2}>
      <Typography variant="subtitle1" color="error" gutterBottom>
        Possible duplicates found
      </Typography>
      <List dense disablePadding>
        {suggestions.map((suggestion) => (
          <ListItem key={suggestion.id} disableGutters>
            <ListItemText
              primary={suggestion.name}
              secondary={`IČO: ${suggestion.companyId} — ${suggestion.organizationAlias}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
