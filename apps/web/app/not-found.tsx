import Typography from '@mui/material/Typography';
import CenterCardLayout from './components/CenterCardLayout';

export default function NotFound() {
  return (
    <CenterCardLayout>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Sorry! <br /> this page couldn&apos;t be found
      </Typography>
    </CenterCardLayout>
  );
}
