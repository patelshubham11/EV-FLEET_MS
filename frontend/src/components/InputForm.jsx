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
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary-glow p-2 rounded-lg text-xl">📋</div>
        <h2 className="m-0 text-xl">Trip <span className="text-primary">Parameters</span></h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Vehicle Model {preFillModel && '🔒'}</label>
            <input 
              name="vehicleModel" 
              value={formData.vehicleModel} 
              onChange={handleChange} 
              required 
              placeholder="e.g. Tesla Semi" 
              disabled={!!preFillModel}
              style={preFillModel ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            />
          </div>

          <div>
            <label>Mfg. Date {preFillModel && '🔒'}</label>
            <input 
              name="year" 
              type="month" 
              value={formData.year} 
              onChange={handleChange} 
              required 
              disabled={!!preFillModel}
              style={preFillModel ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Category {preFillType && '🔒'}</label>
            <select 
              name="vehicleType" 
              value={formData.vehicleType} 
              onChange={handleChange}
              disabled={!!preFillType}
              style={preFillType ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            >
              <option value="Van">Electric Van</option>
              <option value="Truck">Electric Truck</option>
              <option value="Car">Electric Car</option>
            </select>
          </div>

          <div>
            <label>Current SoC (%)</label>
            <input name="batteryPercentage" type="number" min="1" max="100" value={formData.batteryPercentage} onChange={handleChange} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Origin City</label>
            <input name="pickupLocation" value={formData.pickupLocation} onChange={handleChange} required placeholder="e.g. San Francisco" />
          </div>

          <div>
            <label>Destination</label>
            <input name="dropLocation" value={formData.dropLocation} onChange={handleChange} required placeholder="e.g. Los Angeles" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Payload (kg)</label>
            <input name="loadWeight" type="number" min="0" value={formData.loadWeight} onChange={handleChange} required />
          </div>

          <div>
            <label>External Temp (°C)</label>
            <input name="temperature" type="number" value={formData.temperature} onChange={handleChange} required placeholder="25" />
          </div>
        </div>

        <button type="submit" disabled={loading} className="mt-4 py-4 w-full">
          {loading ? (
            <span className="animate-pulse">Analyzing Optimal Route...</span>
          ) : (
            <><span>⚡</span> Calculate Optimization</>
          )}
        </button>
      </form>
    </div>
  )
}
