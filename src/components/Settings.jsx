import { useState } from 'react'
import { db } from '../firebase'
import { collection, getDocs, deleteDoc, doc, writeBatch, setDoc } from 'firebase/firestore'
import './Settings.css'

const Settings = () => {
  const [isResetting, setIsResetting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Funzione per resettare tutti gli ordini
  const resetAllOrders = async () => {
    setIsResetting(true)
    try {
      // Ottieni tutti gli ordini
      const ordersSnapshot = await getDocs(collection(db, 'ordini'))
      
      if (ordersSnapshot.empty) {
        alert('Nessun ordine da cancellare')
        setIsResetting(false)
        return
      }

      // Usa un batch per cancellare tutti gli ordini in una transazione
      const batch = writeBatch(db)
      
      ordersSnapshot.docs.forEach((orderDoc) => {
        batch.delete(doc(db, 'ordini', orderDoc.id))
      })

      // Esegui il batch
      await batch.commit()
      
      // Reset del contatore degli ordini a 0 (così il primo ordine sarà 1)
      try {
        const counterRef = doc(db, 'counters', 'orderCounter')
        await setDoc(counterRef, { currentNumber: 0 })
        console.log('✅ Contatore ordini resettato a 0')
      } catch (error) {
        console.error('⚠️ Errore nel reset del contatore ordini:', error)
        // Non blocchiamo il reset se fallisce il contatore
      }
      
      alert(`Tutti gli ordini sono stati cancellati. Il contatore ordini è stato resettato a 0.`)
      setShowConfirmDialog(false)
      
    } catch (error) {
      console.error('Errore durante il reset degli ordini:', error)
      alert('Errore durante il reset degli ordini. Riprova.')
    } finally {
      setIsResetting(false)
    }
  }

  // Funzione per confermare il reset
  const confirmReset = () => {
    setShowConfirmDialog(true)
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>⚙️ Impostazioni Sistema</h2>
        <p>Gestione configurazioni e operazioni di sistema</p>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h3>🔄 Reset Sistema</h3>
          <p>Questa operazione cancellerà tutti gli ordini esistenti e riporterà il contatore ordini a 0 (il primo ordine sarà #1).</p>
          <p className="warning-text">⚠️ Attenzione: Questa operazione non può essere annullata!</p>
          
          <div className="reset-actions">
            <button
              onClick={confirmReset}
              className="reset-btn"
              disabled={isResetting}
            >
              {isResetting ? '🔄 Reset in corso...' : '🗑️ Reset Tutti gli Ordini'}
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>📊 Informazioni Sistema</h3>
          <div className="system-info">
            <div className="info-item">
              <span className="info-label">Database:</span>
              <span className="info-value">Firebase Firestore</span>
            </div>
            <div className="info-item">
              <span className="info-label">Autenticazione:</span>
              <span className="info-value">Firebase Auth</span>
            </div>
            <div className="info-item">
              <span className="info-label">Framework:</span>
              <span className="info-value">React + Vite</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog di conferma reset */}
      {showConfirmDialog && (
        <div className="dialog-overlay">
          <div className="dialog-content settings-dialog">
            <div className="dialog-header">
              <h3>⚠️ Conferma Reset</h3>
              <button 
                onClick={() => setShowConfirmDialog(false)}
                className="close-dialog-btn"
              >
                ✕
              </button>
            </div>
            <div className="dialog-body">
              <div className="confirm-message">
                <p>Sei sicuro di voler cancellare <strong>TUTTI</strong> gli ordini?</p>
                <p>Questa operazione:</p>
                <ul>
                  <li>❌ Cancellerà tutti gli ordini esistenti</li>
                  <li>🔄 Resetterà il contatore ordini a 0</li>
                  <li>📊 Resetterà il contatore Firestore</li>
                  <li>💾 Manterrà intatti i piatti del menu</li>
                  <li>🚫 Non può essere annullata</li>
                </ul>
                <p className="final-warning">Vuoi procedere con il reset?</p>
              </div>
            </div>
            <div className="dialog-footer">
              <button 
                onClick={() => setShowConfirmDialog(false)}
                className="cancel-dialog-btn"
              >
                Annulla
              </button>
              <button 
                onClick={resetAllOrders}
                className="confirm-reset-btn"
                disabled={isResetting}
              >
                {isResetting ? '🔄 Reset in corso...' : '🗑️ Conferma Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
