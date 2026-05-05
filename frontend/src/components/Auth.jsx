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
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.post(`${API_URL}${endpoint}`, {
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
      <div className="glass-panel animate-slide-up" style={{ maxWidth: '450px', width: '100%', padding: '3rem' }}>
        <div className="text-center mb-8">
          <div className="accent-gradient" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {isLogin ? '👋' : '🚀'}
          </div>
          <h2 className="text-2xl m-0">{isLogin ? 'Welcome Back' : 'Get Started'}</h2>
          <p className="text-muted text-sm mt-2">{isLogin ? 'Enter your credentials to access the studio' : 'Create your account to start optimizing'}</p>
        </div>
        
        {error && (
          <div className="bg-danger text-danger p-3 rounded-lg mb-6 text-center text-sm border border-danger/20">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label>Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com" 
            />
          </div>
          <div>
            <label>Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
            />
          </div>
          <button type="submit" disabled={loading} className="mt-4 py-4">
            {loading ? (
              <>
                <span className="animate-pulse">Authenticating...</span>
              </>
            ) : (
              isLogin ? 'Sign In to Dashboard' : 'Create My Account'
            )}
          </button>
        </form>

        <div className="text-center mt-8">
          <p className="text-sm text-dim mb-2">{isLogin ? "New to the platform?" : "Already have an account?"}</p>
          <button 
            type="button" 
            className="btn-secondary w-full"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Create an Account" : "Sign In Instead"}
          </button>
        </div>
      </div>
    </div>
  )
}
