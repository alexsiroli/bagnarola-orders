# 🔥 Configurazione Firebase per Bagnarola Orders

## Problema Attuale
L'applicazione sta ricevendo errori di permessi Firebase:
```
FirebaseError: [code=permission-denied]: Missing or insufficient permissions.
```

## Soluzione: Configurare le Regole di Sicurezza

### 1. Accedi alla Console Firebase
- Vai su [console.firebase.google.com](https://console.firebase.google.com)
- Seleziona il progetto `bagnarola-orders`

### 2. Configura Firestore Database
- Nel menu laterale, clicca su **Firestore Database**
- Se non è ancora stato creato, clicca su **Crea database**
- Scegli la modalità **Test** per iniziare (permetti accesso pubblico temporaneamente)

### 3. Configura le Regole di Sicurezza
- Nella sezione Firestore, vai su **Regole**
- Sostituisci le regole esistenti con quelle del file `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regole per la collezione menu
    match /menu/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Regole per la collezione users
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Regole per altre collezioni future
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Crea gli Indici (Opzionale)
- Nella sezione Firestore, vai su **Indici**
- Clicca su **Crea indice**
- Configura l'indice per la collezione `menu`:
  - Collection ID: `menu`
  - Fields: `category` (Ascending), `name` (Ascending)

### 5. Verifica le Regole
- Dopo aver salvato le regole, attendi qualche minuto per la propagazione
- Le regole permettono:
  - ✅ **Lettura e scrittura** per utenti autenticati
  - ❌ **Nessun accesso** per utenti non autenticati

## Regole di Sicurezza Spiegate

### `allow read, write: if request.auth != null;`
- **Permette** accesso completo (lettura e scrittura) solo agli utenti autenticati
- **Blocca** tutti gli utenti non autenticati
- **Sicuro** perché richiede login Firebase

### `allow read, write: if request.auth != null && request.auth.uid == userId;`
- **Permette** agli utenti di accedere solo ai propri dati
- **Blocca** l'accesso ai dati di altri utenti

## Test delle Regole

### Test Positivo (Utente Autenticato)
```javascript
// ✅ Funziona - utente loggato
const user = auth.currentUser;
if (user) {
  // Può leggere e scrivere nel menu
  const menuRef = collection(db, 'menu');
  const snapshot = await getDocs(menuRef);
}
```

### Test Negativo (Utente Non Autenticato)
```javascript
// ❌ Fallisce - utente non loggato
const menuRef = collection(db, 'menu');
const snapshot = await getDocs(menuRef); // Errore: permission-denied
```

## Risoluzione Problemi

### Se le regole non funzionano:
1. **Attendi 5-10 minuti** per la propagazione
2. **Verifica** che l'utente sia autenticato
3. **Controlla** la console per errori di sintassi nelle regole
4. **Riprova** a riavviare l'applicazione

### Per Sviluppo (Regole Temporanee):
```javascript
// ⚠️ SOLO PER SVILUPPO - NON IN PRODUZIONE
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Accesso pubblico completo
    }
  }
}
```

## Prossimi Passi
1. Configura le regole di sicurezza
2. Riavvia l'applicazione
3. Testa la funzionalità del menu
4. Verifica che non ci siano più errori di permessi

## Supporto
Se i problemi persistono, controlla:
- Console Firebase per errori
- Log dell'applicazione
- Stato dell'autenticazione utente
- Configurazione delle variabili d'ambiente
