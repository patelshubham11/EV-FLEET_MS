import { useState } from 'react'
import axios from 'axios'

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const res = await axios.post(`http://localhost:5000${endpoint}`, {
        email, password
      })
      onLogin(res.data.token)
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center" style={{ minHeight: '60vh' }}>
      <div className="glass-panel" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="text-center mb-6">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        
        {error && <div className="text-danger mb-4 text-center">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div>
            <label className="text-muted mb-2 block">Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="driver@fleet.com" 
            />
          </div>
          <div>
            <label className="text-muted mb-2 block">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
            />
          </div>
          <button type="submit" disabled={loading} className="mt-4">
            {loading ? 'Authenticating...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="text-center mt-4">
          <button 
            type="button" 
            style={{ background: 'transparent', color: 'var(--primary)', border: 'none', padding: 0 }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  )
}
