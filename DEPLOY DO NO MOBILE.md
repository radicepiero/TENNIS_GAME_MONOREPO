# Deploy su DigitalOcean (escludendo `services/mobile` con git sparse-checkout)
 
## 1) Setup una tantum sul droplet (modalità NON-cone, include file in root)
 
Esegui questi comandi **solo la prima volta** (o se devi cambiare l’elenco dei path inclusi).
 
1. SSH e vai nella repo:
   ```bash
   ssh root@138.68.94.153
   cd ~/TENNIS_GAME_MONOREPO
Abilita sparse-checkout (non-cone) e includi solo ciò che serve al deploy:


bash
git sparse-checkout disable 2>/dev/null || true \
  && git sparse-checkout init --no-cone \
  && git sparse-checkout set --no-cone \
    /docker-compose.prod.yml \
    /docker-compose.prod.local.yml \
    /nginx/ \
    /services/api/ \
    /services/ui/ \
    /.env.example
Verifiche rapide:


bash
git sparse-checkout list
test -d services/mobile && echo "mobile PRESENTE (non ok)" || echo "mobile ASSENTE (ok)"
ls -la docker-compose.prod.yml
Note:

Non usare git sparse-checkout init --cone se vuoi includere anche file singoli in root.
git sparse-checkout disable serve solo a ripulire configurazioni precedenti (se non esiste, non è un problema).
2) Deploy normale (da ripetere ogni volta)
Ogni volta che fai deploy di una nuova versione:

Allinea il codice:


bash
cd ~/TENNIS_GAME_MONOREPO
git fetch origin
git reset --hard origin/master
Rebuild + restart stack prod:



bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
(Opzionale) verifica servizi:



bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps