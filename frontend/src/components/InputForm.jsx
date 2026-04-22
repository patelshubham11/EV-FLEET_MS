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
    <div className="glass-panel animate-slide-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '1.5rem' }}>📋</div>
        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Trip <span className="accent-gradient">Parameters</span></h2>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div>
            <label>Vehicle Model {preFillModel && '🔒'}</label>
            <input name="vehicleModel" value={formData.vehicleModel} onChange={handleChange} required placeholder="e.g. Tata Ace EV" disabled={!!preFillModel} style={preFillModel ? { opacity: 0.5, cursor: 'not-allowed' } : {}} />
          </div>
          <div>
            <label>Mfg. Date {preFillModel && '🔒'}</label>
            <input name="year" type="month" value={formData.year} onChange={handleChange} required disabled={!!preFillModel} style={preFillModel ? { opacity: 0.5, cursor: 'not-allowed' } : {}} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div>
            <label>Category {preFillType && '🔒'}</label>
            <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} disabled={!!preFillType} style={preFillType ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
              <option value="Van">Electric Van</option>
              <option value="Truck">Electric Truck</option>
              <option value="Car">Electric Car</option>
            </select>
          </div>
          <div>
            <label>Battery SoC (%)</label>
            <input name="batteryPercentage" type="number" min="1" max="100" value={formData.batteryPercentage} onChange={handleChange} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div>
            <label>Origin City</label>
            <input name="pickupLocation" value={formData.pickupLocation} onChange={handleChange} required placeholder="e.g. Delhi" />
          </div>
          <div>
            <label>Destination</label>
            <input name="dropLocation" value={formData.dropLocation} onChange={handleChange} required placeholder="e.g. Mumbai" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div>
            <label>Payload (kg)</label>
            <input name="loadWeight" type="number" min="0" value={formData.loadWeight} onChange={handleChange} required />
          </div>
          <div>
            <label>Ambient Temp (°C)</label>
            <input name="temperature" type="number" value={formData.temperature} onChange={handleChange} required placeholder="25" />
          </div>
        </div>

        <button type="submit" disabled={loading} style={{ marginTop: '0.5rem', width: '100%', padding: '1rem' }}>
          {loading ? '⏳ Analyzing Route...' : '⚡ Calculate Optimization'}
        </button>
      </form>
    </div>
  )
}

