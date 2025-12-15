'use client';

import {
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import Link from 'next/link';
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
          <ListItem key={suggestion.id} disablePadding>
            <ListItemButton
              component={Link}
              href={`/auth/organizations/${suggestion.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ListItemText
                primary={suggestion.name}
                secondary={`IČO: ${suggestion.companyId} — ${suggestion.organizationAlias}`}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
