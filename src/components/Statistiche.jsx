import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import './Statistiche.css'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  PointElement, 
  LineElement 
} from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'

// Registra i componenti Chart.js necessari
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
)

const Statistiche = () => {
  const [loading, setLoading] = useState(true)
  // Rimuovo la selezione del periodo temporale - prendo sempre tutti i dati
  const [orders, setOrders] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [menuCompositi, setMenuCompositi] = useState([])
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    foodRevenue: 0,
    drinksRevenue: 0,
    menuRevenue: 0,
    categorySales: {},
    productSales: {},
    productSalesCount: {},
    inventorySoldPercentage: 0,
    inventoryStats: { sold: 0, remaining: 0, total: 0, percentage: 0 },
    dailyRevenue: [],
    categorySalesCount: {},
    topProducts: []
  })

  // Prendo sempre tutti i dati dal database

  // Carica i dati dal database
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Carica tutti gli ordini
        const ordersQuery = query(
          collection(db, 'ordini'),
          orderBy('createdAt', 'desc')
        )
        const ordersSnapshot = await getDocs(ordersQuery)
        const ordersData = []
        ordersSnapshot.forEach((doc) => {
          ordersData.push({ id: doc.id, ...doc.data() })
        })
        setOrders(ordersData)

        // Carica i prodotti
        const menuQuery = query(collection(db, 'menu'), orderBy('createdAt', 'asc'))
        const menuSnapshot = await getDocs(menuQuery)
        const menuItemsData = []
        menuSnapshot.forEach((doc) => {
          menuItemsData.push({ id: doc.id, ...doc.data() })
        })
        setMenuItems(menuItemsData)

        // Carica i menu compositi
        const compositiQuery = query(collection(db, 'menuCompositi'), orderBy('createdAt', 'asc'))
        const compositiSnapshot = await getDocs(compositiQuery)
        const compositiData = []
        compositiSnapshot.forEach((doc) => {
          compositiData.push({ id: doc.id, ...doc.data() })
        })
        setMenuCompositi(compositiData)

        // Calcola le statistiche
        calculateStats(ordersData, menuItemsData, compositiData)
      } catch (error) {
        console.error('Errore nel caricamento dei dati:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calcola le statistiche
  const calculateStats = (ordersData, menuItemsData, compositiData) => {
    // Inizializza i contatori
    let totalRevenue = 0
    let foodRevenue = 0
    let drinksRevenue = 0
    let menuRevenue = 0
    const categorySales = {}
    const categorySalesCount = {}
    const productSales = {}
    const dailyRevenue = {}
    const productSalesCount = {}

    // Analizza gli ordini
    ordersData.forEach(order => {
      // Salta gli ordini annullati
      if (order.status === 'annullato') return

      // Aggiungi al totale ricavi
      totalRevenue += order.total || 0

      // Organizza ricavi per mezz'ora
      const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt)
      // Arrotonda alla mezz'ora più vicina
      const minutes = date.getMinutes()
      const roundedMinutes = minutes >= 30 ? 30 : 0
      date.setMinutes(roundedMinutes, 0, 0)
      const timeKey = date.getTime()
      dailyRevenue[timeKey] = (dailyRevenue[timeKey] || 0) + (order.total || 0)

      // Analizza gli articoli dell'ordine
      order.items?.forEach(item => {
        // Usa il prezzo parziale già calcolato (quantità × prezzo unitario)
        // Se l'ordine è dello staff (totale = 0), il parziale è 0
        const itemRevenue = order.total === 0 ? 0 : (item.price * item.quantity)
        
        // Aggrega per categoria
        if (item.category === 'cibo') {
          foodRevenue += itemRevenue
        } else if (item.category === 'bevande') {
          drinksRevenue += itemRevenue
        } else if (item.category === 'composito') {
          menuRevenue += itemRevenue
        }

        // Aggrega per categoria
        categorySales[item.category] = (categorySales[item.category] || 0) + itemRevenue
        categorySalesCount[item.category] = (categorySalesCount[item.category] || 0) + item.quantity

        // Aggrega per prodotto
        const productKey = `${item.name}_${item.category}`
        productSales[productKey] = (productSales[productKey] || 0) + itemRevenue
        productSalesCount[productKey] = (productSalesCount[productKey] || 0) + item.quantity
      })
    })

    // Calcola la percentuale di inventario venduto
    let totalRemainingInventory = 0
    let totalSoldInventory = 0

    // Somma l'inventario corrente (solo cibi e bevande, escludendo menu compositi)
    menuItemsData.forEach(item => {
      if (item.category === 'cibo' || item.category === 'bevande') {
        totalRemainingInventory += item.quantity || 0
      }
    })

    // Calcola i prodotti venduti: cibi + bevande + elementi dei menu venduti
    Object.entries(productSalesCount).forEach(([productKey, count]) => {
      const [name, category] = productKey.split('_')
      
      if (category === 'cibo' || category === 'bevande') {
        // Per cibi e bevande venduti direttamente
        totalSoldInventory += count
      } else if (category === 'composito') {
        // Per i menu compositi, conta ogni elemento contenuto
        const menuComposito = compositiData.find(menu => menu.name === name)
        if (menuComposito && menuComposito.items) {
          // Ogni menu venduto contribuisce con la quantità di ogni suo elemento
          totalSoldInventory += count * menuComposito.items.length
        }
      }
    })

    // Calcola la percentuale di inventario venduto
    const totalInventory = totalRemainingInventory + totalSoldInventory
    const inventorySoldPercentage = totalInventory > 0 
      ? (totalSoldInventory / totalInventory) * 100
      : 0

    // Salva anche i numeri assoluti per i tooltip
    const inventoryStats = {
      sold: totalSoldInventory,
      remaining: totalRemainingInventory,
      total: totalInventory,
      percentage: inventorySoldPercentage
    }

    // Ordina i prodotti per vendite e prendi i primi 10
    const topProducts = Object.entries(productSales)
      .map(([key, value]) => {
        const [name, category] = key.split('_')
        return { name, category, revenue: value, quantity: productSalesCount[key] || 0 }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Crea array completo di mezz'ore dal primo all'ultimo ordine
    const timeSlots = []
    if (ordersData.length > 0) {
      // Trova il primo e l'ultimo ordine
      const firstOrder = ordersData.reduce((earliest, order) => {
        const orderTime = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt)
        return orderTime < earliest ? orderTime : earliest
      }, new Date())
      
      const lastOrder = ordersData.reduce((latest, order) => {
        const orderTime = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt)
        return orderTime > latest ? orderTime : latest
      }, new Date(0))
      
      // Arrotonda il primo ordine alla mezz'ora precedente
      const firstSlot = new Date(firstOrder)
      firstSlot.setMinutes(firstSlot.getMinutes() >= 30 ? 30 : 0, 0, 0)
      
      // Arrotonda l'ultimo ordine alla mezz'ora successiva
      const lastSlot = new Date(lastOrder)
      lastSlot.setMinutes(lastSlot.getMinutes() >= 30 ? 30 : 0, 0, 0)
      if (lastSlot.getMinutes() === 0) {
        lastSlot.setMinutes(30)
      } else {
        lastSlot.setMinutes(0)
        lastSlot.setHours(lastSlot.getHours() + 1)
      }
      
      // Genera tutti gli slot di mezz'ora
      const currentSlot = new Date(firstSlot)
      while (currentSlot <= lastSlot) {
        const timeKey = currentSlot.getTime()
        timeSlots.push({
          time: timeKey,
          label: currentSlot.toLocaleTimeString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          date: currentSlot.toLocaleDateString('it-IT'),
          revenue: dailyRevenue[timeKey] || 0
        })
        
        // Avanza di mezz'ora
        currentSlot.setMinutes(currentSlot.getMinutes() + 30)
      }
    }

    // Imposta le statistiche calcolate
    setStats({
      totalRevenue,
      totalOrders: ordersData.filter(o => o.status !== 'annullato').length,
      averageOrderValue: ordersData.length > 0 ? totalRevenue / ordersData.filter(o => o.status !== 'annullato').length : 0,
      foodRevenue,
      drinksRevenue,
      menuRevenue,
      categorySales,
      categorySalesCount,
      productSales,
      productSalesCount,
      inventorySoldPercentage,
      inventoryStats,
      dailyRevenue: timeSlots,
      topProducts
    })
  }

  // Formatta i numeri come valuta
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
  }

  // Prepara i dati per il grafico a torta delle vendite per categoria
  const categoryPieData = {
    labels: ['Menu Compositi', 'Cibi', 'Bevande'],
    datasets: [
      {
        data: [stats.menuRevenue || 0, stats.foodRevenue || 0, stats.drinksRevenue || 0],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
        hoverBackgroundColor: ['#FF4778', '#2D88C5', '#FFB223'],
      },
    ],
  }

  // Prepara i dati per il grafico a barre dei prodotti più venduti
  const topProductsBarData = {
    labels: (stats.topProducts || []).map(p => p.name),
    datasets: [
      {
        label: 'Ricavi (€)',
        data: (stats.topProducts || []).map(p => p.revenue),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  }

  // Prepara i dati per il grafico a barre dei ricavi per mezz'ora
  const dailyRevenueData = {
    labels: (stats.dailyRevenue || []).map(slot => `${slot.date} ${slot.label}`),
    datasets: [
      {
        label: 'Ricavi per Mezz\'ora',
        data: (stats.dailyRevenue || []).map(slot => slot.revenue),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      }
    ]
  }

  // Opzioni per i grafici
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Statistiche di Vendita',
      },
    },
  }

  return (
    <div className="statistiche-container">
      <div className="statistiche-header">
        <h2>📊 Statistiche</h2>
        <p>Analisi e report del sistema di gestione ristorante</p>
      </div>
      

      
      {loading ? (
        <div className="statistiche-loading">
          <p>Caricamento dati in corso...</p>
        </div>
      ) : (
      <div className="statistiche-content">
          {/* Statistiche di riepilogo */}
          <div className="stats-overview">
            <div className="stats-card">
              <h3>Ricavi Totali</h3>
              <p className="stats-value">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="stats-card">
              <h3>Ordini Totali</h3>
              <p className="stats-value">{stats.totalOrders}</p>
            </div>
            <div className="stats-card">
              <h3>Valore Medio Ordine</h3>
              <p className="stats-value">{formatCurrency(stats.averageOrderValue)}</p>
            </div>
            <div className="stats-card">
              <h3>% Inventario Venduto</h3>
              <p className="stats-value">{stats.inventorySoldPercentage.toFixed(1)}%</p>
            </div>
          </div>

          {/* Grafici principali */}
          <div className="charts-row">
            <div className="chart-container">
              <h3>Ricavi per Categoria</h3>
              <div className="chart-wrapper">
                <Pie data={categoryPieData} options={chartOptions} />
              </div>
              <div className="chart-stats">
                <div className="chart-stat-item">
                  <span className="stat-label">Menu Compositi:</span>
                                          <span className="stat-value">{formatCurrency(stats.menuRevenue || 0)}</span>
                      </div>
                      <div className="chart-stat-item">
                        <span className="stat-label">Cibi:</span>
                        <span className="stat-value">{formatCurrency(stats.foodRevenue || 0)}</span>
                      </div>
                      <div className="chart-stat-item">
                        <span className="stat-label">Bevande:</span>
                        <span className="stat-value">{formatCurrency(stats.drinksRevenue || 0)}</span>
                </div>
              </div>
            </div>
            
            <div className="chart-container">
              <h3>Quantità Vendute per Categoria</h3>
              <div className="chart-wrapper">
                <Pie 
                  data={{
                    labels: ['Menu Compositi', 'Cibi', 'Bevande'],
                    datasets: [
                      {
                        data: [
                          (stats.categorySalesCount && stats.categorySalesCount['composito']) || 0, 
                          (stats.categorySalesCount && stats.categorySalesCount['cibo']) || 0, 
                          (stats.categorySalesCount && stats.categorySalesCount['bevande']) || 0
                        ],
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
                        hoverBackgroundColor: ['#FF4778', '#2D88C5', '#FFB223'],
                      },
                    ],
                  }} 
                  options={chartOptions} 
                />
              </div>
              <div className="chart-stats">
                <div className="chart-stat-item">
                  <span className="stat-label">Menu Compositi:</span>
                                          <span className="stat-value">{(stats.categorySalesCount && stats.categorySalesCount['composito']) || 0} unità</span>
                      </div>
                      <div className="chart-stat-item">
                        <span className="stat-label">Cibi:</span>
                        <span className="stat-value">{(stats.categorySalesCount && stats.categorySalesCount['cibo']) || 0} unità</span>
                      </div>
                      <div className="chart-stat-item">
                        <span className="stat-label">Bevande:</span>
                        <span className="stat-value">{(stats.categorySalesCount && stats.categorySalesCount['bevande']) || 0} unità</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grafico dei ricavi per mezz'ora */}
          <div className="full-width-chart">
            <h3>Andamento Ricavi per Mezz'ora</h3>
            <div className="chart-wrapper">
              <Bar 
                data={dailyRevenueData} 
                options={{
                  ...chartOptions,
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Ricavi (€)'
                      }
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Data e Ora'
                      }
                    }
                  }
                }} 
              />
            </div>
          </div>

          {/* Top prodotti */}
          <div className="full-width-chart">
            <h3>Top 10 Prodotti per Ricavi</h3>
            <div className="chart-wrapper">
              <Bar 
                data={topProductsBarData} 
                options={{
                  ...chartOptions,
                  indexAxis: 'y',
                  scales: {
                    x: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Ricavi (€)'
                      }
                    }
                  }
                }} 
              />
            </div>
          </div>

          {/* Tabella di tutti i prodotti del menu */}
          <div className="products-table-section">
            <h3>Dettaglio Tutti i Prodotti del Menu</h3>
            <div className="products-table-container">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Prodotto</th>
                    <th>Categoria</th>
                    <th>Quantità Venduta</th>
                    <th>Ricavi Totali</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Combina tutti i prodotti del menu con le statistiche di vendita
                    const allProducts = []
                    
                    // Aggiungi i prodotti singoli
                    menuItems.forEach(item => {
                      const productKey = `${item.name}_${item.category}`
                      const directSales = (stats.productSalesCount && stats.productSalesCount[productKey]) || 0
                      const salesData = (stats.productSales && stats.productSales[productKey]) || 0
                      
                      // Calcola vendite totali (dirette + tramite menu)
                      let totalSales = directSales
                      
                      // Cerca quanti menu compositi contengono questo prodotto
                      menuCompositi.forEach(menu => {
                        if (menu.items && menu.items.includes(item.id)) {
                          const menuSales = (stats.productSalesCount && stats.productSalesCount[`${menu.name}_composito`]) || 0
                          totalSales += menuSales
                        }
                      })
                      
                      allProducts.push({
                        name: item.name,
                        category: item.category,
                        quantity: directSales,
                        totalQuantity: totalSales,
                        revenue: salesData
                      })
                    })
                    
                    // Aggiungi i menu compositi
                    menuCompositi.forEach(menu => {
                      const productKey = `${menu.name}_composito`
                      const salesData = (stats.productSales && stats.productSales[productKey]) || 0
                      const salesCount = (stats.productSalesCount && stats.productSalesCount[productKey]) || 0
                      
                      allProducts.push({
                        name: menu.name,
                        category: 'composito',
                        quantity: salesCount,
                        totalQuantity: salesCount, // Per i menu, quantità diretta = totale
                        revenue: salesData
                      })
                    })
                    
                    // Ordina per ricavo decrescente
                    allProducts.sort((a, b) => b.revenue - a.revenue)
                    
                    return allProducts.map((product, index) => (
                      <tr key={index}>
                        <td>{product.name}</td>
                        <td className={`category-cell category-${product.category}`}>
                          {product.category === 'cibo' ? 'Cibo' : 
                           product.category === 'bevande' ? 'Bevanda' : 
                           product.category === 'composito' ? 'Menu' : product.category}
                        </td>
                        <td>
                          {product.totalQuantity > product.quantity ? 
                            `${product.quantity} (${product.totalQuantity})` : 
                            product.quantity}
                        </td>
                        <td>{formatCurrency(product.revenue)}</td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dettagli inventario */}
          <div className="inventory-section">
            <h3>Stato Inventario</h3>
            <div className="inventory-chart-container">
              <div className="inventory-chart">
                <Pie 
                  data={{
                    labels: ['Venduto', 'Disponibile'],
                    datasets: [
                      {
                        data: [stats.inventorySoldPercentage, 100 - stats.inventorySoldPercentage],
                        backgroundColor: ['#36A2EB', '#E7E9ED'],
                        hoverBackgroundColor: ['#2D88C5', '#D6D8DC'],
                      },
                    ],
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            if (label === 'Venduto') {
                              return `${label}: ${stats.inventoryStats?.sold || 0} prodotti`;
                            } else if (label === 'Disponibile') {
                              return `${label}: ${stats.inventoryStats?.remaining || 0} prodotti`;
                            }
                            return `${label}: ${context.parsed.toFixed(1)}%`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
              <div className="inventory-stats">
                <p>Prodotti venduti: <strong>{stats.inventoryStats?.sold || 0}</strong></p>
                <p>Prodotti disponibili: <strong>{stats.inventoryStats?.remaining || 0}</strong></p>
                <p>Totale prodotti: <strong>{stats.inventoryStats?.total || 0}</strong></p>
                <p>Percentuale venduti: <strong>{stats.inventorySoldPercentage.toFixed(1)}%</strong></p>
              </div>
            </div>
          </div>
      </div>
      )}
    </div>
  )
}

export default Statistiche
