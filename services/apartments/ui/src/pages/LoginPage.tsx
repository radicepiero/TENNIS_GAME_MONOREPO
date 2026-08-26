import { Box, Button, Container, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { type ChangeEvent, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth, type UserRole } from '../auth/AuthContext'
import { loginApi } from '../api/client'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('member')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fromPath = useMemo(() => {
    const state = location.state as { from?: string } | null
    return state?.from || '/'
  }, [location.state])

  const canSubmit = nickname.trim().length > 0 && password.trim().length > 0

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

          <TextField
            label="Nickname"
            fullWidth
            autoComplete="username"
            value={nickname}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNickname(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            autoComplete="current-password"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          />

          <TextField
            label="Ruolo"
            select
            fullWidth
            value={role}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setRole(e.target.value as UserRole)}
          >
            <MenuItem value="admin">admin</MenuItem>
            <MenuItem value="member">member</MenuItem>
            <MenuItem value="visitor">visitor</MenuItem>
          </TextField>

          <Button
            variant="contained"
            disabled={!canSubmit}
            onClick={async () => {
              if (!canSubmit || submitting) return
              setError(null)
              setSubmitting(true)
              try {
                const res = await loginApi({
                  nickname: nickname.trim(),
                  password,
                  role,
                })

                login({ token: res.token, user: { nickname: res.user.nickname, role: res.user.role } })
                navigate(fromPath, { replace: true })
              } catch (e) {
                setError('Login fallito')
              } finally {
                setSubmitting(false)
              }
            }}
          >
            Entra
          </Button>

          {error ? (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          ) : null}
        </Stack>
      </Paper>
    </Container>
  )
}
