const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const connectDB = require('./db');
const User = require('./models/User');
const History = require('./models/History');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

dotenv.config();

// Connect to MongoDB
connectDB();


let fleetData = [];
let modelEfficiencies = {}; 

const loadDataset = () => {
    const results = [];
    const csvFilePath = path.join(__dirname, 'ev_dataset.csv');
    
    if (!fs.existsSync(csvFilePath)) {
        console.log("⚠️ ev_dataset.csv not found. Using fallback logic.");
        return;
    }

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            fleetData = results;
            console.log(`✅ Loaded ${fleetData.length} records from dataset.`);
            
            
            const models = {};
            fleetData.forEach(row => {
                const model = row['Vehicle Model'];
                const energy = parseFloat(row['Energy Consumed (kWh)']);
                const distance = parseFloat(row['Distance Driven (since last charge) (km)']);
                
                if (model && !isNaN(energy) && !isNaN(distance) && distance > 0) {
                    if (!models[model]) models[model] = { totalEnergy: 0, totalDistance: 0 };
                    models[model].totalEnergy += energy;
                    models[model].totalDistance += distance;
                }
            });

            for (const model in models) {
                modelEfficiencies[model] = models[model].totalEnergy / models[model].totalDistance;
            }
            console.log("📈 Model Efficiencies (kWh/km):", modelEfficiencies);
        });
};

loadDataset();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://ev-fleet-ms.vercel.app'],
    credentials: true,
}));
app.use(express.json());


const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log("Protecting route. Token received:", token.substring(0, 10) + "...");
      const secret = process.env.JWT_SECRET || 'secret123';
      const decoded = jwt.verify(token, secret);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        console.log("User not found for token:", decoded.id);
        return res.status(401).json({ error: 'User not found' });
      }
      next();
    } catch (error) {
      console.error("JWT verification failed:", error.message);
      res.status(401).json({ error: 'Not authorized, token failed' });
    }
  } else {
    console.log("No authorization header or not Bearer");
    res.status(401).json({ error: 'Not authorized, no token' });
  }
};


app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: 'User already exists' });

    const user = await User.create({ email, password });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
    res.status(201).json({ _id: user._id, email: user.email, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
      res.json({ _id: user._id, email: user.email, token });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


async function getCoordinates(city) {
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${process.env.OPENROUTESERVICE_API_KEY}&text=${encodeURIComponent(city)}`;
  const response = await axios.get(url);
  if (response.data.features && response.data.features.length > 0) {
    return response.data.features[0].geometry.coordinates; // [lon, lat]
  }
  throw new Error(`Could not find coordinates for ${city}`);
}

// Optimization Endpoint
app.post('/api/optimize', protect, async (req, res) => {
  try {
    let { 
        vehicleModel, pickupLocation, dropLocation, 
        batteryPercentage, loadWeight, temperature 
    } = req.body;

    // Use saved vehicle details if not provided
    if (!vehicleModel && req.user.vehicleDetails) {
        vehicleModel = req.user.vehicleDetails.model;
    }

    if (!vehicleModel) {
        return res.status(400).json({ error: "Please provide vehicle model or register a vehicle in your profile." });
    }

    // 1. Get Coordinates
    let pickupCoords, dropCoords;
    try {
        pickupCoords = await getCoordinates(pickupLocation);
    } catch (err) {
        return res.status(400).json({ error: `Start location '${pickupLocation}' not found. Please check the spelling.` });
    }
    
    try {
        dropCoords = await getCoordinates(dropLocation);
    } catch (err) {
        return res.status(400).json({ error: `Destination '${dropLocation}' not found. Please check the spelling.` });
    }

    // 2. Get Route from OpenRouteService
    const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${process.env.OPENROUTESERVICE_API_KEY}&start=${pickupCoords[0]},${pickupCoords[1]}&end=${dropCoords[0]},${dropCoords[1]}`;
    const routeResponse = await axios.get(orsUrl);
    
    const distanceMeters = routeResponse.data.features[0].properties.segments[0].distance;
    const durationSeconds = routeResponse.data.features[0].properties.segments[0].duration;
    
    const distanceKm = distanceMeters / 1000;
    const timeMins = Math.floor(durationSeconds / 60);
    const geometry = routeResponse.data.features[0].geometry; // GeoJSON geometry

    // 3. Smart Logic (Data Driven)
    const warnings = [];
    const suggestions = [];
    let rangeError = null;

    // Base consumption from CSV data if available, else default 0.2 kWh/km
    const baseEfficiency = modelEfficiencies[vehicleModel] || 0.2;
    
    // Age Impact (Battery degrades over time)
    let ageFactor = 1.0;
    const vehiclePurchaseDate = req.user.vehicleDetails?.purchaseDate || "2023-01";
    const purchaseDate = new Date(vehiclePurchaseDate);
    const currentDate = new Date();
    const ageInYears = (currentDate - purchaseDate) / (1000 * 60 * 60 * 24 * 365);
    
    if (ageInYears > 2) ageFactor += (ageInYears - 2) * 0.02; // 2% more consumption per year after 2 years
    
    // Temperature Impact (Battery loses ~20% efficiency in extreme cold/heat)
    let tempFactor = 1.0;
    const currentTemp = parseFloat(temperature) || 25;
    if (currentTemp < 5) tempFactor = 1.3; // 30% more drain in cold
    else if (currentTemp > 35) tempFactor = 1.15; // 15% more drain in heat

    // Load Impact (Max 6 Tons = 6000kg)
    const maxLoad = 6000;
    let loadFactor = 1 + (parseFloat(loadWeight) / 1000) * 0.1; // Baseline: 10% increase per 1000kg
    
    if (parseFloat(loadWeight) > maxLoad) {
        warnings.push(`⚠️ OVERLOAD ALERT: Current load (${loadWeight}kg) exceeds max limit of ${maxLoad}kg. Consumption will be extremely high.`);
        loadFactor *= 1.4; // 40% additional penalty for overloading
    }

    // Average Battery capacity
    const avgBatteryCapacity = req.user.vehicleDetails?.batteryCapacity || 75; 
    const currentRangeKm = (batteryPercentage / 100) * avgBatteryCapacity / (baseEfficiency * ageFactor);
    
    const totalConsumption = distanceKm * baseEfficiency * tempFactor * loadFactor * ageFactor;
    const consumptionPercent = (totalConsumption / avgBatteryCapacity) * 100;
    const remainingBattery = (batteryPercentage - consumptionPercent).toFixed(1);

    // 4. Charging Suggestions ALONG the route
    let chargingStops = [];
    let batteryToFirstStop = null;

    if (process.env.OPENCHARGEMAP_API_KEY && geometry) {
        // Sample points along the route (Start, Middle, Near End)
        const coords = geometry.coordinates;
        const samplePoints = [
            coords[0], // Start
            coords[Math.floor(coords.length * 0.3)], // 30% mark
            coords[Math.floor(coords.length * 0.6)], // 60% mark
            coords[coords.length - 1] // End
        ];

        try {
            const allStops = [];
            for (const point of samplePoints) {
                const ocmUrl = `https://api.openchargemap.io/v3/poi?key=${process.env.OPENCHARGEMAP_API_KEY}&latitude=${point[1]}&longitude=${point[0]}&distance=30&maxresults=3`;
                const ocmResponse = await axios.get(ocmUrl);
                allStops.push(...ocmResponse.data);
            }

            // Deduplicate and map
            const uniqueStops = Array.from(new Set(allStops.filter(s => s && s.ID).map(s => s.ID))).map(id => allStops.find(s => s.ID === id));
            
            chargingStops = uniqueStops.filter(poi => poi && poi.AddressInfo).map(poi => ({
                name: poi.AddressInfo.Title,
                location: poi.AddressInfo.AddressLine1,
                type: poi.Connections[0]?.ConnectionType?.Title || 'Fast Charger',
                coords: [poi.AddressInfo.Latitude, poi.AddressInfo.Longitude],
                distanceFromStart: 0 // Will calculate if needed
            }));

            // Calculate distance to first stop manually or just use the first one from search
            if (chargingStops.length > 0) {
                // Simplified: first stop found near the start point
                const firstStop = chargingStops[0];
                // Distance estimation (Roughly)
                const distToFirst = Math.sqrt(Math.pow(firstStop.coords[0]-pickupCoords[1], 2) + Math.pow(firstStop.coords[1]-pickupCoords[0], 2)) * 111;
                const consumptionToFirstStop = distToFirst * baseEfficiency * tempFactor * loadFactor * ageFactor;
                batteryToFirstStop = ((consumptionToFirstStop / avgBatteryCapacity) * 100).toFixed(1);
            }
        } catch (e) {
            console.error("OpenChargeMap error:", e.message);
        }
    }

    // Feasibility Check
    if (parseFloat(remainingBattery) < 5 && chargingStops.length === 0) {
        rangeError = "CRITICAL: Range Insufficient. No charging stations found on this route within your current range. Traveling with this vehicle right now is unsafe as you will run out of battery before reaching the destination or any known charger.";
    } else if (chargingStops.length > 0 && parseFloat(batteryToFirstStop) > batteryPercentage) {
         rangeError = `CRITICAL: First charging station is ${chargingStops[0].distance.toFixed(1)}km away, but your current range is only ${currentRangeKm.toFixed(1)}km. You cannot reach the first charger.`;
    }

    if (remainingBattery < 20 && !rangeError) {
        warnings.push(`Low battery alert: Estimated arrival charge is ${remainingBattery}%. Charging stop strongly recommended.`);
    }
    
    if (currentTemp < 5) {
        warnings.push(`Extreme Cold (${currentTemp}°C) detected. Battery range reduced significantly.`);
        suggestions.push("Pre-heat battery at charging station if possible.");
    }

    // Driver Break Logic (Suggest break every 30km)
    const numBreaks = Math.floor(distanceKm / 30);
    if (numBreaks > 0) {
        suggestions.push(`Safety Alert: This is a long trip (${distanceKm.toFixed(0)} km). Please take at least ${numBreaks} short break(s) every 30km to stay alert.`);
    }

    const results = {
      distance: `${distanceKm.toFixed(2)} km`,
      estimatedTime: `${Math.floor(timeMins/60)}h ${timeMins%60}m`,
      remainingBattery: `${remainingBattery}%`,
      batteryToFirstStop: batteryToFirstStop ? `${batteryToFirstStop}%` : null,
      baseEfficiency, // Return for simulation accuracy
      rangeError,
      geometry,
      startCoords: pickupCoords,
      endCoords: dropCoords,
      pickupLocation,
      dropLocation,
      warnings,
      suggestions: [
        ...suggestions,
        "Maintain steady speed for optimal range.",
        "Check tire pressure at charging station."
      ],
      chargingStops
    };

    // Save to History
    const historyEntry = await History.create({
      user: req.user._id,
      inputs: {
        vehicleModel,
        pickupLocation,
        dropLocation,
        batteryPercentage,
        loadWeight,
        temperature
      },
      results
    });

    res.json({ ...results, historyId: historyEntry._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update History with Simulation Data
app.patch('/api/history/:id', protect, async (req, res) => {
  try {
    const history = await History.findOne({ _id: req.params.id, user: req.user._id });
    if (!history) return res.status(404).json({ error: 'History not found' });
    
    // Merge new simulation results with existing ones
    history.results = { ...history.results.toObject(), ...req.body };
    await history.save();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update history' });
  }
});

// Get History
app.get('/api/history', protect, async (req, res) => {
  try {
    const history = await History.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update User Vehicle Details
app.post('/api/user/vehicle', protect, async (req, res) => {
    try {
        const { model, purchaseDate, batteryCapacity, vehicleType } = req.body;
        console.log("Saving vehicle for user:", req.user?._id);
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: "User not found" });
        
        user.vehicleDetails = { 
            model, 
            purchaseDate, 
            batteryCapacity: parseFloat(batteryCapacity) || 0, 
            vehicleType 
        };
        await user.save();
        res.json({ message: 'Vehicle registered successfully', vehicleDetails: user.vehicleDetails });
    } catch (err) {
      console.error("Vehicle Registration Error:", err);
      const errorMsg = err.response?.data?.error || 'Failed to save vehicle details';
      res.status(500).json({ error: errorMsg });
    }
});

// Get User Profile (including vehicle)
app.get('/api/user/profile', protect, async (req, res) => {
    res.json(req.user);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
