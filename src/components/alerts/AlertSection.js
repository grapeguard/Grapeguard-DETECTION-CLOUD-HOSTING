// Fixed AlertSection.js - Remove Unused Imports
// src/components/alerts/AlertSection.js

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Collapse,
  IconButton,
  Chip
} from '@mui/material';
import {
  Sensors as SensorIcon,
  BugReport as ManualIcon,
  Camera as LiveIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { useTranslation } from '../../context/LanguageContext';
import AlertCard from './AlertCard';

export default function AlertSection({
  title,
  alerts,
  filter,
  color,
  icon,
  onMarkAsRead,
  onDismiss,
  onRedirect,
  emptyMessage,
  preferences,
  onToggleSection
}) {
  
  const { t, formatSensorValue } = useTranslation();
  
  // Filter alerts based on current filter
  const filteredAlerts = (alerts || []).filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !alert.read;
    if (filter === 'critical') return alert.type === 'critical';
    if (filter === 'warning') return alert.type === 'warning';
    return false;
  });
  
  const sectionKey = icon === 'sensor' ? 'sensor' : icon === 'manual' ? 'manual' : 'live';
  const isExpanded = preferences?.sectionsExpanded?.[sectionKey] ?? true;

  const getIcon = () => {
    switch (icon) {
      case 'sensor': return <SensorIcon style={{ color, fontSize: '1.25rem' }} />;
      case 'manual': return <ManualIcon style={{ color, fontSize: '1.25rem' }} />;
      case 'live': return <LiveIcon style={{ color, fontSize: '1.25rem' }} />;
      default: return null;
    }
  };

  const getCriticalCount = () => filteredAlerts.filter(alert => alert.type === 'critical').length;
  const getWarningCount = () => filteredAlerts.filter(alert => alert.type === 'warning').length;

  return (
    <Card 
      style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        border: `2px solid ${color}`,
        height: 'fit-content',
        maxHeight: '600px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Section Header */}
      <CardContent 
        style={{ 
          padding: '1rem',
          paddingBottom: '0.5rem',
          cursor: 'pointer'
        }}
        onClick={() => onToggleSection(!isExpanded)}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            {getIcon()}
            <Typography variant="h6" style={{ fontWeight: 600, fontSize: '1rem' }}>
              {title}
            </Typography>
            <Chip 
              label={formatSensorValue(filteredAlerts.length, 0)} 
              size="small" 
              style={{ 
                backgroundColor: `${color}20`, 
                color: color,
                fontWeight: 600,
                fontSize: '0.75rem'
              }} 
            />
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            {/* Priority indicators */}
            {getCriticalCount() > 0 && (
              <Chip 
                label={`${formatSensorValue(getCriticalCount(), 0)} ${t('critical')}`} 
                size="small" 
                color="error"
                variant="outlined"
              />
            )}
            {getWarningCount() > 0 && (
              <Chip 
                label={`${formatSensorValue(getWarningCount(), 0)} ${t('warning')}`} 
                size="small" 
                color="warning"
                variant="outlined"
              />
            )}
            
            <IconButton size="small">
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>
      </CardContent>

      {/* Section Content */}
      <Collapse in={isExpanded}>
        <CardContent 
          style={{ 
            padding: '0 1rem 1rem 1rem',
            flex: 1,
            overflowY: 'auto',
            maxHeight: '500px'
          }}
        >
          {filteredAlerts.length === 0 ? (
            <Box 
              textAlign="center" 
              py={3} 
              style={{ 
                backgroundColor: `${color}10`, 
                borderRadius: '6px',
                border: `1px dashed ${color}50`
              }}
            >
              <CheckIcon style={{ fontSize: '2rem', color, marginBottom: '0.5rem' }} />
              <Typography variant="body2" style={{ color }}>
                {emptyMessage}
              </Typography>
            </Box>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredAlerts.map((alert) => (
                <AlertCard 
                  key={alert.id} 
                  alert={alert} 
                  onMarkAsRead={onMarkAsRead}
                  onDismiss={onDismiss}
                  onRedirect={onRedirect}
                  compact={true}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
}