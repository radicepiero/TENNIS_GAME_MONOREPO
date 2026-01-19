# Branch test (locale) + merge + deploy (droplet su master)

Questo file contiene una sequenza di comandi **pronta da copiare/incollare** per:
- lavorare e testare su un branch
- push su GitHub
- merge su `master` (tramite PR consigliata)
- deploy su droplet che segue `master`

> NOTE
> - **Locale (Windows / PowerShell)**: comandi in `powershell`.
> - **Droplet (Linux / SSH)**: comandi in `bash`.
> - In produzione il droplet **segue `master`**.

---

## 0) Requisiti

- Sei sul branch di lavoro (es: `chore/remove-tornei-endpoint`).
- Hai aggiornato i file e vuoi testarli in locale “simil-prod” con Nginx.

---

## 1) Git (locale): commit e push del branch

### 1.1 Controllo stato

```powershell
git status
```

### 1.2 Stage + commit

```powershell
git add -A
git commit -m "chore: ui tournaments refactor"
```

### 1.3 Push del branch (NON master)

```powershell
git push -u origin chore/remove-tornei-endpoint
```

---

## 2) Test locale “simil prod” (nginx davanti, senza porta)

> Usa SEMPRE gli stessi compose per evitare mismatch con Nginx.

### 2.1 Rebuild mirato (api + ui)

```powershell
docker compose -f docker-compose.prod.yml -f docker-compose.prod.local.yml --env-file .env.prod up -d --build api ui
```

### 2.2 Rebuild completo (nginx + api + ui)

```powershell
docker compose -f docker-compose.prod.yml -f docker-compose.prod.local.yml --env-file .env.prod up -d --build nginx api ui
```

### 2.3 Se vuoi ripartire “pulito” (senza cancellare volumi)

```powershell
docker compose -f docker-compose.prod.yml -f docker-compose.prod.local.yml --env-file .env.prod down
docker compose -f docker-compose.prod.yml -f docker-compose.prod.local.yml --env-file .env.prod up -d --build nginx api ui
```

### 2.4 Smoke test manuale

Apri nel browser:
- `http://localhost/`

Controlla:
- `/tornei/friends`
- `/friend/home`
- `/tornei/:id/albero-pronostico`
- `/tornei/:id/genera-albero`

---

## 3) GitHub: PR e merge verso master (consigliato)

1. Vai su GitHub
2. Crea una Pull Request:
   - base: `master`
   - compare: `chore/remove-tornei-endpoint`
3. Quando sei soddisfatto dei test, fai **Merge** nella PR

---

## 4) Droplet (produzione): deploy da master

> Esegui questi comandi **sul droplet via SSH** nella root del repo.

### 4.1 Aggiorna codice a `origin/master`

```bash
git fetch origin

git checkout master

git pull origin master
```

> Se vuoi essere “aggressivo” e riallineare al 100% (perdendo eventuali modifiche locali sul droplet), usa:

```bash
git fetch origin \
  && git reset --hard origin/master \
  && git clean -fd \
    -e .env.prod \
    -e services/ui/public/uploads \
    -e services/ui/public/immagini \
    -e services/api/public/immagini
```

### 4.2 Rebuild e restart stack produzione

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### 4.3 Verifica rapida log

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps

docker compose -f docker-compose.prod.yml --env-file .env.prod logs -n 200 --no-color nginx

docker compose -f docker-compose.prod.yml --env-file .env.prod logs -n 200 --no-color ui

docker compose -f docker-compose.prod.yml --env-file .env.prod logs -n 200 --no-color api
```

---

## 5) Note su cache e build

- Se cambi JS/CSS e non vedi l’update:
  - hard refresh nel browser
  - oppure rebuild includendo `nginx`.

---
