# Gestione Ordini - Esportazione/Importazione CSV

## Descrizione
Questa funzionalità permette di esportare e importare tutti gli ordini tramite file CSV per backup, analisi dati o migrazione tra ambienti.

## Funzionalità

### 📤 **Esportazione Ordini**
- **Scarica**: Tutti gli ordini con tutti i dettagli
- **Formato**: File CSV chiamato `ordini.csv` (come richiesto)
- **Contenuto**: Dati completi con metadati e prodotti
- **Utilizzo**: Backup, analisi dati, migrazione tra ambienti

### 📥 **Importazione Ordini**
- **Carica**: File CSV con ordini
- **Validazione**: Controlla la struttura del file prima dell'import
- **Sovrascrittura**: Cancella tutti gli ordini esistenti e carica i nuovi
- **Sicurezza**: Richiede conferma prima di procedere

## Struttura File CSV

### Formato Esportazione
```csv
Numero Ordine,Stato,Totale (€),Data Creazione,Data Aggiornamento,Data Completamento,Data Consegna,Prodotti,Numero Prodotti
1,in_preparazione,15.50,2024-01-15T10:30:00.000Z,2024-01-15T10:30:00.000Z,,,"2x Pizza Margherita (cibo) [€17.00]; 1x Coca Cola (bevande) [€3.50]",2
2,pronto,22.00,2024-01-15T11:00:00.000Z,2024-01-15T11:15:00.000Z,2024-01-15T11:15:00.000Z,,"1x Menu Completo (composito) [€22.00]",1
```

### Campi Esportati
- **Numero Ordine**: Numero progressivo dell'ordine
- **Stato**: Stato corrente (in_preparazione, pronto, consegnato, annullato)
- **Totale (€)**: Importo totale dell'ordine
- **Data Creazione**: Data e ora di creazione
- **Data Aggiornamento**: Data e ora dell'ultimo aggiornamento
- **Data Completamento**: Data e ora di completamento (se pronto)
- **Data Consegna**: Data e ora di consegna (se consegnato)
- **Prodotti**: Lista prodotti formattata (quantità x nome (categoria) [€totale_parziale])
- **Numero Prodotti**: Numero totale di prodotti nell'ordine

## Processo di Import

### 1. **Selezione File**
- Clicca su "📥 Importa Ordini (CSV)"
- Seleziona un file CSV valido
- Il sistema valida il formato del file

### 2. **Conferma Import**
- **⚠️ ATTENZIONE**: L'import cancellerà TUTTI gli ordini esistenti
- Richiede conferma esplicita dell'utente
- Mostra informazioni sul file selezionato

### 3. **Esecuzione Import**
- Cancella tutti gli ordini esistenti
- Reset del contatore ordini a 0
- Importa i nuovi ordini dal file CSV
- Genera nuovi ID per tutti i documenti
- Conferma il completamento con statistiche

## Parsing CSV

### **Gestione Virgole**
- I campi con virgole sono racchiusi tra virgolette
- Esempio: `"2x Pizza Margherita (cibo); 1x Coca Cola (bevande)"`

### **Formato Prodotti**
- Sintassi: `quantità x nome (categoria) [€totale_parziale]`
- Separatore tra prodotti: `;`
- Esempio: `2x Pizza Margherita (cibo) [€17.00]; 1x Coca Cola (bevande) [€3.50]`
- **Nota**: Il totale parziale è la spesa totale per quel prodotto (quantità × prezzo unitario)

### **Parsing Date**
- Formato ISO 8601: `2024-01-15T10:30:00.000Z`
- Gestione automatica dei timestamp Firestore
- Fallback per date non valide

## Sicurezza e Validazione

### **Validazione File**
- Controlla che il file sia in formato CSV valido
- Verifica la presenza degli header obbligatori
- Mostra errori dettagliati in caso di problemi

### **Header Obbligatori**
- `Numero Ordine` - Identificativo univoco
- `Stato` - Stato dell'ordine (in_preparazione, pronto, consegnato, annullato)
- `Totale (€)` - Importo
- `Data Creazione` - Data di creazione
- `Prodotti` - Lista prodotti

### **Protezioni**
- Conferma esplicita prima dell'import
- Backup automatico tramite esportazione
- Gestione errori robusta
- Rollback in caso di problemi

### **Limitazioni**
- Solo utenti autenticati possono accedere
- L'import è irreversibile (cancella tutto)
- Richiede file CSV con struttura corretta
- I prezzi dei prodotti vengono importati come totali parziali (quantità × prezzo unitario)

### **Gestione Ordini Staff**
- **Rilevamento**: Se il totale dell'ordine è 0, viene considerato ordine dello staff
- **Prezzi Parziali**: Tutti i prezzi parziali vengono impostati automaticamente a 0
- **Coerenza**: Mantiene la coerenza tra totale ordine e prezzi parziali
- **Esempio**: Ordine staff con 3 patatine → totale: 0€, parziale patatine: 0€

## Casi d'Uso

### 🔄 **Sincronizzazione Ambienti**
- **Sviluppo → Produzione**: Copia ordini da ambiente test a produzione
- **Backup → Ripristino**: Ripristina ordini dopo problemi o reset
- **Multi-sede**: Sincronizza ordini tra diversi ristoranti

### 💾 **Backup e Sicurezza**
- **Backup periodici**: Esporta ordini regolarmente per sicurezza
- **Analisi dati**: Analizza ordini con Excel o altri tool
- **Disaster Recovery**: Ripristina ordini in caso di emergenza

### 📊 **Analisi e Report**
- **Statistiche vendite**: Analizza trend e performance
- **Controllo qualità**: Verifica ordini e stati
- **Audit**: Traccia modifiche e movimenti

## Note Tecniche

### **Performance**
- Utilizza batch operations per operazioni multiple
- Gestione efficiente della memoria per file grandi
- Transazioni atomiche per consistenza dati

### **Compatibilità**
- Formato CSV standard e compatibile con Excel
- Supporta tutti i tipi di ordini e stati
- Mantiene metadati e timestamp
- Gestione automatica dei contatori

### **Gestione Errori**
- Validazione robusta dei dati CSV
- Parsing sicuro delle righe problematiche
- Messaggi di errore chiari e informativi
- Skip delle righe non valide

## Best Practices

### **Prima dell'Import**
1. **Esporta** sempre gli ordini esistenti come backup
2. **Verifica** la struttura del file CSV
3. **Testa** l'import in ambiente di sviluppo
4. **Comunica** con il team prima di importare in produzione

### **Formato CSV Consigliato**
- Usa virgolette per campi con virgole
- Mantieni formato date ISO 8601
- Verifica separatori e encoding
- Testa con Excel o Google Sheets

### **Dopo l'Import**
1. **Verifica** che tutti gli ordini siano stati caricati correttamente
2. **Controlla** stati e numeri ordine
3. **Testa** la creazione di nuovi ordini
4. **Documenta** le modifiche apportate

### **Manutenzione**
- **Backup regolari**: Esporta ordini settimanalmente
- **Versioning**: Mantieni versioni numerate dei file
- **Documentazione**: Registra tutte le modifiche apportate
- **Test periodici**: Verifica funzionalità import/export

## Esempi di Utilizzo

### **Backup Completo**
```bash
# Esporta tutti gli ordini
📤 Esporta Ordini (CSV) → ordini.csv

# File generato con timestamp
ordini_2024-01-15.csv
```

### **Migrazione Ambienti**
```bash
# 1. Esporta da ambiente sorgente
📤 Esporta Ordini (CSV) → ordini_produzione.csv

# 2. Importa in ambiente destinazione
📥 Importa Ordini (CSV) → ordini_produzione.csv
```

### **Analisi Dati**
```bash
# 1. Esporta ordini
📤 Esporta Ordini (CSV) → ordini.csv

# 2. Apri in Excel/Google Sheets
# 3. Analizza trend, stati, prodotti
# 4. Genera report e statistiche
```
