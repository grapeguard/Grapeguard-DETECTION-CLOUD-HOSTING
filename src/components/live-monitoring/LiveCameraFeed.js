/ Fixed LiveCameraFeed.js with Proper "Show More" and Visualization Storage
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
  const [supabasePage, setSupabasePage] = useState(0);
  const [supabaseHasMore, setSupabaseHasMore] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [isDriveFallback, setIsDriveFallback] = useState(false);
  
  // Drive pagination state
  const [driveCache, setDriveCache] = useState([]);
  const [driveFolders, setDriveFolders] = useState([]);
  const [driveFolderIndex, setDriveFolderIndex] = useState(0);
  const [drivePageToken, setDrivePageToken] = useState(null);
  const [driveHasMore, setDriveHasMore] = useState(false);
  const [processedDriveIds, setProcessedDriveIds] = useState(() => new Set());
  const [isBackgroundSaving, setIsBackgroundSaving] = useState(false);
  
  const DRIVE_BATCH_SIZE = 10;

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

  // Load Supabase history first, then Drive images
  const loadSupabaseHistoryPage = async (uid, page = 0) => {
    try {
      if (!uid) { 
        setDetectionHistory([]); 
        setSupabaseHasMore(false); 
        return; 
      }
      
      setIsLoadingPage(true);
      const { items, hasMore } = await analysisSupabaseService.listUserAnalysesPaged(uid, 10, page, { type: 'live' });
      
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
        timestamp: it.timestamp,
        source: 'supabase'
      }));
      
      if (page === 0) {
        setDetectionHistory(mapped);
        // Load processed Drive IDs
        if (processedDriveIds.size === 0) {
          try {
            const ids = await analysisSupabaseService.listProcessedDriveIds(uid);
            setProcessedDriveIds(new Set(ids));
          } catch (_) {}
        }
      } else {
        setDetectionHistory(prev => [...prev, ...mapped]);
      }
      
      setSupabaseHasMore(hasMore);
      setSupabasePage(page);
      
    } catch (e) {
      console.error('Failed to load Supabase live history:', e);
    } finally {
      setIsLoadingPage(false);
    }
  };

  useEffect(() => { 
    loadSupabaseHistoryPage(currentUser?.uid, 0); 
  }, [currentUser?.uid]);

  // Reset state when user changes
  useEffect(() => {
    setDriveCache([]);
    setDriveFolders([]);
    setDriveFolderIndex(0);
    setDrivePageToken(null);
    setDriveHasMore(false);
    setProcessedDriveIds(new Set());
    setDetectionHistory([]);
    setIsDriveFallback(false);
    setSupabasePage(0);
    setSupabaseHasMore(false);
  }, [currentUser?.uid]);

  // FIXED: Load Drive images with proper pagination
  const loadDriveImages = async (reset = false) => {
    try {
      setIsLoadingPage(true);
      
      let currentCache = reset ? [] : driveCache;
      let currentFolders = reset ? [] : driveFolders;
      let currentFolderIndex = reset ? 0 : driveFolderIndex;
      let currentPageToken = reset ? null : drivePageToken;
      
      // Initialize folders if needed
      if (currentFolders.length === 0) {
        const fetchedFolders = await driveService.getDateFolders();
        if (!fetchedFolders || fetchedFolders.length === 0) {
          setDriveHasMore(false);
          return;
        }
        currentFolders = fetchedFolders;
        setDriveFolders(currentFolders);
      }
      
      // Load more images until we have enough unprocessed ones
      const targetBatch = DRIVE_BATCH_SIZE;
      let unprocessedImages = [];
      
      while (unprocessedImages.length < targetBatch && currentFolderIndex < currentFolders.length) {
        const currentFolder = currentFolders[currentFolderIndex];
        
        // Get images from current folder
        const page = await driveService.getImagesFromFolderPage(
          currentFolder.id, 
          currentPageToken, 
          50
        );
        
        // Add new images to cache
        const newImages = page.files.filter(img => 
          !currentCache.some(cached => cached.id === img.id)
        );
        currentCache = [...currentCache, ...newImages];
        
        // Filter unprocessed images from the entire cache
        const unprocessedFromCache = currentCache.filter(img => !processedDriveIds.has(img.id));
        unprocessedImages = unprocessedFromCache.slice(0, targetBatch);
        
        // Update pagination state
        currentPageToken = page.nextPageToken;
        setDrivePageToken(currentPageToken);
        
        // Move to next folder if current folder is exhausted
        if (!currentPageToken) {
          currentFolderIndex++;
          setDriveFolderIndex(currentFolderIndex);
          currentPageToken = null;
        }
      }
      
      // Update cache
      setDriveCache(currentCache);
      
      // Check if there are more images available
      const hasMoreImages = currentPageToken || currentFolderIndex < currentFolders.length - 1;
      setDriveHasMore(hasMoreImages);
      
      if (unprocessedImages.length === 0) {
        return;
      }
      
      // Process batch
      const batchPrepared = await Promise.all(
        unprocessedImages.map(async (img) => {
          try {
            const dataUrl = await driveService.getImageAsDataUrl({
              id: img.id,
              name: img.name,
              downloadUrl: driveService.buildDownloadUrl(img.id)
            });
            
            return {
              id: `drive_${img.id}`,
              camera: img.name?.toLowerCase().includes('_2.jpg') ? 2 : 1,
              originalImage: dataUrl,
              driveUploadTime: img.createdTime,
              driveFileName: img.name,
              _driveId: img.id,
              detection: {
                disease: 'Processing...',
                confidence: 0,
                severity: 'Unknown',
                detectedRegions: 0
              },
              timestamp: new Date().toISOString(),
              source: 'drive'
            };
          } catch (_) {
            return null;
          }
        })
      );
      
      const validBatch = batchPrepared.filter(Boolean);
      
      if (validBatch.length > 0) {
        setDetectionHistory(prev => [...prev, ...validBatch]);
        
        // Process detections in background
        if (isModelLoaded && !modelError && currentUser?.uid) {
          setIsBackgroundSaving(true);
          await processAndSaveDriveImages(validBatch);
          
          // Mark as processed
          const newProcessedIds = new Set(processedDriveIds);
          validBatch.forEach(item => newProcessedIds.add(item._driveId));
          setProcessedDriveIds(newProcessedIds);
        }
      }
      
    } catch (error) {
      console.error('Failed to load Drive images:', error);
      setDriveHasMore(false);
    } finally {
      setIsLoadingPage(false);
      setIsBackgroundSaving(false);
    }
  };

  // FIXED: Process and save Drive images with visualization
  const processAndSaveDriveImages = async (driveItems) => {
    const tasks = driveItems.map(async (item) => {
      try {
        // Run AI detection
        const imgEl = new Image();
        const result = await new Promise((resolve, reject) => {
          imgEl.onload = async () => {
            try {
              const detection = await detectionService.predict(imgEl, true);
              resolve(detection);
            } catch (e) { 
              reject(e); 
            }
          };
          imgEl.onerror = () => reject(new Error('Image load failed'));
          imgEl.crossOrigin = 'anonymous';
          imgEl.src = item.originalImage;
        });

        // FIXED: Save both original and visualization images to Supabase
        const saved = await analysisSupabaseService.uploadImagesAndSave(currentUser.uid, {
          originalImageDataUrl: item.originalImage,
          visualizationImageDataUrl: result.visualizationImage || item.originalImage, // This was missing!
          result: {
            disease: result.disease,
            confidence: result.confidence,
            severity: result.severity,
            detectedRegions: result.detectedRegions,
            modelType: 'AI (HF Space)'
          },
          context: 'live',
          camera: item.camera,
          sourceMeta: {
            originDriveId: item._driveId,
            originDriveName: item.driveFileName,
            originCreatedTime: item.driveUploadTime
          }
        });

        // Update UI with detection results and Supabase URLs
        const updated = {
          ...item,
          id: `sb_${saved.id}`, // Use Supabase ID
          originalImage: saved.image_url || item.originalImage,
          visualizationImage: saved.visualizationImage || result.visualizationImage || item.originalImage,
          detection: result,
          timestamp: saved.createdAt || new Date().toISOString(),
          source: 'supabase'
        };

        // Update in history immediately
        setDetectionHistory(prev => 
          prev.map(histItem => 
            histItem.id === item.id ? updated : histItem
          )
        );

        return updated;
      } catch (e) {
        console.warn('Detection/save failed for drive item', item.id, e?.message || e);
        return null;
      }
    });

    await Promise.allSettled(tasks);
  };

  const saveToHistory = (results) => {
    try {
      const newHistoryItems = [];
      
      if (results.camera1) {
        newHistoryItems.push({
          ...results.camera1,
          historyId: `history_${results.camera1.id}_${Date.now()}`,
          driveUploadTime: results.camera1.imageData?.createdTime || results.camera1.timestamp,
          driveFileName: results.camera1.imageData?.name || `camera1_${Date.now()}.jpg`,
          source: 'live'
        });
      }
      
      if (results.camera2) {
        newHistoryItems.push({
          ...results.camera2,
          historyId: `history_${results.camera2.id}_${Date.now() + 1}`,
          driveUploadTime: results.camera2.imageData?.createdTime || results.camera2.timestamp,
          driveFileName: results.camera2.imageData?.name || `camera2_${Date.now()}.jpg`,
          source: 'live'
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
      
      // Persist each result to Supabase with BOTH original and visualization images
      try {
        if (currentUser?.uid) {
          const tasks = [];
          if (camera1Result) {
            tasks.push(
              analysisSupabaseService.uploadImagesAndSave(currentUser.uid, {
                originalImageDataUrl: camera1Result.originalImage,
                visualizationImageDataUrl: camera1Result.visualizationImage || camera1Result.originalImage,
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
                visualizationImageDataUrl: camera2Result.visualizationImage || camera2Result.originalImage,
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
          // Refresh history
          loadSupabaseHistoryPage(currentUser.uid, 0);
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

  // FIXED: Show More button logic
  const handleShowMore = async () => {
    if (!isDriveFallback && supabaseHasMore) {
      // Load more from Supabase
      await loadSupabaseHistoryPage(currentUser?.uid, supabasePage + 1);
    } else {
      // Switch to Drive mode or load more Drive images
      if (!isDriveFallback) {
        setIsDriveFallback(true);
      }
      await loadDriveImages(false);
    }
  };

  // Determine if "Show More" should be available
  const canShowMore = supabaseHasMore || driveHasMore || (!isDriveFallback && detectionHistory.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Detection History */}
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
                                {result.detection.disease === 'Processing...' ? 'Processing...' : t('analysisResult')}
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
                              backgroundColor: result.detection.disease === 'Processing...' ? 
                                'rgba(255, 165, 0, 0.9)' : 'rgba(139, 92, 246, 0.9)',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            <AIIcon style={{ fontSize: '0.75rem', marginRight: '0.25rem' }} />
                            {result.detection.disease === 'Processing...' ? 'Processing' : t('aiDetected')}
                          </Box>
                        </Box>
                        
                        {/* Disease name with inline confidence */}
                        <Typography variant="body2" style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{diseaseNames.primary}</span>
                          {result.detection.confidence > 0 && (
                            <span style={{ color: '#6b7280', fontWeight: 500 }}>
                              • {formatSensorValue(result.detection.confidence, 1)}% {t('confidence')}
                            </span>
                          )}
                        </Typography>
                        {diseaseNames.secondary && (
                          <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '0.25rem', fontStyle: 'italic' }}>
                            {diseaseNames.secondary}
                          </Typography>
                        )}
                        
                        {/* Camera info */}
                        <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '0.25rem' }}>
                          {t('camera')} {result.camera}
                        </Typography>
                        
                        {/* Drive Upload Time */}
                        <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '0.25rem', fontStyle: 'italic' }}>
                          📸 {t('drive')}: {formatDriveUploadTime(result.driveUploadTime)}
                        </Typography>
                        
                        {/* Analysis Time */}
                        <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                          🤖 {t('analyzed')}: {formatDriveUploadTime(result.timestamp)}
                        </Typography>
                        
                        {/* Severity and Status Chips */}
                        <Box display="flex" gap={0.5} flexWrap="wrap" style={{ marginTop: 'auto' }}>
                          {result.detection.severity !== 'Unknown' && (
                            <Chip
                              label={getSeverityLabel(result.detection.severity)}
                              size="small"
                              color={
                                result.detection.severity === 'High' ? 'error' :
                                result.detection.severity === 'Medium' ? 'warning' :
                                result.detection.severity === 'None' ? 'success' : 'default'
                              }
                            />
                          )}
                          {result.detection.detectedRegions > 0 && (
                            <Chip
                              label={`${formatSensorValue(result.detection.detectedRegions, 0)} ${t('regions')}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          <Chip
                            label={result.source === 'supabase' ? 'Stored' : 'Processing'}
                            size="small"
                            variant="outlined"
                            style={{ fontSize: '0.7rem' }}
                            color={result.source === 'supabase' ? 'success' : 'warning'}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {/* FIXED: Show More Button with proper logic */}
          {detectionHistory.length > 0 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Button
                variant="outlined"
                onClick={handleShowMore}
                disabled={!canShowMore || isLoadingPage}
                startIcon={isLoadingPage ? <CircularProgress size={16} /> : null}
              >
                {isLoadingPage ? (t('loading') || 'Loading...') : 
                 canShowMore ? (t('showMore') || 'Show More') : 
                 (t('noMore') || 'No More')}
              </Button>
              
              {/* Processing indicator */}
              {isBackgroundSaving && (
                <Box ml={2} display="flex" alignItems="center">
                  <CircularProgress size={16} />
                  <Typography variant="caption" style={{ marginLeft: '0.5rem' }}>
                    Processing images...
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Status indicators */}
          {isDriveFallback && (
            <Box mt={2} textAlign="center">
              <Typography variant="caption" color="textSecondary" style={{ fontStyle: 'italic' }}>
                📁 Loading from Drive archives • Processed: {processedDriveIds.size} images
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
