# Manuale didattico: architettura del progetto (Monorepo Tennis Game)

Destinatari: **classe quinta ITIS Informatica**
Materia: **TPSIT (Tecnologie e Progettazione di Sistemi Informatici e di Telecomunicazioni)**

---

## 1) Che tipo di progetto è?

Questo progetto è un **monorepo**, cioè un unico repository Git che contiene più componenti (servizi) della stessa applicazione.

Nel monorepo troviamo una tipica architettura **web a più livelli (multi-tier)**:

- **Frontend / UI (presentazione)**: servizio `ui`
- **Backend / API (logica applicativa)**: servizio `api`
- **Database (dati persistenti)**: Postgres
- **Reverse proxy (ingresso unico, routing, HTTPS)**: Nginx

In più, in produzione l’app è eseguita in **container Docker** e orchestrata con **Docker Compose**.

---

## 2) Componenti principali (vista “a scatole”)

### 2.1 Diagramma logico

```
Browser utente
   |
   | HTTPS (443) / HTTP (80)
   v
Nginx (reverse proxy)
   |                 |
   | / (UI)          | /api (API)
   v                 v
UI (Express + EJS)   API (Express + JSON)
          \          /
           \        /
            v      v
             Postgres
```

### 2.2 Dove stanno i file (mappa rapida)

- Root del repo:
  - `docker-compose.yml` (stack locale base)
  - `docker-compose.prod.yml` (stack produzione)
  - `nginx/nginx.prod.conf` (config Nginx prod)
  - manuali di deploy (es. `DEPLOY_DIGITALOCEAN.md`)

- `services/api`:
  - `app.js`: entrypoint dell’API
  - `routes/`: routing delle API
  - `controllers/`: gestiscono la richiesta e costruiscono la risposta
  - `services/`: logica applicativa e accesso ai dati (layer “service”)
  - `models/`: modelli Sequelize (mappano tabelle DB)
  - `middleware/`: autenticazione/controlli

- `services/ui`:
  - `app.js`: entrypoint del server UI
  - `views/`: template EJS (pagine HTML renderizzate server-side)
  - `public/`: asset statici (CSS/JS/immagini/uploads)
  - `routes/`: routing pagine UI
  - `middleware/`: autenticazione/controlli

---

## 3) Architetture presenti nel progetto

Questo progetto unisce più “stili architetturali”:

### 3.1 Client–Server (Web)
- Il **client** è il browser.
- Il **server** è composto da più servizi (UI/API).

### 3.2 MVC (nel backend)
Nel servizio API (e in parte nella UI) si riconosce una struttura simile a **MVC**:

- **Model**: `services/api/models/*` (Sequelize)
- **Controller**: `services/api/controllers/*`
- **View**: nella UI con `EJS` (`services/ui/views/*`)

Nota: nella pratica reale si parla spesso di “MVC-like”, perché la separazione non è sempre perfetta.

### 3.3 3-tier / N-tier
- **Presentation tier**: UI (HTML/CSS/JS)
- **Application tier**: API (logica e regole)
- **Data tier**: Postgres

### 3.4 Microservizi? Non proprio
Ci sono più container, ma:
- UI e API sono servizi separati (bene),
- però condividono lo stesso dominio applicativo.

È più corretto parlare di **servizi separati (SOA leggera)** che di microservizi “puri”.

---

## 4) Reverse proxy (Nginx): perché serve?

Nginx è il **punto di ingresso**.

Cosa fa:
- **termina HTTPS** (gestisce certificati e TLS)
- instrada le richieste:
  - `/api/...` -> API
  - `/...` -> UI
- può fare redirect `http -> https` e `popostapo.com -> www.popostapo.com`

Riferimenti nel progetto:
- `nginx/nginx.prod.conf`

Esempio (idea):
- in config c’è un upstream `tennis_ui` e `tennis_api`
- `/api/` fa `proxy_pass` verso l’API

---

## 5) UI: cosa fa davvero il servizio `ui`?

Il servizio UI non è una Single Page App completa; è un server Node/Express che:

- serve file statici:
  - `services/ui/public/*` (JS, CSS, immagini, uploads)
- renderizza pagine con template EJS:
  - `services/ui/views/*`
- gestisce autenticazione (rotte di login/signup) e pagine protette

Entry point:
- `services/ui/app.js`

Punto didattico importante:
- Con EJS, parte dell’HTML viene generata sul server.
- Il browser riceve HTML già pronto, poi eventuale JS “arricchisce” la pagina.

---

## 6) API: che responsabilità ha il servizio `api`?

L’API è un server Express che espone endpoint JSON.

Entry point:
- `services/api/app.js`

Caratteristiche:
- usa CORS per permettere alla UI di chiamare l’API
- usa middleware di autenticazione (es. `requireAuth`)
- monta le rotte sotto `/api`

Esempio importante dal codice:
- `app.use("/api", requireAuth, apiRouter);`

Quindi:
- quasi tutte le rotte `/api/*` sono protette
- esiste un endpoint pubblico per login API:
  - `POST /api/auth/login`

---

## 7) Database: Postgres + ORM (Sequelize)

Il DB è Postgres.

Nel servizio API, l’accesso ai dati è gestito da Sequelize:
- i modelli in `services/api/models/*` rappresentano tabelle e relazioni

Vantaggi didattici:
- separazione tra “modello logico” (entità) e “query SQL”
- possibilità di validare/controllare dati in modo centralizzato

Nota: nel progetto esistono anche pezzi di **migrazione/seed** eseguiti all’avvio dell’API (query `ALTER TABLE`, `CREATE TABLE IF NOT EXISTS`, ecc.).

---

## 8) Autenticazione e sessione (idea generale)

Il progetto usa autenticazione con cookie/JWT (dal contesto e middleware).

Pattern tipico:
- l’utente fa login
- il server crea un token (es. JWT) e lo mette in cookie
- le richieste successive includono il cookie
- il middleware `requireAuth` controlla se l’utente è autenticato

Dove guardare:
- `services/api/middleware/authMiddleware.js`
- `services/ui/middleware/authMiddleware.js`

---

## 9) Docker e Docker Compose

### 9.1 Perché Docker?
Docker serve a:
- rendere l’ambiente “ripetibile”
- evitare problemi tipo “sul mio PC funziona”
- isolare dipendenze

### 9.2 Compose: orchestrazione locale e produzione

In locale (`docker-compose.yml`) di solito:
- Postgres
- API
- UI
- Nginx (solo HTTP, spesso)

In produzione (`docker-compose.prod.yml`):
- aggiunge volumi e rete dedicata
- aggiunge certbot e HTTPS

Riferimenti:
- `docker-compose.yml`
- `docker-compose.prod.yml`

Concetto chiave TPSIT:
- **rete virtuale** di Compose: i container si vedono tra loro per nome (`tennis-api`, `tennis-ui`, ecc.).
- ecco perché in compose si trova:
  - UI con `API=http://tennis-api:9000/api`

---

## 10) Flussi principali (use case)

### 10.1 Flusso: “Aprire una pagina protetta”

1. Browser -> `GET /friend/home`
2. Nginx inoltra a UI
3. UI (Express) controlla autenticazione (`requireAuth`)
4. UI renderizza EJS e invia HTML
5. JS lato client fa chiamate a `/api/...`
6. Nginx inoltra `/api/...` a API
7. API valida token/cookie (`requireAuth`) e legge/scrive su Postgres

### 10.2 Flusso: “Chiamare un endpoint API”

1. Browser -> `fetch('/api/rooms/my')`
2. Nginx -> API
3. API -> DB
4. API -> risposta JSON

---

## 11) Aspetti di qualità: sicurezza, manutenibilità, scalabilità

### 11.1 Sicurezza (base)
- HTTPS (Nginx + Let’s Encrypt)
- autenticazione e middleware
- separazione tra UI e API

### 11.2 Manutenibilità
- separazione in folder (`controllers`, `services`, `models`)
- monorepo: un’unica repo, ma più servizi

### 11.3 Scalabilità
- potenzialmente si può scalare UI e API separatamente (più repliche)
- Postgres resta un punto centrale (bottleneck possibile)

---

## 12) Glossario (TPSIT)

- **Monorepo**: un repo con più progetti/servizi.
- **Reverse proxy**: server che riceve richieste e le inoltra ad altri server.
- **Container**: processo isolato con file system e dipendenze proprie.
- **Docker Compose**: tool per definire e avviare più container insieme.
- **MVC**: Model–View–Controller.
- **API REST**: interfaccia HTTP con risorse, metodi, JSON.
- **CORS**: regole che permettono/limitano richieste tra domini.

---

## 13) Esercizi per gli alunni

### 13.1 Comprensione
1. Spiega perché è utile Nginx in questa architettura.
2. Differenza tra UI server-side (EJS) e una SPA.
3. Perché in Docker Compose la UI può chiamare `http://tennis-api:9000/api`?

### 13.2 Progettazione
4. Proponi una modifica per aggiungere un endpoint `/api/health` che ritorna `{ ok: true }`. In quale servizio va? Quali file tocchi?
5. Disegna un diagramma di sequenza (UML) del login.

### 13.3 Troubleshooting
6. Se un utente vede `502 Bad Gateway`, quali 3 controlli fai e dove?

---

## 14) Riferimenti pratici nel repo

- Stack e infrastruttura:
  - `docker-compose.yml`
  - `docker-compose.prod.yml`
  - `nginx/nginx.prod.conf`

- Entry point servizi:
  - `services/ui/app.js`
  - `services/api/app.js`

- Manuali operativi:
  - `DEPLOY_DIGITALOCEAN.md`
  - `modifiche_locali_to_droplet.md`

- Workflows IDE:
  - `.windsurf/workflows/commit-and-merge.md`
  - `.windsurf/workflows/deploy-digitalocean-droplet.md`
