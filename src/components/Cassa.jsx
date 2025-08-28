import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore'

const Cassa = () => {
  const [menuItems, setMenuItems] = useState([])
  const [menuCompositi, setMenuCompositi] = useState([])
  const [currentOrder, setCurrentOrder] = useState([])
  const [orderNumber, setOrderNumber] = useState(1)
  const [total, setTotal] = useState(0)

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

  // Carica il prossimo numero d'ordine
  useEffect(() => {
    const loadNextOrderNumber = async () => {
      try {
        const ordersQuery = query(collection(db, 'ordini'), orderBy('orderNumber', 'desc'))
        const ordersSnapshot = await getDocs(ordersQuery)
        
        if (!ordersSnapshot.empty) {
          const lastOrder = ordersSnapshot.docs[0].data()
          setOrderNumber(lastOrder.orderNumber + 1)
        } else {
          setOrderNumber(1)
        }
      } catch (error) {
        console.error('Errore nel caricamento del numero ordine:', error)
      }
    }

    loadNextOrderNumber()
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

  // Conferma l'ordine e lo salva nel database
  const confirmOrder = async () => {
    if (currentOrder.length === 0) {
      alert('Aggiungi almeno un prodotto all\'ordine')
      return
    }

    try {
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

      // Salva l'ordine nel database
      await addDoc(collection(db, 'ordini'), orderData)

      // Reset dell'ordine e incrementa il numero
      setCurrentOrder([])
      setOrderNumber(prev => prev + 1)
      setTotal(0)

      alert(`Ordine #${orderData.orderNumber} confermato e salvato!`)
    } catch (error) {
      console.error('Errore nel salvataggio dell\'ordine:', error)
      alert('Errore nel salvataggio dell\'ordine')
    }
  }

  // Raggruppa gli item per categoria
  const groupedItems = {
    cibo: menuItems.filter(item => item.category === 'cibo'),
    bevande: menuItems.filter(item => item.category === 'bevande'),
    compositi: menuCompositi.map(menu => ({ ...menu, category: 'composito' }))
  }

  // Raggruppa gli item dell'ordine per nome e categoria
  const groupedOrderItems = currentOrder.reduce((acc, item) => {
    const key = `${item.name}-${item.category}`
    if (acc[key]) {
      acc[key].quantity += item.quantity
    } else {
      acc[key] = { ...item }
    }
    return acc
  }, {})

  return (
    <div className="cassa-section">
      <div className="cassa-header">
        <h2>💰 Cassa</h2>
        <div className="order-info">
          <div className="order-number">
            <span className="label">Ordine #</span>
            <span className="number">{orderNumber}</span>
          </div>
          <div className="order-total">
            <span className="label">Totale:</span>
            <span className="total">€{total.toFixed(2)}</span>
          </div>
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

        {/* Sezione destra - Riepilogo ordine */}
        <div className="order-summary">
          <h3>📋 Riepilogo Ordine</h3>
          
          {currentOrder.length === 0 ? (
            <div className="empty-order">
              <p>Nessun prodotto selezionato</p>
              <p>Seleziona i prodotti dalla lista a sinistra</p>
            </div>
          ) : (
            <>
              <div className="order-items">
                {Object.values(groupedOrderItems).map((item, index) => (
                  <div key={index} className="order-item">
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
                ))}
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
        </div>
      </div>
    </div>
  )
}

export default Cassa
