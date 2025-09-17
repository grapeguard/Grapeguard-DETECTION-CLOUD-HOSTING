// Fixed Alerts.js - Remove Unused Variable
// src/components/alerts/Alerts.js

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Button,
  Grid,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';
import { useSensorData } from '../../hooks/useSensorData';
import { useAlerts } from '../../hooks/useAlerts';
import AlertSection from './AlertSection';
import AlertSettings from './AlertSetting';

export default function Alerts() {
  const { refreshData } = useSensorData();
  const navigate = useNavigate();
  const { t, formatSensorValue } = useTranslation();
  
  // ALL HOOKS MUST BE CALLED FIRST
  const [filter, setFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  
  // Get alerts with proper error handling
  const alertsData = useAlerts();
  
  // Handle loading state AFTER hooks
  if (!alertsData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} style={{ color: '#22c55e' }} />
        <Typography variant="h6" ml={2}>{t('loadingAlerts')}</Typography>
      </Box>
    );
  }
  
  const {
    sensorAlerts,
    manualDetectionAlerts,
    liveDetectionAlerts,
    alertPreferences,
    updatePreferences,
    handleMarkAsRead,
    handleDismissAlert
  } = alertsData;

  // Safely handle alerts arrays
  const safeSensorAlerts = Array.isArray(sensorAlerts) ? sensorAlerts : [];
  const safeManualAlerts = Array.isArray(manualDetectionAlerts) ? manualDetectionAlerts : [];
  const safeLiveAlerts = Array.isArray(liveDetectionAlerts) ? liveDetectionAlerts : [];

  // Combine all alerts for filtering and stats
  const allAlerts = [...safeSensorAlerts, ...safeManualAlerts, ...safeLiveAlerts];
  const unreadCount = allAlerts.filter(alert => alert && !alert.read).length;
  const criticalCount = allAlerts.filter(alert => alert && alert.type === 'critical').length;
  const warningCount = allAlerts.filter(alert => alert && alert.type === 'warning').length;

  // FIXED: Navigation handlers for redirects with support for live monitoring
  const handleRedirect = (alert) => {
    if (!alert) return;
    
    console.log('🔗 Redirecting alert:', alert);
    
    switch (alert.category) {
      case 'sensor':
        navigate('/dashboard');
        break;
      case 'manual':
        navigate('/detection');
        break;
      case 'live':
        // FIXED: Navigate to live monitoring tab in detection page
        navigate('/detection', { 
          state: { 
            tab: 1, // Live monitoring tab
            fromAlert: true,
            alertData: alert
          } 
        });
        break;
      default:
        // Fallback: check if alert has specific redirect info
        if (alert.redirectTo) {
          if (alert.redirectTo.includes('?tab=live')) {
            navigate('/detection', { state: { tab: 1, fromAlert: true } });
          } else {
            navigate(alert.redirectTo);
          }
        }
        break;
    }
  };

  // Determine border color based on alert levels
  const getSectionBorderColor = (alerts) => {
    if (!Array.isArray(alerts) || alerts.length === 0) return '#22c55e'; // Green (no alerts)
    
    const hasCritical = alerts.some(alert => alert && alert.type === 'critical');
    const hasWarning = alerts.some(alert => alert && alert.type === 'warning');
    
    if (hasCritical) return '#ef4444'; // Red
    if (hasWarning) return '#f59e0b';  // Orange  
    return '#22c55e'; // Green (no alerts)
  };

  // Safe update preferences function
  const safeUpdatePreferences = (updates) => {
    if (updatePreferences && typeof updatePreferences === 'function') {
      updatePreferences(updates);
    }
  };

  // Safe mark as read function
  const safeMarkAsRead = (alertId) => {
    if (handleMarkAsRead && typeof handleMarkAsRead === 'function') {
      handleMarkAsRead(alertId);
    }
  };

  // Safe dismiss alert function
  const safeDismissAlert = (alertId) => {
    if (handleDismissAlert && typeof handleDismissAlert === 'function') {
      handleDismissAlert(alertId);
    }
  };

  return (
    <div style={{ padding: '0', backgroundColor: '#f8fafc' }}>
      {/* FIXED: Compact Summary Cards Row with proper translations */}
      <Grid container spacing={2} style={{ marginBottom: '1.5rem' }}>
        <Grid item xs={6} sm={3}>
          <Card style={{ border: '2px solid #ef4444', backgroundColor: 'white', borderRadius: '8px' }}>
            <CardContent style={{ padding: '1rem', textAlign: 'center' }}>
              <Typography variant="h4" style={{ fontWeight: 'bold', color: '#ef4444', marginBottom: '0.25rem' }}>
                {formatSensorValue(criticalCount, 0)}
              </Typography>
              <Typography variant="caption" color="textSecondary">{t('criticalDiseases')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card style={{ border: '2px solid #f59e0b', backgroundColor: 'white', borderRadius: '8px' }}>
            <CardContent style={{ padding: '1rem', textAlign: 'center' }}>
              <Typography variant="h4" style={{ fontWeight: 'bold', color: '#f59e0b', marginBottom: '0.25rem' }}>
                {formatSensorValue(warningCount, 0)}
              </Typography>
              <Typography variant="caption" color="textSecondary">{t('sensorWarnings')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card style={{ border: '2px solid #3b82f6', backgroundColor: 'white', borderRadius: '8px' }}>
            <CardContent style={{ padding: '1rem', textAlign: 'center' }}>
              <Typography variant="h4" style={{ fontWeight: 'bold', color: '#3b82f6', marginBottom: '0.25rem' }}>
                {formatSensorValue(unreadCount, 0)}
              </Typography>
              <Typography variant="caption" color="textSecondary">{t('unread')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card style={{ border: '2px solid #22c55e', backgroundColor: 'white', borderRadius: '8px' }}>
            <CardContent style={{ padding: '1rem', textAlign: 'center' }}>
              <Button 
                onClick={refreshData} 
                style={{ color: '#22c55e', textTransform: 'none', padding: '0.25rem' }}
                startIcon={<RefreshIcon />}
                size="small"
              >
                {t('refresh')}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* FIXED: Compact Filter Tabs with proper translations */}
      <Card style={{ backgroundColor: 'white', borderRadius: '8px', marginBottom: '1rem' }}>
        <CardContent style={{ padding: '0.75rem' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Tabs value={filter} onChange={(e, newValue) => setFilter(newValue)} variant="scrollable">
              <Tab label={`${t('all')} (${formatSensorValue(allAlerts.length, 0)})`} value="all" />
              <Tab label={`${t('critical')} (${formatSensorValue(criticalCount, 0)})`} value="critical" />
              <Tab label={`${t('warnings')} (${formatSensorValue(warningCount, 0)})`} value="warning" />
              <Tab label={`${t('unread')} (${formatSensorValue(unreadCount, 0)})`} value="unread" />
            </Tabs>
            <IconButton onClick={() => setShowSettings(true)} size="small">
              <SettingsIcon />
            </IconButton>
          </Box>
        </CardContent>
      </Card>

      {/* FIXED: THREE SECTION LAYOUT with proper translations */}
      <Grid container spacing={2}>
        
        {/* Environmental Sensors Section */}
        <Grid item xs={12} md={4}>
          <AlertSection
            title={t('environmentalSensors')}
            alerts={safeSensorAlerts}
            filter={filter}
            color={getSectionBorderColor(safeSensorAlerts)}
            icon="sensor"
            onMarkAsRead={safeMarkAsRead}
            onDismiss={safeDismissAlert}
            onRedirect={handleRedirect}
            emptyMessage={t('allSensorsOptimal')}
            preferences={alertPreferences || {}}
            onToggleSection={(expanded) => safeUpdatePreferences({
              sectionsExpanded: { 
                ...(alertPreferences?.sectionsExpanded || {}), 
                sensor: expanded 
              }
            })}
          />
        </Grid>

        {/* Manual Detection Alerts Section */}
        <Grid item xs={12} md={4}>
          <AlertSection
            title={t('manualDetection')}
            alerts={safeManualAlerts}
            filter={filter}
            color={getSectionBorderColor(safeManualAlerts)}
            icon="manual"
            onMarkAsRead={safeMarkAsRead}
            onDismiss={safeDismissAlert}
            onRedirect={handleRedirect}
            emptyMessage={t('noRecentManualDetections')}
            preferences={alertPreferences || {}}
            onToggleSection={(expanded) => safeUpdatePreferences({
              sectionsExpanded: { 
                ...(alertPreferences?.sectionsExpanded || {}), 
                manual: expanded 
              }
            })}
          />
        </Grid>

        {/* Live Camera Detection Alerts Section */}
        <Grid item xs={12} md={4}>
          <AlertSection
            title={t('liveCameraMonitoring')}
            alerts={safeLiveAlerts}
            filter={filter}
            color={getSectionBorderColor(safeLiveAlerts)}
            icon="live"
            onMarkAsRead={safeMarkAsRead}
            onDismiss={safeDismissAlert}
            onRedirect={handleRedirect}
            emptyMessage={t('noRecentCameraDetections')}
            preferences={alertPreferences || {}}
            onToggleSection={(expanded) => safeUpdatePreferences({
              sectionsExpanded: { 
                ...(alertPreferences?.sectionsExpanded || {}), 
                live: expanded 
              }
            })}
          />
        </Grid>
      </Grid>

      {/* Settings Dialog */}
      {alertPreferences && (
        <AlertSettings
          open={showSettings}
          onClose={() => setShowSettings(false)}
          preferences={alertPreferences}
          onUpdatePreferences={safeUpdatePreferences}
        />
      )}
    </div>
  );
}