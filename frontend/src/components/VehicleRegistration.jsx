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
    <div className="glass-panel mb-6">
      <h2 className="text-gradient">Register Your Truck</h2>
      <p className="text-muted text-sm mb-4">Save your vehicle details to get faster optimizations.</p>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-muted mb-2 block">Vehicle Model</label>
          <input 
            name="model" 
            value={vehicle.model} 
            onChange={handleChange} 
            required 
            placeholder="e.g. Tata Ace EV" 
          />
        </div>

        <div>
          <label className="text-muted mb-2 block">Purchase Year & Month</label>
          <input 
            name="purchaseDate" 
            type="month" 
            value={vehicle.purchaseDate} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div>
          <label className="text-muted mb-2 block">Battery Capacity (kWh)</label>
          <input 
            name="batteryCapacity" 
            type="number" 
            value={vehicle.batteryCapacity} 
            onChange={handleChange} 
            required 
            placeholder="e.g. 145" 
          />
        </div>

        <div>
          <label className="text-muted mb-2 block">Vehicle Type</label>
          <select name="vehicleType" value={vehicle.vehicleType} onChange={handleChange}>
            <option value="Van">Electric Van</option>
            <option value="Truck">Electric Truck</option>
            <option value="Car">Electric Car</option>
          </select>
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Vehicle Details'}
          </button>
          {message && <p className={`mt-2 text-sm ${message.includes('success') ? 'text-success' : 'text-danger'}`}>{message}</p>}
        </div>
      </form>
    </div>
  )
}
