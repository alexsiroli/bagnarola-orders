import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore'
import './Orders.css'

const Orders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

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
  const updateOrderStatus = async (orderId, newStatus, newStatusCode) => {
    try {
      const orderRef = doc(db, 'ordini', orderId)
      await updateDoc(orderRef, {
        status: newStatus,
        statusCode: newStatusCode,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Errore nell\'aggiornamento dello stato:', error)
      alert('Errore nell\'aggiornamento dello stato dell\'ordine')
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
                <select
                  value={order.status}
                  onChange={(e) => {
                    const newStatus = e.target.value
                    let newStatusCode = 0
                    switch (newStatus) {
                      case 'in_preparazione':
                        newStatusCode = 0
                        break
                      case 'pronto':
                        newStatusCode = 1
                        break
                      case 'consegnato':
                        newStatusCode = 2
                        break
                      case 'annullato':
                        newStatusCode = 3
                        break
                      default:
                        newStatusCode = 0
                    }
                    updateOrderStatus(order.id, newStatus, newStatusCode)
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
    </div>
  )
}

export default Orders
