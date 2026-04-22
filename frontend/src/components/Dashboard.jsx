import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import InputForm from './InputForm'
import VehicleRegistration from './VehicleRegistration'
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON, LayersControl } from 'react-leaflet'
const { BaseLayer } = LayersControl;
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const getHaversineDistance = (p1, p2) => {
  const R = 6371; 
  const dLat = (p2[1] - p1[1]) * Math.PI / 180;
  const dLon = (p2[0] - p1[0]) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1[1] * Math.PI / 180) * Math.cos(p2[1] * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function ChangeView({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
    else if (center) map.setView(center, zoom);
  }, [center, zoom, bounds, map]);
  return null;
}

export default function Dashboard({ token, onLogout }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [inputs, setInputs] = useState(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [viewingHistoryItem, setViewingHistoryItem] = useState(false)
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]) 
  const [zoom, setZoom] = useState(5)
  const [mapBounds, setMapBounds] = useState(null)
  const [registeredVehicle, setRegisteredVehicle] = useState(null)
  const [showVehicleReg, setShowVehicleReg] = useState(false)

  // Simulation State
  const [simActive, setSimActive] = useState(false)
  const [simPaused, setSimPaused] = useState(false)
  const [simPosIndex, setSimPosIndex] = useState(0)
  const [simBattery, setSimBattery] = useState(100)
  const [simSpeed, setSimSpeed] = useState(60)
  const [simDistance, setSimDistance] = useState(0)
  const [lastBreakDist, setLastBreakDist] = useState(0)
  const [showChargeModal, setShowChargeModal] = useState(false)
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [nearbyStation, setNearbyStation] = useState(null)
  
  // Performance Tracking
  const [violations, setViolations] = useState([])
  const [overspeedingCount, setOverspeedingCount] = useState(0)
  const [breaksTaken, setBreaksTaken] = useState(0)
  const [breaksSkipped, setBreaksSkipped] = useState(0)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.data.vehicleDetails) setRegisteredVehicle(res.data.vehicleDetails)
      } catch (err) { console.error("Profile fetch error") }
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    if (showHistory) {
      const fetchHistory = async () => {
        try {
          const res = await axios.get('http://localhost:5000/api/history', {
            headers: { Authorization: `Bearer ${token}` }
          })
          setHistory(res.data)
        } catch (err) { console.error("History fetch error") }
      }
      fetchHistory()
    }
  }, [showHistory])

  // Simulation Loop
  useEffect(() => {
    let timer;
    if (simActive && !simPaused && result?.geometry?.coordinates) {
      const coords = result.geometry.coordinates;
      if (simPosIndex < coords.length - 1) {
        timer = setTimeout(() => {
          const nextIndex = simPosIndex + 1;
          const p1 = coords[simPosIndex];
          const p2 = coords[nextIndex];
          const d = getHaversineDistance(p1, p2);
          
          // Logic Factors
          let speedFactor = 1.0;
          if (simSpeed > 80) {
            speedFactor = 1 + (simSpeed - 80) * 0.015;
            setOverspeedingCount(prev => prev + 1);
          } else if (simSpeed < 40) speedFactor = 1.05;

          // Load Factor (Sync with Backend)
          const loadWeight = parseFloat(inputs?.loadWeight || 500);
          let loadFactor = 1 + (loadWeight / 1000) * 0.1;
          if (loadWeight > 6000) loadFactor *= 1.4; // 40% penalty for overload

          // Temp Factor
          let tempFactor = 1.0;
          const currentTemp = parseFloat(inputs?.temperature || 25);
          if (currentTemp < 5) tempFactor = 1.3;
          else if (currentTemp > 35) tempFactor = 1.15;

          const baseEff = result.baseEfficiency || 0.22; 
          const actualConsumption = d * baseEff * speedFactor * loadFactor * tempFactor;
          const drainPercent = (actualConsumption / (registeredVehicle?.batteryCapacity || 75)) * 100;

          setSimBattery(prev => Math.max(0, prev - drainPercent));
          setSimDistance(prev => {
            const newDist = prev + d;
            if (Math.floor(newDist / 100) > Math.floor(lastBreakDist / 100)) {
                setSimPaused(true);
                setShowBreakModal(true);
                setLastBreakDist(newDist);
            }
            return newDist;
          });
          setSimPosIndex(nextIndex);

          // Station Detection
          if (result.chargingStops) {
            const station = result.chargingStops.find(s => getHaversineDistance(p2, [s.coords[1], s.coords[0]]) < 0.3);
            if (station) {
                setNearbyStation(station);
                setShowChargeModal(true);
                setSimPaused(true);
            }
          }
        }, 1000 / (simSpeed / 25));
      } else {
        finishTrip();
      }
    }
    return () => clearTimeout(timer);
  }, [simActive, simPaused, simPosIndex, simSpeed, result]);

  const finishTrip = async () => {
    setSimActive(false);
    const finalViolations = [...violations];
    if (overspeedingCount > 20) finalViolations.push("Overspeeding (>80km/h)");
    if (breaksSkipped > 0) finalViolations.push(`Skipped ${breaksSkipped} Breaks`);
    if (parseFloat(inputs?.loadWeight) > 6000) finalViolations.push("Vehicle Overloaded (>6 Tons)");
    
    let score = 100;
    score -= overspeedingCount * 0.5;
    score -= breaksSkipped * 15;
    if (parseFloat(inputs?.loadWeight) > 6000) score -= 25; // Massive penalty for overloading
    score = Math.max(0, Math.min(100, score));

    const tips = [];
    if (parseFloat(inputs?.loadWeight) > 6000) tips.push("Reduce load below 6 tons to avoid 40% battery drain penalty.");
    if (overspeedingCount > 10) tips.push("Keep speed below 80km/h for 20% more range.");
    
    if (result.historyId) {
        try {
            await axios.patch(`http://localhost:5000/api/history/${result.historyId}`, {
                driverScore: score.toFixed(0),
                violations: finalViolations,
                performanceTips: tips
            }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (err) { console.error("Report submit failed") }
    }
    alert(`Trip Completed!\nScore: ${score.toFixed(0)}/100`);
  };

  const handleOptimize = async (formData) => {
    setLoading(true); setError(''); setResult(null); setMapBounds(null); setSimActive(false);
    setInputs(formData);
    setViolations([]); setOverspeedingCount(0); setBreaksTaken(0); setBreaksSkipped(0); setLastBreakDist(0);
    try {
      console.log("Optimizing route with token:", token ? token.substring(0, 10) + "..." : "NULL/UNDEFINED");
      const res = await axios.post('http://localhost:5000/api/optimize', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setResult(res.data);
      setSimBattery(parseFloat(formData.batteryPercentage));
      if (res.data.startCoords) setMapBounds([[res.data.startCoords[1], res.data.startCoords[0]], [res.data.endCoords[1], res.data.endCoords[0]]])
    } catch (err) { setError('Optimization failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl m-0">Control <span className="accent-gradient">Center</span></h1>
          <p className="text-muted text-sm mt-1">Manage and optimize your electric vehicle fleet in real-time.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => { setShowHistory(false); setShowVehicleReg(!showVehicleReg); }} className="btn-secondary">
            {showVehicleReg ? 'Close Profile' : 'Vehicle Profile'}
          </button>
          <button onClick={() => { setShowVehicleReg(false); setViewingHistoryItem(false); setShowHistory(!showHistory); }} className="btn-secondary">
            {showHistory ? 'Back to Dashboard' : 'Performance History'}
          </button>
        </div>
      </div>

      {showVehicleReg && <VehicleRegistration onUpdate={(v) => { setRegisteredVehicle(v); setShowVehicleReg(false); }} />}

      {showHistory ? (
        <div className="glass-panel animate-slide-up">
          <h2 className="mb-8">Analytics & Reports</h2>
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
            {history.map(h => (
              <div key={h._id} className="card">
                <div className="flex justify-between items-start mb-4">
                    <div>
                      <strong className="block text-lg">{h.inputs.pickupLocation} → {h.inputs.dropLocation}</strong>
                      <span className="text-xs text-dim">{new Date(h.createdAt).toLocaleString()}</span>
                    </div>
                    {h.results.driverScore !== undefined && (
                        <div className={`badge ${h.results.driverScore > 80 ? 'bg-success' : h.results.driverScore > 50 ? 'bg-warning' : 'bg-danger'}`}>
                            Score: {h.results.driverScore}
                        </div>
                    )}
                </div>
                <div className="mb-4">
                  {h.results.violations?.length > 0 ? (
                    h.results.violations.map((v, i) => <p key={i} className="text-xs text-danger m-0 mb-1">⚠️ {v}</p>)
                  ) : (
                    <p className="text-xs text-success m-0">✅ No violations recorded</p>
                  )}
                </div>
                <button onClick={() => { setResult(h.results); setInputs(h.inputs); setShowHistory(false); setViewingHistoryItem(true); setSimBattery(parseFloat(h.inputs.batteryPercentage)); }} className="btn-secondary w-full text-sm">Review Detailed Report</button>
              </div>
            ))}
            {history.length === 0 && <p className="text-center text-muted col-span-full py-12">No historical data available yet.</p>}
          </div>
        </div>
      ) : (
        <div className="dashboard-grid">
          <aside className="flex flex-col gap-6">
            {!viewingHistoryItem ? (
              <InputForm onSubmit={handleOptimize} loading={loading} preFillModel={registeredVehicle?.model} preFillYear={registeredVehicle?.purchaseDate} preFillType={registeredVehicle?.vehicleType} />
            ) : (
              <div className="glass-panel">
                <button onClick={() => setViewingHistoryItem(false)} className="btn-secondary mb-6 w-full">Start New Optimization</button>
                <div className="mb-6">
                  <label className="text-xs">Active Route</label>
                  <h3 className="m-0 accent-gradient text-xl">{inputs?.pickupLocation} to {inputs?.dropLocation}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="card p-3">
                      <label className="text-[10px]">Load Weight</label>
                      <p className={`font-bold m-0 ${parseFloat(inputs?.loadWeight) > 6000 ? 'text-danger' : 'text-main'}`}>{inputs?.loadWeight} kg</p>
                  </div>
                  <div className="card p-3">
                      <label className="text-[10px]">Ambient Temp</label>
                      <p className="font-bold m-0">{inputs?.temperature}°C</p>
                  </div>
                </div>
              </div>
            )}
            
            {result && !result.rangeError && (
              <div className="glass-panel">
                <h3 className="mb-4 text-sm uppercase tracking-wider text-muted">Trip Summary</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between text-sm">
                    <span>Estimated Distance</span>
                    <span className="font-bold">{result.totalDistance?.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Stops Required</span>
                    <span className="font-bold">{result.chargingStops?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Energy Required</span>
                    <span className="font-bold">{(result.totalConsumption || 0).toFixed(1)} kWh</span>
                  </div>
                </div>
              </div>
            )}
          </aside>

          <main className="flex flex-col gap-6">
            <div className="glass-panel p-0 overflow-hidden relative shadow-2xl" style={{ height: '600px' }}>
              <MapContainer center={mapCenter} zoom={zoom} className="leaflet-container">
                <ChangeView center={mapCenter} zoom={zoom} bounds={mapBounds} />
                <LayersControl position="topright">
                  <BaseLayer checked name="Modern Street"><TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" /></BaseLayer>
                  <BaseLayer name="Dark Matter"><TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" /></BaseLayer>
                  <BaseLayer name="Satellite"><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" /></BaseLayer>
                </LayersControl>
                
                {result && (
                  <>
                    <Marker position={[result.startCoords[1], result.startCoords[0]]} />
                    <Marker position={[result.endCoords[1], result.endCoords[0]]} />
                    {result.geometry && <GeoJSON key={JSON.stringify(result.geometry)} data={result.geometry} style={{ color: 'var(--primary)', weight: 6, opacity: 0.8 }} />}
                    {simActive && result.geometry.coordinates[simPosIndex] && (
                        <Marker position={[result.geometry.coordinates[simPosIndex][1], result.geometry.coordinates[simPosIndex][0]]} icon={L.icon({
                            iconUrl: 'https://cdn-icons-png.flaticon.com/512/3103/3103164.png',
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        })} />
                    )}
                    {result.chargingStops?.map((s, i) => (
                      <Marker key={i} position={s.coords} icon={L.icon({
                        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3541/3541430.png',
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                      })}>
                        <Popup>{s.name}</Popup>
                      </Marker>
                    ))}
                  </>
                )}
              </MapContainer>

              {result && !result.rangeError && (
                <div className="absolute bottom-10 left-10 right-10 z-[2000]">
                  {!simActive ? (
                    <button onClick={() => { setSimPosIndex(0); setSimDistance(0); setSimActive(true); setSimPaused(false); }} className="py-5 w-full text-xl shadow-2xl animate-pulse-slow">
                      🚀 Initialize Active Simulation
                    </button>
                  ) : (
                    <div className="glass-panel flex items-center gap-10 py-5 px-10 shadow-2xl border-white/20" style={{ borderRadius: 'var(--radius-lg)', background: 'rgba(15, 23, 42, 0.9)' }}>
                      <button onClick={() => setSimPaused(!simPaused)} className="text-3xl p-0 bg-transparent shadow-none w-auto hover:scale-110 transition-transform">
                        {simPaused ? '▶️' : '⏸️'}
                      </button>
                      <div className="flex-1">
                        <div className="flex justify-between mb-2">
                          <label className="text-[10px] m-0 uppercase tracking-widest text-dim font-bold">Velocity Controller</label>
                          <span className="text-primary font-bold text-sm bg-primary/10 px-2 rounded">{simSpeed} km/h</span>
                        </div>
                        <input type="range" min="20" max="150" value={simSpeed} onChange={(e) => setSimSpeed(parseInt(e.target.value))} className="w-full accent-primary" />
                      </div>
                      <div className="border-l border-white/10 pl-10 text-right min-w-[120px]">
                        <label className="text-[10px] m-0 uppercase tracking-widest text-dim font-bold">Battery Charge</label>
                        <p className={`text-3xl font-bold m-0 ${simBattery < 20 ? 'text-danger' : 'text-success'}`}>{simBattery.toFixed(0)}%</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {simActive && (
              <div className="grid grid-cols-3 gap-6 animate-slide-up">
                <div className="glass-panel text-center py-6">
                  <label className="mb-2">Total Distance</label>
                  <p className="text-3xl font-bold m-0">{simDistance.toFixed(1)} <span className="text-sm font-normal text-muted">km</span></p>
                </div>
                <div className="glass-panel text-center py-6">
                  <label className="mb-2">System Load</label>
                  <p className={`text-2xl font-bold m-0 ${parseFloat(inputs?.loadWeight) > 6000 ? 'text-danger' : 'text-success'}`}>
                    {parseFloat(inputs?.loadWeight) > 6000 ? 'OVERLOAD' : 'OPTIMAL'}
                  </p>
                </div>
                <div className="glass-panel text-center py-6">
                  <label className="mb-2">Efficiency Multiplier</label>
                  <p className={`text-3xl font-bold m-0 ${parseFloat(inputs?.loadWeight) > 6000 ? 'text-danger' : 'text-main'}`}>
                    {((parseFloat(inputs?.loadWeight)/1000) * 0.1 + (parseFloat(inputs?.loadWeight) > 6000 ? 0.4 : 0) + 1).toFixed(1)}<span className="text-sm font-normal text-muted">x</span>
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {showBreakModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-bg-deep/80 backdrop-blur-xl">
          <div className="glass-panel p-10 max-w-md text-center border-primary shadow-2xl">
            <div className="text-6xl mb-6">☕</div>
            <h2 className="text-primary text-3xl mb-2">Mandatory Break</h2>
            <p className="text-muted mb-10">You've covered 100km. Federal safety regulations require a 15-minute rest stop.</p>
            <div className="flex flex-col gap-4">
              <button onClick={() => { setBreaksTaken(p=>p+1); setShowBreakModal(false); setSimPaused(false); }} className="py-4 text-lg">Acknowledge & Rest</button>
              <button onClick={() => { setBreaksSkipped(p=>p+1); setShowBreakModal(false); setSimPaused(false); }} className="btn-secondary py-3 text-danger">Skip (Security Flagged)</button>
            </div>
          </div>
        </div>
      )}

      {showChargeModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-bg-deep/80 backdrop-blur-xl">
          <div className="glass-panel p-10 max-w-md text-center border-success shadow-2xl">
            <div className="text-6xl mb-6">⚡</div>
            <h2 className="text-success text-3xl mb-2">Charging Point</h2>
            <p className="text-muted mb-10">Proximity alert: <strong>{nearbyStation?.name}</strong> is within range. Would you like to top up?</p>
            <div className="flex gap-4">
              <button onClick={() => { setSimBattery(100); setShowChargeModal(false); setSimPaused(false); }} className="flex-1 py-4">Fast Charge</button>
              <button onClick={() => { setShowChargeModal(false); setSimPaused(false); }} className="btn-secondary flex-1 py-4">Continue Trip</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
