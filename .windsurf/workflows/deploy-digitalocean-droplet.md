---
description: Deploy su DigitalOcean droplet (Docker Compose prod)
---

# Obiettivo
Aggiornare il codice sul droplet e ricostruire lo stack `docker compose` in produzione, senza toccare `.env.prod`, DB, uploads, certificati.

# Contesto
- Questo workflow è **sul droplet** via SSH (bash).
- Assunzioni:
  - Repo sul droplet: `~/TENNIS_GAME_MONOREPO`
  - File compose: `docker-compose.prod.yml`
  - Env file: `.env.prod`

# Passi

1. (Locale) Assicurati che `master` sia su GitHub e aggiornato
   - Verifica (PowerShell):
     - `git status`
     - `git log --oneline -n 5`
     - `git push origin master`

2. Connessione SSH al droplet
   - Comando (PowerShell):
     - `ssh root@<IP_DROPLET>`

3. Vai nella repo sul droplet
   - Comando (droplet / bash):
     - `cd TENNIS_GAME_MONOREPO`

4. Snapshot rapido (consigliato)
   - Comandi:
     - `git status`
     - `git rev-parse --short HEAD`
     - `docker ps --format "table {{.Names}}\t{{.Status}}"`

5. Allinea il codice al remoto
   - Comandi:
     - `git fetch origin`
     - `git reset --hard origin/master`

6. Pulisci file non tracciati (con esclusioni)
   - ATTENZIONE: `git clean -fd` cancella file non tracciati.
   - Comando conservativo:
     - `git clean -fd \
  -e .env.prod \
  -e services/ui/public/uploads \
  -e services/ui/public/immagini`

7. Rebuild + restart stack prod
   - Comando:
     - `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`

8. Verifica rapida servizi
   - Comandi:
     - `docker compose -f docker-compose.prod.yml --env-file .env.prod ps`
     - `docker logs --tail 150 tennis-proxy`
     - `docker logs --tail 150 tennis-ui`
     - `docker logs --tail 150 tennis-api`

9. Smoke test (browser)
   - Verifica:
     - `https://www.popostapo.com/`
     - `https://www.popostapo.com/friend/home`
     - `https://www.popostapo.com/tornei/friends`
     - `https://www.popostapo.com/stanze`
     - `https://www.popostapo.com/api/health` (se esiste endpoint; altrimenti una rotta API nota)

# Note
- Non usare `docker compose down -v` in produzione.
- Se c’è un problema di proxy (502), controlla prima che non ci siano stack compose “misti” (reti diverse).
- Questo workflow non include bootstrap/rinnovo Let’s Encrypt: vedi `DEPLOY_DIGITALOCEAN.md`.
