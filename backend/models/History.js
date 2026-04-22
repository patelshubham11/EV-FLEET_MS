const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  inputs: {
    vehicleModel: String,
    year: String,
    vehicleType: String,
    pickupLocation: String,
    dropLocation: String,
    batteryPercentage: Number,
    loadWeight: Number,
    temperature: Number,
  },
  results: {
    distance: String,
    estimatedTime: String,
    remainingBattery: String,
    batteryToFirstStop: String,
    rangeError: String,
    driverScore: Number,
    violations: [String],
    performanceTips: [String],
    warnings: [String],
    suggestions: [String],
    chargingStops: [Object]
  }
}, { timestamps: true });

module.exports = mongoose.model('History', historySchema);
