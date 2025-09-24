// Fixed LiveCameraFeed.js with Proper Analysis History Cards Format
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
  PlayArrow as PlayIcon,
  Clear as ClearIcon,
  Psychology as AIIcon,
  Camera as CameraIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useTranslation } from '../../context/LanguageContext';
import GoogleDriveService from '../../services/GoogleDriveService';
import DetectronDiseaseService from '../../services/DetectronDiseaseService';
import EnhancedCameraCard from './EnhancedCameraCard';
import { useAuth } from '../../context/AuthContext';
import analysisSupabaseService from '../../services/AnalysisSupabaseService';

export default function LiveCameraFeed() {
  const [driveService] = useState(new GoogleDriveService());
  const [detectionService] = useState(new DetectronDiseaseService());
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
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [error, setError] = useState(null);
  
  const [cameraResults, setCameraResults] = useState({
    camera1: null,
    camera2: null
  });
  
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [isDriveFallback, setIsDriveFallback] = useState(false);
  const [driveCache, setDriveCache] = useState([]); // accumulated images across folders
  const [drivePage, setDrivePage] = useState(0);
  const [driveFolders, setDriveFolders] = useState([]);
  const [driveFolderIndex, setDriveFolderIndex] = useState(0);
  const [drivePageToken, setDrivePageToken] = useState(null);

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

  // Load AI model on component mount
  useEffect(() => {
    const initModel = async () => {
      try {
        console.log('🤖 Loading AI model (HF Space)...');
        setModelError(null);
        
        const loaded = await detectionService.loadModel();
        setIsModelLoaded(loaded);
        
        if (!loaded) {
          setModelError('AI service unavailable. Please check your internet and try again.');
          console.error('❌ AI model failed to load');
        } else {
          console.log('✅ AI model loaded successfully');
        }
        
      } catch (error) {
        console.error('❌ Model loading failed:', error);
        setModelError(`Service connection failed: ${error.message}`);
        setIsModelLoaded(false);
      }
    };

    initModel();
  }, [detectionService]);

  // Load per-user live detection history from Supabase (paginated: 10 per page)
  const loadCloudHistoryPage = async (uid, nextPage = 0) => {
    try {
      if (!uid) { setDetectionHistory([]); setHasMore(false); return; }
      setIsLoadingPage(true);
      const { items, hasMore: more } = await analysisSupabaseService.listUserAnalysesPaged(uid, 10, nextPage, { type: 'live' });
      const mapped = items.map(it => ({
        id: it.id,
        historyId: `sb_${it.id}`,
        camera: it.camera,
        originalImage: it.originalImage,
        visualizationImage: it.visualizationImage,
        detection: {
          disease: it.disease,
          confidence: it.confidence,
          severity: it.severity,
          detectedRegions: it.detectedRegions || 0
        },
        timestamp: it.timestamp
      }));
      if (nextPage === 0) {
        setDetectionHistory(mapped);
      } else {
        setDetectionHistory(prev => [...prev, ...mapped]);
      }
      setHasMore(more);
      setPage(nextPage);
      // Fallback: if no Supabase items on first page, show latest 10 images from Drive
      if (nextPage === 0 && mapped.length === 0) {
        await loadDriveRecent(0);
      } else {
        setIsDriveFallback(false);
      }
    } catch (e) {
      console.error('Failed to load Supabase live history (paged):', e);
    } finally {
      setIsLoadingPage(false);
    }
  };

  useEffect(() => { loadCloudHistoryPage(currentUser?.uid, 0); }, [currentUser?.uid]);

  // Drive fallback: load most recent images from latest date folder
  const loadDriveRecent = async (nextDrivePage = 0, options = {}) => {
    const { append = false } = options;
    try {
      setIsLoadingPage(true);
      setIsDriveFallback(true);
      let images = driveCache;
      if (images.length === 0) {
        const dateFolders = await driveService.getDateFolders();
        if (!dateFolders || dateFolders.length === 0) { setDetectionHistory([]); setHasMore(false); return; }
        setDriveFolders(dateFolders);
        setDriveFolderIndex(0);
        const latestDateFolder = dateFolders[0];
        const page = await driveService.getImagesFromFolderPage(latestDateFolder.id, undefined, 100);
        images = page.files;
        setDriveCache(images);
        setDrivePageToken(page.nextPageToken || null);
      }
      const start = nextDrivePage * 10;
      let end = start + 10;
      let workingImages = images.slice();
      // First, exhaust pages within the current latest folder
      if (workingImages.length < end && driveFolders.length > 0) {
        const currentFolder = driveFolders[driveFolderIndex] || driveFolders[0];
        while (drivePageToken && workingImages.length < end) {
          const page = await driveService.getImagesFromFolderPage(currentFolder.id, drivePageToken, 100);
          workingImages = workingImages.concat(page.files);
          setDrivePageToken(page.nextPageToken || null);
        }
      }
      // Then, move to older folders if still not enough
      while (workingImages.length < end && driveFolders.length > 0 && (driveFolderIndex + 1) < driveFolders.length) {
        const nextIdx = driveFolderIndex + 1;
        const nextFolder = driveFolders[nextIdx];
        const page = await driveService.getImagesFromFolderPage(nextFolder.id, undefined, 100);
        workingImages = workingImages.concat(page.files);
        setDriveFolderIndex(nextIdx);
        setDrivePageToken(page.nextPageToken || null);
      }
      // Update cache
      if (workingImages.length !== driveCache.length) {
        setDriveCache(workingImages);
      }
      const slice = workingImages.slice(start, end);
      // De-dup against already-rendered items (avoid repeating same Drive file)
      const existingIds = new Set((nextDrivePage === 0 ? [] : detectionHistory).map(it => String(it.id)));
      const mapped = await Promise.all(slice.map(async (img, idx) => {
        let dataUrl = null;
        try {
          // Render via data URL to avoid transient CORS/referrer issues with direct media URLs
          dataUrl = await driveService.getImageAsDataUrl({
            id: img.id,
            name: img.name,
            downloadUrl: driveService.buildDownloadUrl(img.id)
          });
        } catch (_) {
          // Fallback to proxy/direct URL
          dataUrl = driveService.buildDownloadUrl(img.id);
        }
        const computedId = `drive_${img.id}`;
        if (existingIds.has(computedId)) {
          return null; // skip duplicates already shown
        }
        return {
          id: computedId,
          historyId: computedId,
          camera: img.name?.toLowerCase().includes('_2.jpg') ? 2 : 1,
          originalImage: dataUrl,
          visualizationImage: null,
          detection: {
            disease: 'Unknown',
            confidence: 0,
            severity: 'None',
            detectedRegions: 0
          },
          timestamp: img.createdTime,
          driveUploadTime: img.createdTime,
          driveFileName: img.name
        };
      }))
      .then(list => list.filter(Boolean));
      if (nextDrivePage === 0 && !append) {
        setDetectionHistory(mapped);
      } else {
        setDetectionHistory(prev => [...prev, ...mapped]);
      }
      setDrivePage(nextDrivePage);
      const moreInWorking = end < workingImages.length;
      const canPageCurrentFolder = !!drivePageToken;
      const moreFoldersRemain = driveFolders.length > 0 && ((driveFolderIndex + 1) < driveFolders.length);
      setHasMore(moreInWorking || canPageCurrentFolder || moreFoldersRemain);

      // Background: run AI detection and persist to Supabase for these Drive items
      if (mapped.length > 0 && isModelLoaded && !modelError) {
        try {
          await detectAndPersistForDriveItems(mapped);
        } catch (e) {
          console.error('Background detection for Drive items failed:', e);
        }
      }
    } catch (err) {
      console.error('Drive fallback failed:', err);
      setIsDriveFallback(false);
    } finally {
      setIsLoadingPage(false);
    }
  };

  // Detect and persist visualization for Drive fallback items
  const detectAndPersistForDriveItems = async (items) => {
    const updates = [];
    for (const item of items) {
      try {
        // Skip if already visualized
        if (item.visualizationImage) continue;
        const imgEl = new Image();
        const result = await new Promise((resolve, reject) => {
          imgEl.onload = async () => {
            try {
              const det = await detectionService.predict(imgEl, true);
              resolve(det);
            } catch (e) { reject(e); }
          };
          imgEl.onerror = () => reject(new Error('Image load failed'));
          imgEl.crossOrigin = 'anonymous';
          imgEl.src = item.originalImage;
        });

        const updated = {
          ...item,
          visualizationImage: result.visualizationImage || item.originalImage,
          detection: result,
          timestamp: new Date().toISOString()
        };
        updates.push(updated);

        // Persist to Supabase for current user
        if (currentUser?.uid) {
          await analysisSupabaseService.uploadImagesAndSave(currentUser.uid, {
            originalImageDataUrl: item.originalImage,
            visualizationImageDataUrl: result.visualizationImage || item.originalImage,
            result: {
              disease: result.disease,
              confidence: result.confidence,
              severity: result.severity,
              detectedRegions: result.detectedRegions,
              modelType: 'AI (HF Space)'
            },
            context: 'live',
            camera: item.camera
          });
        }
      } catch (e) {
        // Keep showing original image even if detection fails
        console.warn('Detection failed for drive item', item.id, e?.message || e);
      }
    }
    if (updates.length > 0) {
      setDetectionHistory(prev => prev.map(it => {
        const u = updates.find(x => x.id === it.id);
        return u ? u : it;
      }));
    }
  };

  const saveToHistory = (results) => {
    try {
      const newHistoryItems = [];
      
      if (results.camera1) {
        newHistoryItems.push({
          ...results.camera1,
          historyId: `history_${results.camera1.id}_${Date.now()}`,
          driveUploadTime: results.camera1.imageData?.createdTime || results.camera1.timestamp,
          driveFileName: results.camera1.imageData?.name || `camera1_${Date.now()}.jpg`
        });
      }
      
      if (results.camera2) {
        newHistoryItems.push({
          ...results.camera2,
          historyId: `history_${results.camera2.id}_${Date.now() + 1}`,
          driveUploadTime: results.camera2.imageData?.createdTime || results.camera2.timestamp,
          driveFileName: results.camera2.imageData?.name || `camera2_${Date.now()}.jpg`
        });
      }
      
      const updatedHistory = [...newHistoryItems, ...detectionHistory];
      setDetectionHistory(updatedHistory);
      localStorage.setItem('liveDetectionHistory', JSON.stringify(updatedHistory));
      
      console.log('💾 Saved to history:', newHistoryItems.length, 'new items, total:', updatedHistory.length);
      
    } catch (error) {
      console.error('Failed to save detection history:', error);
    }
  };

  const deleteIndividualHistory = (historyId) => {
    const updatedHistory = detectionHistory.filter(item => 
      (item.historyId || item.id) !== historyId
    );
    setDetectionHistory(updatedHistory);
    localStorage.setItem('liveDetectionHistory', JSON.stringify(updatedHistory));
    console.log(`🗑️ Deleted history item: ${historyId}`);
  };

  const startAutoDetection = async () => {
    if (!isModelLoaded) {
      setError('AI model not loaded. Please check your internet and refresh the page.');
      return;
    }

    if (modelError) {
      setError('Cannot process: ' + modelError);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🚀 Starting Auto Detection through Camera...');
      
      const images = await driveService.getLatestCameraImages();
      
      if (!images.camera1 && !images.camera2) {
        throw new Error('No camera images found. Make sure ESP32-CAM is uploading images.');
      }
      
      let camera1Result = null;
      if (images.camera1) {
        console.log(`🔬 Processing Camera 1: ${images.camera1.name}`);
        camera1Result = await processImage(images.camera1, 1);
      }
      
      let camera2Result = null;
      if (images.camera2) {
        console.log(`🔬 Processing Camera 2: ${images.camera2.name}`);
        camera2Result = await processImage(images.camera2, 2);
      }
      
      const results = {
        camera1: camera1Result,
        camera2: camera2Result
      };
      
      
      setCameraResults(results);
      saveToHistory(results);
      // Persist each result to Supabase (Storage + Database)
      try {
        if (currentUser?.uid) {
          const tasks = [];
          if (camera1Result) {
            tasks.push(
              analysisSupabaseService.uploadImagesAndSave(currentUser.uid, {
                originalImageDataUrl: camera1Result.originalImage,
                visualizationImageDataUrl: camera1Result.visualizationImage,
                result: {
                  disease: camera1Result.detection?.disease,
                  confidence: camera1Result.detection?.confidence,
                  severity: camera1Result.detection?.severity,
                  detectedRegions: camera1Result.detection?.detectedRegions,
                  modelType: camera1Result.modelType
                },
                context: 'live',
                camera: 1
              })
            );
          }
          if (camera2Result) {
            tasks.push(
              analysisSupabaseService.uploadImagesAndSave(currentUser.uid, {
                originalImageDataUrl: camera2Result.originalImage,
                visualizationImageDataUrl: camera2Result.visualizationImage,
                result: {
                  disease: camera2Result.detection?.disease,
                  confidence: camera2Result.detection?.confidence,
                  severity: camera2Result.detection?.severity,
                  detectedRegions: camera2Result.detection?.detectedRegions,
                  modelType: camera2Result.modelType
                },
                context: 'live',
                camera: 2
              })
            );
          }
          await Promise.allSettled(tasks);
          // Refresh cloud history (reset to first page)
          loadCloudHistoryPage(currentUser.uid, 0);
        }
      } catch (persistErr) {
        console.error('Failed to persist live results to Supabase:', persistErr);
      }
      
      console.log('🎉 Auto detection completed successfully!');
      
    } catch (error) {
      console.error('❌ Auto detection failed:', error);
      setError(`Detection failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processImage = async (imageData, cameraNumber) => {
    const startTime = Date.now();
    
    try {
      console.log(`🤖 Running AI detection on Camera ${cameraNumber}...`);
      
      const imageDataUrl = await driveService.getImageAsDataUrl(imageData);
      const img = new Image();
      
      const detectionResult = await new Promise((resolve, reject) => {
        img.onload = async () => {
          try {
            console.log(`🔬 Image loaded, running AI prediction...`);
            const result = await detectionService.predict(img, true);
            resolve(result);
          } catch (error) {
            console.error('❌ AI prediction failed:', error);
            reject(error);
          }
        };
        
        img.onerror = () => reject(new Error('Image loading failed'));
        img.crossOrigin = 'anonymous';
        img.src = imageDataUrl;
      });

      const processingTime = Date.now() - startTime;
      
      const result = {
        id: `real_${imageData.id}_${Date.now()}`,
        camera: cameraNumber,
        imageName: imageData.name,
        imageData: imageData,
        originalImage: imageDataUrl,
        visualizationImage: detectionResult.visualizationImage || null,
        detection: detectionResult,
        timestamp: new Date().toISOString(),
        processingTime: processingTime,
        isRealDetectron2: false,
        modelType: 'AI (HF Space)',
        driveUploadTime: imageData.createdTime,
        driveFileName: imageData.name
      };
      
      console.log(`🎯 Camera ${cameraNumber} processed in ${processingTime}ms:`, {
        disease: detectionResult.disease,
        confidence: detectionResult.confidence,
        severity: detectionResult.severity,
        driveUploadTime: imageData.createdTime
      });
      
      return result;
      
    } catch (error) {
      console.error(`❌ Processing failed for Camera ${cameraNumber}:`, error);
      throw error;
    }
  };

  const clearCurrentResults = () => {
    setCameraResults({ camera1: null, camera2: null });
    setError(null);
    console.log('🧹 Cleared current results (history preserved)');
  };

  const clearHistory = () => {
    setDetectionHistory([]);
    localStorage.removeItem('liveDetectionHistory');
    console.log('🗑️ Cleared detection history');
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
      {/* Detection History only */}
      <Card elevation={2} style={{ backgroundColor: 'white', borderRadius: '12px' }}>
        <CardContent style={{ padding: '1.5rem' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" style={{ fontWeight: 600 }}>
              {t('recentAnalysisHistory')} ({detectionHistory.length})
            </Typography>
            
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
          
          {detectionHistory.length === 0 ? (
            <Box textAlign="center" py={3} style={{ backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <CameraIcon style={{ fontSize: '3rem', color: '#9ca3af', marginBottom: '1rem' }} />
              <Typography variant="h6" color="textSecondary" style={{ marginBottom: '0.5rem' }}>
                {t('noAIDetectionsYet')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {t('clickAutoDetect')}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {/* FIXED: Proper format with exactly 5 items per row */}
              {detectionHistory.map((result) => {
                const diseaseNames = getDiseaseDisplayName(result.detection.disease, language);
                
                return (
                  <Grid 
                    item 
                    xs={12}    // Full width on mobile
                    sm={6}     // 2 per row on small screens
                    md={2.4}   // 5 per row on medium+ screens (12/5 = 2.4)
                    key={result.historyId || result.id}
                  >
                    <Card 
                      elevation={1} 
                      style={{ 
                        transition: 'all 0.3s ease',
                        border: '1px solid #e5e7eb',
                        position: 'relative',
                        backgroundColor: 'white',
                        height: '350px' // Increased height to match Detection page format
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
                                // Fallback to original if visualization fails
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
                        
                        {/* Camera only (confidence moved up) */}
                        <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '0.25rem' }}>
                          {t('camera')} {result.camera}
                        </Typography>
                        
                        {/* Drive Upload Time - EXACT format from image */}
                        <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '0.25rem', fontStyle: 'italic' }}>
                          📸 {t('drive')}: {formatDriveUploadTime(result.driveUploadTime)}
                        </Typography>
                        
                        {/* Analysis Time - EXACT format from image */}
                        <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                          🤖 {t('analyzed')}: {formatDriveUploadTime(result.timestamp)}
                        </Typography>
                        
                        {/* Severity and Status Chips - Using translated severity labels */}
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

          {/* Show more pagination */}
          {detectionHistory.length > 0 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Button
                variant="outlined"
                onClick={() => {
                  if (isDriveFallback) {
                    loadDriveRecent(drivePage + 1);
                  } else {
                    // Switch to Drive-based pagination after first Supabase page
                    setIsDriveFallback(true);
                    loadDriveRecent(0, { append: true });
                  }
                }}
                disabled={!hasMore || isLoadingPage}
              >
                {isLoadingPage ? t('loading') || 'Loading...' : (hasMore ? (t('showMore') || 'Show more') : (t('noMore') || 'No more'))}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
