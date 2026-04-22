import { useState, useEffect } from 'react'
import axios from 'axios'

export default function VehicleRegistration({ onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [vehicle, setVehicle] = useState({
    model: '',
    purchaseDate: '',
    batteryCapacity: '',
    vehicleType: 'Truck'
  })

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token')
      try {
        const res = await axios.get('http://localhost:5000/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.data.vehicleDetails) {
          setVehicle(res.data.vehicleDetails)
        }
      } catch (err) {
        console.error("Failed to fetch profile")
      }
    }
    fetchProfile()
  }, [])

  const handleChange = (e) => {
    setVehicle({ ...vehicle, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const token = localStorage.getItem('token')
    try {
      const res = await axios.post('http://localhost:5000/api/user/vehicle', vehicle, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage('Vehicle details saved successfully!')
      if (onUpdate) onUpdate(res.data.vehicleDetails)
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to save vehicle details';
      setMessage(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-panel mb-8 animate-slide-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '1.5rem' }}>🚛</div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.15rem' }} className="accent-gradient">Vehicle Profile</h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Save your vehicle to auto-fill trip forms.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div>
            <label>Model Name</label>
            <input name="model" value={vehicle.model} onChange={handleChange} required placeholder="e.g. Tata Ace EV" />
          </div>
          <div>
            <label>Purchase Date</label>
            <input name="purchaseDate" type="month" value={vehicle.purchaseDate} onChange={handleChange} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div>
            <label>Battery Capacity (kWh)</label>
            <input name="batteryCapacity" type="number" value={vehicle.batteryCapacity} onChange={handleChange} required placeholder="e.g. 145" />
          </div>
          <div>
            <label>Vehicle Category</label>
            <select name="vehicleType" value={vehicle.vehicleType} onChange={handleChange}>
              <option value="Van">Electric Van</option>
              <option value="Truck">Electric Truck</option>
              <option value="Car">Electric Car</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading} style={{ marginTop: '0.5rem', width: '100%', padding: '1rem' }}>
          {loading ? '⏳ Saving Profile...' : '💾 Save Vehicle Configuration'}
        </button>
        {message && (
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: message.includes('success') ? 'var(--primary)' : 'var(--error)', margin: '0.25rem 0 0' }}>
            {message.includes('success') ? '✅ ' : '❌ '}{message}
          </p>
        )}
      </form>
    </div>
  )
}

