'use client';

import React from 'react';
import { Box, Button } from '@mui/material';

interface OrganizationsFilterProps {
  showMine: boolean;
  onToggle: () => void;
}

export default function OrganizationsFilter({
                                              showMine,
                                              onToggle,
                                            }: OrganizationsFilterProps) {
  return (
    <Box>
      <Button
        fullWidth
        variant={showMine ? 'contained' : 'outlined'}
        onClick={onToggle}
      >
        {showMine ? 'Show all organizations' : 'Show my organizations'}
      </Button>
    </Box>
  );
}
