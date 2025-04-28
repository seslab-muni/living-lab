import { Button, Link, Stack } from "@mui/material";
import Typography from "@mui/material/Typography";
import CenterCardLayout from "../components/CenterCardLayout";

export default function Home() {
  return (
    <CenterCardLayout>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        BVV Living Lab <br/> Communication platform
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 2 }} >
        a place where multi-contextual ideas become reality
      </Typography>
      <Stack direction="row" spacing={4} justifyContent="center">
        <Button
          component={Link}
          href="/login">
            login
        </Button>
        <Button 
          component={Link}
          href="/register">
            register
        </Button>
      </Stack>
    </CenterCardLayout>
  );
}
