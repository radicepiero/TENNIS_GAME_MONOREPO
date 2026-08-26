import { Card, CardContent, Grid, Typography } from '@mui/material'

export default function HomePage() {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6">Presenze</Typography>
            <Typography variant="body2" color="text.secondary">
              Calendario e chi c’è.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6">Experience</Typography>
            <Typography variant="body2" color="text.secondary">
              Cene, gite, lettura libri.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
