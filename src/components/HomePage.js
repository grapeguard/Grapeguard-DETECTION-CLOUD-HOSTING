// Updated HomePage.js - 4 Card Layout with improved Alert Summary
// src/components/HomePage.js

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Grid,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  BugReport as DetectionIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useSensorData } from '../hooks/useSensorData';
import { useAlerts } from '../hooks/useAlerts';
import { fetchWeatherAuto } from '../services/WeatherService';
import { computeFarmHealth } from '../services/FarmHealthService';

export default function HomePage() {
  const navigate = useNavigate();
  const { t, currentLanguage } = useTranslation();
  const { sensorData, loading, lastUpdated, refreshData } = useSensorData();
  const alertsData = useAlerts();
  
  const [weather, setWeather] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [farmHealth, setFarmHealth] = useState({ score: 88, label: 'Excellent' });

  // Helper function to format numbers based on language
  const formatNumber = (num) => {
    if (typeof num !== 'number') return num;
    
    if (currentLanguage === 'hi' || currentLanguage === 'mr') {
      const devanagariNumerals = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
      return num.toString().replace(/[0-9]/g, (digit) => devanagariNumerals[parseInt(digit)]);
    }
    return num.toString();
  };

  // Helper function to format dates based on language
  const formatDate = (date) => {
    if (!date) return '';
    
    const options = { weekday: 'short', day: '2-digit', month: 'short' };
    
    if (currentLanguage === 'hi') {
      return date.toLocaleDateString('hi-IN', options);
    } else if (currentLanguage === 'mr') {
      return date.toLocaleDateString('mr-IN', options);
    }
    return date.toLocaleDateString('en-US', options);
  };

  // Helper function to format time based on language
  const formatDateTime = (date) => {
    if (!date) return '';
    
    if (currentLanguage === 'hi') {
      const dateStr = date.toLocaleDateString('hi-IN');
      const timeStr = date.toLocaleTimeString('hi-IN');
      return `${dateStr} ${timeStr}`;
    } else if (currentLanguage === 'mr') {
      const dateStr = date.toLocaleDateString('mr-IN');
      const timeStr = date.toLocaleTimeString('mr-IN');
      return `${dateStr} ${timeStr}`;
    }
    
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // Get actual alert counts by severity from alertsData
  const getAlertCounts = () => {
    if (!alertsData) return { critical: 0, warning: 0 };
    
    let critical = 0;
    let warning = 0;
    
    // Count sensor alerts
    if (Array.isArray(alertsData.sensorAlerts)) {
      alertsData.sensorAlerts.forEach(alert => {
        if (alert.severity === 'critical' || alert.priority === 'high') {
          critical++;
        } else if (alert.severity === 'warning' || alert.priority === 'medium') {
          warning++;
        }
      });
    }
    
    // Count detection alerts
    if (Array.isArray(alertsData.manualDetectionAlerts)) {
      alertsData.manualDetectionAlerts.forEach(alert => {
        if (alert.severity === 'critical' || alert.diseaseRisk === 'high') {
          critical++;
        } else {
          warning++;
        }
      });
    }
    
    if (Array.isArray(alertsData.liveDetectionAlerts)) {
      alertsData.liveDetectionAlerts.forEach(alert => {
        if (alert.severity === 'critical' || alert.diseaseRisk === 'high') {
          critical++;
        } else {
          warning++;
        }
      });
    }
    
    return { critical, warning };
  };

  const alertCounts = getAlertCounts();

  // Calculate Farm Health based on alerts and sensor conditions
  const calculateFarmHealth = () => {
    let baseScore = 100;
    
    // Reduce score based on critical alerts (each critical alert reduces score by 15)
    baseScore -= (alertCounts.critical * 15);
    
    // Reduce score based on warning alerts (each warning alert reduces score by 5)
    baseScore -= (alertCounts.warning * 5);
    
    // Sensor health factor
    const sensorUptime = sensorData ? 95 : 80; // Assume 95% if connected, 80% if not
    baseScore -= ((100 - sensorUptime) * 0.3);
    
    // Environmental conditions factor
    if (typeof sensorData?.temperature?.value === 'number') {
      const temp = sensorData.temperature.value;
      if (temp < 15 || temp > 35) {
        baseScore -= 10; // Temperature out of optimal range
      }
    }
    
    if (typeof sensorData?.soilMoisture?.value === 'number') {
      const moisture = sensorData.soilMoisture.value;
      if (moisture < 30 || moisture > 80) {
        baseScore -= 10; // Moisture out of optimal range
      }
    }
    
    // Ensure score is between 0 and 100
    baseScore = Math.max(0, Math.min(100, Math.round(baseScore)));
    
    let label = 'excellent';
    if (baseScore >= 85) label = 'excellent';
    else if (baseScore >= 70) label = 'good';
    else if (baseScore >= 50) label = 'fair';
    else label = 'poor';
    
    return { score: baseScore, label };
  };

  // Load weather and compute farm health
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { weather: w, coords } = await fetchWeatherAuto();
        if (!mounted) return;
        setWeather(w);
        if (coords) {
          const lat = formatNumber(coords.latitude.toFixed(3));
          const lng = formatNumber(coords.longitude.toFixed(3));
          setLocationLabel(`${lat}, ${lng}`);
        }
      } catch (e) {
        // ignore; will show fallback
      }

      // Calculate farm health based on alerts and sensor data
      const fh = calculateFarmHealth();
      if (mounted) setFarmHealth(fh);
    })();
    return () => { mounted = false; };
  }, [sensorData, alertsData, currentLanguage]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} style={{ color: '#22c55e' }} />
        <Typography variant="h6" ml={2} style={{ color: '#1f2937' }}>
          {t('loadingGrapeGuard')}
        </Typography>
      </Box>
    );
  }

  return (
    <div style={{ 
      padding: '0.5rem', 
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <Typography 
        variant="h5" 
        style={{ 
          fontWeight: 700, 
          color: '#1f2937',
          marginBottom: '0.5rem'
        }}
      >
        {t('welcomeToGrapeGuard')}
      </Typography>

      {/* Status Cards Row - 4 Cards */}
      <Box display="flex" gap="0.5rem" style={{ marginBottom: '0.5rem' }}>
        {/* Weather Card */}
        <Card elevation={1} style={{ backgroundColor: 'white', borderRadius: '8px', flex: '1', minWidth: '180px' }}>
          <CardContent style={{ padding: '0.75rem' }}>
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 4 }}>
              {formatDate(new Date())}
            </Typography>
            <Typography variant="h5" style={{ fontWeight: 700, color: '#1f2937', marginBottom: '0.25rem' }}>
              {typeof weather?.temperatureC === 'number' 
                ? `${formatNumber(Math.round(weather.temperatureC))}°${t('celsius')}` 
                : `${formatNumber(25)}°${t('celsius')}`
              }
            </Typography>
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: '0.5rem' }}>
              {typeof weather?.minC === 'number' && typeof weather?.maxC === 'number' 
                ? `${formatNumber(Math.round(weather.minC))}° / ${formatNumber(Math.round(weather.maxC))}°` 
                : `${formatNumber(23)}° / ${formatNumber(25)}°`
              }
            </Typography>
            <Chip 
              label={locationLabel || t('location')} 
              size="small" 
              style={{ fontSize: '0.65rem', backgroundColor: '#f3f4f6' }}
            />
          </CardContent>
        </Card>

        {/* Connected Sensors Card */}
        <Card elevation={1} style={{ backgroundColor: 'white', borderRadius: '8px', flex: '1', minWidth: '220px' }}>
          <CardContent style={{ padding: '0.75rem' }}>
            <Box display="flex" alignItems="center" mb={0.5}>
              <CheckCircleIcon style={{ color: '#22c55e', marginRight: '0.5rem', fontSize: '1rem' }} />
              <Typography variant="body2" style={{ fontWeight: 600, color: '#1f2937' }}>
                {t('connectedToSensors')}
              </Typography>
            </Box>
            <Typography variant="caption" color="textSecondary" style={{ marginBottom: '0.5rem', display: 'block' }}>
              {t('lastUpdated')}: {lastUpdated 
                ? formatDateTime(lastUpdated)
                : (currentLanguage === 'hi' ? '९/१२/२०२५ ३:५६:३४ PM' : 
                   currentLanguage === 'mr' ? '९/१२/२०२५ ३:५६:३४ PM' : 
                   '9/12/2025 3:56:34 PM')
              }
            </Typography>
            <Button 
              startIcon={<RefreshIcon />} 
              onClick={refreshData}
              disabled={loading}
              size="small"
              style={{ color: '#22c55e', borderColor: '#22c55e', textTransform: 'none', fontSize: '0.7rem' }}
              variant="outlined"
            >
              {t('refresh')}
            </Button>
          </CardContent>
        </Card>

        {/* Farm Health Card */}
        <Card elevation={1} style={{ backgroundColor: 'white', borderRadius: '8px', border: '2px solid #22c55e', flex: '1', minWidth: '160px' }}>
          <CardContent style={{ padding: '0.75rem', textAlign: 'center' }}>
            <Typography variant="body2" style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#1f2937' }}>
              {t('farmHealth')}
            </Typography>
            <Typography variant="h4" style={{ fontWeight: 'bold', color: '#22c55e', marginBottom: '0.25rem' }}>
              {formatNumber(farmHealth.score)}%
            </Typography>
            <Typography variant="caption" style={{ color: '#22c55e', fontWeight: 600 }}>
              {t(farmHealth.label.toLowerCase())}
            </Typography>
          </CardContent>
        </Card>

        {/* Alert Summary Card */}
        <Card elevation={1} style={{ backgroundColor: 'white', borderRadius: '8px', flex: '1', minWidth: '180px', cursor: 'pointer' }} onClick={() => navigate('/alerts')}>
          <CardContent style={{ padding: '0.75rem' }}>
            <Typography variant="body2" style={{ fontWeight: 600, marginBottom: '0.75rem', color: '#1f2937' }}>
              {t('alertSummary')}
            </Typography>
            
            {/* Alert Counts */}
            <Box display="flex" flexDirection="column" gap="6px">
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center">
                  <ErrorIcon style={{ color: '#ef4444', fontSize: '1.1rem', marginRight: '6px' }} />
                  <Typography variant="body2" style={{ color: '#ef4444', fontWeight: 600 }}>
                    {t('critical')}
                  </Typography>
                </Box>
                <Typography variant="h6" style={{ color: '#ef4444', fontWeight: 'bold' }}>
                  {formatNumber(alertCounts.critical)}
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center">
                  <WarningIcon style={{ color: '#f59e0b', fontSize: '1.1rem', marginRight: '6px' }} />
                  <Typography variant="body2" style={{ color: '#f59e0b', fontWeight: 600 }}>
                    {t('warning')}
                  </Typography>
                </Box>
                <Typography variant="h6" style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                  {formatNumber(alertCounts.warning)}
                </Typography>
              </Box>
              
              {alertCounts.critical === 0 && alertCounts.warning === 0 && (
                <Box display="flex" alignItems="center" justifyContent="center">
                  <CheckCircleIcon style={{ color: '#22c55e', fontSize: '1.1rem', marginRight: '6px' }} />
                  <Typography variant="body2" style={{ color: '#22c55e', fontWeight: 600 }}>
                    {t('noAlerts')}
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Grape Diseases Section */}
      <Card 
        elevation={2} 
        style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          marginBottom: '0.5rem'
        }}
      >
        <CardContent style={{ 
          padding: '0.75rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <Box>
            <Typography variant="h6" style={{ fontWeight: 700, color: '#1f2937' }}>
              {t('grapeDiseasesTitle')}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {t('knowSymptomsAndTips')}
            </Typography>
          </Box>
          <Button 
            onClick={() => navigate('/diseases')} 
            variant="contained" 
            size="small"
            style={{ 
              backgroundColor: '#22c55e', 
              color: 'white',
              textTransform: 'none',
              borderRadius: '6px',
              fontWeight: 600
            }}
          >
            {t('viewGrapeDiseases')}
          </Button>
        </CardContent>
      </Card>

      {/* Navigation Cards - Compact Green Style */}
      <Grid container spacing={1}>
        <Grid item xs={12} md={6}>
          <Card 
            elevation={2}
            style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              height: '100px',
              backgroundImage: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: 'white'
            }}
            onClick={() => navigate('/dashboard')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(34,197,94,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            <CardContent style={{ 
              padding: '1rem', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DashboardIcon style={{ fontSize: '2rem', marginRight: '1rem', opacity: 0.9 }} />
              <Typography variant="h6" style={{ fontWeight: 700 }}>
                {t('dashboard')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card 
            elevation={2}
            style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              height: '100px',
              backgroundImage: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: 'white'
            }}
            onClick={() => navigate('/detection')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(34,197,94,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            <CardContent style={{ 
              padding: '1rem', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DetectionIcon style={{ fontSize: '2rem', marginRight: '1rem', opacity: 0.9 }} />
              <Typography variant="h6" style={{ fontWeight: 700 }}>
                {t('diseaseDetection')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
}
