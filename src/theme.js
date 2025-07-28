import { createTheme } from '@mui/material/styles';

// Simple theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#4caf50',
    },
  },
  components: {
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontWeight: 'bold',
          fontSize: '1rem',
          '& span': {
            marginBottom: '8px',
            display: 'inline-block',
          },
          // Add any other styles you want for the primary text
        },
        secondary: {
          fontSize: '0.875rem',
          color: '#666666',
          '& span': {
            marginBottom: '4px',
            display: 'inline-block',
          },
          // Add any other styles you want for the secondary text
        },
        root: {
          margin: '4px 0',
          // Add any other styles you want for the entire ListItemText component
        },
      },
    },
  },
});

export default theme;
