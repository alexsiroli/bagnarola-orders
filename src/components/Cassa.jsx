import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, onSnapshot, query, orderBy, getDocs, updateDoc, doc, increment, where, getDoc, setDoc, runTransaction } from 'firebase/firestore'

const Cassa = () => {
  const [menuItems, setMenuItems] = useState([])
  const [menuCompositi, setMenuCompositi] = useState([])
  const [currentOrder, setCurrentOrder] = useState([])
  const [lastOrderNumber, setLastOrderNumber] = useState(0)
  const [total, setTotal] = useState(0)
  const [showOrderSummary, setShowOrderSummary] = useState(false)
  const [confirmedOrder, setConfirmedOrder] = useState(null)
  const [isStaffOrder, setIsStaffOrder] = useState(false)

  // Carica i prodotti dal menu in tempo reale
  useEffect(() => {
    // Sottoscrizione ai prodotti singoli
    const menuQuery = query(collection(db, 'menu'), orderBy('createdAt', 'asc'))
    const unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
      const items = []
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() })
      })
      setMenuItems(items)
    }, (error) => {
      console.warn('Warning nella query menu:', error)
      // Continua a funzionare anche con warning
    })

    // Sottoscrizione ai menu compositi
    const compositiQuery = query(collection(db, 'menuCompositi'), orderBy('createdAt', 'asc'))
    const unsubscribeCompositi = onSnapshot(compositiQuery, (snapshot) => {
      const compositi = []
      snapshot.forEach((doc) => {
        compositi.push({ id: doc.id, ...doc.data() })
      })
      setMenuCompositi(compositi)
    }, (error) => {
      console.warn('Warning nella query menu compositi:', error)
      // Continua a funzionare anche con warning
    })

    // Listener specifico per aggiornamenti delle quantità in tempo reale
    const quantitiesQuery = query(collection(db, 'menu'))
    const unsubscribeQuantities = onSnapshot(quantitiesQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const updatedItem = { id: change.doc.id, ...change.doc.data() }
          
          // Aggiorna solo la quantità dell'item modificato
          setMenuItems(prev => prev.map(item => 
            item.id === updatedItem.id 
              ? { ...item, quantity: updatedItem.quantity }
              : item
          ))

          // Aggiorna anche i menu compositi che contengono questo piatto
          setMenuCompositi(prev => prev.map(menu => {
            if (menu.items && menu.items.includes(updatedItem.id)) {
              // Ricalcola la minQuantity per questo menu composito
              const newMinQuantity = Math.min(...menu.items.map(itemId => {
                const product = menuItems.find(i => i.id === itemId)
                return product ? product.quantity : 0
              }))
              return { ...menu, minQuantity: newMinQuantity }
            }
            return menu
          }))
        }
      })
    }, (error) => {
      console.warn('Warning nella query quantità:', error)
      // Continua a funzionare anche con warning
    })

    // Cleanup delle sottoscrizioni
    return () => {
      unsubscribeMenu()
      unsubscribeCompositi()
      unsubscribeQuantities()
    }
  }, [])

  // Carica l'ultimo numero d'ordine e mantiene aggiornato in tempo reale
  useEffect(() => {
    const loadLastOrderNumber = async () => {
      try {
        const ordersQuery = query(collection(db, 'ordini'), orderBy('orderNumber', 'desc'))
        const ordersSnapshot = await getDocs(ordersQuery)
        
        if (!ordersSnapshot.empty) {
          const lastOrder = ordersSnapshot.docs[0].data()
          setLastOrderNumber(lastOrder.orderNumber)
        } else {
          setLastOrderNumber(0)
        }
      } catch (error) {
        console.error('Errore nel caricamento del numero ordine:', error)
      }
    }

    // Carica inizialmente
    loadLastOrderNumber()

    // Listener in tempo reale per l'ultimo numero d'ordine
    const ordersQuery = query(collection(db, 'ordini'), orderBy('orderNumber', 'desc'))
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      if (!snapshot.empty) {
        const lastOrder = snapshot.docs[0].data()
        const newLastOrderNumber = lastOrder.orderNumber
        
        // Aggiorna solo se il numero è diverso (evita loop infiniti)
        if (newLastOrderNumber !== lastOrderNumber) {
          setLastOrderNumber(newLastOrderNumber)
          console.log(`Nuovo ordine rilevato: #${newLastOrderNumber}`)
        }
      }
    }, (error) => {
      console.warn('Warning nella query ordini:', error)
      // Continua a funzionare anche con warning
    })

    // Cleanup del listener
    return () => {
      unsubscribeOrders()
    }
  }, [lastOrderNumber])

  // Calcola il totale quando cambia l'ordine o lo stato STAFF
  useEffect(() => {
    if (isStaffOrder) {
      setTotal(0)
    } else {
      const newTotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      setTotal(newTotal)
    }
  }, [currentOrder, isStaffOrder])

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

  // Mostra il riepilogo ordine (senza numero d'ordine che sarà assegnato solo dopo la conferma)
  const confirmOrder = () => {
    if (currentOrder.length === 0) {
      alert('Aggiungi almeno un prodotto all\'ordine')
      return
    }

    // Prepara i dati dell'ordine senza il numero (verrà assegnato al momento del salvataggio)
    const orderData = {
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

    // Mostra il riepilogo dell'ordine (senza mostrare ancora il numero)
    setConfirmedOrder(orderData)
    setShowOrderSummary(true)
  }

  // Funzione per ottenere il prossimo numero d'ordine usando transazione atomica
  const getNextOrderNumber = async () => {
    try {
      const result = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'counters', 'orderCounter')
        const counterDoc = await transaction.get(counterRef)
        
        let newNumber = 1
        
        if (counterDoc.exists()) {
          // Se esiste, incrementa di 1
          newNumber = counterDoc.data().currentNumber + 1
          console.log('📊 Contatore esistente, incremento da:', counterDoc.data().currentNumber, 'a:', newNumber)
        } else {
          // Se non esiste, inizia da 1
          console.log('🆕 Contatore non trovato, creo nuovo contatore con valore 1')
        }
        
        // Aggiorna o crea il contatore
        transaction.set(counterRef, { currentNumber: newNumber })
        
        return newNumber
      })
      
      console.log('✅ Transazione completata, nuovo numero ordine:', result)
      return result
      
    } catch (error) {
      console.error('❌ Errore nella transazione del contatore:', error)
      
      // Fallback: usa timestamp come numero univoco
      const timestamp = Date.now()
      console.log('🔄 Fallback: uso timestamp come numero ordine:', timestamp)
      return timestamp
    }
  }

  // Salva effettivamente l'ordine nel database e assegna il numero d'ordine
  const saveOrder = async () => {
    try {
      // Ottieni il prossimo numero d'ordine in modo atomico
      const newOrderNumber = await getNextOrderNumber()

      // Controlla se il numero d'ordine è già stato usato (doppio controllo)
      const duplicateCheck = query(
        collection(db, 'ordini'), 
        where('orderNumber', '==', newOrderNumber)
      )
      const duplicateSnapshot = await getDocs(duplicateCheck)
      
      let finalOrderNumber = newOrderNumber
      
      if (!duplicateSnapshot.empty) {
        console.warn('⚠️ Numero ordine duplicato rilevato, riprovo...')
        // Se c'è un duplicato, riprova con un nuovo numero
        const retryNumber = await getNextOrderNumber()
        console.log('🔄 Nuovo tentativo con numero:', retryNumber)
        
        // Controlla di nuovo
        const retryCheck = query(
          collection(db, 'ordini'), 
          where('orderNumber', '==', retryNumber)
        )
        const retrySnapshot = await getDocs(retryCheck)
        
        if (!retrySnapshot.empty) {
          // Se anche il secondo tentativo fallisce, usa timestamp
          const timestamp = Date.now()
          console.log('🚨 Fallback finale: uso timestamp:', timestamp)
          finalOrderNumber = timestamp
        } else {
          finalOrderNumber = retryNumber
        }
      }

      // Aggiungi il numero dell'ordine ai dati dell'ordine
      const finalOrderData = {
        ...confirmedOrder,
        orderNumber: finalOrderNumber
      }

      // Salva l'ordine nel database
      await addDoc(collection(db, 'ordini'), finalOrderData)

      // Aggiorna le quantità dei piatti ordinati
      await updateProductQuantities(finalOrderData.items)

      // Non serve più aggiornare le quantità locali qui perché si aggiornano graficamente
      // Le quantità reali vengono aggiornate dal database tramite onSnapshot

      // Reset dell'ordine PRIMA del popup (così il carrello è vuoto quando si vede il popup)
      setCurrentOrder([])
      setTotal(0)
      setLastOrderNumber(finalOrderNumber)
      setShowOrderSummary(false)
      setConfirmedOrder(null)
      setIsStaffOrder(false)

      // Log del numero dell'ordine creato
      console.log(`🆕 Nuovo ordine creato: #${finalOrderNumber}`)

      // Usa setTimeout per mostrare il popup DOPO che React ha aggiornato l'interfaccia
      // Questo garantisce che il carrello sia vuoto quando si vede il popup
      setTimeout(() => {
        alert(`Ordine #${finalOrderNumber} confermato e salvato!`)
      }, 100)
    } catch (error) {
      console.error('Errore nel salvataggio dell\'ordine:', error)
      alert('Errore nel salvataggio dell\'ordine')
    }
  }

  // Funzione per aggiornare le quantità dei prodotti ordinati
  const updateProductQuantities = async (orderItems) => {
    try {
      const updatePromises = orderItems.map(async (item) => {
        if (item.category === 'composito') {
          // Per i menu compositi, diminuisci le quantità di tutti i piatti componenti
          await updateMenuCompositoQuantities(item.id, item.quantity)
        } else {
          // Per i piatti singoli, diminuisci direttamente la quantità
          const productRef = doc(db, 'menu', item.id)
          
          // Usa increment per diminuire la quantità in modo atomico
          await updateDoc(productRef, {
            quantity: increment(-item.quantity)
          })

          console.log(`Aggiornata quantità per ${item.name}: -${item.quantity}`)

          // Aggiorna anche i menu compositi che contengono questo piatto
          await updateMenuCompositiForProduct(item.id, item.quantity)
        }
      })

      // Esegui tutti gli aggiornamenti in parallelo
      await Promise.all(updatePromises)
      
      // Dopo aver aggiornato tutte le quantità, ricalcola TUTTI i menu compositi
      await recalculateAllMenuCompositiMinQuantities()
      
      console.log('Tutte le quantità dei prodotti sono state aggiornate e i menu compositi ricalcolati')
    } catch (error) {
      console.error('Errore nell\'aggiornamento delle quantità dei prodotti:', error)
      // Non blocchiamo il salvataggio dell'ordine se fallisce l'aggiornamento delle quantità
    }
  }

  // Funzione per aggiornare immediatamente le quantità locali
  const updateLocalQuantities = (orderItems) => {
    orderItems.forEach((orderItem) => {
      if (orderItem.category === 'composito') {
        // Per i menu compositi, aggiorna le quantità di tutti i piatti componenti
        const menuComposito = menuCompositi.find(menu => menu.id === orderItem.id)
        
        if (menuComposito && menuComposito.items) {
          menuComposito.items.forEach((itemId) => {
            const productIndex = menuItems.findIndex(item => item.id === itemId)
            if (productIndex !== -1) {
              // Aggiorna la quantità locale
              setMenuItems(prev => prev.map((item, index) => 
                index === productIndex 
                  ? { ...item, quantity: Math.max(0, item.quantity - orderItem.quantity) }
                  : item
              ))
            }
          })

          // Aggiorna anche la minQuantity del menu composito locale
          updateLocalMenuCompositiQuantities(orderItem.id, orderItem.quantity)
        }
      } else {
        // Per i piatti singoli, aggiorna direttamente la quantità
        setMenuItems(prev => prev.map(item => 
          item.id === orderItem.id 
            ? { ...item, quantity: Math.max(0, item.quantity - orderItem.quantity) }
            : item
        ))

        // Aggiorna anche i menu compositi locali che contengono questo piatto
        updateLocalMenuCompositiForProduct(orderItem.id, orderItem.quantity)
      }
    })

    console.log('Quantità locali aggiornate per feedback istantaneo')
  }

  // Funzione per aggiornare i menu compositi quando si vende un piatto singolo
  const updateMenuCompositiForProduct = async (productId, soldQuantity) => {
    try {
      // Trova tutti i menu compositi che contengono questo piatto
      const menuCompositiRef = collection(db, 'menuCompositi')
      const q = query(menuCompositiRef, where('items', 'array-contains', productId))
      const querySnapshot = await getDocs(q)

      // Aggiorna ogni menu composito trovato
      const updatePromises = querySnapshot.docs.map(async (docSnapshot) => {
        const menuData = docSnapshot.data()
        
        // Ricalcola la quantità disponibile del menu
        const minQuantity = Math.min(...menuData.items.map(itemId => {
          if (itemId === productId) {
            // Per il piatto appena venduto, usa la quantità aggiornata
            const existingProduct = menuItems.find(i => i.id === itemId)
            return existingProduct ? Math.max(0, existingProduct.quantity - soldQuantity) : 0
          }
          // Per gli altri piatti, usa la quantità attuale
          const existingItem = menuItems.find(i => i.id === itemId)
          return existingItem ? existingItem.quantity : 0
        }))

        // Aggiorna il menu composito con la nuova quantità minima
        return updateDoc(doc(db, 'menuCompositi', docSnapshot.id), {
          minQuantity: minQuantity,
          updatedAt: new Date()
        })
      })

            // Esegui tutti gli aggiornamenti in parallelo
      await Promise.all(updatePromises)
      
      // Dopo aver aggiornato i menu compositi, ricalcola le loro minQuantity
      const recalculatePromises = querySnapshot.docs.map(async (docSnapshot) => {
        await recalculateMenuCompositoMinQuantity(docSnapshot.id)
      })
      
      await Promise.all(recalculatePromises)
      
      console.log(`Aggiornati ${updatePromises.length} menu compositi per il piatto ${productId}`)
    } catch (error) {
      console.error('Errore nell\'aggiornamento dei menu compositi per il piatto:', error)
    }
  }

  // Funzione per aggiornare localmente la minQuantity di un menu composito
  const updateLocalMenuCompositiQuantities = (menuId, orderQuantity) => {
    setMenuCompositi(prev => prev.map(menu => {
      if (menu.id === menuId) {
        // Ricalcola la minQuantity locale
        const newMinQuantity = Math.max(0, menu.minQuantity - orderQuantity)
        return { ...menu, minQuantity: newMinQuantity }
      }
      return menu
    }))
  }

  // Funzione per aggiornare localmente i menu compositi che contengono un piatto venduto
  const updateLocalMenuCompositiForProduct = (productId, soldQuantity) => {
    setMenuCompositi(prev => prev.map(menu => {
      if (menu.items.includes(productId)) {
        // Ricalcola la minQuantity locale per questo menu
        const newMinQuantity = Math.min(...menu.items.map(itemId => {
          if (itemId === productId) {
            // Per il piatto appena venduto, usa la quantità aggiornata
            const existingProduct = menuItems.find(i => i.id === itemId)
            return existingProduct ? Math.max(0, existingProduct.quantity - soldQuantity) : 0
          }
          // Per gli altri piatti, usa la quantità attuale
          const existingItem = menuItems.find(i => i.id === itemId)
          return existingItem ? existingItem.quantity : 0
        }))
        return { ...menu, minQuantity: newMinQuantity }
      }
      return menu
    }))
  }

  // Funzione per aggiornare le quantità dei piatti di un menu composito
  const updateMenuCompositoQuantities = async (menuId, orderQuantity) => {
    try {
      // Trova il menu composito nel database
      const menuRef = doc(db, 'menuCompositi', menuId)
      
      // Per ora, assumiamo che ogni menu composito richieda 1 di ogni piatto
      // In futuro potremmo voler specificare le quantità per ogni piatto nel menu
      const menuComposito = menuCompositi.find(menu => menu.id === menuId)
      
      if (menuComposito && menuComposito.items) {
        // Diminuisci la quantità di ogni piatto del menu
        const updatePromises = menuComposito.items.map(async (itemId) => {
          const productRef = doc(db, 'menu', itemId)
          
          // Diminuisci di orderQuantity per ogni piatto del menu
          await updateDoc(productRef, {
            quantity: increment(-orderQuantity)
          })

          console.log(`Aggiornata quantità per piatto del menu ${menuComposito.name}: -${orderQuantity}`)
        })

        await Promise.all(updatePromises)
        
        // Dopo aver aggiornato le quantità dei piatti, ricalcola la minQuantity del menu
        await recalculateMenuCompositoMinQuantity(menuId)
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento delle quantità del menu composito:', error)
    }
  }

  // Funzione per ricalcolare la minQuantity di un menu composito
  const recalculateMenuCompositoMinQuantity = async (menuId) => {
    try {
      const menuComposito = menuCompositi.find(menu => menu.id === menuId)
      if (!menuComposito || !menuComposito.items) return
      
      // Ottieni le quantità aggiornate di tutti i piatti del menu
      const quantities = await Promise.all(
        menuComposito.items.map(async (itemId) => {
          const productRef = doc(db, 'menu', itemId)
          const productDoc = await getDoc(productRef)
          return productDoc.exists() ? productDoc.data().quantity : 0
        })
      )
      
      // Calcola la nuova minQuantity
      const newMinQuantity = Math.min(...quantities)
      
      // Aggiorna il menu composito nel database
      const menuRef = doc(db, 'menuCompositi', menuId)
      await updateDoc(menuRef, {
        minQuantity: newMinQuantity,
        updatedAt: new Date()
      })
      
      console.log(`✅ Menu composito ${menuComposito.name} aggiornato: minQuantity = ${newMinQuantity}`)
      
      // Aggiorna anche i dati locali
      setMenuCompositi(prev => prev.map(menu => 
        menu.id === menuId 
          ? { ...menu, minQuantity: newMinQuantity }
          : menu
      ))
      
    } catch (error) {
      console.error('Errore nel ricalcolo della minQuantity del menu composito:', error)
    }
  }

  // Funzione per ricalcolare TUTTI i menu compositi
  const recalculateAllMenuCompositiMinQuantities = async () => {
    try {
      console.log('🔄 Ricalcolo di tutti i menu compositi...')
      
      // Ricalcola ogni menu composito
      const recalculatePromises = menuCompositi.map(async (menu) => {
        if (menu.items && menu.items.length > 0) {
          await recalculateMenuCompositoMinQuantity(menu.id)
        }
      })
      
      await Promise.all(recalculatePromises)
      
      console.log('✅ Tutti i menu compositi sono stati ricalcolati e aggiornati')
      
    } catch (error) {
      console.error('❌ Errore nel ricalcolo di tutti i menu compositi:', error)
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

  // Funzione per calcolare la quantità disponibile durante la costruzione dell'ordine
  const getAvailableQuantity = (item) => {
    if (item.category === 'composito') {
      // Per i menu compositi, calcola la quantità minima disponibile
      const menuComposito = menuCompositi.find(menu => menu.id === item.id)
      if (menuComposito && menuComposito.items) {
        const minQuantity = Math.min(...menuComposito.items.map(itemId => {
          const product = menuItems.find(i => i.id === itemId)
          if (product) {
            // Sottrai la quantità già ordinata per questo piatto singolo
            const orderedQuantity = currentOrder.reduce((total, orderItem) => {
              if (orderItem.id === itemId) {
                return total + orderItem.quantity
              }
              return total
            }, 0)
            
            // Sottrai anche la quantità dei menu compositi che contengono questo piatto
            const menuOrderedQuantity = currentOrder.reduce((total, orderItem) => {
              if (orderItem.category === 'composito') {
                const menu = menuCompositi.find(m => m.id === orderItem.id)
                if (menu && menu.items.includes(itemId)) {
                  return total + orderItem.quantity
                }
              }
              return total
            }, 0)
            
            return Math.max(0, product.quantity - orderedQuantity - menuOrderedQuantity)
          }
          return 0
        }))
        return minQuantity
      }
      return item.minQuantity || 0
    } else {
      // Per i piatti singoli, sottrai la quantità già ordinata
      const orderedQuantity = currentOrder.reduce((total, orderItem) => {
        if (orderItem.id === item.id) {
          return total + orderItem.quantity
        }
        return total
      }, 0)
      
      // Sottrai anche la quantità dei menu compositi che contengono questo piatto
      const menuOrderedQuantity = currentOrder.reduce((total, orderItem) => {
        if (orderItem.category === 'composito') {
          const menu = menuCompositi.find(m => m.id === orderItem.id)
          if (menu && menu.items.includes(item.id)) {
            return total + orderItem.quantity
          }
        }
        return total
      }, 0)
      
      return Math.max(0, (item.quantity || 0) - orderedQuantity - menuOrderedQuantity)
    }
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
              {groupedItems.compositi.map(item => {
                const availableQuantity = getAvailableQuantity(item);
                const isSoldOut = availableQuantity <= 0;
                return (
                  <button
                    key={item.id}
                    onClick={isSoldOut ? undefined : () => addToOrder(item)}
                    className={`product-button ${isSoldOut ? 'sold-out' : ''}`}
                    disabled={isSoldOut}
                  >
                    <div className="product-name">{item.name}</div>
                    <div className="product-info-row">
                      <div className="product-quantity">{availableQuantity}</div>
                      {isSoldOut ? (
                        <div className="sold-out-price">Sold Out</div>
                      ) : (
                        <div className="product-price">€{item.price.toFixed(2)}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cibi */}
          <div className="category-section">
            <h3>🍽️ Cibi</h3>
            <div className="products-grid">
              {groupedItems.cibo.map(item => {
                const availableQuantity = getAvailableQuantity(item);
                const isSoldOut = availableQuantity <= 0;
                return (
                  <button
                    key={item.id}
                    onClick={isSoldOut ? undefined : () => addToOrder(item)}
                    className={`product-button ${isSoldOut ? 'sold-out' : ''}`}
                    disabled={isSoldOut}
                  >
                    <div className="product-name">{item.name}</div>
                    <div className="product-info-row">
                      <div className="product-quantity">{availableQuantity}</div>
                      {isSoldOut ? (
                        <div className="sold-out-price">Sold Out</div>
                      ) : (
                        <div className="product-price">€{item.price.toFixed(2)}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bevande */}
          <div className="category-section">
            <h3>🥤 Bevande</h3>
            <div className="products-grid">
              {groupedItems.bevande.map(item => {
                const availableQuantity = getAvailableQuantity(item);
                const isSoldOut = availableQuantity <= 0;
                return (
                  <button
                    key={item.id}
                    onClick={isSoldOut ? undefined : () => addToOrder(item)}
                    className={`product-button ${isSoldOut ? 'sold-out' : ''}`}
                    disabled={isSoldOut}
                  >
                    <div className="product-name">{item.name}</div>
                    <div className="product-info-row">
                      <div className="product-quantity">{availableQuantity}</div>
                      {isSoldOut ? (
                        <div className="sold-out-price">Sold Out</div>
                      ) : (
                        <div className="product-price">€{item.price.toFixed(2)}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

                {/* Sezione destra - Riepilogo ordine o conferma */}
        <div className="order-summary">
          {showOrderSummary ? (
            // Riepilogo ordine confermato
            <div className="order-confirmation">
              <h3>📋 Riepilogo Ordine</h3>
              
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
                  ✅ Conferma Ordine
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
                      onClick={() => {
                        setCurrentOrder([])
                        setIsStaffOrder(false)
                      }}
                      className="clear-order-btn"
                    >
                      🗑️ Svuota Ordine
                    </button>
                    
                    {/* Checkbox STAFF */}
                    <div 
                      className="staff-checkbox-container"
                      onClick={() => setIsStaffOrder(!isStaffOrder)}
                    >
                      <input
                        type="checkbox"
                        checked={isStaffOrder}
                        onChange={(e) => setIsStaffOrder(e.target.checked)}
                        className="staff-checkbox"
                      />
                      <span className="staff-checkbox-text">👥 STAFF</span>
                    </div>
                    
                    <button
                      onClick={confirmOrder}
                      className="confirm-order-btn"
                      disabled={currentOrder.length === 0}
                    >
                      <div className="confirm-order-content">
                        <div className="confirm-order-total">€{total.toFixed(2)}</div>
                      </div>
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
