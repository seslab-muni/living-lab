import { Box } from '@mui/material';
import { AdminMenu } from '../../components';
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box
      display="flex"
      flexDirection="row"
      justifyContent="space-between"
      alignContent="center"
      gap={2}
      p={{ sx: 4, md: 6 }}
    >
      <Box width="10%">
        <AdminMenu />
      </Box>
      <Box width="60%">{children}</Box>
      <Box width="10%"></Box>
    </Box>
  );
}
