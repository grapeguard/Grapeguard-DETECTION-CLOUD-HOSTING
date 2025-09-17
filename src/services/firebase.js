import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Authentication & User Database Config (grapeguard-acc43)
const authConfig = {
  apiKey: process.env.REACT_APP_AUTH_API_KEY || "AIzaSyCUc3Serwlq4Z-6ToXbR8vmEQxWmlBXOk8",
  authDomain: process.env.REACT_APP_AUTH_DOMAIN || "grapeguard-acc43.firebaseapp.com",
  databaseURL: process.env.REACT_APP_AUTH_DATABASE_URL || "https://grapeguard-acc43-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: process.env.REACT_APP_AUTH_PROJECT_ID || "grapeguard-acc43",
  storageBucket: process.env.REACT_APP_AUTH_STORAGE_BUCKET || "grapeguard-acc43.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_AUTH_MESSAGING_SENDER_ID || "270802234818",
  appId: process.env.REACT_APP_AUTH_APP_ID || "1:270802234818:web:234a9bb8bf19add71fba5b",
  measurementId: process.env.REACT_APP_AUTH_MEASUREMENT_ID || "G-3483H8EYFD"
};

// Sensor Data Database Config (grapeguard-c7ad9) - SEPARATE DATABASE
const sensorConfig = {
  apiKey: process.env.REACT_APP_SENSOR_API_KEY || "AIzaSyD3Ijs8q_qkUSE8lvNd_Zvzr-uvdWBjISs",
  authDomain: process.env.REACT_APP_SENSOR_DOMAIN || "grapeguard-c7ad9.firebaseapp.com",
  databaseURL: process.env.REACT_APP_SENSOR_DATABASE_URL || "https://grapeguard-c7ad9-default-rtdb.firebaseio.com",
  projectId: process.env.REACT_APP_SENSOR_PROJECT_ID || "grapeguard-c7ad9",
  storageBucket: process.env.REACT_APP_SENSOR_STORAGE_BUCKET || "grapeguard-c7ad9.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_SENSOR_MESSAGING_SENDER_ID || "842909622610",
  appId: process.env.REACT_APP_SENSOR_APP_ID || "1:842909622610:web:fc7b3def304e2240b75a8b",
  measurementId: process.env.REACT_APP_SENSOR_MEASUREMENT_ID || "G-GPWZ3RW2SS"
};

// Initialize separate Firebase apps
const authApp = initializeApp(authConfig, 'auth');
const sensorApp = initializeApp(sensorConfig, 'sensor');

// Initialize services
export const auth = getAuth(authApp);              // For authentication
export const authDatabase = getDatabase(authApp);  // For user profiles
export const sensorDatabase = getDatabase(sensorApp); // For sensor data
export const storage = getStorage(authApp);

// Fetch latest sensor data from SENSOR database only
export const fetchLatestSensorData = async () => {
  try {
    console.log('🔍 Fetching from sensor database (grapeguard-c7ad9)...');
    
    const envLogsRef = ref(sensorDatabase, 'envLogs');
    const snapshot = await get(envLogsRef);
    
    if (snapshot.exists()) {
      const envLogsData = snapshot.val();
      console.log('✅ All sensor data found:', envLogsData);
      
      const records = Object.entries(envLogsData);
      console.log('📊 Total records:', records.length);
      
      if (records.length > 0) {
        
        // Sort by timestamp properly: "DD-MM-YYYY HH:MM:SS" format
        const sortedRecords = records.sort((a, b) => {
          const timeA = a[1].time || "00-00-0000 00:00:00";
          const timeB = b[1].time || "00-00-0000 00:00:00";
          
          // Convert "26-06-2025 13:40:21" to comparable Date object
          const parseDateTime = (timeStr) => {
            try {
              const [datePart, timePart] = timeStr.split(' ');
              const [day, month, year] = datePart.split('-');
              const [hour, minute, second] = timePart.split(':');
              
              // Create Date object (month is 0-indexed)
              return new Date(
                parseInt(year), 
                parseInt(month) - 1, 
                parseInt(day), 
                parseInt(hour), 
                parseInt(minute), 
                parseInt(second)
              );
            } catch (error) {
              console.error('Date parse error for:', timeStr);
              return new Date(0); // Return epoch if parsing fails
            }
          };
          
          const dateA = parseDateTime(timeA);
          const dateB = parseDateTime(timeB);
          
          // Latest first (descending order)
          return dateB.getTime() - dateA.getTime();
        });
        
        // Log all records with their timestamps for debugging
        console.log('📋 All records sorted by time:');
        sortedRecords.forEach((record, index) => {
          console.log(`${index + 1}. ${record[0]} → Time: ${record[1].time}, soil: ${record[1].soil}`);
        });
        
        const latestRecord = sortedRecords[0][1];
        console.log('🎯 LATEST RECORD SELECTED:');
        console.log('Key:', sortedRecords[0][0]);
        console.log('Time:', latestRecord.time);
        console.log('soil:', latestRecord.soil);
        console.log('temp:', latestRecord.temp);
        console.log('hum:', latestRecord.hum);
        console.log('Complete record:', latestRecord);
        
        return latestRecord;
      }
    }
    
    console.log('❌ No sensor data found');
    return null;
  } catch (error) {
    console.error('❌ Sensor data fetch error:', error);
    throw error;
  }
};

export default authApp;