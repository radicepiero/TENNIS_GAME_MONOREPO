# Accedere a Postgres (psql) nel droplet (Docker)

Questa guida contiene comandi **copia/incolla** per:
- individuare il container Postgres nello stack Docker Compose sul droplet
- aprire `psql` dentro al container
- fare un backup veloce prima di modifiche
- eseguire query utili

> Assunzioni:
> - Sei connesso via **SSH** al droplet.
> - Sei nella root del repo sul droplet (es: `TENNIS_GAME_MONOREPO`).
> - In produzione usi Docker Compose con: `docker compose -f docker-compose.prod.yml --env-file .env.prod ...`

---

## 1) Individuare il servizio/container Postgres

### 1.1 Lista servizi e container dello stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

Cerca la riga del database.

Nel nostro compose:
- **servizio**: `postgres`
- **container**: `tennis-postgres`

### 1.2 Recuperare il container id del servizio db (metodo robusto)

Usa il nome del **servizio** (nel nostro caso: `postgres`).

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps -q postgres
```

---

## 2) Leggere credenziali dal file `.env.prod`

> Le variabili possono chiamarsi in modo diverso (es: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`).
> Questo comando ti mostra le righe rilevanti.

```bash
cat .env.prod | grep -E "^(POSTGRES_|PG)" 
```

Tipicamente ti serviranno:
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

---

## 3) Aprire una shell dentro al container e lanciare psql

### 3.1 Entrare nel container (come shell)

Usa il nome del **servizio** (nel nostro caso: `postgres`):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -it postgres sh
```

Se `sh` non esiste (raro), prova `bash`:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -it postgres bash
```

Se preferisci usare direttamente il **nome container** (nel nostro caso: `tennis-postgres`):

```bash
docker exec -it tennis-postgres sh
```

### 3.2 Dentro al container: avviare psql

Esempio (sostituisci variabili reali):

```bash
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Se vuoi essere sicuro di quali variabili vede il container:

```bash
echo "POSTGRES_USER=$POSTGRES_USER" && echo "POSTGRES_DB=$POSTGRES_DB"
```

Se le variabili non sono disponibili dentro al container, inserisci valori espliciti:

```bash
psql -U <POSTGRES_USER> -d <POSTGRES_DB>
```

### 3.3 Accesso “one-liner” (senza aprire shell)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -it postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

One-liner equivalente usando direttamente il nome container:

```bash
docker exec -it tennis-postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

---

## 4) Backup rapido PRIMA di modifiche (consigliato)

> Salva un dump SQL nella directory corrente del droplet.

```bash
mkdir -p ./backups

docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "./backups/pg_dump_$(date +%Y-%m-%d_%H-%M-%S).sql"
```

Se `pg_dump` non è presente nell’immagine, puoi comunque fare dump via `psql` (ma `pg_dump` è la soluzione corretta).

---

## 5) Comandi utili dentro `psql`

Una volta dentro `psql`:

```sql
-- mostra DB corrente
SELECT current_database();

-- mostra utente
SELECT current_user;

-- elenca tabelle
\dt

-- descrivi una tabella
\d <nome_tabella>

-- esci
\q
```

---

## 6) Esempio: modifica dato (pattern consigliato)

1) Fai prima una SELECT:

```sql
SELECT *
FROM <tabella>
WHERE id = <id>;
```

2) Poi UPDATE mirato:

```sql
UPDATE <tabella>
SET <campo> = <valore>
WHERE id = <id>;
```

3) Verifica:

```sql
SELECT *
FROM <tabella>
WHERE id = <id>;
```

---

## 7) Troubleshooting rapido

- **Non trovi il servizio `db`**:
  - usa `docker compose ... ps` per vedere il nome reale del servizio.

- **`psql: command not found`**:
  - l’immagine Postgres standard include `psql`; se non c’è, probabilmente il servizio DB non è Postgres oppure stai entrando nel container sbagliato.

- **Permessi**:
  - assicurati di usare `POSTGRES_USER` corretto.
