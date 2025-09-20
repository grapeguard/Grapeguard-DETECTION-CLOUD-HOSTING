// Fixed LiveCameraFeed.js - Resolving 406 Error and Function Issues
// src/components/live-monitoring/LiveCameraFeed.js

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Clear as ClearIcon,
  Camera as CameraIcon,
  Delete as DeleteIcon,
  Psychology as AIIcon
} from '@mui/icons-material';
import { useTranslation } from '../../context/LanguageContext';
import EnhancedCameraCard from './EnhancedCameraCard';
import { useAuth } from '../../context/AuthContext';
import analysisSupabaseService from '../../services/AnalysisSupabaseService';

export default function LiveCameraFeed() {
  const { t, language, formatSensorValue } = useTranslation();
  const { currentUser } = useAuth();
  
  // Helper function to get translated severity label
  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'High':
        return t('severityHigh');
      case 'Medium':
        return t('severityMedium');
      case 'Low':
        return t('severityLow');
      case 'None':
        return t('severityNone');
      default:
        return severity;
    }
  };
  
  const [error, setError] = useState(null);
  
  const [cameraResults, setCameraResults] = useState({
    camera1: null,
    camera2: null
  });
  
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [showMoreOffset, setShowMoreOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Disease name mapping with multilingual support
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

  // FIXED: Load latest live monitoring images from Supabase
  const loadLatestImages = async (uid) => {
    try {
      if (!uid) { 
        setDetectionHistory([]); 
        setCameraResults({ camera1: null, camera2: null });
        return; 
      }
      
      console.log('Loading latest images for user:', uid);
      
      // FIXED: Using correct service method
      const items = await analysisSupabaseService.getLatestLiveImages(uid, 10);
      console.log('Loaded items:', items);
      
      setDetectionHistory(items.map(it => ({
        id: it.id,
        historyId: `sb_${it.id}`,
        camera: it.camera,
        originalImage: it.originalImage,
        visualizationImage: it.visualizationImage,
        detection: {
          disease: it.detection.disease,
          confidence: it.detection.confidence,
          severity: it.detection.severity,
          detectedRegions: it.detection.detectedRegions || 0
        },
        timestamp: it.timestamp,
        driveFileName: it.driveFileName,
        driveUploadTime: it.driveUploadTime
      })));

      // FIXED: Load latest image for each camera using correct service method
      const [camera1Image, camera2Image] = await Promise.all([
        analysisSupabaseService.getLatestImageByCamera(uid, 1),
        analysisSupabaseService.getLatestImageByCamera(uid, 2)
      ]);

      console.log('Camera 1 image:', camera1Image);
      console.log('Camera 2 image:', camera2Image);

      setCameraResults({
        camera1: camera1Image ? {
          id: camera1Image.id,
          camera: camera1Image.camera,
          originalImage: camera1Image.originalImage,
          visualizationImage: camera1Image.visualizationImage,
          detection: camera1Image.detection,
          timestamp: camera1Image.timestamp,
          driveFileName: camera1Image.driveFileName,
          driveUploadTime: camera1Image.driveUploadTime
        } : null,
        camera2: camera2Image ? {
          id: camera2Image.id,
          camera: camera2Image.camera,
          originalImage: camera2Image.originalImage,
          visualizationImage: camera2Image.visualizationImage,
          detection: camera2Image.detection,
          timestamp: camera2Image.timestamp,
          driveFileName: camera2Image.driveFileName,
          driveUploadTime: camera2Image.driveUploadTime
        } : null
      });

    } catch (e) {
      console.error('Failed to load latest live images:', e);
      setError(`Failed to load live images: ${e.message}`);
    }
  };

  useEffect(() => { 
    console.log('Current user changed:', currentUser?.uid);
    loadLatestImages(currentUser?.uid); 
  }, [currentUser?.uid]);

  const deleteIndividualHistory = (historyId) => {
    const updatedHistory = detectionHistory.filter(item => 
      (item.historyId || item.id) !== historyId
    );
    setDetectionHistory(updatedHistory);
    console.log(`Deleted history item: ${historyId}`);
  };

  const clearCurrentResults = () => {
    setCameraResults({ camera1: null, camera2: null });
    setError(null);
    console.log('Cleared current results (history preserved)');
  };

  const clearHistory = () => {
    setDetectionHistory([]);
    setShowMoreOffset(0);
    console.log('Cleared detection history');
  };

  // FIXED: Load more images function
  const loadMoreImages = async () => {
    if (!currentUser?.uid || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const newOffset = showMoreOffset + 10;
      console.log('Loading more images with offset:', newOffset);
      
      // FIXED: Using correct service method
      const moreItems = await analysisSupabaseService.getMoreLiveImages(currentUser.uid, newOffset, 10);
      console.log('Loaded more items:', moreItems);
      
      if (moreItems.length > 0) {
        const newHistoryItems = moreItems.map(it => ({
          id: it.id,
          historyId: `sb_${it.id}`,
          camera: it.camera,
          originalImage: it.originalImage,
          visualizationImage: it.visualizationImage,
          detection: {
            disease: it.detection.disease,
            confidence: it.detection.confidence,
            severity: it.detection.severity,
            detectedRegions: it.detection.detectedRegions || 0
          },
          timestamp: it.timestamp,
          driveFileName: it.driveFileName,
          driveUploadTime: it.driveUploadTime
        }));
        
        setDetectionHistory(prev => [...prev, ...newHistoryItems]);
        setShowMoreOffset(newOffset);
      }
    } catch (e) {
      console.error('Failed to load more images:', e);
      setError(`Failed to load more images: ${e.message}`);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const downloadResult = (result) => {
    if (result?.visualizationImage) {
      const link = document.createElement('a');
      link.href = result.visualizationImage;
      link.download = `detectron2-camera${result.camera}-${Date.now()}.jpg`;
      link.click();
    }
  };

  // Format Drive upload time with date
  const formatDriveUploadTime = (driveTime) => {
    if (!driveTime) return 'Unknown time';
    
    try {
      const date = new Date(driveTime);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Control Panel */}
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            onClick={clearCurrentResults}
            startIcon={<ClearIcon />}
            style={{ borderColor: '#6b7280', color: '#6b7280' }}
            size="large"
          >
            {t('clearResults')}
          </Button>
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            label={t('liveMonitoringActive')}
            color="success"
            icon={<CameraIcon />}
            size="small"
          />
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Camera Results */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <EnhancedCameraCard 
            cameraData={cameraResults.camera1}
            cameraNumber={1}
            onCameraClick={(data) => console.log('Camera 1 details:', data)}
            onDownload={downloadResult}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <EnhancedCameraCard 
            cameraData={cameraResults.camera2}
            cameraNumber={2}
            onCameraClick={(data) => console.log('Camera 2 details:', data)}
            onDownload={downloadResult}
          />
        </Grid>
      </Grid>

      {/* Detection History */}
      <Card elevation={2} style={{ backgroundColor: 'white', borderRadius: '12px' }}>
        <CardContent style={{ padding: '1.5rem' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" style={{ fontWeight: 600 }}>
              {t('recentAnalysisHistory')} ({detectionHistory.length})
            </Typography>
            
            <Box display="flex" gap={1}>
              {detectionHistory.length > 0 && (
                <Button
                  onClick={loadMoreImages}
                  disabled={isLoadingMore}
                  variant="outlined"
                  size="small"
                  startIcon={isLoadingMore ? <CircularProgress size={16} /> : null}
                  style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
                >
                  {isLoadingMore ? t('loading') : t('showMore')}
                </Button>
              )}
              
              {detectionHistory.length > 0 && (
                <Button
                  onClick={clearHistory}
                  style={{ color: '#ef4444' }}
                  size="small"
                  startIcon={<DeleteIcon />}
                >
                  {t('clearHistory')}
                </Button>
              )}
            </Box>
          </Box>
          
          {detectionHistory.length === 0 ? (
            <Box textAlign="center" py={3} style={{ backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <CameraIcon style={{ fontSize: '3rem', color: '#9ca3af', marginBottom: '1rem' }} />
              <Typography variant="h6" color="textSecondary" style={{ marginBottom: '0.5rem' }}>
                {t('noLiveImagesYet')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {t('liveImagesWillAppearHere')}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {detectionHistory.map((result) => {
                const diseaseNames = getDiseaseDisplayName(result.detection.disease, language);
                
                return (
                  <Grid 
                    item 
                    xs={12}
                    sm={6}
                    md={2.4}
                    key={result.historyId || result.id}
                  >
                    <Card 
                      elevation={1} 
                      style={{ 
                        transition: 'all 0.3s ease',
                        border: '1px solid #e5e7eb',
                        position: 'relative',
                        backgroundColor: 'white',
                        height: '350px'
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
                      {/* Individual Delete Button */}
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
                            onClick={() => deleteIndividualHistory(result.historyId || result.id)}
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

                      <CardContent style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* Image Preview Box with AI indicator overlay */}
                        <Box 
                          style={{
                            width: '100%',
                            height: '120px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '6px',
                            marginBottom: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                        >
                          {result.visualizationImage || result.originalImage ? (
                            <img
                              src={result.visualizationImage || result.originalImage}
                              alt={`${result.detection.disease} preview`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                if (result.originalImage && e.target.src !== result.originalImage) {
                                  e.target.src = result.originalImage;
                                }
                              }}
                            />
                          ) : (
                            <Box textAlign="center">
                              <CameraIcon style={{ fontSize: '2rem', color: '#9ca3af', marginBottom: '0.5rem' }} />
                              <Typography variant="caption" color="textSecondary">
                                {t('analysisResult')}
                              </Typography>
                            </Box>
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
                            <AIIcon style={{ fontSize: '0.75rem', marginRight: '0.25rem' }} />
                            {t('aiDetected')}
                          </Box>
                        </Box>
                        
                        {/* Disease name with inline confidence */}
                        <Typography variant="body2" style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{diseaseNames.primary}</span>
                          <span style={{ color: '#6b7280', fontWeight: 500 }}>• {formatSensorValue(result.detection.confidence, 1)}% {t('confidence')}</span>
                        </Typography>
                        {diseaseNames.secondary && (
                          <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '0.25rem', fontStyle: 'italic' }}>
                            {diseaseNames.secondary}
                          </Typography>
                        )}
                        
                        <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '0.25rem' }}>
                          {t('camera')} {result.camera}
                        </Typography>
                        
                        <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '0.25rem', fontStyle: 'italic' }}>
                          📸 {t('drive')}: {formatDriveUploadTime(result.driveUploadTime)}
                        </Typography>
                        
                        <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                          🤖 {t('analyzed')}: {formatDriveUploadTime(result.timestamp)}
                        </Typography>
                        
                        {/* Severity and Status Chips */}
                        <Box display="flex" gap={0.5} flexWrap="wrap" style={{ marginTop: 'auto' }}>
                          <Chip
                            label={getSeverityLabel(result.detection.severity)}
                            size="small"
                            color={
                              result.detection.severity === 'High' ? 'error' :
                              result.detection.severity === 'Medium' ? 'warning' :
                              result.detection.severity === 'None' ? 'success' : 'default'
                            }
                          />
                          {result.detection.detectedRegions > 0 && (
                            <Chip
                              label={`${formatSensorValue(result.detection.detectedRegions, 0)} ${t('regions')}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
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
    </div>
  );
}
