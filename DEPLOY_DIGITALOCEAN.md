# Deploy su DigitalOcean Droplet (Docker Compose)

Questa guida descrive come deployare il monorepo su un Droplet DigitalOcean con:
- UI (service `ui`)
- API (service `api`)
- Postgres (service `postgres`)
- Nginx reverse proxy (service `nginx`) con HTTPS Let’s Encrypt (service `certbot`)

Dominio canonico: `www.popostapo.com` (redirect 301 da `popostapo.com`).

## Prerequisiti

- Un Droplet Ubuntu (consigliato almeno 2GB RAM)
- Un dominio gestito (DNS) con record A
- Accesso SSH al droplet

## 1) DNS

Imposta questi record:

- `A` `@` -> IP del droplet
- `A` `www` -> IP del droplet

Attendi la propagazione.

## 2) Firewall (DigitalOcean)

Apri porte:

- 22/tcp (SSH)
- 80/tcp (HTTP)
- 443/tcp (HTTPS)

## 3) Setup droplet: installazione Docker

Segui la guida ufficiale Docker per Ubuntu (consigliato). In sintesi:

- Installa Docker Engine
- Installa Docker Compose plugin

Verifica:

- `docker --version`
- `docker compose version`

## 4) Checkout del repo sul droplet

Esempio:

- `git clone <REPO_URL>`
- `cd TENNIS_GAME_MONOREPO`

## 5) Preparazione `.env.prod` (sul droplet)

Il file `.env.prod` contiene le variabili d'ambiente per Postgres/API/UI e non va committato.

Nel repo esiste un template `.env.example` (committabile). Sul droplet:

```bash
cp .env.example .env.prod
nano .env.prod
```

Imposta almeno:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD` (password forte)
- `POSTGRES_DB`
- `DB_USER` (uguale a `POSTGRES_USER`)
- `DB_PSSW` (uguale a `POSTGRES_PASSWORD`)
- `DATABASE` (uguale a `POSTGRES_DB`)
- `JWT_SECRET` (stringa lunga random)

Nota:
- Le variabili Mailer sono opzionali se non usi flussi email (es. autoregistrazione).

## 6) Creazione file `.env.prod` (esempio)

Crea un file `.env.prod` nella root del repo (stessa cartella di `docker-compose.prod.yml`).

Esempio (valori da adattare):

```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=UNA_PASSWORD_FORTE
POSTGRES_DB=utenticoi_1

# API
PORT=9000
CORS_ORIGIN=https://www.popostapo.com,https://popostapo.com
DATABASE=utenticoi_1
DB_USER=postgres
DB_PSSW=UNA_PASSWORD_FORTE
DB_CONNESSIONE=postgres
SUPERUSER=1430d132-d7ce-49d2-a9ec-cfc8c5c8bd30
JWT_SECRET=UNA_STRINGA_LUNGA_RANDOM

# Mailer (Gmail: usare App Password)
MAILER_SERVICE=gmail
MAILER_USER=radice.p@gmail.com
MAILER_PSSW=APP_PASSWORD_GMAIL
```

Note:
- `POSTGRES_PASSWORD` / `DB_PSSW` devono combaciare.
- `CORS_ORIGIN` include entrambi i domini, anche se il canonico è `www`.
- Le variabili Mailer sono opzionali se non usi flussi email (es. autoregistrazione). Login e creazione utenti da admin funzionano anche senza SMTP.

## 7) Avvio stack in produzione

Da root repo sul droplet:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Controlla che i container siano up:

```bash
docker ps
```

## 8) Certificato HTTPS Let’s Encrypt

La config Nginx prod serve la challenge in:
- `/.well-known/acme-challenge/`

Esegui Certbot (webroot) dal droplet:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d popostapo.com -d www.popostapo.com \
  --email radice.p@gmail.com \
  --agree-tos --no-eff-email
```

Poi riavvia Nginx:

```bash
docker compose -f docker-compose.prod.yml restart nginx
```

## 9) Verifica

- Apri `https://www.popostapo.com`
- Verifica che `http://popostapo.com` e `https://popostapo.com` redirigano a `https://www.popostapo.com`
- Verifica che `/api/...` funzioni dietro Nginx.

## 10) Persistenza dati

La configurazione `docker-compose.prod.yml` usa volumi docker:

- `postgres_data` per Postgres
- `ui_uploads` per `services/ui/public/uploads`
- `letsencrypt` e `certbot_www` per certificati e challenge

Quindi dati e uploads non si perdono con rebuild.

## 11) Migrazione dati (locale -> droplet)

Questa sezione serve a portare i dati presenti in locale (DB + uploads) sul droplet.

In locale:
- Postgres è in un volume docker (`postgres_data`).
- Gli uploads della UI sono una bind-mount su filesystem: `./services/ui/public/uploads`.

In produzione (`docker-compose.prod.yml`):
- Postgres usa il volume `postgres_data`.
- Gli uploads UI usano il volume `ui_uploads`.

### 11.1) Migrazione DB (Postgres)

Sul PC locale (da root repo):

```bash
docker exec -t tennis-postgres pg_dump -U postgres -d utenticoi_1 > dump.sql
```

Copia `dump.sql` sul droplet (es. con `scp`).

Sul droplet (dentro la cartella del repo):

```bash
cat dump.sql | docker exec -i tennis-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Nota: se sul droplet il DB non è vuoto, valuta di ripartire da database pulito prima del restore.

### 11.2) Migrazione uploads UI

In locale, gli uploads sono una cartella sul filesystem:

```bash
tar -czf uploads.tgz -C services/ui/public/uploads .
```

Copia `uploads.tgz` sul droplet.

Sul droplet, importa nel volume `ui_uploads`. Il nome reale del volume può variare in base al project name di Docker Compose: controlla con `docker volume ls`.

Esempio:

```bash
docker run --rm -v tennis_game_monorepo_ui_uploads:/data -v $(pwd):/backup alpine tar -xzf /backup/uploads.tgz -C /data .
```

Se il volume non si chiama `tennis_game_monorepo_ui_uploads`, sostituisci con quello corretto.

## 12) Backup

### Backup Postgres (dump)

Esempio:

```bash
docker exec -t tennis-postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

### Backup uploads

Se vuoi esportare sul filesystem del droplet:

```bash
docker run --rm -v tennis_game_monorepo_ui_uploads:/data -v $(pwd):/backup alpine tar -czf /backup/uploads.tgz -C /data .
```

Nota: verifica il nome del volume con `docker volume ls`.

## 13) Update (deploy nuova versione)

Workflow tipico:

- `git pull`
- `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`

## 14) Rinnovo certificati

## Appendice: smoke test Postgres/API (prima del deploy completo)

Se vuoi verificare subito credenziali e connessione DB prima del `--build` completo:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d postgres
docker exec -it tennis-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Poi avvia API e controlla i log:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d api
docker logs --tail 100 tennis-api
```

Let’s Encrypt dura 90 giorni.

Manuale:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew
```

Dopo rinnovo:

```bash
docker compose -f docker-compose.prod.yml restart nginx
```

(Consigliato) automatizzare con cron sul droplet.
