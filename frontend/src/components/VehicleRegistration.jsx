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
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-secondary-glow p-2 rounded-lg text-xl">🚛</div>
        <div>
          <h2 className="m-0 text-xl accent-gradient">Vehicle Profile</h2>
          <p className="text-muted text-xs">Configure your primary vehicle for faster route calculations.</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label>Model Name</label>
            <input 
              name="model" 
              value={vehicle.model} 
              onChange={handleChange} 
              required 
              placeholder="e.g. Tata Ace EV" 
            />
          </div>

          <div>
            <label>Purchase Date</label>
            <input 
              name="purchaseDate" 
              type="month" 
              value={vehicle.purchaseDate} 
              onChange={handleChange} 
              required 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label>Battery Capacity (kWh)</label>
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
            <label>Vehicle Category</label>
            <select name="vehicleType" value={vehicle.vehicleType} onChange={handleChange}>
              <option value="Van">Electric Van</option>
              <option value="Truck">Electric Truck</option>
              <option value="Car">Electric Car</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button type="submit" disabled={loading} className="w-full py-4">
            {loading ? (
              <span className="animate-pulse">Saving Profile...</span>
            ) : (
              'Save Configuration'
            )}
          </button>
          {message && (
            <p className={`mt-3 text-center text-sm font-medium ${message.includes('success') ? 'text-success' : 'text-danger'}`}>
              {message.includes('success') ? '✅ ' : '❌ '} {message}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
