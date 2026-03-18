# Misure anti-IDOR (Insecure Direct Object Reference)

## Obiettivo
Ridurre/azzerare il rischio che un client possa **forzare identificativi** (es. `:uuid` in path o `userId` nel body) per **leggere/modificare risorse di altri utenti**.

---

## 1) Principio applicato: “User identity only from JWT”
- **Regola**: l’identità dell’utente autenticato non viene mai presa dal client.
- **Fonte autorevole**: `res.locals.user` popolato a partire dal JWT.
- **Conseguenza**: nei controller la logica “chi è l’utente” deve derivare dal token, non da parametri o body della request.

---

## 2) Middleware unico per API: `requireAuthAndUser`
**File**: `services/api/middleware/authMiddleware.js`

- **Cosa fa**:
  - verifica il JWT
  - carica l’utente dal DB usando `decodedToken.uuid`
  - imposta `res.locals.user`
  - se token mancante/invalido o utente non trovato → `401 Unauthorized`
- **Vantaggio**:
  - evita la doppia `jwt.verify` (rispetto a `requireAuth` + `checkUser` separati)
  - garantisce che nelle API autenticate `res.locals.user` sia sempre disponibile

**Mount**: `services/api/app.js`
- tutte le rotte sotto `/api` passano da `requireAuthAndUser`

---

## 3) Invarianti operative (da rispettare in futuro)
- **Non accettare mai** `user_uuid`, `userId`, `uuid` “di ownership” dal body/query come fonte di verità.
- Se un endpoint è **user-scoped**:
  - applicare un controllo di autorizzazione coerente (es. self/admin o ownership check equivalente) prima di leggere/scrivere.
- Per endpoint di **scrittura** su risorse globali/sensibili:
  - default: accesso ristretto (ruoli elevati) salvo necessità diversa esplicita.
