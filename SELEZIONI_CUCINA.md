# Sincronizzazione Selezioni Cucina

## Descrizione
Questa funzionalità permette di sincronizzare la selezione degli ordini nella sezione cucina tra diversi dispositivi in tempo reale.

## Come Funziona

### Selezione Ordini
- Gli utenti possono cliccare su un ordine in preparazione per selezionarlo
- La selezione viene evidenziata con un bordo verde
- Ricliccando sull'ordine, la selezione viene rimossa
- Solo gli ordini con stato "in_preparazione" possono essere selezionati

### Sincronizzazione
- Le selezioni vengono salvate nel database Firestore nella collezione `selezioniCucina`
- Ogni dispositivo ascolta i cambiamenti in tempo reale
- Le selezioni sono sincronizzate istantaneamente tra tutti i dispositivi

### Pulizia Automatica
- Le selezioni vengono rimosse automaticamente quando:
  - Un ordine viene completato (stato → "pronto")
  - Un ordine viene consegnato
  - Un ordine viene ripristinato in preparazione
  - Un ordine viene rimosso dalla lista

## Struttura Dati

### Collezione: `selezioniCucina`
```json
{
  "orderId": "string",
  "status": "in_preparazione",
  "selectedAt": "timestamp"
}
```

### Indici Firestore
- `status` (ASCENDING) - per ottimizzare le query di filtraggio

## Implementazione Tecnica

### Componenti Modificati
- `src/components/Cucina.jsx` - Logica principale
- `src/components/Cucina.css` - Stili per la selezione
- `firestore.indexes.json` - Indici per le performance

### Funzioni Principali
- `toggleOrderSelection()` - Gestisce il toggle della selezione
- `completeOrder()` - Rimuove la selezione quando l'ordine è completato
- `restoreOrder()` - Rimuove la selezione quando l'ordine è ripristinato

### Listener Firestore
- Ascolta i cambiamenti nella collezione `selezioniCucina`
- Filtra solo le selezioni per ordini in preparazione
- Pulisce automaticamente le selezioni orfane

## Vantaggi

1. **Collaborazione**: Più cuochi possono coordinarsi sulla preparazione
2. **Sincronizzazione**: Stato visivo identico su tutti i dispositivi
3. **Pulizia Automatica**: Nessuna selezione orfana nel database
4. **Performance**: Indici ottimizzati per le query frequenti
5. **Robustezza**: Gestione degli errori e fallback allo stato locale

## Note di Sicurezza

- Solo utenti autenticati possono accedere alle selezioni
- Le selezioni sono limitate agli ordini in preparazione
- Pulizia automatica previene l'accumulo di dati inutili
