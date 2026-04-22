import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))

  const handleLogin = (newToken) => {
    setToken(newToken)
    localStorage.setItem('token', newToken)
  }

  const handleLogout = () => {
    setToken(null)
    localStorage.removeItem('token')
  }

  return (
    <Router>
      <div className="app-container animate-fade-in">
        <header className="flex justify-between items-center mb-8 glass-panel py-4 px-8" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-3">
            <div className="bg-primary" style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '1.5rem' }}>⚡</div>
            <h1 className="text-gradient m-0">EV Fleet <span className="accent-gradient">Studio</span></h1>
          </div>
          {token && (
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}>
              Sign Out
            </button>
          )}
        </header>

        <main>
          <Routes>
            <Route 
              path="/login" 
              element={!token ? <Auth onLogin={handleLogin} /> : <Navigate to="/dashboard" />} 
            />
            <Route 
              path="/dashboard" 
              element={token ? <Dashboard token={token} onLogout={handleLogout} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="*" 
              element={<Navigate to={token ? "/dashboard" : "/login"} />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
