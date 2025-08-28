import { useState } from 'react'
import { useUser } from './hooks/useUser'
import { auth } from './firebase'
import Auth from './components/Auth'
import Menu from './components/Menu'
import './App.css'

function App() {
  const [currentSection, setCurrentSection] = useState('home')
  const { user, userData, loading, hasPermission, isAdmin, isCassa, isCucina } = useUser()

  const sections = [
    { id: 'cassa', name: 'Cassa', icon: '💰', requiredPermission: 'canManageCassa' },
    { id: 'cucina', name: 'Cucina', icon: '👨‍🍳', requiredPermission: 'canManageOrders' },
    { id: 'ordini', name: 'Ordini', icon: '📋', requiredPermission: 'canManageOrders' },
    { id: 'menu', name: 'Menu', icon: '🍽️', requiredPermission: 'canManageMenu' },
    { id: 'impostazioni', name: 'Impostazioni', icon: '⚙️', requiredPermission: 'canManageSettings' }
  ]

  const renderSection = () => {
    switch (currentSection) {
      case 'cassa':
        return <div className="section-content">Pagina Cassa - Gestione pagamenti e chiusura cassa</div>
      case 'cucina':
        return <div className="section-content">Pagina Cucina - Visualizzazione ordini in preparazione</div>
      case 'ordini':
        return <div className="section-content">Pagina Ordini - Gestione e tracciamento ordini</div>
      case 'menu':
        return <Menu />
      case 'impostazioni':
        return <div className="section-content">Pagina Impostazioni - Configurazione sistema</div>
      default:
        return <div className="section-content">Benvenuto nel sistema di gestione ristorante</div>
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Caricamento...</div>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  // Filtra le sezioni in base ai permessi dell'utente
  // const availableSections = sections.filter(section => 
  //   hasPermission(section.requiredPermission)
  // )

  // Per ora mostra tutte le sezioni (per sviluppo)
  const availableSections = sections;

  // Debug: mostra i dati utente nella console
  console.log('Debug - userData:', userData);
  console.log('Debug - Permissions:', userData?.permissions);
  console.log('Debug - Available sections:', availableSections);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Bagnarola Orders</h1>
            <p>Sistema di gestione ordinazioni ristorante</p>
          </div>
          <div className="header-right">
            <div className="user-info-header">
              <span className="user-email">{user.email}</span>
              <span className="user-role">{userData?.accountType || 'Utente'}</span>
            </div>
            <button onClick={() => auth.signOut()} className="logout-header-btn">
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <main className="app-main">
        <nav className="sidebar">
          {availableSections.map((section) => (
            <button
              key={section.id}
              className={`nav-button ${currentSection === section.id ? 'active' : ''}`}
              onClick={() => setCurrentSection(section.id)}
            >
              <span className="nav-icon">{section.icon}</span>
              <span className="nav-text">{section.name}</span>
            </button>
          ))}
        </nav>
        
        <div className="content-area">
          {renderSection()}
        </div>
      </main>
    </div>
  )
}

export default App
