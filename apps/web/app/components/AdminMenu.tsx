import Divider from '@mui/material/Divider';
import NextLink from 'next/link';
import Paper from '@mui/material/Paper';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import ContentPasteRoundedIcon from '@mui/icons-material/ContentPasteRounded';

export default function IconMenu() {
  return (
    <Paper
      elevation={0} // kills the shadow
      square // sets borderRadius: 0
      sx={{
        bgcolor: 'transparent', // or use your theme’s background: 'background.default'
        p: 0, // trim any padding if you like
      }}
    >
      <MenuList>
        <MenuItem component={NextLink} href="/auth/admin">
          <ListItemIcon>
            <PersonRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Users</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem component={NextLink} href="/auth/admin/facilities">
          <ListItemIcon>
            <LocationCityRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Facilities</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem component={NextLink} href="/auth/admin/organizations">
          <ListItemIcon>
            <GroupsRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Organizations</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem component={NextLink} href="/auth/admin/projects">
          <ListItemIcon>
            <ContentPasteRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Projects</ListItemText>
        </MenuItem>
      </MenuList>
    </Paper>
  );
}
