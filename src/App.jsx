import { useState, useEffect } from 'react'
import { useUser } from './hooks/useUser'
import { auth } from './firebase'
import Auth from './components/Auth'
import Menu from './components/Menu'
import Statistiche from './components/Statistiche'
import Cassa from './components/Cassa'
import Orders from './components/Orders'
import Settings from './components/Settings'
import Cucina from './components/Cucina'
import Consegna from './components/Consegna'
import './App.css'

function App() {
  const [currentSection, setCurrentSection] = useState('home')
  const { user, userData, loading, hasPermission, isAdmin, isCassa, isCucina } = useUser()

  const sections = [
    { id: 'cassa', name: 'Cassa', icon: '💰', requiredPermission: 'canManageCassa' },
    { id: 'cucina', name: 'Cucina', icon: '👨‍🍳', requiredPermission: 'canManageOrders' },
    { id: 'consegna', name: 'Consegna', icon: '🚚', requiredPermission: 'canManageOrders' },
    { id: 'ordini', name: 'Ordini', icon: '📋', requiredPermission: 'canManageOrders' },
    { id: 'menu', name: 'Menu', icon: '🍽️', requiredPermission: 'canManageMenu' },
    { id: 'statistiche', name: 'Statistiche', icon: '📊', requiredPermission: 'canManageOrders' },
    { id: 'impostazioni', name: 'Impostazioni', icon: '⚙️', requiredPermission: 'canManageSettings' }
  ]

  const renderSection = () => {
    // Controlla se la sezione corrente è autorizzata per questo utente
    const isSectionAuthorized = availableSections.find(s => s.id === currentSection);
    if (!isSectionAuthorized) {
      return <div className="section-content">Sezione non autorizzata per il tuo tipo di account</div>;
    }

    switch (currentSection) {
      case 'cassa':
        return <Cassa />
      case 'cucina':
        return <Cucina />
      case 'consegna':
        return <Consegna />
      case 'ordini':
        return <Orders />
      case 'menu':
        return <Menu />
      case 'statistiche':
        return <Statistiche />
      case 'impostazioni':
        return <Settings />
      default:
        return <div className="section-content">Benvenuto nel sistema di gestione ristorante</div>
    }
  }

  // Filtra le sezioni in base al tipo di account dell'utente
  const getAvailableSections = () => {
    // Se userData non è ancora caricato, mostra tutte le sezioni (fallback sicuro)
    if (!userData) {
      return sections;
    }
    
    if (isAdmin()) {
      // Admin può vedere tutto
      return sections;
    } else if (isCassa()) {
      // Cassa può vedere solo Cassa e Ordini
      return sections.filter(section => 
        section.id === 'cassa' || section.id === 'ordini'
      );
    } else if (isCucina()) {
      // Cucina può vedere solo Cucina e Ordini
      return sections.filter(section => 
        section.id === 'cucina' || section.id === 'ordini'
      );
    }
    // Fallback: nessuna sezione disponibile
    return [];
  };

  const availableSections = getAvailableSections();

  // Debug: log per capire il problema
  console.log('Debug info:', {
    userData,
    accountType: userData?.accountType,
    isAdmin: isAdmin(),
    isCassa: isCassa(),
    isCucina: isCucina(),
    availableSections: availableSections.length,
    sections: sections.length
  });

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      return;
    }

    // Se la sezione corrente non è disponibile per questo tipo di account,
    // reindirizza alla prima sezione disponibile
    if (availableSections.length > 0 && !availableSections.find(s => s.id === currentSection)) {
      setCurrentSection(availableSections[0].id);
    }
  }, [loading, user, currentSection, availableSections]);

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

  // Debug: mostra i dati utente nella console
      // Log rimossi per semplificare la console

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Bagnarola Orders</h1>
            <p>Sistema di gestione ordinazioni</p>
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
