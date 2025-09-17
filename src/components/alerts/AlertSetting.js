// Complete Multilingual AlertSettings.js
// src/components/alerts/AlertSettings.js

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  IconButton,
  Switch,
  FormControlLabel,
  Divider,
  Button
} from '@mui/material';
import {
  Close as CloseIcon,
  Sensors as SensorIcon,
  BugReport as ManualIcon,
  Camera as LiveIcon
} from '@mui/icons-material';
import { useTranslation } from '../../context/LanguageContext';

export default function AlertSettings({ 
  open, 
  onClose, 
  preferences, 
  onUpdatePreferences 
}) {
  
  const { t, formatSensorValue } = useTranslation();
  
  const handleToggle = (key, value) => {
    onUpdatePreferences({ [key]: value });
  };

  const handleClearAction = (actionType) => {
    switch (actionType) {
      case 'dismissed':
        onUpdatePreferences({ dismissedAlerts: [] });
        break;
      case 'read':
        onUpdatePreferences({ readAlerts: [] });
        break;
      default:
        break;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        style: { borderRadius: '12px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" style={{ fontWeight: 600 }}>
            {t('alertPreferences')}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Alert Type Toggles */}
          <Box>
            <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: '1rem' }}>
              {t('alertCategories')}
            </Typography>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.enableSensorAlerts}
                    onChange={(e) => handleToggle('enableSensorAlerts', e.target.checked)}
                    color="success"
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <SensorIcon style={{ color: '#22c55e', fontSize: '1.25rem' }} />
                    <Typography>{t('environmentalSensorAlerts')}</Typography>
                  </Box>
                }
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.enableManualAlerts}
                    onChange={(e) => handleToggle('enableManualAlerts', e.target.checked)}
                    style={{ color: '#8b5cf6' }}
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <ManualIcon style={{ color: '#8b5cf6', fontSize: '1.25rem' }} />
                    <Typography>{t('manualDetectionAlerts')}</Typography>
                  </Box>
                }
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.enableLiveAlerts}
                    onChange={(e) => handleToggle('enableLiveAlerts', e.target.checked)}
                    style={{ color: '#f59e0b' }}
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <LiveIcon style={{ color: '#f59e0b', fontSize: '1.25rem' }} />
                    <Typography>{t('liveCameraAlerts')}</Typography>
                  </Box>
                }
              />
            </div>
          </Box>

          <Divider />

          {/* Alert Behavior Settings */}
          <Box>
            <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: '1rem' }}>
              {t('alertBehavior')}
            </Typography>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.criticalOnly}
                    onChange={(e) => handleToggle('criticalOnly', e.target.checked)}
                    color="error"
                  />
                }
                label={t('showCriticalAlertsOnly')}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.autoRefresh}
                    onChange={(e) => handleToggle('autoRefresh', e.target.checked)}
                    color="primary"
                  />
                }
                label={t('autoRefreshAlerts')}
              />
            </div>
          </Box>

          <Divider />

          {/* Clear Actions */}
          <Box>
            <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: '1rem' }}>
              {t('manageAlerts')}
            </Typography>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">
                  {t('dismissedAlerts')} ({formatSensorValue(preferences.dismissedAlerts?.length || 0, 0)})
                </Typography>
                <Button
                  onClick={() => handleClearAction('dismissed')}
                  variant="outlined"
                  size="small"
                  disabled={!preferences.dismissedAlerts?.length}
                  style={{ 
                    color: '#6b7280', 
                    borderColor: '#6b7280',
                    textTransform: 'none'
                  }}
                >
                  {t('clearDismissed')}
                </Button>
              </Box>
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">
                  {t('readAlerts')} ({formatSensorValue(preferences.readAlerts?.length || 0, 0)})
                </Typography>
                <Button
                  onClick={() => handleClearAction('read')}
                  variant="outlined"
                  size="small"
                  disabled={!preferences.readAlerts?.length}
                  style={{ 
                    color: '#6b7280', 
                    borderColor: '#6b7280',
                    textTransform: 'none'
                  }}
                >
                  {t('markAllUnread')}
                </Button>
              </Box>
            </div>
          </Box>
        </div>
      </DialogContent>
    </Dialog>
  );
}