# Bagnarola Orders

Sistema di gestione ordinazioni per ristorante - Web App Desktop con Firebase

## Descrizione

Applicazione web per la gestione completa delle operazioni di un ristorante, inclusa la gestione degli ordini, della cassa, della cucina e del menu. L'app utilizza Firebase per l'autenticazione e il database.

## Sezioni Principali

- **💰 Cassa**: Gestione pagamenti e chiusura cassa
- **👨‍🍳 Cucina**: Visualizzazione ordini in preparazione
- **📋 Ordini**: Gestione e tracciamento ordini
- **🍽️ Menu**: Gestione piatti e prezzi
- **⚙️ Impostazioni**: Configurazione sistema

## Funzionalità di Autenticazione

- ✅ **Login/Logout** con email e password
- ✅ **Registrazione nuovi utenti** con selezione tipo account
- ✅ **Sistema di permessi** basato sul tipo di account
- ✅ **Protezione delle rotte** - accesso solo per utenti autenticati
- ✅ **Gestione stato utente** in tempo reale
- ✅ **Interfaccia di autenticazione** integrata con toggle login/registrazione
- ✅ **Validazione form** con messaggi di errore personalizzati

## Tipi di Account e Permessi

### **👑 Admin**
- **Accesso completo** a tutte le funzionalità
- **Gestione utenti** e permessi
- **Gestione menu** e prezzi
- **Report e statistiche**
- **Impostazioni sistema**

### **💰 Cassa**
- **Gestione ordini** e pagamenti
- **Chiusura cassa**
- **Accesso limitato** alle altre funzioni

### **👨‍🍳 Cucina**
- **Visualizzazione ordini** in preparazione
- **Aggiornamento stato** ordini
- **Selezione ordini** sincronizzata tra dispositivi
- **Accesso limitato** alle altre funzioni

## Installazione e Avvio

1. Installa le dipendenze:
```bash
npm install
```

2. Configura Firebase:
   - Crea un progetto Firebase
   - Abilita Authentication e Firestore
   - Le credenziali sono già configurate in `src/firebase.js`

3. Avvia l'applicazione in modalità sviluppo:
```bash
npm run dev
```

4. Apri il browser all'indirizzo indicato (solitamente http://localhost:5173)

5. Effettua il login con le credenziali Firebase

## Tecnologie Utilizzate

- **Frontend**: React 18, Vite
- **Backend**: Firebase (Authentication, Firestore)
- **Sincronizzazione**: Firestore Realtime Updates
- **Styling**: CSS3, Design System personalizzato
- **Build Tool**: Vite

## Struttura del Progetto

```
src/
├── components/
│   └── Auth.jsx          # Componente autenticazione con registrazione
├── hooks/
│   └── useUser.js        # Hook per gestione utente e permessi
├── App.jsx               # Componente principale con controllo permessi
├── App.css               # Stili dell'applicazione
├── firebase.js           # Configurazione Firebase
├── index.css             # Stili globali
└── main.jsx              # Punto di ingresso
```

## Configurazione Firebase

L'app è configurata per utilizzare:
- **Authentication**: Login con email/password
- **Firestore**: Database per ordini e menu
- **Configurazione**: Credenziali già impostate

## Funzionalità Attuali

- ✅ Interfaccia utente responsive
- ✅ Sistema di autenticazione completo
- ✅ Navigazione tra le sezioni protetta
- ✅ Layout chiaro e funzionale
- ✅ Design ottimizzato per desktop
- ✅ Gestione stato utente
- ✅ **Sincronizzazione selezioni cucina** tra dispositivi in tempo reale

## Prossimi Sviluppi

- Integrazione con stampanti per ricevute
- Gestione inventario
- Notifiche in tempo reale per la cucina
- Dashboard con statistiche e report
- Sistema di backup e sincronizzazione

## Sicurezza

- Tutte le rotte sono protette da autenticazione
- Credenziali Firebase gestite in modo sicuro
- Nessun dato sensibile esposto nel codice
