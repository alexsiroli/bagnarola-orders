import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import './Cucina.css'

const Cucina = () => {
  const [ordersInPreparation, setOrdersInPreparation] = useState([])
  const [readyOrders, setReadyOrders] = useState([])
  const [menuCompositi, setMenuCompositi] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState(new Set())

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
    // Query per tutti gli ordini in preparazione e pronti (non consegnati)
    // Nota: rimuovo orderBy per evitare problemi di indice composito
    const ordersQuery = query(
      collection(db, 'ordini'),
      where('status', 'in', ['in_preparazione', 'pronto'])
    )

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersInPrep = []
      const ordersReady = []
      
      snapshot.forEach((docSnapshot) => {
        const orderData = { id: docSnapshot.id, ...docSnapshot.data() }
        
        // Controlla se l'ordine contiene solo bevande
        const hasOnlyBeverages = orderData.items.every(item => {
          if (item.category === 'composito') {
            // Per i menu compositi, controlla se contengono solo bevande
            const menuComposito = menuCompositi.find(menu => menu.id === item.id)
            if (menuComposito && menuComposito.items) {
              return menuComposito.items.every(productId => {
                const product = menuItems.find(p => p.id === productId)
                return product && product.category === 'bevande'
              })
            }
            return false // Se non trova il menu, considera che non è solo bevande
          }
          return item.category === 'bevande'
        })
        
        // Se l'ordine contiene solo bevande, aggiorna automaticamente lo stato a "consegnato"
        if (hasOnlyBeverages && orderData.status === 'in_preparazione') {
          updateDoc(doc(db, 'ordini', docSnapshot.id), {
            status: 'consegnato',
            deliveredAt: new Date()
          }).catch(error => {
            console.error('Errore nell\'aggiornamento automatico ordine bevande:', error)
          })
          return // Non includere questo ordine nella lista cucina
        }
        
        // Filtra le bevande dalla visualizzazione (ma mantieni l'ordine se ha altri cibi)
        const filteredItems = orderData.items.filter(item => {
          if (item.category === 'composito') {
            // Per i menu compositi, controlla se contengono cibi (non solo bevande)
            const menuComposito = menuCompositi.find(menu => menu.id === item.id)
            if (menuComposito && menuCompositi.items) {
              return menuCompositi.items.some(productId => {
                const product = menuItems.find(p => p.id === productId)
                return product && product.category !== 'bevande'
              })
            }
            return true // Se non trova il menu, mantieni l'ordine
          }
          return item.category !== 'bevande'
        })
        
              // Se dopo il filtro l'ordine ha ancora cibi, includilo nella lista appropriata
      if (filteredItems.length > 0) {
        const orderWithFilteredItems = {
          ...orderData,
          items: filteredItems
        }
        
        if (orderData.status === 'in_preparazione') {
          ordersInPrep.push(orderWithFilteredItems)
        } else if (orderData.status === 'pronto') {
          // Solo ordini "pronto" (non "consegnato")
          ordersReady.push(orderWithFilteredItems)
        }
      }
      })
      
      // Ordina ordini in preparazione dal meno recente al più recente
      ordersInPrep.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
        return dateA - dateB // asc = dal meno recente al più recente
      })
      
      // Ordina ordini pronti dal più recente al meno recente
      ordersReady.sort((a, b) => {
        const dateA = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt)
        const dateB = b.completedAt?.toDate ? b.completedAt.toDate() : new Date(b.completedAt)
        return dateB - dateA // desc = dal più recente al meno recente
      })
      
      setOrdersInPreparation(ordersInPrep)
      setReadyOrders(ordersReady)
      setLoading(false)
    }, (error) => {
      console.error('Errore nel caricamento degli ordini:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  {/* Funzione formatDate rimossa - non più necessaria */}

  // Funzione per gestire il toggle della selezione ordine
  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(orderId)) {
        newSelected.delete(orderId)
      } else {
        newSelected.add(orderId)
      }
      return newSelected
    })
  }

  // Funzione per completare un ordine (cambia stato a "pronto")
  const completeOrder = async (orderId) => {
    try {
      await updateDoc(doc(db, 'ordini', orderId), {
        status: 'pronto',
        completedAt: new Date()
      })
      console.log('✅ Ordine completato:', orderId)
    } catch (error) {
      console.error('❌ Errore nel completare l\'ordine:', error)
    }
  }

  // Funzione per ripristinare un ordine completato (rimette in preparazione)
  const restoreOrder = async (orderId) => {
    try {
      await updateDoc(doc(db, 'ordini', orderId), {
        status: 'in_preparazione',
        completedAt: null
      })
      console.log('🔄 Ordine ripristinato:', orderId)
    } catch (error) {
      console.error('❌ Errore nel ripristinare l\'ordine:', error)
    }
  }

  {/* Funzione calculateTotal rimossa - non più necessaria */}

  if (loading || menuCompositi.length === 0 || menuItems.length === 0) {
    return (
      <div className="cucina-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento menu e ordini...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="cucina-container">
      <div className="cucina-header">
        <h2>👨‍🍳 Cucina</h2>
        <p>Gestione ordini in preparazione</p>
      </div>

      <div className="orders-section">
        <h3>📋 Ordini in Preparazione</h3>
        
        {ordersInPreparation.length === 0 ? (
          <div className="no-orders">
            <p>Nessun ordine in preparazione al momento</p>
            <p>🎉 Tutti gli ordini sono stati completati!</p>
          </div>
        ) : (
          <div className="orders-list">
            {ordersInPreparation.map((order) => (
              <div 
                key={order.id} 
                className={`order-card ${selectedOrders.has(order.id) ? 'selected' : ''}`}
                onClick={() => toggleOrderSelection(order.id)}
              >
                <div className="order-header">
                  <div className="order-number">
                    <span className="order-number-label">Ordine #{order.orderNumber}</span>
                  </div>
                  <button 
                    className="complete-order-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      completeOrder(order.id)
                    }}
                  >
                    ✅ Completato
                  </button>
                </div>
                
                <div className="order-items">
                  <div className="items-row">
                    {(() => {
                      // Raccoglie tutti i piatti (singoli + espansi dai menu compositi)
                      const allItems = []
                      
                      order.items.forEach((item) => {
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
                
                {/* Footer rimosso - totale e stato non necessari per la cucina */}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Separazione */}
      <div className="orders-separator"></div>

      {/* Sezione ordini pronti (non consegnati) */}
      <div className="orders-section completed-orders">
        <h3>✅ Ordini Pronti</h3>
        
        {readyOrders.length === 0 ? (
          <div className="no-orders">
            <p>Nessun ordine pronto al momento</p>
            <p>🚚 Tutti gli ordini pronti sono stati consegnati!</p>
          </div>
        ) : (
          <div className="orders-list">
            {readyOrders.map((order) => (
              <div 
                key={order.id} 
                className="order-card completed"
                onClick={() => toggleOrderSelection(order.id)}
              >
                <div className="order-header">
                  <div className="order-number">
                    <span className="order-number-label">Ordine #{order.orderNumber}</span>
                  </div>
                  <button 
                    className="restore-order-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      restoreOrder(order.id)
                    }}
                  >
                    🔄 Ripristina
                  </button>
                </div>
                
                <div className="order-items">
                  <div className="items-row">
                    {(() => {
                      // Raccoglie tutti i piatti (singoli + espansi dai menu compositi)
                      const allItems = []
                      
                      order.items.forEach((item) => {
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Cucina
