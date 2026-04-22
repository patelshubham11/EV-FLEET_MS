# EV Dataset Integration Plan

Bhai, data mil gaya! Ab hum is data ko base banakar apna optimization algorithm aur smart banayenge. Hardcoded values ki jagah ab machine learning/data-driven approach use hoga.

## Proposed Changes

### 1. Data Processing
*   **Dataset File:** Main ek `dataset.csv` file backend mein banaunga aur is data ko wahan save karunga.
# Implementation Plan - Real-time Trip Simulation

Implement a live simulation feature where the vehicle moves along the optimized route, allowing the user to control speed and manage battery charging in real-time.

## User Review Required

> [!IMPORTANT]
> The simulation will be client-side for immediate responsiveness. Speed changes will dynamically affect battery consumption.

## Proposed Changes

### Frontend - Dashboard & Map

#### [MODIFY] [Dashboard.jsx](file:///d:/vehicle fleet optimization system/frontend/src/components/Dashboard.jsx)
- **State Management**: Add `simState` (active, paused, currentPos, battery, speed).
- **Movement Logic**: Implement `requestAnimationFrame` loop to interpolate vehicle position along the route geometry.
- **Speed Slider**: Add UI controls for simulation speed (20-120 km/h).
- **Proximity Detection**: Auto-pause when near a `chargingStop`.
- **Charging Modal**: Interactive popup to "Charge" or "Skip".

### Telemetry & Logic
- **Battery Calculation**: 
  - Consumption = (Distance * BaseEfficiency * AgeFactor * SpeedFactor)
  - `SpeedFactor` = 1.0 at 60km/h, increases exponentially above 80km/h.

## Verification Plan

### Manual Verification
- Run a route, start simulation.
- Increase speed and verify battery drains faster.
- Reach a charging stop and verify the "Charge" option works.

</content>
