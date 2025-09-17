// Updated Multilingual AlertCard.js - Display Disease Names in Selected Language
// src/components/alerts/AlertCard.js

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  Launch as RedirectIcon
} from '@mui/icons-material';
import { useTranslation } from '../../context/LanguageContext';

export default function AlertCard({ 
  alert, 
  onMarkAsRead, 
  onDismiss, 
  onRedirect, 
  compact = false 
}) {
  
  const { t, formatSensorValue, language } = useTranslation();
  
  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical': return <ErrorIcon style={{ color: '#ef4444', fontSize: '1rem' }} />;
      case 'warning': return <WarningIcon style={{ color: '#f59e0b', fontSize: '1rem' }} />;
      case 'info': return <InfoIcon style={{ color: '#3b82f6', fontSize: '1rem' }} />;
      default: return <InfoIcon style={{ color: '#6b7280', fontSize: '1rem' }} />;
    }
  };

  // FIXED: Disease name mapping with multilingual support
  const getDiseaseDisplayName = (disease, currentLanguage) => {
    const diseaseMap = {
      'Karpa (Anthracnose)': {
        english: 'Karpa (Anthracnose)',
        marathi: 'कर्पा रोग',
        hindi: 'कर्पा (एंथ्रैक्नोस)'
      },
      'Bhuri (Powdery Mildew)': {
        english: 'Bhuri (Powdery Mildew)',
        marathi: 'भुरी रोग',
        hindi: 'भुरी (पाउडरी मिल्ड्यू)'
      },
      'Bokadlela (Borer Infestation)': {
        english: 'Bokadlela (Borer Infestation)',
        marathi: 'बोकाडलेला',
        hindi: 'बोकाडलेला (बोरर संक्रमण)'
      },
      'Davnya (Downy Mildew)': {
        english: 'Davnya (Downy Mildew)',
        marathi: 'दवयाचा रोग',
        hindi: 'दवयाचा (डाउनी मिल्ड्यू)'
      },
      'Healthy': {
        english: 'Healthy Grapes',
        marathi: 'निरोगी द्राक्षे',
        hindi: 'स्वस्थ अंगूर'
      }
    };

    const diseaseInfo = diseaseMap[disease] || { 
      english: disease, 
      marathi: disease, 
      hindi: disease 
    };

    if (currentLanguage === 'marathi') {
      return {
        primary: diseaseInfo.marathi,
        secondary: diseaseInfo.english !== diseaseInfo.marathi ? diseaseInfo.english : null
      };
    } else if (currentLanguage === 'hindi') {
      return {
        primary: diseaseInfo.hindi,
        secondary: diseaseInfo.english !== diseaseInfo.hindi ? diseaseInfo.english : null
      };
    } else {
      return {
        primary: diseaseInfo.english,
        secondary: null
      };
    }
  };

  // FIXED: Get translated alert title - prioritize disease names for detection alerts
  const getTranslatedTitle = (alert) => {
    // For manual and live detection alerts, show disease name directly
    if ((alert.category === 'manual' || alert.category === 'live') && alert.disease) {
      const diseaseNames = getDiseaseDisplayName(alert.disease, language);
      return diseaseNames.primary;
    }
    
    // For sensor alerts, use translation keys
    if (alert.titleKey) {
      return t(alert.titleKey);
    }
    
    // Fallback
    return alert.title || t('alert');
  };

  // FIXED: Get translated subtitle for detection alerts
  const getTranslatedSubtitle = (alert) => {
    // For detection alerts, show secondary language if available
    if ((alert.category === 'manual' || alert.category === 'live') && alert.disease) {
      const diseaseNames = getDiseaseDisplayName(alert.disease, language);
      return diseaseNames.secondary;
    }
    return null;
  };

  // FIXED: Get translated message
  const getTranslatedMessage = (alert) => {
    if (alert.messageKey) {
      let message = t(alert.messageKey);
      
      // Replace placeholders if needed
      if (alert.value && alert.sensorType) {
        const unit = getSensorUnit(alert.sensorType);
        message = message.replace('{value}', `${formatSensorValue(alert.value, 1)}${unit}`);
      }
      
      if (alert.confidence) {
        message = message.replace('{confidence}', `${formatSensorValue(alert.confidence, 1)}%`);
      }
      
      return message;
    }
    
    // For detection alerts, show confidence info
    if ((alert.category === 'manual' || alert.category === 'live') && alert.confidence) {
      return `${formatSensorValue(alert.confidence, 1)}% ${t('confidence')} • ${t('aiDetected')}`;
    }
    
    return alert.message || '';
  };

  // Get sensor unit for display
  const getSensorUnit = (sensorType) => {
    const units = {
      temperature: '°C',
      humidity: '%',
      soilMoisture: '%',
      lightIntensity: 'Lux',
      batteryVoltage: 'V',
      rainSensor: '%'
    };
    return units[sensorType] || '';
  };

  // Get translated source
  const getTranslatedSource = (alert) => {
    if (alert.sourceKey) {
      return t(alert.sourceKey);
    }
    
    if (alert.category === 'live') {
      return `${t('camera')} ${alert.camera}`;
    }
    
    if (alert.category === 'manual') {
      return t('manualAnalysis');
    }
    
    return alert.source || alert.sensor || t('unknown');
  };

  const formatEnhancedTimestamp = (alert) => {
    if (!alert.timestamp) return { timeAgo: t('unknownTime'), contextualTime: t('noTimestamp') };
    
    // Handle different timestamp formats
    let alertTime;
    if (typeof alert.timestamp === 'string') {
      if (alert.timestamp.includes('-') && alert.timestamp.includes(' ')) {
        const [datePart, timePart] = alert.timestamp.split(' ');
        const [day, month, year] = datePart.split('-');
        const [hour, minute, second] = timePart.split(':');
        alertTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                           parseInt(hour), parseInt(minute), parseInt(second));
      } else {
        alertTime = new Date(alert.timestamp);
      }
    } else {
      alertTime = new Date(alert.timestamp);
    }
    
    if (isNaN(alertTime.getTime())) {
      return { timeAgo: t('invalidTime'), contextualTime: t('invalidTimestamp') };
    }
    
    const now = new Date();
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    let timeAgo;
    if (diffMins < 1) timeAgo = t('justNow');
    else if (diffMins < 60) timeAgo = `${formatSensorValue(diffMins, 0)} ${t('minutesAgo')}`;
    else if (diffHours < 24) timeAgo = `${formatSensorValue(diffHours, 0)} ${t('hoursAgo')}`;
    else timeAgo = alertTime.toLocaleDateString();
    
    // Enhanced timestamp with context
    let contextualTime;
    switch (alert.category) {
      case 'sensor':
        contextualTime = `${t('sensorReading')}: ${alertTime.toLocaleString()}`;
        break;
      case 'manual':
        contextualTime = `${t('analyzed')}: ${alertTime.toLocaleString()}`;
        break;
      case 'live':
        let driveUploadTime = t('unknown');
        if (alert.driveUploadTime) {
          try {
            const driveTime = new Date(alert.driveUploadTime);
            driveUploadTime = driveTime.toLocaleString();
          } catch (error) {
            driveUploadTime = t('parseError');
          }
        }
        contextualTime = `📸 ${t('captured')}: ${driveUploadTime} → 🤖 ${t('analyzed')}: ${alertTime.toLocaleString()}`;
        break;
      default:
        contextualTime = alertTime.toLocaleString();
    }
    
    return { timeAgo, contextualTime };
  };

  const getRedirectText = (category, source) => {
    if (category === 'sensor') return t('viewDashboard');
    if (category === 'manual') return t('goToDetection');
    if (category === 'live') return t('viewLiveFeed');
    return t('viewSource');
  };

  const { timeAgo, contextualTime } = formatEnhancedTimestamp(alert);

  return (
    <Card 
      style={{
        border: `1px solid ${
          alert.type === 'critical' ? '#ef4444' : 
          alert.type === 'warning' ? '#f59e0b' : '#3b82f6'
        }`,
        borderRadius: '6px',
        backgroundColor: alert.read ? '#ffffff' : '#fefbff',
        transition: 'all 0.2s ease',
        marginBottom: '0.25rem'
      }}
    >
      <CardContent style={{ padding: compact ? '0.75rem' : '1rem' }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          
          {/* Alert Content */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            {getAlertIcon(alert.type)}
            
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* FIXED: Alert Title - Show disease name directly for detection alerts */}
              <Box display="flex" alignItems="center" gap="0.5rem" mb={0.5}>
                <Typography 
                  variant={compact ? "body2" : "body1"} 
                  style={{ 
                    fontWeight: 600, 
                    color: '#1f2937',
                    fontSize: compact ? '0.875rem' : '1rem',
                    lineHeight: 1.2
                  }}
                  noWrap
                  title={getTranslatedTitle(alert)}
                >
                  {getTranslatedTitle(alert)}
                </Typography>
                
                {/* Show camera info for live alerts */}
                {alert.category === 'live' && alert.camera && (
                  <Chip
                    label={`${t('camera')} ${formatSensorValue(alert.camera, 0)}`}
                    size="small"
                    style={{ 
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                      fontSize: '0.7rem',
                      height: '18px'
                    }}
                  />
                )}
              </Box>
              
              {/* FIXED: Secondary language display for detection alerts */}
              {getTranslatedSubtitle(alert) && (
                <Typography 
                  variant="caption" 
                  style={{ 
                    color: '#6b7280', 
                    display: 'block',
                    fontStyle: 'italic',
                    marginBottom: '0.25rem'
                  }}
                >
                  {getTranslatedSubtitle(alert)}
                </Typography>
              )}
              
              {/* Alert Message */}
              <Typography 
                variant="caption" 
                style={{ 
                  color: '#6b7280', 
                  display: '-webkit-box',
                  WebkitLineClamp: compact ? 2 : 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.3,
                  marginBottom: '0.5rem'
                }}
                title={getTranslatedMessage(alert)}
              >
                {getTranslatedMessage(alert)}
              </Typography>
              
              {/* Enhanced Metadata */}
              <Box display="flex" flexDirection="column" gap="0.25rem">
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" style={{ color: '#9ca3af', fontSize: '0.7rem' }}>
                    {getTranslatedSource(alert)}
                    {alert.confidence && ` • ${formatSensorValue(alert.confidence, 1)}% ${t('confidence')}`}
                    {alert.value && ` • ${formatSensorValue(alert.value, 1)}${getSensorUnit(alert.sensorType)}`}
                  </Typography>
                  
                  <Typography variant="caption" style={{ color: '#9ca3af', fontSize: '0.7rem' }}>
                    {timeAgo}
                  </Typography>
                </Box>
                
                {/* Enhanced timestamp row with context */}
                <Tooltip title={contextualTime} placement="bottom">
                  <Typography 
                    variant="caption" 
                    style={{ 
                      color: '#6b7280', 
                      fontSize: '0.65rem',
                      fontStyle: 'italic',
                      cursor: 'help',
                      lineHeight: 1.2
                    }}
                  >
                    {alert.category === 'live' && (
                      <>
                        📸 {t('drive')}: {alert.driveUploadTime ? new Date(alert.driveUploadTime).toLocaleTimeString() : t('unknown')}
                        {' • '}
                        🤖 AI: {new Date(alert.timestamp).toLocaleTimeString()}
                      </>
                    )}
                    {alert.category === 'manual' && (
                      <>
                        🤖 {t('analyzed')}: {new Date(alert.timestamp).toLocaleTimeString()}
                      </>
                    )}
                    {alert.category === 'sensor' && (
                      <>
                        📊 {t('sensor')}: {new Date(alert.timestamp).toLocaleTimeString()}
                      </>
                    )}
                  </Typography>
                </Tooltip>
              </Box>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.25rem', 
            marginLeft: '0.5rem',
            alignItems: 'flex-end'
          }}>
            <Tooltip title={getRedirectText(alert.category, alert.source)}>
              <IconButton 
                size="small" 
                onClick={() => onRedirect(alert)}
                style={{ 
                  color: '#3b82f6',
                  backgroundColor: '#eff6ff',
                  width: '24px',
                  height: '24px'
                }}
              >
                <RedirectIcon style={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Tooltip>
            
            <Box display="flex" gap="0.25rem">
              {!alert.read && (
                <Tooltip title={t('markAsRead')}>
                  <IconButton 
                    size="small" 
                    onClick={() => onMarkAsRead(alert.id)}
                    style={{ 
                      color: '#22c55e',
                      width: '20px',
                      height: '20px'
                    }}
                  >
                    <CheckIcon style={{ fontSize: '0.75rem' }} />
                  </IconButton>
                </Tooltip>
              )}
              
              <Tooltip title={t('dismissAlert')}>
                <IconButton 
                  size="small" 
                  onClick={() => onDismiss(alert.id)}
                  style={{ 
                    color: '#ef4444',
                    width: '20px',
                    height: '20px'
                  }}
                >
                  <DeleteIcon style={{ fontSize: '0.75rem' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </div>
        </Box>
      </CardContent>
    </Card>
  );
}