import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import './Consegna.css'

const Consegna = () => {
  const [readyOrders, setReadyOrders] = useState([])
  const [menuCompositi, setMenuCompositi] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)

  useEffect(() => {
    // Carica menu compositi e prodotti
    const loadMenuData = async () => {
      try {
        // Carica menu compositi
        const menuCompositiSnapshot = await getDocs(collection(db, 'menuCompositi'))
        const menuCompositiData = []
        menuCompositiSnapshot.forEach((doc) => {
          menuCompositiData.push({ id: doc.id, ...doc.data() })
        })
        setMenuCompositi(menuCompositiData)

        // Carica prodotti singoli
        const menuItemsSnapshot = await getDocs(collection(db, 'menu'))
        const menuItemsData = []
        menuItemsSnapshot.forEach((doc) => {
          menuItemsData.push({ id: doc.id, ...doc.data() })
        })
        setMenuItems(menuItemsData)
      } catch (error) {
        console.error('Errore nel caricamento dei menu:', error)
      }
    }

    loadMenuData()
  }, [])

  useEffect(() => {
    // Query per tutti gli ordini pronti (non consegnati)
    const ordersQuery = query(
      collection(db, 'ordini'),
      where('status', '==', 'pronto')
    )

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const orders = []
      
      snapshot.forEach((docSnapshot) => {
        const orderData = { id: docSnapshot.id, ...docSnapshot.data() }
        
        // Filtra le bevande dalla visualizzazione (ma mantieni l'ordine se ha altri cibi)
        const filteredItems = orderData.items.filter(item => {
          if (item.category === 'composito') {
            // Per i menu compositi, controlla se contengono cibi (non solo bevande)
            const menuComposito = menuCompositi.find(menu => menu.id === item.id)
            if (menuComposito && menuComposito.items) {
              return menuComposito.items.some(productId => {
                const product = menuItems.find(p => p.id === productId)
                return product && product.category !== 'bevande'
              })
            }
            return true // Se non trova il menu, mantieni l'ordine
          }
          return item.category !== 'bevande'
        })
        
        // Se dopo il filtro l'ordine ha ancora cibi, includilo
        if (filteredItems.length > 0) {
          orders.push({
            ...orderData,
            items: filteredItems
          })
        }
      })
      
      // Ordina ordini pronti dal più vecchio al più recente
      orders.sort((a, b) => {
        const dateA = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt)
        const dateB = b.completedAt?.toDate ? b.completedAt.toDate() : new Date(b.completedAt)
        return dateA - dateB // asc = dal più vecchio al più recente
      })
      
      setReadyOrders(orders)
      setLoading(false)
    }, (error) => {
      console.error('Errore nel caricamento degli ordini:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [menuCompositi, menuItems])

  // Funzione per mostrare i dettagli di un ordine
  const showOrderInfo = (order) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
  }

  // Funzione per chiudere i dettagli dell'ordine
  const closeOrderDetails = () => {
    setShowOrderDetails(false)
    setSelectedOrder(null)
  }

  // Funzione per consegnare un ordine (cambia stato da "pronto" a "consegnato")
  const deliverOrder = async (orderId) => {
    try {
      await updateDoc(doc(db, 'ordini', orderId), {
        status: 'consegnato',
        deliveredAt: new Date()
      })
      // Log rimosso per semplificare la console
    } catch (error) {
      console.error('❌ Errore nella consegna dell\'ordine:', error)
    }
  }

  if (loading || menuCompositi.length === 0 || menuItems.length === 0) {
    return (
      <div className="consegna-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento menu e ordini da consegnare...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="consegna-container">
      <div className="consegna-header">
        <h2>🚚 Consegna</h2>
        <p>Gestione ordini pronti da consegnare</p>
      </div>

      <div className="consegna-content">
        {readyOrders.length === 0 ? (
          <div className="no-orders">
            <p>Nessun ordine pronto da consegnare al momento</p>
            <p>🎉 Tutti gli ordini sono stati consegnati!</p>
          </div>
        ) : (
          <div className="orders-grid">
            {readyOrders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div className="order-number">
                    <span className="order-number-label">Ordine #{order.orderNumber}</span>
                  </div>
                </div>
                
                <div className="order-actions">
                  <button 
                    className="info-btn"
                    onClick={() => showOrderInfo(order)}
                  >
                    ℹ️ Info
                  </button>
                  <button 
                    className="deliver-btn"
                    onClick={() => deliverOrder(order.id)}
                  >
                    ✅ Consegna
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal per i dettagli dell'ordine */}
      {showOrderDetails && selectedOrder && (
        <div className="order-details-modal" onClick={closeOrderDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Dettagli Ordine #{selectedOrder.orderNumber}</h3>
              <button className="close-btn" onClick={closeOrderDetails}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="order-items">
                <div className="items-row">
                  {(() => {
                    // Raccoglie tutti i piatti (singoli + espansi dai menu compositi)
                    const allItems = []
                    
                    selectedOrder.items.forEach((item) => {
                      if (item.category === 'composito') {
                        // Espandi il menu composito nei suoi piatti componenti (escludendo bevande)
                        const menuComposito = menuCompositi.find(menu => menu.id === item.id)
                        if (menuComposito && menuComposito.items) {
                          menuComposito.items.forEach((productId) => {
                            const product = menuItems.find(p => p.id === productId)
                            if (product && product.category !== 'bevande') {
                              allItems.push({
                                name: product.name,
                                quantity: item.quantity
                              })
                            }
                          })
                        } else {
                          // Se non trova il menu composito, aggiungi il nome originale
                          allItems.push({
                            name: item.name,
                            quantity: item.quantity
                          })
                        }
                      } else {
                        // Piatto singolo (escludendo bevande)
                        if (item.category !== 'bevande') {
                          allItems.push({
                            name: item.name,
                            quantity: item.quantity
                          })
                        }
                      }
                    })
                    
                    // Raggruppa e somma le quantità dei piatti identici
                    const groupedItems = {}
                    allItems.forEach((item) => {
                      if (groupedItems[item.name]) {
                        groupedItems[item.name] += item.quantity
                      } else {
                        groupedItems[item.name] = item.quantity
                      }
                    })
                    
                    // Renderizza i piatti raggruppati
                    return Object.entries(groupedItems).map(([name, quantity], index) => (
                      <span key={index} className="item-name-only">
                        {quantity}x {name}
                      </span>
                    ))
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Consegna
