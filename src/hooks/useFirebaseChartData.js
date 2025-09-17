// Firebase Chart Data Hook
// src/hooks/useFirebaseChartData.js

import { useState, useEffect } from 'react';
import { ref, get, query, orderByKey, limitToLast } from 'firebase/database';
import { sensorDatabase } from '../services/firebase';

export const useFirebaseChartData = (sensorType = 'temperature', hoursBack = 12) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Fetching chart data for:', sensorType);
        
        // Get all sensor data from Firebase
        const envLogsRef = ref(sensorDatabase, 'envLogs');
        const snapshot = await get(envLogsRef);
        
        if (!snapshot.exists()) {
          console.warn('❌ No data found in Firebase');
          setChartData([]);
          setLoading(false);
          return;
        }

        const allData = snapshot.val();
        console.log('📊 Raw Firebase data:', Object.keys(allData).length, 'records');

        // Convert to array and sort by time
        const dataArray = Object.entries(allData).map(([key, value]) => ({
          id: key,
          ...value,
          timestamp: parseFirebaseTime(value.time)
        }));

        // Sort by timestamp (newest first)
        dataArray.sort((a, b) => b.timestamp - a.timestamp);

        // Take last N records and reverse for chronological order
        const recentData = dataArray.slice(0, 50).reverse(); // Get last 50 records
        
        console.log('📈 Processing', recentData.length, 'records for chart');

        // Transform data for chart
        const chartData = recentData.map((record, index) => {
          const timeLabel = formatTimeForChart(record.timestamp);
          
          const dataPoint = {
            time: timeLabel,
            timestamp: record.timestamp,
            // Include all sensor values
            temperature: parseFloat(record.temp) || 0,
            humidity: parseFloat(record.hum) || 0,
            soilMoisture: parseFloat(record.soil) || 0,
            lightIntensity: parseFloat(record.lux) || 0,
            rainSensor: parseFloat(record.rain) || 0,
            batteryVoltage: parseFloat(record.battV) || 0,
            activeBattery: parseInt(record.active) || 0
          };

          return dataPoint;
        });

        console.log('✅ Chart data processed:', chartData.length, 'points');
        console.log('📊 Sample data point:', chartData[0]);
        
        setChartData(chartData);
        
      } catch (error) {
        console.error('❌ Error fetching chart data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [sensorType, hoursBack]);

  return { chartData, loading, error };
};

// Helper function to parse Firebase time format: "DD-MM-YYYY HH:MM:SS"
const parseFirebaseTime = (timeString) => {
  if (!timeString) return new Date();
  
  try {
    // Expected format: "26-06-2025 13:40:21"
    const [datePart, timePart] = timeString.split(' ');
    const [day, month, year] = datePart.split('-');
    const [hour, minute, second] = timePart.split(':');
    
    // Create Date object (month is 0-indexed)
    const date = new Date(
      parseInt(year), 
      parseInt(month) - 1, 
      parseInt(day), 
      parseInt(hour), 
      parseInt(minute), 
      parseInt(second)
    );
    
    return date;
  } catch (error) {
    console.error('Error parsing time:', timeString, error);
    return new Date();
  }
};

// Helper function to format time for chart display
const formatTimeForChart = (timestamp) => {
  const date = new Date(timestamp);
  
  // Format as "HH:MM" for better readability
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
};

export default useFirebaseChartData;