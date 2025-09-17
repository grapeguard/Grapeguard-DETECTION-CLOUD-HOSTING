import { useState, useEffect } from 'react';
import { fetchLatestSensorData } from '../services/firebase';

// Western Maharashtra specific thresholds for grapes
const THRESHOLDS = {
  temperature: { 
    optimal: [24, 34], // Growing season range
    unit: '°C'
  },
  humidity: { 
    optimal: [40, 60], // Normal range (can spike during monsoon)
    warning: 85, // Disease risk threshold
    unit: '%'
  },
  soilMoisture: { 
    optimal: [30, 75], // Well-drained but adequate moisture
    unit: '%'
  },
  lightIntensity: { 
    optimal: [200, 2000], // Good light for photosynthesis
    unit: 'Lux'
  },
  batteryVoltage: { 
    optimal: [9.5, 14.5], // 9V threshold, up to 14.5V when charging
    critical: 9.0, // Below 9V switches to second battery
    unit: 'V'
  },
  rainSensor: { 
    optimal: [0, 0.1], // Dry conditions preferred
    unit: '%'
  }
};

// Disease risk detection based on Western Maharashtra conditions
const detectDiseaseRisk = (data) => {
  const risks = [];
  const temp = data.temperature?.value || 0;
  const humidity = data.humidity?.value || 0;
  const rain = data.rainSensor?.value || 0;
  const soilMoisture = data.soilMoisture?.value || 0;
  const light = data.lightIntensity?.value || 0;

  // 1. Downy Mildew (Davnya) - Oct-Dec risk
  if (temp >= 20 && temp <= 28 && humidity > 85 && rain > 0.2 && soilMoisture > 75 && light < 120) {
    risks.push({
      disease: 'Downy Mildew (Davnya)',
      severity: 'High',
      period: 'Oct-Dec',
      recommendation: 'Spray Metalaxyl + Mancozeb after rain. Ensure canopy pruning to allow sunlight. Avoid evening irrigation.',
      marathi: 'धूसर बुरशी - मेटालॅक्सिल + मॅनकोझेब फवारणी करा'
    });
  }

  // 2. Anthracnose (Karpa) - July-Oct risk
  if (temp >= 26 && temp <= 32 && humidity > 70 && rain > 0.1 && light < 150) {
    risks.push({
      disease: 'Anthracnose (Karpa)',
      severity: 'Medium',
      period: 'July-Oct',
      recommendation: 'Remove infected leaves early. Spray Chlorothalonil or Carbendazim. Improve air circulation within vines.',
      marathi: 'कर्पा रोग - संक्रमित पाने काढा आणि क्लोरोथॅलोनिल फवारणी करा'
    });
  }

  // 3. Powdery Mildew (Bhuri) - Dec-Feb risk
  if (temp >= 22 && temp <= 30 && humidity >= 40 && humidity <= 60 && rain === 0 && soilMoisture < 30 && light > 200) {
    risks.push({
      disease: 'Powdery Mildew (Bhuri)',
      severity: 'Medium',
      period: 'Dec-Feb',
      recommendation: 'Spray Sulphur fungicide every 10-15 days. Avoid over-pruning. Balanced fertilization (don\'t overdo nitrogen).',
      marathi: 'भुरी रोग - गंधक फवारणी दर १०-१५ दिवसांनी करा'
    });
  }

  // 4. Borer Infestation (Bokadlela) - March-May risk
  if (temp > 30 && humidity < 55 && light > 220 && rain === 0) {
    risks.push({
      disease: 'Borer Infestation (Bokadlela)',
      severity: 'High',
      period: 'March-May',
      recommendation: 'Install pheromone traps (10 per acre). Use Spinosad or Neem oil spray. Inspect vines weekly for larvae entry holes.',
      marathi: 'बोकाडलेला - फेरोमोन ट्रॅप लावा आणि स्पिनोसाड फवारणी करा'
    });
  }

  return risks;
};

const getSensorStatus = (sensorType, value) => {
  const threshold = THRESHOLDS[sensorType];
  if (!threshold) return { status: 'Unknown', color: '#6b7280' };

  if (sensorType === 'batteryVoltage') {
    // Special logic for battery (9V threshold)
    if (value >= 9.5) return { status: 'Good', color: '#22c55e' };
    if (value >= 9.0) return { status: 'Warning', color: '#eab308' };
    return { status: 'Critical', color: '#dc2626' }; // Will switch to battery 2
  }

  if (sensorType === 'humidity') {
    // Special logic for humidity (disease risk consideration)
    const [optimalMin, optimalMax] = threshold.optimal;
    if (value >= optimalMin && value <= optimalMax) {
      return { status: 'Good', color: '#22c55e' };
    } else if (value > 85) {
      return { status: 'Critical', color: '#dc2626' }; // Disease risk
    } else {
      return { status: 'Warning', color: '#eab308' };
    }
  }

  const [optimalMin, optimalMax] = threshold.optimal;
  
  if (value >= optimalMin && value <= optimalMax) {
    return { status: 'Good', color: '#22c55e' };
  } else if (value < optimalMin * 0.7 || value > optimalMax * 1.3) {
    return { status: 'Critical', color: '#dc2626' };
  } else {
    return { status: 'Warning', color: '#eab308' };
  }
};

const formatFirebaseSensorData = (firebaseData) => {
  if (!firebaseData) return null;

  console.log('🔍 Raw Firebase data received:', firebaseData);

  // Extract exact values from Firebase (no conversion yet)
  const rawValues = {
    soil: firebaseData.soil,
    temp: firebaseData.temp,
    hum: firebaseData.hum,
    lux: firebaseData.lux,
    battV: firebaseData.battV,
    rain: firebaseData.rain,
    active: firebaseData.active
  };
  
  console.log('📊 Raw values extracted:', rawValues);

  const sensorMapping = {
    soilMoisture: { value: rawValues.soil, unit: '%' },
    temperature: { value: rawValues.temp, unit: '°C' },
    humidity: { value: rawValues.hum, unit: '%' },
    lightIntensity: { value: rawValues.lux, unit: 'Lux' },
    batteryVoltage: { value: rawValues.battV, unit: 'V' },
    rainSensor: { value: rawValues.rain, unit: '%' }
  };

  console.log('🎯 Sensor mapping:', sensorMapping);

  const formattedData = {};
  
  Object.keys(sensorMapping).forEach(sensorType => {
    const sensor = sensorMapping[sensorType];
    const rawValue = sensor.value; // Keep exact value
    const numericValue = Number(rawValue); // Convert for status calculation
    const statusInfo = getSensorStatus(sensorType, numericValue);
    
    console.log(`📈 ${sensorType}: Raw="${rawValue}" → Numeric=${numericValue} → Status=${statusInfo.status}`);
    
    formattedData[sensorType] = {
      value: numericValue, // Use the numeric value
      unit: sensor.unit,
      status: statusInfo.status,
      color: statusInfo.color
    };
  });

  // Active Battery (exact integer)
  const activeBatteryNum = parseInt(rawValues.active) || 0;
  formattedData.activeBattery = {
    value: activeBatteryNum,
    unit: '',
    status: activeBatteryNum > 0 ? 'Active' : 'Offline',
    color: activeBatteryNum > 0 ? '#22c55e' : '#dc2626'
  };

  formattedData.diseaseRisks = detectDiseaseRisk(formattedData);
  formattedData.timestamp = firebaseData.time || new Date().toISOString();

  console.log('✅ Final formatted data:', formattedData);

  return formattedData;
};

export const useSensorData = () => {
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const rawData = await fetchLatestSensorData();
      
      if (rawData) {
        const formatted = formatFirebaseSensorData(rawData);
        setSensorData(formatted);
        
        // Fix date parsing - handle DD-MM-YYYY HH:MM:SS format
        let timestamp = new Date();
        if (rawData.time) {
          try {
            // Your format: "17-06-2025 18:33:51"
            const timeStr = rawData.time.toString();
            if (timeStr.includes('-') && timeStr.includes(':')) {
              // Parse DD-MM-YYYY HH:MM:SS format
              const [datePart, timePart] = timeStr.split(' ');
              const [day, month, year] = datePart.split('-');
              const [hour, minute, second] = timePart.split(':');
              
              // Create proper date (month is 0-indexed in JS)
              timestamp = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                                 parseInt(hour), parseInt(minute), parseInt(second));
            }
          } catch (parseError) {
            console.log('Date parse error, using current time:', parseError);
            timestamp = new Date();
          }
        }
        
        setLastUpdated(timestamp);
        console.log('✅ Data updated at:', timestamp.toLocaleString());
      } else {
        setError('No sensor data found');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    fetchData();
  };

  return {
    sensorData,
    loading,
    error,
    lastUpdated,
    refreshData
  };
};