import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore'

const Menu = () => {
  const [menuItems, setMenuItems] = useState([])
  const [editingItem, setEditingItem] = useState(null)

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

  const startEditing = (item) => {
    setEditingItem({ ...item })
  }

  const cancelEditing = () => {
    setEditingItem(null)
  }

  const filteredItems = (category) => {
    return menuItems.filter(item => item.category === category)
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
    </div>
  )
}

export default Menu
