'use client';

import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import OrganizationsFilter from './OrganizationFilter';

export type OrganizationSortOption = 'newest' | 'asc' | 'desc';

type Props = {
  search: string;
  sort: OrganizationSortOption;
  showMine: boolean;
  onSearchChange: (value: string) => void;
  onSortChange: (value: OrganizationSortOption) => void;
  onToggleMine: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export default function OrganizationFiltersPanel({
  search,
  sort,
  showMine,
  onSearchChange,
  onSortChange,
  onToggleMine,
  onSubmit,
}: Props) {
  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      sx={{
        display: 'grid',
        gap: 2,
        alignItems: 'center',
        gridTemplateColumns: { xs: '1fr', md: '2fr 1fr auto' },
        width: '100%',
      }}
    >
      <TextField
        label="Search organizations"
        variant="outlined"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        size="small"
        sx={{
          flexGrow: 1,
          ml: -0.1,
        }}
      />

      <FormControl size="small">
        <InputLabel id="sort-label">Sort</InputLabel>
        <Select
          labelId="sort-label"
          value={sort}
          label="Sort"
          onChange={(e) =>
            onSortChange(e.target.value as OrganizationSortOption)
          }
        >
          <MenuItem value="newest">Newest</MenuItem>
          <MenuItem value="asc">A–Z</MenuItem>
          <MenuItem value="desc">Z–A</MenuItem>
        </Select>
      </FormControl>

      <Button type="submit" variant="contained">
        Search
      </Button>

      <Box gridColumn={{ xs: '1 / -1', md: 'span 3' }}>
        <OrganizationsFilter showMine={showMine} onToggle={onToggleMine} />
      </Box>
    </Box>
  );
}
