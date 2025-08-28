import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore'

const Menu = () => {
  const [menuItems, setMenuItems] = useState([])
  const [menuCompositi, setMenuCompositi] = useState([])
  const [editingItem, setEditingItem] = useState(null)
  const [editingMenu, setEditingMenu] = useState(null)
  const [showCreateMenuDialog, setShowCreateMenuDialog] = useState(false)
  const [newMenu, setNewMenu] = useState({ name: '', price: '', items: [] })

  useEffect(() => {
    const q = query(collection(db, 'menu'), orderBy('createdAt', 'asc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = []
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() })
      })
      setMenuItems(items)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'menuCompositi'), orderBy('createdAt', 'asc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const menus = []
      snapshot.forEach((doc) => {
        menus.push({ id: doc.id, ...doc.data() })
      })
      setMenuCompositi(menus)
    })

    return () => unsubscribe()
  }, [])

  const handleAddItem = async (category, newItem) => {
    if (!newItem.name || !newItem.price || !newItem.quantity) {
      alert('Compila tutti i campi obbligatori')
      return
    }

    try {
      await addDoc(collection(db, 'menu'), {
        name: newItem.name,
        price: parseFloat(newItem.price),
        quantity: parseInt(newItem.quantity),
        category: category,
        createdAt: new Date()
      })
      
      // Reset del form
      newItem.name = ''
      newItem.price = ''
      newItem.quantity = ''
    } catch (error) {
      console.error('Errore nell\'aggiunta del piatto:', error)
      alert('Errore nell\'aggiunta del piatto')
    }
  }

  const handleAddMenu = async () => {
    if (!newMenu.name || !newMenu.price || !newMenu.items || newMenu.items.length === 0) {
      alert('Compila tutti i campi obbligatori e seleziona almeno un prodotto')
      return
    }

    try {
      // Calcola la quantità disponibile (minima tra tutti i prodotti selezionati)
      const minQuantity = Math.min(...newMenu.items.map(itemId => {
        const item = menuItems.find(i => i.id === itemId)
        return item ? item.quantity : 0
      }))

      await addDoc(collection(db, 'menuCompositi'), {
        name: newMenu.name,
        price: parseFloat(newMenu.price),
        items: newMenu.items,
        minQuantity: minQuantity,
        createdAt: new Date()
      })
      
      // Reset del form e chiudi dialog
      setNewMenu({ name: '', price: '', items: [] })
      setShowCreateMenuDialog(false)
    } catch (error) {
      console.error('Errore nell\'aggiunta del menu:', error)
      alert('Errore nell\'aggiunta del menu')
    }
  }

  const handleEditItem = async (item) => {
    try {
      await updateDoc(doc(db, 'menu', item.id), {
        name: item.name,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity)
      })
      setEditingItem(null)
    } catch (error) {
      console.error('Errore nell\'aggiornamento del piatto:', error)
      alert('Errore nell\'aggiornamento del piatto')
    }
  }

  const handleEditMenu = async (menu) => {
    try {
      // Ricalcola la quantità disponibile
      const minQuantity = Math.min(...menu.items.map(itemId => {
        const item = menuItems.find(i => i.id === itemId)
        return item ? item.quantity : 0
      }))

      await updateDoc(doc(db, 'menuCompositi', menu.id), {
        name: menu.name,
        price: parseFloat(menu.price),
        items: menu.items,
        minQuantity: minQuantity
      })
      setEditingMenu(null)
    } catch (error) {
      console.error('Errore nell\'aggiornamento del menu:', error)
      alert('Errore nell\'aggiornamento del menu')
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (confirm('Sei sicuro di voler eliminare questo piatto?')) {
      try {
        await deleteDoc(doc(db, 'menu', itemId))
      } catch (error) {
        console.error('Errore nell\'eliminazione del piatto:', error)
        alert('Errore nell\'eliminazione del piatto')
      }
    }
  }

  const handleDeleteMenu = async (menuId) => {
    if (confirm('Sei sicuro di voler eliminare questo menu?')) {
      try {
        await deleteDoc(doc(db, 'menuCompositi', menuId))
      } catch (error) {
        console.error('Errore nell\'eliminazione del menu:', error)
        alert('Errore nell\'eliminazione del menu')
      }
    }
  }

  const startEditing = (item) => {
    setEditingItem({ ...item })
  }

  const startEditingMenu = (menu) => {
    setEditingMenu({ ...menu })
  }

  const cancelEditing = () => {
    setEditingItem(null)
  }

  const cancelEditingMenu = () => {
    setEditingMenu(null)
  }

  const filteredItems = (category) => {
    return menuItems.filter(item => item.category === category)
  }

  const getItemName = (itemId) => {
    const item = menuItems.find(i => i.id === itemId)
    return item ? item.name : 'Prodotto non trovato'
  }

  const renderMenuItem = (item) => {
    if (editingItem && editingItem.id === item.id) {
      return (
        <div key={item.id} className="menu-item editing">
          <input
            type="text"
            value={editingItem.name}
            onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
            className="edit-input"
            placeholder="Nome"
          />
          <input
            type="number"
            step="0.01"
            value={editingItem.price}
            onChange={(e) => setEditingItem({...editingItem, price: e.target.value})}
            className="edit-input"
            placeholder="Prezzo"
          />
          <input
            type="number"
            value={editingItem.quantity}
            onChange={(e) => setEditingItem({...editingItem, quantity: e.target.value})}
            className="edit-input"
            placeholder="Quantità"
          />
          <div className="edit-actions">
            <button onClick={() => handleEditItem(editingItem)} className="save-btn">
              💾
            </button>
            <button onClick={cancelEditing} className="cancel-btn">
              ❌
            </button>
          </div>
        </div>
      )
    }

    return (
      <div key={item.id} className="menu-item">
        <span className="item-name">{item.name}</span>
        <span className="item-price">€{item.price.toFixed(2)}</span>
        <span className="item-quantity">{item.quantity}</span>
        <div className="item-actions">
          <button onClick={() => startEditing(item)} className="edit-btn">
            ✏️
          </button>
          <button onClick={() => handleDeleteItem(item.id)} className="delete-btn">
            🗑️
          </button>
        </div>
      </div>
    )
  }

  const renderMenuComposito = (menu) => {
    if (editingMenu && editingMenu.id === menu.id) {
      return (
        <div key={menu.id} className="menu-item editing">
          <input
            type="text"
            value={editingMenu.name}
            onChange={(e) => setEditingMenu({...editingMenu, name: e.target.value})}
            className="edit-input"
            placeholder="Nome Menu"
          />
          <input
            type="number"
            step="0.01"
            value={editingMenu.price}
            onChange={(e) => setEditingMenu({...editingMenu, price: e.target.value})}
            className="edit-input"
            placeholder="Prezzo"
          />
          <div className="products-selection compact">
            <div className="products-section">
              <h5>🍽️ Cibi</h5>
              <div className="products-list">
                {filteredItems('cibo').map(item => (
                  <label key={item.id} className="product-checkbox">
                    <input
                      type="checkbox"
                      checked={editingMenu.items.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingMenu({...editingMenu, items: [...editingMenu.items, item.id]})
                        } else {
                          setEditingMenu({...editingMenu, items: editingMenu.items.filter(id => id !== item.id)})
                        }
                      }}
                    />
                    <span className="product-name">{item.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="products-divider"></div>
            <div className="products-section">
              <h5>🥤 Bevande</h5>
              <div className="products-list">
                {filteredItems('bevande').map(item => (
                  <label key={item.id} className="product-checkbox">
                    <input
                      type="checkbox"
                      checked={editingMenu.items.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingMenu({...editingMenu, items: [...editingMenu.items, item.id]})
                        } else {
                          setEditingMenu({...editingMenu, items: editingMenu.items.filter(id => id !== item.id)})
                        }
                      }}
                    />
                    <span className="product-name">{item.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="edit-actions">
            <button onClick={() => handleEditMenu(editingMenu)} className="save-btn">
              💾
            </button>
            <button onClick={cancelEditingMenu} className="cancel-btn">
              ❌
            </button>
          </div>
        </div>
      )
    }

    return (
      <div key={menu.id} className="menu-item">
        <span className="item-name">{menu.name}</span>
        <span className="item-price">€{menu.price.toFixed(2)}</span>
        <span className="item-quantity">{menu.minQuantity}</span>
        <div className="item-actions">
          <button onClick={() => startEditingMenu(menu)} className="edit-btn">
            ✏️
          </button>
          <button onClick={() => handleDeleteMenu(menu.id)} className="delete-btn">
            🗑️
          </button>
        </div>
      </div>
    )
  }

  const renderAddRow = (category) => {
    const [newItem, setNewItem] = useState({ name: '', price: '', quantity: '' })

    return (
      <div key={`add-${category}`} className="menu-item add-row">
        <input
          type="text"
          placeholder="Nome"
          value={newItem.name}
          onChange={(e) => setNewItem({...newItem, name: e.target.value})}
          className="add-input"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Prezzo"
          value={newItem.price}
          onChange={(e) => setNewItem({...newItem, price: e.target.value})}
          className="add-input"
        />
        <input
          type="number"
          placeholder="Quantità"
          value={newItem.quantity}
          onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
          className="add-input"
        />
        <button 
          onClick={() => {
            handleAddItem(category, newItem)
            setNewItem({ name: '', price: '', quantity: '' })
          }} 
          className="add-btn"
        >
          ➕
        </button>
      </div>
    )
  }

  return (
    <div className="menu-section">
      <h2>🍽️ Gestione Menu</h2>
      
      {/* Sezione Menu Compositi */}
      <div className="menu-category">
        <div className="category-header">
          <h3>🍽️ Menu Compositi</h3>
          <button 
            onClick={() => setShowCreateMenuDialog(true)}
            className="create-menu-btn"
          >
            ➕ Crea Menu
          </button>
        </div>
        <div className="menu-header">
          <span className="header-name">Nome Menu</span>
          <span className="header-price">Prezzo</span>
          <span className="header-quantity">Quantità</span>
          <span className="header-actions">Azioni</span>
        </div>
        <div className="menu-list">
          {menuCompositi.map(renderMenuComposito)}
        </div>
      </div>

      {/* Sezione Cibo */}
      <div className="menu-category">
        <h3>🍽️ Cibo</h3>
        <div className="menu-header">
          <span className="header-name">Nome</span>
          <span className="header-price">Prezzo</span>
          <span className="header-quantity">Quantità</span>
          <span className="header-actions">Azioni</span>
        </div>
        <div className="menu-list">
          {filteredItems('cibo').map(renderMenuItem)}
          {renderAddRow('cibo')}
        </div>
      </div>

      {/* Sezione Bevande */}
      <div className="menu-category">
        <h3>🥤 Bevande</h3>
        <div className="menu-header">
          <span className="header-name">Nome</span>
          <span className="header-price">Prezzo</span>
          <span className="header-quantity">Quantità</span>
          <span className="header-actions">Azioni</span>
        </div>
        <div className="menu-list">
          {filteredItems('bevande').map(renderMenuItem)}
          {renderAddRow('bevande')}
        </div>
      </div>

      {/* Dialog per creare nuovo menu */}
      {showCreateMenuDialog && (
        <div className="dialog-overlay">
          <div className="dialog-content">
            <div className="dialog-header">
              <h3>➕ Crea Nuovo Menu</h3>
              <button 
                onClick={() => setShowCreateMenuDialog(false)}
                className="close-dialog-btn"
              >
                ✕
              </button>
            </div>
            <div className="dialog-body">
              <div className="form-group">
                <label>Nome Menu:</label>
                <input
                  type="text"
                  placeholder="Es: Menu Completo, Pranzo Business..."
                  value={newMenu.name}
                  onChange={(e) => setNewMenu({...newMenu, name: e.target.value})}
                  className="dialog-input"
                />
              </div>
              <div className="form-group">
                <label>Prezzo (€):</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newMenu.price}
                  onChange={(e) => setNewMenu({...newMenu, price: e.target.value})}
                  className="dialog-input"
                />
              </div>
              <div className="form-group">
                <label>Seleziona Prodotti:</label>
                <div className="products-selection">
                  <div className="products-section">
                    <h4>🍽️ Cibi</h4>
                    <div className="products-list">
                      {filteredItems('cibo').map(item => (
                        <label key={item.id} className="product-checkbox">
                          <input
                            type="checkbox"
                            checked={newMenu.items.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewMenu({...newMenu, items: [...newMenu.items, item.id]})
                              } else {
                                setNewMenu({...newMenu, items: newMenu.items.filter(id => id !== item.id)})
                              }
                            }}
                          />
                          <span className="product-name">{item.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="products-divider"></div>
                  <div className="products-section">
                    <h4>🥤 Bevande</h4>
                    <div className="products-list">
                      {filteredItems('bevande').map(item => (
                        <label key={item.id} className="product-checkbox">
                          <input
                            type="checkbox"
                            checked={newMenu.items.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewMenu({...newMenu, items: [...newMenu.items, item.id]})
                              } else {
                                setNewMenu({...newMenu, items: newMenu.items.filter(id => id !== item.id)})
                              }
                            }}
                          />
                          <span className="product-name">{item.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="dialog-footer">
              <button 
                onClick={() => setShowCreateMenuDialog(false)}
                className="cancel-dialog-btn"
              >
                Annulla
              </button>
              <button 
                onClick={handleAddMenu}
                className="create-dialog-btn"
              >
                Crea Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Menu
