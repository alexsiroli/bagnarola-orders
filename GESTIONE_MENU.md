# Gestione Menu e Piatti - Esportazione/Importazione CSV

## Descrizione
Questa funzionalità permette di esportare e importare tutti i menu, piatti e bevande tramite file CSV per backup, migrazione o sincronizzazione tra ambienti.

## Funzionalità

### 📤 **Esportazione Menu**
- **Scarica**: Tutti i menu compositi e piatti singoli (inclusi bevande)
- **Formato**: File CSV chiamato `menu.csv`
- **Contenuto**: Dati completi con metadati di esportazione
- **Utilizzo**: Backup, migrazione, sincronizzazione tra ambienti

### 📥 **Importazione Menu**
- **Carica**: File JSON con menu e piatti
- **Validazione**: Controlla la struttura del file prima dell'import
- **Sovrascrittura**: Cancella tutti i dati esistenti e carica i nuovi
- **Sicurezza**: Richiede conferma prima di procedere

## Struttura File JSON

### Formato Esportazione CSV
Il file CSV contiene due sezioni separate da una riga vuota:

#### **Sezione Prodotti Singoli**
```csv
ID Prodotto,Nome,Prezzo (€),Categoria,Quantità,Descrizione,Disponibile,Data Creazione
prod_001,"Pizza Margherita",8.50,cibo,10,"Pizza con pomodoro e mozzarella",Sì,2024-01-15T10:30:00.000Z
prod_002,"Coca Cola",2.50,bevande,25,"Bibita gassata",Sì,2024-01-15T10:30:00.000Z
```

#### **Sezione Menu Compositi**
```csv
ID Menu,Nome Menu,Prezzo (€),Descrizione,Prodotti Componenti,Numero Prodotti,Quantità Disponibile,Data Creazione
menu_001,"Menu Completo",15.50,"Menu con pizza e bevanda","prod_001; prod_002",2,8,2024-01-15T10:30:00.000Z
```

### Campi Esportati

#### **Prodotti Singoli**
- **ID Prodotto**: Identificativo univoco del prodotto
- **Nome**: Nome del prodotto
- **Prezzo (€)**: Prezzo in euro
- **Categoria**: Tipo di prodotto (cibo, bevande, composito)
- **Quantità**: Quantità disponibile in magazzino
- **Descrizione**: Descrizione del prodotto
- **Disponibile**: Disponibilità (Sì/No)
- **Data Creazione**: Timestamp di creazione

#### **Menu Compositi**
- **ID Menu**: Identificativo univoco del menu
- **Nome Menu**: Nome del menu composito
- **Prezzo (€)**: Prezzo totale del menu
- **Descrizione**: Descrizione del menu
- **Prodotti Componenti**: Lista ID prodotti separati da punto e virgola
- **Numero Prodotti**: Numero di prodotti nel menu
- **Quantità Disponibile**: Quantità minima disponibile del menu
- **Data Creazione**: Timestamp di creazione

## Processo di Import

### 1. **Selezione File**
- Clicca su "📥 Importa Menu (CSV)"
- Seleziona un file CSV valido
- Il sistema valida il formato del file

### 2. **Conferma Import**
- **⚠️ ATTENZIONE**: L'import cancellerà TUTTI i menu e piatti esistenti
- Richiede conferma esplicita dell'utente
- Mostra informazioni sul file selezionato

### 3. **Esecuzione Import**
- Cancella tutti i dati esistenti (menu + piatti)
- Importa i nuovi dati dal file JSON
- Genera nuovi ID per tutti i documenti
- Conferma il completamento con statistiche

## Sicurezza e Validazione

### **Validazione File**
- Controlla che il file sia in formato CSV valido
- Verifica la presenza degli header obbligatori per entrambe le sezioni
- Controlla la separazione tra prodotti e menu compositi
- Mostra errori dettagliati in caso di problemi

### **Protezioni**
- Conferma esplicita prima dell'import
- Backup automatico tramite esportazione
- Gestione errori robusta
- Rollback in caso di problemi

### **Limitazioni**
- Solo utenti autenticati possono accedere
- L'import è irreversibile (cancella tutto)
- Richiede file JSON con struttura corretta

## Casi d'Uso

### 🔄 **Sincronizzazione Ambienti**
- **Sviluppo → Produzione**: Copia menu da ambiente test a produzione
- **Backup → Ripristino**: Ripristina menu dopo problemi o reset
- **Multi-sede**: Sincronizza menu tra diversi ristoranti

### 💾 **Backup e Sicurezza**
- **Backup periodici**: Esporta menu regolarmente per sicurezza
- **Versioning**: Mantieni versioni diverse del menu
- **Disaster Recovery**: Ripristina menu in caso di emergenza

### 📋 **Gestione Menu**
- **Aggiornamenti stagionali**: Cambia menu per stagioni
- **Test nuove ricette**: Prova menu in ambiente test
- **Standardizzazione**: Uniforma menu tra diverse sedi

## Note Tecniche

### **Performance**
- Utilizza batch operations per operazioni multiple
- Gestione efficiente della memoria per file grandi
- Transazioni atomiche per consistenza dati

### **Compatibilità**
- Formato CSV standard e compatibile con Excel
- Supporta tutti i tipi di prodotti (cibo, bevande, compositi)
- Mantiene metadati e timestamp
- Gestione separazione sezioni con riga vuota

### **Gestione Errori**
- Validazione robusta dei dati
- Messaggi di errore chiari e informativi
- Rollback automatico in caso di problemi

## Best Practices

### **Prima dell'Import**
1. **Esporta** sempre i dati esistenti come backup
2. **Verifica** la struttura del file JSON
3. **Testa** l'import in ambiente di sviluppo
4. **Comunica** con il team prima di importare in produzione

### **Dopo l'Import**
1. **Verifica** che tutti i dati siano stati caricati correttamente
2. **Controlla** prezzi e disponibilità
3. **Testa** la creazione di ordini
4. **Documenta** le modifiche apportate

### **Manutenzione**
- **Backup regolari**: Esporta menu settimanalmente
- **Versioning**: Mantieni versioni numerate dei menu
- **Documentazione**: Registra tutte le modifiche apportate
