import React from 'react';
import { Box, Pagination } from '@mui/material';

interface PaginationControlProps {
  count: number;
  page: number;
  onChange: (event: React.ChangeEvent<unknown>, value: number) => void;
}

export default function PaginationControl({
  count,
  page,
  onChange,
}: PaginationControlProps) {
  if (count <= 1) return null;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
      <Pagination
        count={count}
        page={page}
        onChange={onChange}
        color="primary"
      />
    </Box>
  );
}
