// Update SensorChart.js - Add translation support
// src/components/dashboard/SensorChart.js

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useTranslation } from '../../context/LanguageContext'; // Add this import

// Update SensorChart.js CustomTooltip component
// Replace the CustomTooltip component with this updated version:

const CustomTooltip = ({ active, payload, label }) => {
  const { t, formatSensorValue } = useTranslation(); // Add formatSensorValue
  
  if (active && payload && payload.length) {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        padding: '12px', 
        borderRadius: '8px', 
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <p style={{ fontWeight: 600, color: '#1f2937', margin: '0 0 8px 0' }}>
          {`${t('time')}: ${label}`}
        </p>
        {payload.map((entry, index) => (
          <p key={index} style={{ 
            color: entry.color, 
            fontSize: '14px',
            margin: '2px 0'
          }}>
            {`${entry.name}: ${typeof entry.value === 'number' ? formatSensorValue(entry.value) : entry.value}${entry.payload.unit || ''}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SensorChart({ title, data, dataKeys, colors, unit }) {
  const { t } = useTranslation(); // Add translation hook
  
  console.log('📊 SensorChart Props:', { title, data, dataKeys, colors, unit });
  
  // Handle empty or invalid data
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.warn('⚠️ No data provided to SensorChart');
    return (
      <Card elevation={2} style={{ height: '400px', backgroundColor: 'white', borderRadius: '12px' }}>
        <CardContent style={{ padding: '1.5rem', height: '100%' }}>
          <Typography variant="h6" style={{ fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>
            {title}
          </Typography>
          
          <Box style={{ 
            height: '300px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '2px dashed #d1d5db'
          }}>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              <Typography variant="h6" style={{ marginBottom: '0.5rem' }}>
                {t('noDataAvailable')}
              </Typography>
              <Typography variant="body2">
                {t('waitingForSensorData')}
              </Typography>
            </div>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Validate dataKeys
  if (!dataKeys || !Array.isArray(dataKeys) || dataKeys.length === 0) {
    console.warn('⚠️ No dataKeys provided to SensorChart');
    return (
      <Card elevation={2} style={{ height: '400px', backgroundColor: 'white', borderRadius: '12px' }}>
        <CardContent style={{ padding: '1.5rem', height: '100%' }}>
          <Typography variant="h6" style={{ fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>
            {title}
          </Typography>
          <Box style={{ 
            height: '300px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#ef4444'
          }}>
            <Typography variant="body1">Configuration Error: No data keys specified</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={2} style={{ height: '400px', backgroundColor: 'white', borderRadius: '12px' }}>
      <CardContent style={{ padding: '1.5rem', height: '100%' }}>
        <Typography variant="h6" style={{ fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>
          {title}
        </Typography>
        
        <Box style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="time" 
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
                tickFormatter={(value) => typeof value === 'number' ? value.toFixed(1) : value}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {dataKeys.map((key, index) => {
                const color = colors && colors[index] ? colors[index] : '#22c55e';
                const unitLabel = unit && unit[index] ? unit[index] : '';
                
                // Translate the sensor name using translation keys
                const translatedName = t(key) || key.charAt(0).toUpperCase() + key.slice(1);
                const displayName = `${translatedName}${unitLabel ? ` (${unitLabel})` : ''}`;
                
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={3}
                    dot={{ fill: color, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: 'white' }}
                    name={displayName}
                    connectNulls={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}