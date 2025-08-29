import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore'
import './Orders.css'

const Orders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [searchOrderNumber, setSearchOrderNumber] = useState('')
  const [showOrderNotFound, setShowOrderNotFound] = useState(false)

  // Carica tutti gli ordini in tempo reale
  useEffect(() => {
    const ordersQuery = query(collection(db, 'ordini'), orderBy('orderNumber', 'asc'))
    
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersList = []
      snapshot.forEach((doc) => {
        ordersList.push({ id: doc.id, ...doc.data() })
      })
      setOrders(ordersList)
      setLoading(false)
    }, (error) => {
      console.error('Errore nel caricamento degli ordini:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Funzione per aggiornare lo stato dell'ordine
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'ordini', orderId)
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Errore nell\'aggiornamento dello stato:', error)
      alert('Errore nell\'aggiornamento dello stato dell\'ordine')
    }
  }

  // Funzione per annullare un ordine
  const cancelOrder = async (orderId) => {
    if (window.confirm('Sei sicuro di voler annullare questo ordine?')) {
      try {
        const orderRef = doc(db, 'ordini', orderId)
        await updateDoc(orderRef, {
          status: 'annullato',
          updatedAt: new Date()
        })
      } catch (error) {
        console.error('Errore nell\'annullamento dell\'ordine:', error)
        alert('Errore nell\'annullamento dell\'ordine')
      }
    }
  }

  // Funzione per aprire i dettagli dell'ordine
  const openOrderDetails = (order) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
  }

  // Funzione per cercare un ordine per numero
  const searchOrder = () => {
    const orderNumber = parseInt(searchOrderNumber)
    if (isNaN(orderNumber) || orderNumber <= 0) {
      alert('Inserisci un numero d\'ordine valido')
      return
    }

    const foundOrder = orders.find(order => order.orderNumber === orderNumber)
    if (foundOrder) {
      setSelectedOrder(foundOrder)
      setShowOrderDetails(true)
      setSearchOrderNumber('')
    } else {
      setShowOrderNotFound(true)
    }
  }

  // Funzione per gestire la pressione del tasto Invio
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchOrder()
    }
  }

  // Funzione per formattare la data
  const formatDate = (date) => {
    if (!date) return 'N/A'
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Funzione per ottenere il colore dello stato
  const getStatusColor = (status) => {
    switch (status) {
      case 'in_preparazione':
        return '#ff9800'
      case 'pronto':
        return '#4caf50'
      case 'consegnato':
        return '#2196f3'
      case 'annullato':
        return '#f44336'
      default:
        return '#757575'
    }
  }

  // Funzione per ottenere il testo dello stato
  const getStatusText = (status) => {
    switch (status) {
      case 'in_preparazione':
        return 'In Preparazione'
      case 'pronto':
        return 'Pronto'
      case 'consegnato':
        return 'Consegnato'
      case 'annullato':
        return 'Annullato'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="orders-container">
        <div className="loading-spinner">Caricamento ordini...</div>
      </div>
    )
  }

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h2>📋 Gestione Ordini</h2>
        <p>Visualizzazione di tutti gli ordini in ordine cronologico</p>
      </div>

      {/* Barra di ricerca */}
      <div className="search-section">
        <div className="search-container">
          <input
            type="number"
            placeholder="Cerca per numero ordine..."
            value={searchOrderNumber}
            onChange={(e) => setSearchOrderNumber(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className="search-input"
            min="1"
          />
          <button
            onClick={searchOrder}
            className="search-btn"
            disabled={!searchOrderNumber.trim()}
          >
            🔍 Cerca
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="no-orders">
          <p>Nessun ordine presente</p>
        </div>
      ) : (
        <div className="orders-list">
          <div className="orders-table-header">
            <div className="header-cell">Numero</div>
            <div className="header-cell">Data</div>
            <div className="header-cell">Prezzo</div>
            <div className="header-cell">Stato</div>
            <div className="header-cell">Azioni</div>
          </div>
          
          {orders.map((order) => (
            <div key={order.id} className="order-row">
              <div className="order-cell order-number">
                <span className="order-number-badge">#{order.orderNumber}</span>
              </div>
              
              <div className="order-cell order-date">
                {formatDate(order.createdAt)}
              </div>
              
              <div className="order-cell order-price">
                <span className="price-amount">€{order.total?.toFixed(2) || '0.00'}</span>
              </div>
              
              <div className="order-cell order-status">
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {getStatusText(order.status)}
                </span>
              </div>
              
              <div className="order-cell order-actions">
                <button
                  onClick={() => openOrderDetails(order)}
                  className="action-btn view-btn"
                  title="Visualizza dettagli ordine"
                >
                  👁️
                </button>
                <button
                  onClick={() => cancelOrder(order.id)}
                  className="action-btn cancel-btn"
                  title="Annulla ordine"
                  disabled={order.status === 'annullato' || order.status === 'consegnato'}
                >
                  ❌
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="orders-summary">
        <div className="summary-item">
          <span className="summary-label">Totale Ordini:</span>
          <span className="summary-value">{orders.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">In Preparazione:</span>
          <span className="summary-value">
            {orders.filter(o => o.status === 'in_preparazione').length}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Pronti:</span>
          <span className="summary-value">
            {orders.filter(o => o.status === 'pronto').length}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Consegnati:</span>
          <span className="summary-value">
            {orders.filter(o => o.status === 'consegnato').length}
          </span>
        </div>
      </div>

      {/* Popup Dettagli Ordine */}
      {showOrderDetails && selectedOrder && (
        <div className="dialog-overlay">
          <div className="dialog-content order-details-dialog">
            <div className="dialog-header">
              <h3>📋 Dettagli Ordine #{selectedOrder.orderNumber}</h3>
              <button 
                onClick={() => setShowOrderDetails(false)}
                className="close-dialog-btn"
              >
                ✕
              </button>
            </div>
            <div className="dialog-body">
              <div className="order-details-section">
                <h4>Informazioni Generali</h4>
                <div className="order-info-grid">
                  <div className="info-item">
                    <span className="info-label">Numero Ordine:</span>
                    <span className="info-value">#{selectedOrder.orderNumber}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Data Creazione:</span>
                    <span className="info-value">{formatDate(selectedOrder.createdAt)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Stato Attuale:</span>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(selectedOrder.status) }}
                    >
                      {getStatusText(selectedOrder.status)}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Totale:</span>
                    <span className="info-value price">€{selectedOrder.total?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>

              <div className="order-details-section">
                <h4>Prodotti Ordinati</h4>
                <div className="order-items-list">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="order-item-detail">
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        <span className="item-category">({item.category})</span>
                      </div>
                      <div className="item-details">
                        <span className="item-quantity">Qty: {item.quantity}</span>
                        <span className="item-price">€{selectedOrder.total === 0 ? '0.00' : (item.quantity * (item.price || 0)).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="order-details-section">
                <h4>Aggiorna Stato</h4>
                <div className="status-update-section">
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      updateOrderStatus(selectedOrder.id, newStatus);
                      setSelectedOrder({...selectedOrder, status: newStatus});
                    }}
                    className="status-select"
                  >
                    <option value="in_preparazione">In Preparazione</option>
                    <option value="pronto">Pronto</option>
                    <option value="consegnato">Consegnato</option>
                    <option value="annullato">Annullato</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="dialog-footer">
              <button 
                onClick={() => setShowOrderDetails(false)}
                className="cancel-dialog-btn"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Ordine Non Trovato */}
      {showOrderNotFound && (
        <div className="dialog-overlay">
          <div className="dialog-content order-not-found-dialog">
            <div className="dialog-header">
              <h3>❌ Ordine Non Trovato</h3>
              <button 
                onClick={() => setShowOrderNotFound(false)}
                className="close-dialog-btn"
              >
                ✕
              </button>
            </div>
            <div className="dialog-body">
              <div className="not-found-message">
                <p>L'ordine #{searchOrderNumber} non esiste nel sistema.</p>
                <p>Verifica il numero d'ordine e riprova.</p>
              </div>
            </div>
            <div className="dialog-footer">
              <button 
                onClick={() => setShowOrderNotFound(false)}
                className="cancel-dialog-btn"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Orders
