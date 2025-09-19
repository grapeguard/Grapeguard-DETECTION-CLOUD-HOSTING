// Updated AnalysisHistory.js with Complete Multilingual Support and New Translations
// src/components/detection/AnalysisHistory.js

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  History as HistoryIcon,
  Delete as DeleteIcon,
  Camera as CameraIcon
} from '@mui/icons-material';
import { useTranslation } from '../../context/LanguageContext';
import AnalysisHistoryService from '../../services/AnalysisHistoryService';

export default function AnalysisHistory({ 
  analysisHistory: analysisHistoryProp, 
  setAnalysisHistory: setAnalysisHistoryProp, 
  autoLoadFromCloud = true, 
  userId = null, 
  limit = 10 
}) {
  // Allow component to self-manage and auto-load from GCS if props not supplied
  const [internalHistory, setInternalHistory] = useState([]);
  const analysisHistory = analysisHistoryProp ?? internalHistory;
  const setAnalysisHistory = setAnalysisHistoryProp ?? setInternalHistory;
  const { t, language, formatSensorValue, getSeverityLabel } = useTranslation();

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!autoLoadFromCloud) return;
      try {
        const items = await AnalysisHistoryService.getAnalysisHistory(userId, limit);
        if (isMounted) setAnalysisHistory(items);
      } catch (e) {
        console.error('Failed to load cloud analysis history:', e);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [autoLoadFromCloud, userId, limit, setAnalysisHistory]);

  const clearHistory = () => {
    setAnalysisHistory([]);
    localStorage.removeItem('diseaseAnalysisHistory');
    console.log('📋 Analysis history cleared');
  };

  const deleteIndividualItem = (itemId) => {
    const updatedHistory = analysisHistory.filter(item => item.id !== itemId);
    setAnalysisHistory(updatedHistory);
    localStorage.setItem('diseaseAnalysisHistory', JSON.stringify(updatedHistory));
    console.log(`🗑️ Deleted analysis item: ${itemId}`);
  };

  // Format analysis time with date
  const formatAnalysisTime = (timestamp) => {
    if (!timestamp) return t('time') + ': Unknown';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Disease name mapping with proper language handling
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
        marathi: 'दवन्याचा रोग',
        hindi: 'दवन्याचा (डाउनी मिल्ड्यू)'
      },
      'Healthy': {
        english: 'Healthy',
        marathi: 'निरोगी',
        hindi: 'स्वस्थ'
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
        secondary: diseaseInfo.english
      };
    } else if (currentLanguage === 'hindi') {
      return {
        primary: diseaseInfo.hindi,
        secondary: diseaseInfo.english
      };
    } else {
      return {
        primary: diseaseInfo.english,
        secondary: null
      };
    }
  };

  return (
    <Card elevation={2} style={{ backgroundColor: 'white', borderRadius: '12px' }}>
      <CardContent style={{ padding: '1.5rem' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center">
            <HistoryIcon style={{ color: '#8b5cf6', marginRight: '0.5rem' }} />
            <Typography variant="h6" style={{ fontWeight: 600, color: '#1f2937' }}>
              {t('recentAnalysisHistory')}
              <Badge badgeContent={analysisHistory.length} color="primary" style={{ marginLeft: '0.5rem' }}>
                <span></span>
              </Badge>
            </Typography>
          </Box>
          {analysisHistory.length > 0 && (
            <Button
              size="small"
              onClick={clearHistory}
              startIcon={<DeleteIcon />}
              style={{ color: '#ef4444' }}
            >
              {t('clearHistory')}
            </Button>
          )}
        </Box>
        
        {analysisHistory.length === 0 ? (
          <Box style={{ 
            textAlign: 'center', 
            padding: '2rem', 
            color: '#9ca3af',
            backgroundColor: '#f9fafb',
            borderRadius: '8px'
          }}>
            <HistoryIcon style={{ fontSize: '3rem', marginBottom: '1rem' }} />
            <Typography variant="h6" style={{ marginBottom: '0.5rem' }}>
              {t('noAnalysisHistoryYet')}
            </Typography>
            <Typography variant="body2">
              {t('uploadAndAnalyzeImages')}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {analysisHistory.map((item) => {
              // Get disease names using current language
              const diseaseNames = getDiseaseDisplayName(item.disease, language);
              
              return (
                <Grid item xs={12} sm={6} md={4} lg={2.4} key={item.id}>
                  <Card 
                    elevation={1} 
                    style={{ 
                      transition: 'all 0.3s ease',
                      border: '1px solid #e5e7eb',
                      position: 'relative',
                      backgroundColor: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    {/* Delete button overlay */}
                    <Box
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        zIndex: 1
                      }}
                    >
                      <Tooltip title={t('deleteThisAnalysis')}>
                        <IconButton
                          size="small"
                          onClick={() => deleteIndividualItem(item.id)}
                          style={{ 
                            backgroundColor: 'rgba(239, 68, 68, 0.9)',
                            color: 'white',
                            width: '24px',
                            height: '24px'
                          }}
                        >
                          <DeleteIcon style={{ fontSize: '0.75rem' }} />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <CardContent style={{ padding: '1rem' }}>
                      {/* Image Preview Box - prefer visualization image, tighten spacing above chips */}
                      <Box 
                        style={{
                          width: '100%',
                          height: '120px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '6px',
                          marginBottom: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                      >
                        {/* Show AI visualization (same as live monitoring) */}
                        {item.visualizationImage || item.currentVisualization ? (
                          <img
                            src={item.visualizationImage || item.currentVisualization}
                            alt={`${item.disease} AI result`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            onError={(e) => {
                              console.log('❌ Failed to load visualization, trying original image');
                              // If visualization fails, try original image
                              if (item.originalImage || item.image) {
                                e.target.src = item.originalImage || item.image;
                              }
                            }}
                          />
                        ) : (
                          /* Show original uploaded image if no visualization */
                          item.originalImage || item.image ? (
                            <img
                              src={item.originalImage || item.image}
                              alt={`${item.disease} original`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                filter: 'brightness(0.95)' // Slightly dim original
                              }}
                            />
                          ) : (
                            /* FALLBACK: Show placeholder only if no images available */
                            <Box textAlign="center">
                              <CameraIcon style={{ fontSize: '2rem', color: '#9ca3af', marginBottom: '0.5rem' }} />
                              <Typography variant="caption" color="textSecondary">
                                {t('analysisResult')}
                              </Typography>
                            </Box>
                          )
                        )}

                        {/* AI Processing Indicator */}
                        <Box
                          style={{
                            position: 'absolute',
                            top: '0.5rem',
                            left: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: 'rgba(139, 92, 246, 0.9)',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          <CameraIcon style={{ fontSize: '0.75rem', marginRight: '0.25rem' }} />
                          {t('aiDetected')}
                        </Box>
                      </Box>
                      
                      {/* Disease name with proper language display */}
                      <Typography variant="body2" style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        {diseaseNames.primary}
                      </Typography>
                      {diseaseNames.secondary && diseaseNames.secondary !== diseaseNames.primary && (
                        <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '0.25rem', fontStyle: 'italic' }}>
                          {diseaseNames.secondary}
                        </Typography>
                      )}
                      
                      <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '0.25rem' }}>
                        {formatSensorValue(item.confidence, 1)}% {t('confidence')}
                      </Typography>
                      
                      <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '0.25rem', fontStyle: 'italic' }}>
                        🤖 {t('analyzed')}: {formatAnalysisTime(item.timestamp)}
                      </Typography>
                      <Box display="flex" gap={0.5} flexWrap="wrap" style={{ marginTop: '0' }}>
                        {/* Use translated severity label */}
                        <Chip
                          label={getSeverityLabel(item.severity)}
                          size="small"
                          color={
                            item.severity === 'High' ? 'error' :
                            item.severity === 'Medium' ? 'warning' :
                            item.severity === 'None' ? 'success' : 'default'
                          }
                        />
                        <Chip
                          label="AI"
                          size="small"
                          variant="outlined"
                          style={{ fontSize: '0.7rem' }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
}
