# 🌐 Deploy su Netlify - Bagnarola Orders

## 🚀 Configurazione Completata

### **File Creati:**
- ✅ `netlify.toml` - Configurazione build e redirect
- ✅ `public/_redirects` - Gestione routing SPA
- ✅ `package.json` - Script di deploy aggiunto

## 📋 Passi per Deploy

### **1. Build Locale (Test)**
```bash
npm run build
npm run preview
```

### **2. Deploy su Netlify**

#### **Opzione A: Drag & Drop**
1. Vai su [netlify.com](https://netlify.com)
2. Crea account/effettua login
3. Trascina la cartella `dist` (dopo build) nella dashboard
4. Netlify farà il deploy automaticamente

#### **Opzione B: Git Integration (Raccomandato)**
1. Collega il repository GitHub a Netlify
2. Configura build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. Netlify farà deploy automatico ad ogni push

#### **Opzione C: CLI Netlify**
```bash
# Installa CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
npm run deploy
```

## ⚙️ Configurazione Netlify

### **Build Settings:**
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 18.x

### **Environment Variables:**
Aggiungi nel dashboard Netlify:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### **Redirects:**
Gestiti automaticamente da `netlify.toml`:
- Tutte le route reindirizzano a `index.html`
- Supporto completo per SPA routing

## 🔧 Troubleshooting

### **Problemi Comuni:**
1. **Build fallisce**: Verifica Node.js version (18+)
2. **Route non funzionano**: Controlla `_redirects` e `netlify.toml`
3. **Firebase non funziona**: Verifica environment variables

### **Test Post-Deploy:**
1. **Homepage** carica correttamente
2. **Registrazione** funziona
3. **Login** funziona
4. **Navigazione** tra sezioni funziona
5. **Logout** funziona

## 📱 URL Deploy

Dopo il deploy, avrai un URL tipo:
```
https://random-name.netlify.app
```

## 🎯 Prossimi Passi

1. **Fai build locale**: `npm run build`
2. **Testa build**: `npm run preview`
3. **Deploy su Netlify** (scegli metodo preferito)
4. **Configura environment variables**
5. **Testa l'app online**

**L'app è pronta per il deploy!** 🚀
