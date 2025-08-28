import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore'

const Cassa = () => {
  const [menuItems, setMenuItems] = useState([])
  const [menuCompositi, setMenuCompositi] = useState([])
  const [currentOrder, setCurrentOrder] = useState([])
  const [orderNumber, setOrderNumber] = useState(1)
  const [lastOrderNumber, setLastOrderNumber] = useState(0)
  const [total, setTotal] = useState(0)
  const [showOrderSummary, setShowOrderSummary] = useState(false)
  const [confirmedOrder, setConfirmedOrder] = useState(null)

  // Carica i prodotti dal menu
  useEffect(() => {
    const loadMenu = async () => {
      try {
        // Carica prodotti singoli
        const menuQuery = query(collection(db, 'menu'), orderBy('createdAt', 'asc'))
        const menuSnapshot = await getDocs(menuQuery)
        const items = []
        menuSnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() })
        })
        setMenuItems(items)

        // Carica menu compositi
        const compositiQuery = query(collection(db, 'menuCompositi'), orderBy('createdAt', 'asc'))
        const compositiSnapshot = await getDocs(compositiQuery)
        const compositi = []
        compositiSnapshot.forEach((doc) => {
          compositi.push({ id: doc.id, ...doc.data() })
        })
        setMenuCompositi(compositi)
      } catch (error) {
        console.error('Errore nel caricamento del menu:', error)
      }
    }

    loadMenu()
  }, [])

  // Carica l'ultimo numero d'ordine
  useEffect(() => {
    const loadLastOrderNumber = async () => {
      try {
        const ordersQuery = query(collection(db, 'ordini'), orderBy('orderNumber', 'desc'))
        const ordersSnapshot = await getDocs(ordersQuery)
        
        if (!ordersSnapshot.empty) {
          const lastOrder = ordersSnapshot.docs[0].data()
          setLastOrderNumber(lastOrder.orderNumber)
          setOrderNumber(lastOrder.orderNumber + 1)
        } else {
          setLastOrderNumber(0)
          setOrderNumber(1)
        }
      } catch (error) {
        console.error('Errore nel caricamento del numero ordine:', error)
      }
    }

    loadLastOrderNumber()
  }, [])

  // Calcola il totale quando cambia l'ordine
  useEffect(() => {
    const newTotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    setTotal(newTotal)
  }, [currentOrder])

  // Aggiunge un prodotto all'ordine
  const addToOrder = (item) => {
    // Per i menu compositi, cerca per nome e categoria
    const existingItem = currentOrder.find(orderItem => 
      orderItem.name === item.name && orderItem.category === item.category
    )
    
    if (existingItem) {
      // Se l'item esiste già, aumenta la quantità
      setCurrentOrder(prev => 
        prev.map(orderItem => 
          (orderItem.name === item.name && orderItem.category === item.category)
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem
        )
      )
    } else {
      // Se è un nuovo item, lo aggiunge
      setCurrentOrder(prev => [...prev, { ...item, quantity: 1 }])
    }
  }

  // Rimuove un prodotto dall'ordine (per ID)
  const removeFromOrder = (itemId) => {
    setCurrentOrder(prev => prev.filter(item => item.id !== itemId))
  }

  // Modifica la quantità di un prodotto
  const updateQuantity = (itemName, itemCategory, newQuantity) => {
    if (newQuantity <= 0) {
      removeAllItemsByName(itemName, itemCategory)
      return
    }
    
    // Aggiorna tutti gli item con lo stesso nome e categoria
    setCurrentOrder(prev => 
      prev.map(item => 
        (item.name === itemName && item.category === itemCategory)
          ? { ...item, quantity: newQuantity }
          : item
      )
    )
  }

  // Rimuove un prodotto dall'ordine (per nome e categoria)
  const removeFromOrderByName = (itemName, itemCategory) => {
    setCurrentOrder(prev => prev.filter(item => !(item.name === itemName && item.category === itemCategory)))
  }

  // Rimuove tutti gli item con lo stesso nome e categoria
  const removeAllItemsByName = (itemName, itemCategory) => {
    setCurrentOrder(prev => prev.filter(item => !(item.name === itemName && item.category === itemCategory)))
  }

  // Conferma l'ordine e mostra il riepilogo
  const confirmOrder = async () => {
    if (currentOrder.length === 0) {
      alert('Aggiungi almeno un prodotto all\'ordine')
      return
    }

    // Prepara i dati dell'ordine
    const orderData = {
      orderNumber: orderNumber,
      items: currentOrder.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.category
      })),
      total: total,
      status: 'in_preparazione', // Stato dell'ordine
      statusCode: 0, // Codice numerico per lo stato
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Mostra il riepilogo dell'ordine
    setConfirmedOrder(orderData)
    setShowOrderSummary(true)
  }

  // Salva effettivamente l'ordine nel database
  const saveOrder = async () => {
    try {
      // Salva l'ordine nel database
      await addDoc(collection(db, 'ordini'), confirmedOrder)

      // Reset dell'ordine e incrementa il numero
      setCurrentOrder([])
      setOrderNumber(prev => prev + 1)
      setTotal(0)
      setLastOrderNumber(confirmedOrder.orderNumber)
      setShowOrderSummary(false)
      setConfirmedOrder(null)

      alert(`Ordine #${confirmedOrder.orderNumber} confermato e salvato!`)
    } catch (error) {
      console.error('Errore nel salvataggio dell\'ordine:', error)
      alert('Errore nel salvataggio dell\'ordine')
    }
  }

  // Annulla l'ordine e torna alla selezione
  const cancelOrder = () => {
    setShowOrderSummary(false)
    setConfirmedOrder(null)
  }

  // Funzione helper per ottenere l'etichetta della categoria
  const getCategoryLabel = (category) => {
    switch (category) {
      case 'composito':
        return '🍽️ Menu Compositi'
      case 'cibo':
        return '🍽️ Cibi'
      case 'bevande':
        return '🥤 Bevande'
      default:
        return category
    }
  }

  // Raggruppa gli item per categoria nell'ordine del menu
  const groupedItems = {
    compositi: menuCompositi.map(menu => ({ ...menu, category: 'composito' })),
    cibo: menuItems.filter(item => item.category === 'cibo'),
    bevande: menuItems.filter(item => item.category === 'bevande')
  }

  // Raggruppa gli item dell'ordine per nome e categoria, mantenendo l'ordine
  const groupedOrderItems = currentOrder.reduce((acc, item) => {
    const key = `${item.name}-${item.category}`
    if (acc[key]) {
      acc[key].quantity += item.quantity
    } else {
      acc[key] = { ...item }
    }
    return acc
  }, {})

  // Ordina gli item dell'ordine secondo l'ordine del menu
  const sortedOrderItems = Object.values(groupedOrderItems).sort((a, b) => {
    const categoryOrder = { 'composito': 0, 'cibo': 1, 'bevande': 2 }
    return categoryOrder[a.category] - categoryOrder[b.category]
  })

  return (
    <div className="cassa-section">
      <div className="cassa-header">
        <h2>💰 Cassa</h2>
        <div className="last-order-info">
          <span className="label">Ultimo ordine: #{lastOrderNumber}</span>
        </div>
      </div>

      <div className="cassa-content">
        {/* Sezione sinistra - Selezione prodotti */}
        <div className="products-selection">
          {/* Menu Compositi */}
          <div className="category-section">
            <h3>🍽️ Menu Compositi</h3>
            <div className="products-grid">
              {groupedItems.compositi.map(item => (
                <button
                  key={item.id}
                  onClick={() => addToOrder(item)}
                  className="product-button"
                >
                  <div className="product-name">{item.name}</div>
                  <div className="product-price">€{item.price.toFixed(2)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Cibi */}
          <div className="category-section">
            <h3>🍽️ Cibi</h3>
            <div className="products-grid">
              {groupedItems.cibo.map(item => (
                <button
                  key={item.id}
                  onClick={() => addToOrder(item)}
                  className="product-button"
                >
                  <div className="product-name">{item.name}</div>
                  <div className="product-price">€{item.price.toFixed(2)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Bevande */}
          <div className="category-section">
            <h3>🥤 Bevande</h3>
            <div className="products-grid">
              {groupedItems.bevande.map(item => (
                <button
                  key={item.id}
                  onClick={() => addToOrder(item)}
                  className="product-button"
                >
                  <div className="product-name">{item.name}</div>
                  <div className="product-price">€{item.price.toFixed(2)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

                {/* Sezione destra - Riepilogo ordine o conferma */}
        <div className="order-summary">
          {showOrderSummary ? (
            // Riepilogo ordine confermato
            <div className="order-confirmation">
              <h3>📋 Riepilogo Ordine #{confirmedOrder.orderNumber}</h3>
              
              <div className="confirmed-order-items">
                {confirmedOrder.items
                  .sort((a, b) => {
                    const categoryOrder = { 'composito': 0, 'cibo': 1, 'bevande': 2 }
                    return categoryOrder[a.category] - categoryOrder[b.category]
                  })
                  .map((item, index, sortedItems) => {
                    const prevItem = index > 0 ? sortedItems[index - 1] : null
                    const showSeparator = prevItem && prevItem.category !== item.category
                    
                    return (
                      <div key={`${item.name}-${item.category}`}>
                        {showSeparator && (
                          <div className="category-separator">
                            <span className="separator-line"></span>
                            <span className="separator-text">{getCategoryLabel(item.category)}</span>
                            <span className="separator-line"></span>
                          </div>
                        )}
                        <div className="confirmed-order-item">
                          <div className="item-info">
                            <span className="item-name">{item.quantity}x {item.name}</span>
                            <span className="item-price">€{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              <div className="confirmed-order-total">
                <span className="total-label">Totale Ordine:</span>
                <span className="total-amount">€{confirmedOrder.total.toFixed(2)}</span>
              </div>

              <div className="order-confirmation-actions">
                <button
                  onClick={cancelOrder}
                  className="cancel-order-btn"
                >
                  ❌ Annulla
                </button>
                <button
                  onClick={saveOrder}
                  className="save-order-btn"
                >
                  💾 Salva Ordine
                </button>
              </div>
            </div>
          ) : (
            // Riepilogo ordine in costruzione
            <>
              <h3>📋 Riepilogo Ordine</h3>
              
              {currentOrder.length === 0 ? (
                <div className="empty-order">
                  <p>Nessun prodotto selezionato</p>
                  <p>Seleziona i prodotti dalla lista a sinistra</p>
                </div>
              ) : (
                <>
                  <div className="order-items">
                    {sortedOrderItems.map((item, index) => {
                      const prevItem = index > 0 ? sortedOrderItems[index - 1] : null
                      const showSeparator = prevItem && prevItem.category !== item.category
                      
                      return (
                        <div key={`${item.name}-${item.category}`}>
                          {showSeparator && (
                            <div className="category-separator">
                              <span className="separator-line"></span>
                              <span className="separator-text">{getCategoryLabel(item.category)}</span>
                              <span className="separator-line"></span>
                            </div>
                          )}
                          <div className="order-item">
                            <div className="item-info">
                              <span className="item-name">{item.name}</span>
                              <span className="item-price">€{item.price.toFixed(2)}</span>
                            </div>
                            <div className="item-controls">
                              <button
                                onClick={() => updateQuantity(item.name, item.category, item.quantity - 1)}
                                className="quantity-btn minus"
                              >
                                -
                              </button>
                              <span className="item-quantity">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.name, item.category, item.quantity + 1)}
                                className="quantity-btn plus"
                              >
                                +
                              </button>
                              <button
                                onClick={() => removeFromOrderByName(item.name, item.category)}
                                className="remove-btn"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="order-actions">
                    <button
                      onClick={() => setCurrentOrder([])}
                      className="clear-order-btn"
                    >
                      🗑️ Svuota Ordine
                    </button>
                    <button
                      onClick={confirmOrder}
                      className="confirm-order-btn"
                      disabled={currentOrder.length === 0}
                    >
                      ✅ Conferma Ordine
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Cassa
