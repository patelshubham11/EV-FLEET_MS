import { useState, useEffect } from 'react'

export default function InputForm({ onSubmit, loading, preFillModel, preFillYear, preFillType }) {
  const [formData, setFormData] = useState({
    vehicleModel: preFillModel || '',
    year: preFillYear || '2023-01',
    vehicleType: preFillType || 'Van',
    pickupLocation: '',
    dropLocation: '',
    batteryPercentage: '100',
    loadWeight: '500',
    temperature: '25'
  })

  useEffect(() => {
    if (preFillModel) {
      setFormData(prev => ({ 
        ...prev, 
        vehicleModel: preFillModel, 
        year: preFillYear || prev.year,
        vehicleType: preFillType || prev.vehicleType
      }))
    }
  }, [preFillModel, preFillYear, preFillType])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="glass-panel">
      <h2>Driver Input</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 mt-4">
        
        <div>
          <label className="text-muted mb-2 block">Vehicle Model {preFillModel && '🔒'}</label>
          <input 
            name="vehicleModel" 
            value={formData.vehicleModel} 
            onChange={handleChange} 
            required 
            placeholder="e.g. Tata Ace EV" 
            disabled={!!preFillModel}
            style={preFillModel ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.05)' } : {}}
          />
        </div>

        <div>
          <label className="text-muted mb-2 block">Mfg. Year & Month {preFillModel && '🔒'}</label>
          <input 
            name="year" 
            type="month" 
            value={formData.year} 
            onChange={handleChange} 
            required 
            disabled={!!preFillModel}
            style={preFillModel ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.05)' } : {}}
          />
        </div>

        <div>
          <label className="text-muted mb-2 block">Vehicle Type {preFillType && '🔒'}</label>
          <select 
            name="vehicleType" 
            value={formData.vehicleType} 
            onChange={handleChange}
            disabled={!!preFillType}
            style={preFillType ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.05)' } : {}}
          >
            <option value="Van">Electric Van</option>
            <option value="Truck">Electric Truck</option>
            <option value="Car">Electric Car</option>
          </select>
        </div>

        <div>
          <label className="text-muted mb-2 block">Battery Percentage (%)</label>
          <input name="batteryPercentage" type="number" min="1" max="100" value={formData.batteryPercentage} onChange={handleChange} required />
        </div>

        <div>
          <label className="text-muted mb-2 block">Pickup Location (City)</label>
          <input name="pickupLocation" value={formData.pickupLocation} onChange={handleChange} required placeholder="e.g. New York" />
        </div>

        <div>
          <label className="text-muted mb-2 block">Drop Location (City)</label>
          <input name="dropLocation" value={formData.dropLocation} onChange={handleChange} required placeholder="e.g. Boston" />
        </div>

        <div style={{ gridColumn: 'span 1' }}>
          <label className="text-muted mb-2 block">Load Weight (kg)</label>
          <input name="loadWeight" type="number" min="0" value={formData.loadWeight} onChange={handleChange} required />
        </div>

        <div style={{ gridColumn: 'span 1' }}>
          <label className="text-muted mb-2 block">Temperature (°C)</label>
          <input name="temperature" type="number" value={formData.temperature} onChange={handleChange} required placeholder="25" />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Optimizing Route...' : 'Calculate Optimal Route'}
          </button>
        </div>
      </form>
    </div>
  )
}
