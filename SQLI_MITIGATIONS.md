# SQL Injection (SQLi): guida rapida e mitigazioni

## Obiettivo
Questa nota descrive:
- cos’è una **SQL injection**
- quali danni può causare
- quali pattern di codice la rendono possibile
- quali contromisure adottare
- come queste contromisure sono state applicate nel progetto

---

## 1) Cos’è una SQL injection
Una SQL injection avviene quando **input controllato dall’utente** (query string, body, params, header, cookie) viene incorporato in una query SQL in modo tale da alterarne la semantica.

In pratica:
- il codice intende eseguire una query “A”
- l’attaccante riesce a trasformarla in una query “B” (es. aggiungendo `OR 1=1`, `UNION SELECT`, `; DROP TABLE ...`, ecc.)

---

## 2) Impatti possibili
- **Data leak**: lettura di dati non autorizzati.
- **Account takeover**: bypass di login/controlli se implementati male.
- **Data tampering**: modifica/cancellazione dati.
- **Privilege escalation**: scrittura su tabelle/colonne che abilitano ruoli.
- **Denial of Service**: query costose o blocchi (meno comune, ma possibile).

---

## 3) Pattern tipici vulnerabili (da evitare)
### 3.1 String concatenation
Esempio *non sicuro* (anti-pattern):
- costruire query con concatenazione o template string includendo input utente.

Concettualmente:
- `SELECT ... WHERE email = '${email}'`
- `... WHERE id = ${req.params.id}`

### 3.2 ORDER BY / LIMIT controllati dall’utente
Anche se i valori “sembrano innocui”, passare direttamente input a:
- `ORDER BY ${req.query.sort}`
- `LIMIT ${req.query.limit}`
può aprire a injection o a query malevole.

### 3.3 Funzioni “raw” / literal
Usare funzioni tipo:
- `sequelize.literal(userInput)`
- `sequelize.query("..." + userInput + "...")`
è rischioso se l’argomento dipende dall’utente.

---

## 4) Mitigazioni consigliate
### 4.1 Preferire ORM/Query Builder
Quando si usa un ORM (es. Sequelize) con `where: { ... }`, l’input viene gestito come **valore** e non come **codice SQL**, riducendo drasticamente la superficie SQLi.

### 4.2 Parameter binding / prepared statements
Se serve una query raw, usare parametri bindati:
- in Sequelize: `db.sequelize.query(sql, { replacements: {...} })`
- in `pg`: `pool.query(sql, [param1, param2, ...])`

### 4.3 Whitelist per sorting/paginazione
Per `order`, `sort`, `direction`, `limit`:
- usare una **lista di campi ammessi**
- normalizzare direzione (`ASC`/`DESC`)
- castare `limit/offset` a numeri e imporre un massimo

### 4.4 Validazione e casting dell’input
Non è la mitigazione primaria della SQLi (lo sono i parametri bindati), ma aumenta robustezza:
- `Number(req.params.id)` per ID numerici
- lunghezze min/max su stringhe
- normalizzazione (trim/lowercase)

### 4.5 Least privilege sul DB
Anche se non elimina SQLi, riduce l’impatto:
- user DB con permessi minimi necessari
- separare utenze per servizi se possibile

---

## 5) Come è stato mitigato nel progetto
### 5.1 Uso prevalente di Sequelize ORM
La maggior parte delle query usa `findAll/findByPk/update/destroy` con `where` strutturati. Questo pattern è **intrinsecamente più sicuro** contro SQLi rispetto a costruire SQL a mano.

### 5.2 Query raw solo dove necessario, con `replacements`
Dove viene usato `db.sequelize.query(...)`, è stato verificato che i parametri variabili sono passati tramite `replacements` (parameter binding), ad esempio:
- risoluzione `room_id` via `SELECT ... WHERE name = :name`
- inserimento `room_members` con `:user_uuid`

Questo evita che input variabile venga interpretato come SQL.

### 5.3 Uso di `sequelize.literal` solo con stringhe statiche
È presente un uso di `sequelize.literal("EXTRACT(YEAR FROM datafine)")` a scopo di indice/unique constraint. Essendo **statico**, non introduce SQLi.

---

## 6) Checklist rapida per review future
- Se vedi `sequelize.query(...)`:
  - controlla che non ci sia `${...}` con input utente
  - usa `replacements`/bind params
- Se vedi `literal(...)`:
  - deve essere statico oppure costruito solo da whitelist
- Se vedi `ORDER BY` dinamico:
  - introdurre whitelist/casting
- Evitare query SQL composte con concatenazioni/template string basate su `req.*`
