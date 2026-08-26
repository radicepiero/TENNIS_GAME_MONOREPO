import { Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()

  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h5">Apartments</Typography>
            <Typography variant="body2" color="text.secondary">
              Login (mock)
            </Typography>
          </Box>

          <TextField label="Nickname" fullWidth autoComplete="username" />
          <TextField label="Password" type="password" fullWidth autoComplete="current-password" />

          <Button
            variant="contained"
            onClick={() => {
              navigate('/')
            }}
          >
            Entra
          </Button>
        </Stack>
      </Paper>
    </Container>
  )
}
