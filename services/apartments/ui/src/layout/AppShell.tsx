import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import HomeIcon from '@mui/icons-material/Home'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import LocalActivityIcon from '@mui/icons-material/LocalActivity'
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat'
import YardIcon from '@mui/icons-material/Yard'
import { useMemo, useState } from 'react'
import type React from 'react'
import { useAuth } from '../auth/AuthContext'

type NavItem = {
  label: string
  path: string
  icon: React.ReactNode
}

const drawerWidth = 260

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()

  const navItems = useMemo<NavItem[]>(
    () => [
      { label: 'Home', path: '/', icon: <HomeIcon /> },
      { label: 'Presenze', path: '/presences', icon: <CalendarMonthIcon /> },
      { label: 'Experience', path: '/experiences', icon: <LocalActivityIcon /> },
      { label: 'Barca', path: '/boat', icon: <DirectionsBoatIcon /> },
      { label: 'Giardino', path: '/garden', icon: <YardIcon /> },
    ],
    [],
  )

  const selectedPath = navItems.find((i) => location.pathname === i.path)?.path

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography variant="h6" noWrap>
          Apartments
        </Typography>
      </Toolbar>
      <Box sx={{ px: 1 }}>
        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.path}
              selected={item.path === selectedPath}
              onClick={() => {
                navigate(item.path)
                setMobileOpen(false)
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>
      <Box sx={{ flex: 1 }} />
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          popostapo.com
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t: any) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen((v: boolean) => !v)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {navItems.find((i) => i.path === selectedPath)?.label ?? 'Apartments'}
          </Typography>

          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" noWrap>
              {user ? `${user.nickname} (${user.role})` : ''}
            </Typography>
            <Button
              color="inherit"
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
            >
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
