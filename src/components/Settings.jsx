import { useState } from 'react'
import { db } from '../firebase'
import { collection, getDocs, deleteDoc, doc, writeBatch, setDoc, updateDoc } from 'firebase/firestore'
import './Settings.css'

const Settings = () => {
  const [isResetting, setIsResetting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [isExportingOrders, setIsExportingOrders] = useState(false)
  const [isImportingOrders, setIsImportingOrders] = useState(false)
  const [showImportOrdersDialog, setShowImportOrdersDialog] = useState(false)
  const [importOrdersFile, setImportOrdersFile] = useState(null)

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
        // Log rimosso per semplificare la console
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

  // Funzione per esportare menu e piatti
  const exportMenuData = async () => {
    setIsExporting(true)
    try {
      // Carica menu compositi
      const menuCompositiSnapshot = await getDocs(collection(db, 'menuCompositi'))
      const menuCompositi = []
      menuCompositiSnapshot.forEach((doc) => {
        menuCompositi.push({ id: doc.id, ...doc.data() })
      })

      // Carica prodotti singoli (inclusi bevande)
      const menuItemsSnapshot = await getDocs(collection(db, 'menu'))
      const menuItems = []
      menuItemsSnapshot.forEach((doc) => {
        menuItems.push({ id: doc.id, ...doc.data() })
      })

      // Crea header CSV per prodotti singoli
      const productHeaders = [
        'ID Prodotto',
        'Nome',
        'Prezzo (€)',
        'Categoria',
        'Quantità',
        'Descrizione',
        'Disponibile',
        'Data Creazione'
      ]

      // Crea righe CSV per prodotti singoli
      const productRows = [productHeaders.join(',')]
      menuItems.forEach(item => {
        const row = [
          item.id,
          `"${item.name || ''}"`,
          (item.price || 0).toFixed(2),
          item.category || '',
          item.quantity || 0,
          `"${item.description || ''}"`,
          item.available ? 'Sì' : 'No',
          item.createdAt ? (item.createdAt.toDate ? item.createdAt.toDate().toISOString() : new Date(item.createdAt).toISOString()) : ''
        ]
        productRows.push(row.join(','))
      })

      // Crea header CSV per menu compositi
      const menuHeaders = [
        'ID Menu',
        'Nome Menu',
        'Prezzo (€)',
        'Descrizione',
        'Prodotti Componenti',
        'Numero Prodotti',
        'Quantità Disponibile',
        'Data Creazione'
      ]

      // Crea righe CSV per menu compositi
      const menuRows = [menuHeaders.join(',')]
      menuCompositi.forEach(menu => {
        const products = menu.items ? menu.items.join('; ') : ''
        const row = [
          menu.id,
          `"${menu.name || ''}"`,
          (menu.price || 0).toFixed(2),
          `"${menu.description || ''}"`,
          `"${products}"`,
          menu.items ? menu.items.length : 0,
          menu.minQuantity || 0,
          menu.createdAt ? (menu.createdAt.toDate ? menu.createdAt.toDate().toISOString() : new Date(menu.createdAt).toISOString()) : ''
        ]
        menuRows.push(row.join(','))
      })

      // Crea e scarica il file CSV
      const csvContent = productRows.join('\n') + '\n\n' + menuRows.join('\n')
      const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = 'menu.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
      
      alert(`✅ Menu esportato con successo! File: menu.csv\n\nEsportati:\n- ${menuItems.length} prodotti/bevande\n- ${menuCompositi.length} menu compositi`)
      
    } catch (error) {
      console.error('Errore durante l\'esportazione:', error)
      alert('❌ Errore durante l\'esportazione. Riprova.')
    } finally {
      setIsExporting(false)
    }
  }

  // Funzione per importare menu e piatti
  const importMenuData = async () => {
    if (!importFile) {
      alert('❌ Seleziona un file CSV da importare')
      return
    }

    setIsImporting(true)
    try {
      const fileContent = await importFile.text()
      const allLines = fileContent.split('\n')
      
      if (allLines.length < 2) {
        throw new Error('File CSV non valido. Deve contenere almeno header e una riga di dati.')
      }

      // Trova la separazione tra prodotti e menu compositi
      const separatorIndex = allLines.findIndex(line => line.trim() === '')
      if (separatorIndex === -1) {
        throw new Error('Formato CSV non valido. Deve contenere una riga vuota per separare prodotti e menu compositi.')
      }

      const productLines = allLines.slice(0, separatorIndex).filter(line => line.trim())
      const menuLines = allLines.slice(separatorIndex + 1).filter(line => line.trim())

      // Parsing prodotti singoli
      const productHeaders = productLines[0].split(',').map(h => h.trim())
      const productData = productLines.slice(1)
      
      // Validazione header prodotti
      const requiredProductHeaders = ['ID Prodotto', 'Nome', 'Prezzo (€)', 'Categoria', 'Quantità']
      const missingProductHeaders = requiredProductHeaders.filter(h => !productHeaders.includes(h))
      
      if (missingProductHeaders.length > 0) {
        throw new Error(`Header prodotti mancanti: ${missingProductHeaders.join(', ')}`)
      }

      // Parsing menu compositi
      const menuHeaders = menuLines[0].split(',').map(h => h.trim())
      const menuData = menuLines.slice(1)
      
      // Validazione header menu
      const requiredMenuHeaders = ['ID Menu', 'Nome Menu', 'Prezzo (€)', 'Quantità Disponibile']
      const missingMenuHeaders = requiredMenuHeaders.filter(h => !menuHeaders.includes(h))
      
      if (missingMenuHeaders.length > 0) {
        throw new Error(`Header menu mancanti: ${missingMenuHeaders.join(', ')}`)
      }

      // Conferma import (cancellerà tutti i dati esistenti)
      if (!confirm('⚠️ ATTENZIONE: L\'import cancellerà TUTTI i menu e piatti esistenti!\n\nVuoi procedere?')) {
        setIsImporting(false)
        return
      }

      // Usa un batch per cancellare tutti i dati esistenti
      const batch = writeBatch(db)
      
      // Cancella menu compositi esistenti
      const existingMenuCompositi = await getDocs(collection(db, 'menuCompositi'))
      existingMenuCompositi.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      // Cancella prodotti esistenti
      const existingMenuItems = await getDocs(collection(db, 'menu'))
      existingMenuItems.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      // Esegui cancellazioni
      await batch.commit()

      // Importa nuovi dati
      const importBatch = writeBatch(db)
      let importedProducts = 0
      let importedMenus = 0

      // Mappa per convertire vecchi ID in nuovi ID
      const idMapping = {}
      
      // Importa prodotti singoli
      for (const line of productData) {
        try {
          const values = parseCSVLine(line)
          if (values.length >= productHeaders.length) {
            const productData = {}
            let oldId = null
            
            productHeaders.forEach((header, index) => {
              const value = values[index]
              switch (header) {
                case 'ID Prodotto':
                  oldId = value // Salva il vecchio ID per la mappatura
                  break
                case 'Nome':
                  productData.name = value.replace(/"/g, '')
                  break
                case 'Prezzo (€)':
                  productData.price = parseFloat(value) || 0
                  break
                case 'Categoria':
                  productData.category = value
                  break
                case 'Quantità':
                  productData.quantity = parseInt(value) || 0
                  break
                case 'Descrizione':
                  productData.description = value.replace(/"/g, '') || ''
                  break
                case 'Disponibile':
                  productData.available = value === 'Sì'
                  break
                case 'Data Creazione':
                  if (value) productData.createdAt = new Date(value)
                  break
              }
            })

            // Valida dati minimi
            if (productData.name && productData.category && productData.price >= 0) {
              const newDocRef = doc(collection(db, 'menu'))
              importBatch.set(newDocRef, productData)
              
              // Salva la mappatura vecchio ID -> nuovo ID
              if (oldId) {
                idMapping[oldId] = newDocRef.id
                // Log rimosso per semplificare la console
              }
              
              importedProducts++
            }
          }
        } catch (error) {
          console.warn('Errore nel parsing della riga prodotto:', line, error)
        }
      }

      // Importa menu compositi
      for (const line of menuData) {
        try {
          const values = parseCSVLine(line)
          if (values.length >= menuHeaders.length) {
            const menuData = {}
            menuHeaders.forEach((header, index) => {
              const value = values[index]
              switch (header) {
                case 'ID Menu':
                  // Ignora ID, verrà generato automaticamente
                  break
                case 'Nome Menu':
                  menuData.name = value.replace(/"/g, '')
                  break
                case 'Prezzo (€)':
                  menuData.price = parseFloat(value) || 0
                  break
                case 'Descrizione':
                  menuData.description = value.replace(/"/g, '') || ''
                  break
                case 'Prodotti Componenti':
                  // Parsing semplificato dei prodotti componenti
                  if (value && value !== '""') {
                    const productIds = value.replace(/"/g, '').split(';').map(id => id.trim()).filter(id => id)
                    // Converti i vecchi ID in nuovi ID usando la mappatura
                    const newProductIds = productIds.map(oldId => idMapping[oldId] || oldId)
                    menuData.items = newProductIds
                    // Log rimosso per semplificare la console
                  }
                  break
                case 'Quantità Disponibile':
                  menuData.minQuantity = parseInt(value) || 0
                  break
                case 'Data Creazione':
                  if (value) menuData.createdAt = new Date(value)
                  break
              }
            })

            // Valida dati minimi
            if (menuData.name && menuData.price >= 0) {
              const newDocRef = doc(collection(db, 'menuCompositi'))
              importBatch.set(newDocRef, menuData)
              importedMenus++
            }
          }
        } catch (error) {
          console.warn('Errore nel parsing della riga menu:', line, error)
        }
      }

      // Esegui import
      await importBatch.commit()

      // Ricalcola le quantità dei menu compositi dopo l'import
      // Log rimosso per semplificare la console
      await recalculateMenuCompositiAfterImport()

      alert(`✅ Import completato con successo!\n\nImportati:\n- ${importedProducts} prodotti/bevande\n- ${importedMenus} menu compositi\n\n✅ Quantità dei menu compositi ricalcolate automaticamente`)
      
      setShowImportDialog(false)
      setImportFile(null)
      
    } catch (error) {
      console.error('Errore durante l\'import:', error)
      alert(`❌ Errore durante l'import: ${error.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  // Funzione per esportare ordini in CSV
  const exportOrdersData = async () => {
    setIsExportingOrders(true)
    try {
      // Carica tutti gli ordini
      const ordersSnapshot = await getDocs(collection(db, 'ordini'))
      const orders = []
      
      ordersSnapshot.forEach((doc) => {
        const orderData = { id: doc.id, ...doc.data() }
        
        // Formatta i dati per il CSV
        const csvRow = {
          orderNumber: orderData.orderNumber || '',
          status: orderData.status || '',
          total: orderData.total || 0,
          createdAt: orderData.createdAt ? (orderData.createdAt.toDate ? orderData.createdAt.toDate().toISOString() : new Date(orderData.createdAt).toISOString()) : '',
          updatedAt: orderData.updatedAt ? (orderData.updatedAt.toDate ? orderData.updatedAt.toDate().toISOString() : new Date(orderData.updatedAt).toISOString()) : '',
          completedAt: orderData.completedAt ? (orderData.completedAt.toDate ? orderData.completedAt.toDate().toISOString() : new Date(orderData.completedAt).toISOString()) : '',
          deliveredAt: orderData.deliveredAt ? (orderData.deliveredAt.toDate ? orderData.deliveredAt.toDate().toISOString() : new Date(orderData.deliveredAt).toISOString()) : '',
          items: orderData.items ? orderData.items.map(item => {
            // Se l'ordine è dello staff (totale = 0), tutti i parziali sono 0
            const partialTotal = orderData.total === 0 ? 0 : (item.quantity * (item.price || 0))
            return `${item.quantity}x ${item.name} (${item.category}) [€${partialTotal.toFixed(2)}]`
          }).join('; ') : '',
          itemsCount: orderData.items ? orderData.items.length : 0
        }
        
        orders.push(csvRow)
      })

      // Ordina per numero ordine
      orders.sort((a, b) => a.orderNumber - b.orderNumber)

      // Crea header CSV
      const headers = [
        'Numero Ordine',
        'Stato',
        'Totale (€)',
        'Data Creazione',
        'Data Aggiornamento',
        'Data Completamento',
        'Data Consegna',
        'Prodotti',
        'Numero Prodotti'
      ]

      // Crea righe CSV
      const csvRows = [headers.join(',')]
      
      orders.forEach(order => {
        const row = [
          order.orderNumber,
          order.status,
          order.total.toFixed(2),
          order.createdAt,
          order.updatedAt,
          order.completedAt,
          order.deliveredAt,
          `"${order.items}"`, // Escape delle virgole nei prodotti
          order.itemsCount
        ]
        csvRows.push(row.join(','))
      })

      // Crea e scarica il file CSV
      const csvContent = csvRows.join('\n')
      const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = 'ordini.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
      
      alert(`✅ Ordini esportati con successo! File: ordini.csv\n\nEsportati ${orders.length} ordini`)
      
    } catch (error) {
      console.error('Errore durante l\'esportazione ordini:', error)
      alert('❌ Errore durante l\'esportazione ordini. Riprova.')
    } finally {
      setIsExportingOrders(false)
    }
  }

  // Funzione per importare ordini da CSV
  const importOrdersData = async () => {
    if (!importOrdersFile) {
      alert('❌ Seleziona un file CSV da importare')
      return
    }

    setIsImportingOrders(true)
    try {
      const fileContent = await importOrdersFile.text()
      const lines = fileContent.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        throw new Error('File CSV non valido. Deve contenere almeno header e una riga di dati.')
      }

      // Parsing CSV (semplificato per questo caso)
      const headers = lines[0].split(',').map(h => h.trim())
      const dataLines = lines.slice(1)
      
      // Validazione header
      const requiredHeaders = ['Numero Ordine', 'Stato', 'Totale (€)', 'Data Creazione', 'Prodotti']
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      
      if (missingHeaders.length > 0) {
        throw new Error(`Header mancanti: ${missingHeaders.join(', ')}`)
      }

      // Conferma import (cancellerà tutti gli ordini esistenti)
      if (!confirm('⚠️ ATTENZIONE: L\'import cancellerà TUTTI gli ordini esistenti!\n\nVuoi procedere?')) {
        setIsImportingOrders(false)
        return
      }

      // Usa un batch per cancellare tutti gli ordini esistenti
      const batch = writeBatch(db)
      
      const existingOrders = await getDocs(collection(db, 'ordini'))
      existingOrders.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      // Esegui cancellazioni
      await batch.commit()

      // Reset del contatore degli ordini
      try {
        const counterRef = doc(db, 'counters', 'orderCounter')
        await setDoc(counterRef, { currentNumber: 0 })
      } catch (error) {
        console.warn('Errore nel reset del contatore ordini:', error)
      }

      // Importa nuovi ordini
      const importBatch = writeBatch(db)
      let importedCount = 0

      for (const line of dataLines) {
        try {
          // Parsing della riga CSV (gestisce virgole nei campi)
          const values = []
          let current = ''
          let inQuotes = false
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i]
            if (char === '"') {
              inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }
          values.push(current.trim())

          if (values.length < headers.length) {
            console.warn('Riga CSV incompleta, saltata:', line)
            continue
          }

          // Crea oggetto ordine
          const orderData = {}
          headers.forEach((header, index) => {
            const value = values[index]
            switch (header) {
              case 'Numero Ordine':
                orderData.orderNumber = parseInt(value) || 0
                break
              case 'Stato':
                orderData.status = value || 'in_preparazione'
                break
              // Rimosso campo Codice Stato
              case 'Totale (€)':
                orderData.total = parseFloat(value) || 0
                break
              case 'Data Creazione':
                orderData.createdAt = new Date(value)
                break
              case 'Data Aggiornamento':
                if (value) orderData.updatedAt = new Date(value)
                break
              case 'Data Completamento':
                if (value) orderData.completedAt = new Date(value)
                break
              case 'Data Consegna':
                if (value) orderData.deliveredAt = new Date(value)
                break
              case 'Prodotti':
                // Parsing semplificato dei prodotti
                orderData.items = []
                if (value && value !== '""') {
                  const products = value.replace(/"/g, '').split(';')
                  products.forEach(product => {
                    // Pattern aggiornato per estrarre il prezzo totale tra parentesi quadre
                    const match = product.trim().match(/(\d+)x (.+?) \((.+?)\)(\s*\[€(\d+(?:\.\d+)?)\])?/)
                    if (match) {
                      const quantity = parseInt(match[1])
                      const totalPrice = match[5] ? parseFloat(match[5]) : 0
                      
                      // Se l'ordine è dello staff (totale = 0), tutti i prezzi parziali sono 0
                      if (orderData.total === 0) {
                        orderData.items.push({
                          quantity: quantity,
                          name: match[2].trim(),
                          category: match[3].trim(),
                          price: 0 // Prezzo unitario 0 per ordini staff
                        })
                      } else {
                        // Calcola il prezzo unitario dividendo il totale per la quantità
                        const unitPrice = quantity > 0 ? totalPrice / quantity : 0
                        orderData.items.push({
                          quantity: quantity,
                          name: match[2].trim(),
                          category: match[3].trim(),
                          price: unitPrice
                        })
                      }
                    }
                  })
                }
                break
            }
          })

          // Valida dati minimi
          if (orderData.orderNumber && orderData.status && orderData.total >= 0) {
            const newDocRef = doc(collection(db, 'ordini'))
            importBatch.set(newDocRef, orderData)
            importedCount++
          }
        } catch (error) {
          console.warn('Errore nel parsing della riga CSV:', line, error)
        }
      }

      // Esegui import
      await importBatch.commit()

      // Aggiorna il contatore degli ordini con l'ultimo numero importato
      if (importedCount > 0) {
        try {
          // Trova l'ordine con il numero più alto tra quelli importati
          let maxOrderNumber = 0
          for (const line of dataLines) {
            try {
              const values = []
              let current = ''
              let inQuotes = false
              
              for (let i = 0; i < line.length; i++) {
                const char = line[i]
                if (char === '"') {
                  inQuotes = !inQuotes
                } else if (char === ',' && !inQuotes) {
                  values.push(current.trim())
                  current = ''
                } else {
                  current += char
                }
              }
              values.push(current.trim())

              if (values.length >= headers.length) {
                const orderNumberIndex = headers.findIndex(h => h === 'Numero Ordine')
                if (orderNumberIndex >= 0) {
                  const orderNumber = parseInt(values[orderNumberIndex]) || 0
                  if (orderNumber > maxOrderNumber) {
                    maxOrderNumber = orderNumber
                  }
                }
              }
            } catch (error) {
              console.warn('Errore nel parsing per trovare max numero ordine:', line, error)
            }
          }

          // Aggiorna il contatore con il numero più alto trovato
          if (maxOrderNumber > 0) {
            const counterRef = doc(db, 'counters', 'orderCounter')
            await setDoc(counterRef, { currentNumber: maxOrderNumber })
            console.log(`✅ Contatore ordini aggiornato a: ${maxOrderNumber}`)
          }
        } catch (error) {
          console.warn('Errore nell\'aggiornamento del contatore ordini:', error)
        }
      }

      alert(`✅ Import ordini completato con successo!\n\nImportati: ${importedCount} ordini\n\nContatore ordini aggiornato al numero più alto importato`)
      
      setShowImportOrdersDialog(false)
      setImportOrdersFile(null)
      
    } catch (error) {
      console.error('Errore durante l\'import ordini:', error)
      alert(`❌ Errore durante l'import ordini: ${error.message}`)
    } finally {
      setIsImportingOrders(false)
    }
  }

  // Funzione per ricalcolare le quantità dei menu compositi dopo l'import
  const recalculateMenuCompositiAfterImport = async () => {
    try {
      console.log('🔄 Ricalcolo delle quantità dei menu compositi...')
      
      // Aspetta un momento per assicurarsi che l'import sia completato
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Ottieni tutti i menu compositi
      const menuCompositiSnapshot = await getDocs(collection(db, 'menuCompositi'))
      const menuCompositi = []
      menuCompositiSnapshot.forEach((doc) => {
        menuCompositi.push({ id: doc.id, ...doc.data() })
      })
      
      // Log rimossi per semplificare la console
      
      // Ottieni tutti i prodotti per calcolare le quantità
      const menuItemsSnapshot = await getDocs(collection(db, 'menu'))
      const menuItems = []
      menuItemsSnapshot.forEach((doc) => {
        menuItems.push({ id: doc.id, ...doc.data() })
      })
      
      // Log rimossi per semplificare la console
      
      // Ricalcola ogni menu composito
      const recalculatePromises = menuCompositi.map(async (menu) => {
        if (menu.items && menu.items.length > 0) {
          try {
            // Log rimossi per semplificare la console
            
            // Calcola la quantità minima disponibile tra tutti i prodotti del menu
            const quantities = menu.items.map(itemId => {
              const product = menuItems.find(i => i.id === itemId)
              const quantity = product ? (product.quantity || 0) : 0
              // Log rimosso per semplificare la console
              return quantity
            })
            
            const newMinQuantity = Math.min(...quantities)
            // Log rimosso per semplificare la console
            
            // Aggiorna il menu composito nel database
            const menuRef = doc(db, 'menuCompositi', menu.id)
            await updateDoc(menuRef, {
              minQuantity: newMinQuantity,
              updatedAt: new Date()
            })
            
            // Log rimosso per semplificare la console
          } catch (error) {
            console.error(`❌ Errore nel ricalcolo del menu ${menu.name}:`, error)
          }
        } else {
          // Log rimosso per semplificare la console
        }
      })
      
      await Promise.all(recalculatePromises)
      // Log rimosso per semplificare la console
      
    } catch (error) {
      console.error('❌ Errore nel ricalcolo delle quantità dei menu compositi:', error)
    }
  }

  // Funzione helper per parsing CSV (gestisce virgole nei campi)
  const parseCSVLine = (line) => {
    const values = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    return values
  }

  // Gestione selezione file
  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setImportFile(file)
    } else {
      alert('❌ Seleziona un file CSV valido')
      event.target.value = null
    }
  }

  // Gestione selezione file ordini
  const handleOrdersFileSelect = (event) => {
    const file = event.target.files[0]
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setImportOrdersFile(file)
    } else {
      alert('❌ Seleziona un file CSV valido')
      event.target.value = null
    }
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>⚙️ Impostazioni Sistema</h2>
        <p>Gestione configurazioni e operazioni di sistema</p>
      </div>

      <div className="settings-content">
        {/* Nuova sezione per gestione ordini */}
        <div className="settings-section">
          <h3>📋 Gestione Ordini</h3>
          <p>Esporta e importa tutti gli ordini tramite file CSV.</p>
          <p className="info-text">💡 Utile per backup, analisi dati o migrazione tra ambienti.</p>
          
          <div className="orders-actions">
            <button
              onClick={exportOrdersData}
              className="export-orders-btn"
              disabled={isExportingOrders}
            >
              {isExportingOrders ? '📤 Esportazione...' : '📤 Esporta Ordini (CSV)'}
            </button>
            
            <button
              onClick={() => setShowImportOrdersDialog(true)}
              className="import-orders-btn"
              disabled={isImportingOrders}
            >
              📥 Importa Ordini (CSV)
            </button>
          </div>
        </div>

        {/* Nuova sezione per gestione menu */}
        <div className="settings-section">
          <h3>🍽️ Gestione Menu e Piatti</h3>
          <p>Esporta e importa tutti i menu, piatti e bevande tramite file CSV.</p>
          <p className="info-text">💡 Utile per backup, migrazione o sincronizzazione tra ambienti.</p>
          
          <div className="menu-actions">
            <button
              onClick={exportMenuData}
              className="export-btn"
              disabled={isExporting}
            >
              {isExporting ? '📤 Esportazione...' : '📤 Esporta Menu (CSV)'}
            </button>
            
            <button
              onClick={() => setShowImportDialog(true)}
              className="import-btn"
              disabled={isImporting}
            >
              📥 Importa Menu (CSV)
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>🔄 Reset Sistema</h3>
          <p>Questa operazione cancellerà tutti gli ordini esistenti.</p>
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

      {/* Dialog di import menu */}
      {showImportDialog && (
        <div className="dialog-overlay">
          <div className="dialog-content settings-dialog">
            <div className="dialog-header">
              <h3>📥 Import Menu e Piatti</h3>
              <button 
                onClick={() => setShowImportDialog(false)}
                className="close-dialog-btn"
              >
                ✕
              </button>
            </div>
            <div className="dialog-body">
              <div className="import-message">
                <p>Seleziona un file CSV per importare menu e piatti.</p>
                <p className="warning-text">⚠️ ATTENZIONE: L'import cancellerà TUTTI i menu e piatti esistenti!</p>
                
                <div className="file-input-container">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileSelect}
                    className="file-input"
                    id="menu-file-input"
                  />
                  <label htmlFor="menu-file-input" className="file-input-label">
                    {importFile ? `📁 ${importFile.name}` : '📁 Seleziona file CSV'}
                  </label>
                </div>
                
                {importFile && (
                  <div className="file-info">
                    <p>✅ File selezionato: <strong>{importFile.name}</strong></p>
                    <p>📏 Dimensione: {(importFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                )}
              </div>
            </div>
            <div className="dialog-footer">
              <button 
                onClick={() => setShowImportDialog(false)}
                className="cancel-dialog-btn"
              >
                Annulla
              </button>
              <button 
                onClick={importMenuData}
                className="confirm-import-btn"
                disabled={!importFile || isImporting}
              >
                {isImporting ? '📥 Import in corso...' : '📥 Conferma Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog di import ordini */}
      {showImportOrdersDialog && (
        <div className="dialog-overlay">
          <div className="dialog-content settings-dialog">
            <div className="dialog-header">
              <h3>📥 Import Ordini</h3>
              <button 
                onClick={() => setShowImportOrdersDialog(false)}
                className="close-dialog-btn"
              >
                ✕
              </button>
            </div>
            <div className="dialog-body">
              <div className="import-message">
                <p>Seleziona un file CSV per importare ordini.</p>
                <p className="warning-text">⚠️ ATTENZIONE: L'import cancellerà TUTTI gli ordini esistenti!</p>
                
                <div className="file-input-container">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleOrdersFileSelect}
                    className="file-input"
                    id="orders-file-input"
                  />
                  <label htmlFor="orders-file-input" className="file-input-label">
                    {importOrdersFile ? `📁 ${importOrdersFile.name}` : '📁 Seleziona file CSV'}
                  </label>
                </div>
                
                {importOrdersFile && (
                  <div className="file-info">
                    <p>✅ File selezionato: <strong>{importOrdersFile.name}</strong></p>
                    <p>📏 Dimensione: {(importOrdersFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                )}
              </div>
            </div>
            <div className="dialog-footer">
              <button 
                onClick={() => setShowImportOrdersDialog(false)}
                className="cancel-dialog-btn"
              >
                Annulla
              </button>
              <button 
                onClick={importOrdersData}
                className="confirm-import-orders-btn"
                disabled={!importOrdersFile || isImportingOrders}
              >
                {isImportingOrders ? '📥 Import in corso...' : '📥 Conferma Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
