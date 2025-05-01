import React from 'react';
import { styled } from '@mui/material/styles';
import Button, { ButtonProps } from '@mui/material/Button';

export type GreyButtonProps = ButtonProps;

const StyledGreyButton = styled(Button)<GreyButtonProps>(({ theme }) => ({
  margin: theme.spacing(2),
  backgroundColor: theme.palette.grey[500],
  color: theme.palette.getContrastText(theme.palette.grey[500]),
  '&:hover': {
    backgroundColor: theme.palette.grey[700],
  },
}));

const GreyButton: React.FC<GreyButtonProps> = (props) => (
  <StyledGreyButton variant="contained" {...props} />
);
export default GreyButton;