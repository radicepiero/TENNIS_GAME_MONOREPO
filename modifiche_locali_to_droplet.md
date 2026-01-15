# modifiche_locali_to_droplet

Questa guida descrive i passaggi ripetibili per portare le modifiche fatte in locale (Git) sulla Droplet DigitalOcean e ricostruire lo stack Docker in produzione.

## Prerequisiti

- Hai già testato in locale le modifiche.
- Hai `origin` configurato e funzionante (push su GitHub/remote).
- Sul droplet esiste la cartella `TENNIS_GAME_MONOREPO` con lo stack già configurato.
- In produzione esiste `.env.prod` sul droplet (non deve essere sovrascritto).

## 1) Locale: controlli + commit + push

Da root repo, su Windows (PowerShell):

```powershell
git status
```

Assicurati che nella lista delle modifiche ci siano solo file attesi.
Poi fai stage/commit/push:

```powershell
git add .
git commit -m "Deploy: allinea locale e produzione"
git push origin master
```

Se preferisci essere più selettivo:

```powershell
git add .gitignore DEPLOY_DIGITALOCEAN.md services/ui/views/friend-home.ejs services/ui/public/js/tornei.js services/ui/public/css/tornei.css
git commit -m "UI: tournament cards + docs + gitignore"
git push origin master
```

## 2) Droplet: accesso SSH

Da locale:

```powershell
ssh root@138.68.94.153
```

Una volta dentro, ti troverai tipicamente in qualcosa tipo:

```text
root@ubuntu-s-1vcpu-1gb-fra1-01:~#
```

Vai nella repo:

```bash
cd TENNIS_GAME_MONOREPO
```

## 3) Droplet: allineamento codice (scelta B) + rebuild stack

### 3.1) (Opzionale ma consigliato) snapshot veloce stato attuale

```bash
git status
```

### 3.2) Allinea il codice con `origin/master`

```bash
git fetch origin
git reset --hard origin/master
```

### 3.3) Pulisci file non tracciati (senza toccare `.env.prod`)

ATTENZIONE: `git clean -fd` cancella i file non tracciati.
Per evitare problemi, usiamo SEMPRE una versione conservativa che esclude esplicitamente `.env.prod` e le directory runtime.

```bash
git clean -fd \
  -e .env.prod \
  -e services/ui/public/uploads \
  -e services/ui/public/immagini \
  -e services/api/public/immagini
```

## 3-bis) Droplet: blocco unico copia-incolla (conservativo)

Una volta entrato via SSH e fatto `cd TENNIS_GAME_MONOREPO`, puoi incollare questo blocco:

```bash
git fetch origin \
  && git reset --hard origin/master \
  && git clean -fd \
    -e .env.prod \
    -e services/ui/public/uploads \
    -e services/ui/public/immagini \
    -e services/api/public/immagini \
  && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### 3.4) Rebuild e riavvio stack produzione

Da root repo sul droplet:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Per vedere cosa sta succedendo (log rapidi):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

E (se serve) log mirati:

```bash
docker logs --tail 100 tennis-proxy
docker logs --tail 100 tennis-ui
docker logs --tail 100 tennis-api
```

## 4) Smoke test

Da browser:

- `https://www.popostapo.com/`
- `https://www.popostapo.com/friend/home`
- `https://www.popostapo.com/tornei/friends`

### Check specifico card tornei

- Il pulsante **superuser tree** deve apparire solo se il tabellone superuser esiste.
- Label:
  - torneo **open**: `tabellone`
  - torneo **in corso/chiuso**: `guarda i risultati`
- I pulsanti **icona** (ATP/Pronostico/Compila albero) non devono esserci nelle card dove li abbiamo rimossi.

## 5) Se qualcosa va storto (debug rapido)

### 5.1) Verifica che i container siano up

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

### 5.2) Verifica Nginx (proxy)

```bash
docker logs --tail 200 tennis-proxy
```

### 5.3) Verifica API/UI

```bash
docker logs --tail 200 tennis-api
docker logs --tail 200 tennis-ui
```

## Note importanti

- Non usare `docker compose down -v` in produzione: cancella i volumi (DB/uploads/cert). 
- Se devi rifare build di solo alcuni servizi, resta coerente con lo stesso compose file usato in produzione:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build api ui
```
