---
description: Commit, push e merge su master (workflow locale)
---

# Obiettivo
Portare le modifiche locali su GitHub e allineare `master` in modo pulito.

# Contesto
- Questo workflow è **locale** (Windows / PowerShell).
- Non include deploy sul droplet.

# Passi

1. Verifica di essere nella repo corretta
   - Controlla che il terminale sia aperto sulla root del monorepo.

2. Controlla lo stato Git
   - Comando (PowerShell):
     - `git status`

3. (Opzionale) Controlla cosa stai per committare
   - Comandi:
     - `git diff`
     - `git diff --cached`

4. Stage selettivo oppure totale
   - Se vuoi aggiungere tutto:
     - `git add .`
   - Se vuoi aggiungere solo alcuni file:
     - `git add <paths...>`

5. Commit
   - Comando:
     - `git commit -m "<messaggio>"`

6. Push del branch corrente
   - Se stai lavorando su `master`:
     - `git push origin master`
   - Se stai lavorando su un feature branch:
     - `git push -u origin <branch>`

7. Merge su `master`
   - Caso A: merge fatto via GitHub PR
     - Verifica che `origin/master` sia aggiornato.
     - Poi riallinea in locale con rebase:
       - `git fetch origin`
       - `git pull --rebase origin master`
   - Caso B: merge in locale
     - Checkout `master`:
       - `git checkout master`
     - Allinea `master` con remoto:
       - `git pull --rebase origin master`
     - Merge del branch:
       - `git merge <branch>`
     - Push:
       - `git push origin master`

8. Pulizia: working tree pulito
   - Verifica finale:
     - `git status`

# Note
- Se `git push origin master` fallisce con `non-fast-forward`, integra prima `origin/master`:
  - consigliato: `git pull --rebase origin master`
- Se hai modifiche locali “rumorose” (es. file tracciati ma non ti interessano), usa `git stash` (consigliato) o `git restore`.
