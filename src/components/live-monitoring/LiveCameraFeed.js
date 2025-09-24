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
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { useTranslation } from '../../context/LanguageContext';
import GoogleDriveService from '../../services/GoogleDriveService';
import DetectronDiseaseService from '../../services/DetectronDiseaseService';
import EnhancedCameraCard from './EnhancedCameraCard';
import { useAuth } from '../../context/AuthContext';
import analysisSupabaseService from '../../services/AnalysisSupabaseService';
import liveMonitoringService from '../../services/LiveMonitoringService';

export default function LiveCameraFeed() {
  const [driveService] = useState(new GoogleDriveService());
  const [detectionService] = useState(new DetectronDiseaseService());
  const { t, language, formatSensorValue } = useTranslation();
  const { currentUser } = useAuth();
  
  // New state for automatic processing
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [autoMonitoringEnabled, setAutoMonitoringEnabled] = useState(false);
  const [lastProcessedTime, setLastProcessedTime] = useState(null);
  const [hasMoreDisplay, setHasMoreDisplay] = useState(true);
  
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
  const [isBackgroundSaving, setIsBackgroundSaving] = useState(false);
  const [processedDriveIds, setProcessedDriveIds] = useState(() => new Set());
  const DRIVE_BATCH_SIZE = 5;

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

  // Load AI model and initialize live monitoring service
  useEffect(() => {
    const initServices = async () => {
      try {
        console.log('🤖 Loading AI model and initializing services...');
        setModelError(null);
        
        // Initialize live monitoring service (includes model loading)
        const serviceReady = await liveMonitoringService.initialize();
        setIsModelLoaded(serviceReady);
        
        if (!serviceReady) {
          setModelError('AI service unavailable. Please check your internet and try again.');
          console.error('❌ Live monitoring service failed to initialize');
        } else {
          console.log('✅ Live monitoring service ready');
          // Start automatic processing when user enters live monitoring
          if (currentUser?.uid) {
            processLatestImagesAutomatically();
          }
        }
        
      } catch (error) {
        console.error('❌ Service initialization failed:', error);
        setModelError(`Service connection failed: ${error.message}`);
        setIsModelLoaded(false);
      }
    };

    initServices();
    // Cleanup on unmount
    return () => {
      try {
        liveMonitoringService.destroy();
      } catch (_) {}
    };
  }, [detectionService, currentUser?.uid]);

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

  // Reset Drive-related state when user switches to prevent cross-user mixing
  useEffect(() => {
    setDriveCache([]);
    setDriveFolders([]);
    setDriveFolderIndex(0);
    setDrivePageToken(null);
    setDrivePage(0);
    setProcessedDriveIds(new Set());
    setDetectionHistory([]);
    setIsDriveFallback(false);
  }, [currentUser?.uid]);

  // Automatic processing of latest ESP32 images when entering Live Monitoring
  const processLatestImagesAutomatically = async () => {
    if (!currentUser?.uid || isAutoProcessing) return;
    
    try {
      setIsAutoProcessing(true);
      setProcessingProgress(0);
      
      console.log('🚀 Starting automatic image processing...');
      
      // Process latest 5 images from ESP32 cameras
      const results = await liveMonitoringService.processLatestImages(currentUser.uid, 5);
      
      if (results.length > 0) {
        console.log(`✅ Processed ${results.length} new images`);
        // Refresh the display with new results
        await loadCloudHistoryPage(currentUser.uid, 0);
      } else {
        console.log('📭 No new images to process');
        // Load existing history if no new images
        await loadCloudHistoryPage(currentUser.uid, 0);
      }
      
      setProcessingProgress(100);
      setLastProcessedTime(new Date().toISOString());
      
    } catch (error) {
      console.error('❌ Automatic processing failed:', error);
      setError(`Automatic processing failed: ${error.message}`);
    } finally {
      setIsAutoProcessing(false);
      setTimeout(() => setProcessingProgress(0), 2000); // Reset progress after 2 seconds
    }
  };
  
  // Process images when component mounts and user is available
  useEffect(() => {
    if (currentUser?.uid && isModelLoaded && !isAutoProcessing) {
      processLatestImagesAutomatically();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, isModelLoaded]);

  // Check if more unprocessed images exist on Drive
  const probeHasMore = async () => {
    if (!currentUser?.uid) return;
    try {
      const next = await liveMonitoringService.getUnprocessedImages(currentUser.uid, 1);
      setHasMoreDisplay((next || []).length > 0);
    } catch (_) {
      setHasMoreDisplay(false);
    }
  };

  // When the model becomes ready, process any Drive placeholders lacking detections
  useEffect(() => {
    const runPendingDetections = async () => {
      if (!isModelLoaded || modelError) return;
      const pending = detectionHistory.filter(it => !it.visualizationImage && it.originalImage && String(it.id || '').startsWith('drive_'));
      if (pending.length > 0) {
        try {
          setIsBackgroundSaving(true);
          await detectAndPersistForDriveItems(pending);
        } catch (_) {
        } finally {
          setIsBackgroundSaving(false);
        }
      }
    };
    runPendingDetections();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModelLoaded, modelError]);

  // Drive fallback: load most recent images from latest date folder
  const loadDriveRecent = async (nextDrivePage = 0, options = {}) => {
    const { append = false } = options;
    try {
      setIsLoadingPage(true);
      setIsDriveFallback(true);
      let images = driveCache;
      // Use local copies to traverse folders within this call (React state updates are async)
      let localFolders = driveFolders;
      let localFolderIndex = driveFolderIndex;
      let localPageToken = drivePageToken;

      if (images.length === 0) {
        const fetchedFolders = await driveService.getDateFolders();
        if (!fetchedFolders || fetchedFolders.length === 0) { setDetectionHistory([]); setHasMore(false); return; }
        localFolders = fetchedFolders;
        localFolderIndex = 0;
        const latestDateFolder = localFolders[0];
        const page = await driveService.getImagesFromFolderPage(latestDateFolder.id, undefined, 100);
        images = page.files;
        localPageToken = page.nextPageToken || null;
        // Load processed IDs from Supabase once when entering Drive mode
        try {
          if (currentUser?.uid && processedDriveIds.size === 0) {
            const ids = await analysisSupabaseService.listProcessedDriveIds(currentUser.uid);
            setProcessedDriveIds(new Set(ids));
          }
        } catch (_) {}
      }
      // Accumulate images across folders until we have at least DRIVE_BATCH_SIZE unseen items
      let workingImages = images.slice();
      const seen = processedDriveIds;
      const countUnseen = (arr) => arr.reduce((acc, f) => acc + (seen.has(f.id) ? 0 : 1), 0);
      // First, exhaust pages within the current folder
      if (localFolders.length > 0) {
        const currentFolder = localFolders[localFolderIndex] || localFolders[0];
        while (localPageToken && countUnseen(workingImages) < DRIVE_BATCH_SIZE) {
          const page = await driveService.getImagesFromFolderPage(currentFolder.id, localPageToken, 100);
          workingImages = workingImages.concat(page.files);
          localPageToken = page.nextPageToken || null;
        }
      }
      // Then, move to older folders if still not enough
      while (countUnseen(workingImages) < DRIVE_BATCH_SIZE && localFolders.length > 0 && (localFolderIndex + 1) < localFolders.length) {
        const nextIdx = localFolderIndex + 1;
        const nextFolder = localFolders[nextIdx];
        const page = await driveService.getImagesFromFolderPage(nextFolder.id, undefined, 100);
        workingImages = workingImages.concat(page.files);
        localFolderIndex = nextIdx;
        localPageToken = page.nextPageToken || null;
      }
      // Update cache
      if (workingImages.length !== driveCache.length) {
        setDriveCache(workingImages);
      }
      // Persist traversal state back to React state
      if (localFolders !== driveFolders) setDriveFolders(localFolders);
      if (localFolderIndex !== driveFolderIndex) setDriveFolderIndex(localFolderIndex);
      if (localPageToken !== drivePageToken) setDrivePageToken(localPageToken);
      // Select next unseen batch of DRIVE_BATCH_SIZE
      const batch = [];
      for (const img of workingImages) {
        if (!seen.has(img.id)) batch.push(img);
        if (batch.length >= DRIVE_BATCH_SIZE) break;
      }
      const remainingAfterBatch = workingImages.filter(img => !seen.has(img.id)).length - batch.length;
      setHasMore(remainingAfterBatch > 0 || !!localPageToken || (localFolders.length > 0 && (localFolderIndex + 1) < localFolders.length));

      // If no new items found, nothing to do
      if (batch.length === 0) {
        setIsDriveFallback(false);
        if (currentUser?.uid) await loadCloudHistoryPage(currentUser.uid, 0);
        return;
      }

      // Download batch as data URLs
      const batchPrepared = (await Promise.all(batch.map(async (img) => {
        let dataUrl;
        try {
          dataUrl = await driveService.getImageAsDataUrl({ id: img.id, name: img.name, downloadUrl: driveService.buildDownloadUrl(img.id) });
        } catch (_) {
          // Skip items that cannot be fetched (404/private) to avoid broken images
          return null;
        }
        return {
          id: `drive_${img.id}`,
          camera: img.name?.toLowerCase().includes('_2.jpg') ? 2 : 1,
          originalImage: dataUrl,
          driveUploadTime: img.createdTime,
          driveFileName: img.name,
          _driveId: img.id,
          // Placeholder detection so UI can render immediately
          detection: {
            disease: 'Processing... ',
            confidence: 0,
            severity: 'Unknown',
            detectedRegions: 0
          },
          timestamp: new Date().toISOString(),
          _uid: currentUser?.uid || 'anon'
        };
      }))).filter(Boolean);

      // Immediately surface placeholders in UI so user sees latest 5 images
      if (batchPrepared.length > 0) {
        setDetectionHistory(prev => append ? [...prev, ...batchPrepared] : batchPrepared);
      }
      // Track page progression for Drive pagination UI
      setDrivePage(nextDrivePage);

      // Background: run AI detection and persist
      if (batchPrepared.length > 0 && isModelLoaded && !modelError) {
        try {
          setIsBackgroundSaving(true);
          await detectAndPersistForDriveItems(batchPrepared);
          // Mark processed
          const newSet = new Set(seen);
          batch.forEach(img => newSet.add(img.id));
          setProcessedDriveIds(newSet);
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
    // Process all items in parallel for speed; update UI incrementally
    const tasks = items.map(async (item) => {
      try {
        if (item.visualizationImage) return null;
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

        let storedOriginalUrl = null;
        let storedVisualizationUrl = null;
        if (currentUser?.uid) {
          try {
            const saved = await analysisSupabaseService.uploadImagesAndSave(currentUser.uid, {
              originalImageDataUrl: result.visualizationImage ? item.originalImage : item.originalImage,
              visualizationImageDataUrl: result.visualizationImage || item.originalImage,
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
            storedOriginalUrl = saved?.image_url || null;
            storedVisualizationUrl = saved?.visualizationImage || null;
          } catch (persistError) {
            console.error('[Supabase] Save failed for item', item.id, persistError);
          }
        }

        const updated = {
          ...item,
          originalImage: storedOriginalUrl || item.originalImage,
          visualizationImage: storedVisualizationUrl || result.visualizationImage || item.originalImage,
          detection: result,
          timestamp: new Date().toISOString()
        };

        // Update UI immediately for this item
        setDetectionHistory(prev => prev.map(it => (it.id === item.id ? updated : it)));
        return updated;
      } catch (e) {
        console.warn('Detection failed for drive item', item.id, e?.message || e);
        return null;
      }
    });

    const results = await Promise.allSettled(tasks);
    const anySaved = results.some(r => r.status === 'fulfilled' && r.value);
    if (anySaved && currentUser?.uid) {
      try {
        setIsDriveFallback(false);
        await loadCloudHistoryPage(currentUser.uid, 0);
      } catch (_) {}
    }
    setIsBackgroundSaving(false);
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
            <Box>
              <Typography variant="h6" style={{ fontWeight: 600 }}>
                {t('recentAnalysisHistory')} ({detectionHistory.length})
              </Typography>
              {lastProcessedTime && (
                <Typography variant="caption" color="textSecondary">
                  {t('lastProcessed') || 'Last processed'}: {formatDriveUploadTime(lastProcessedTime)}
                </Typography>
              )}
            </Box>
            <Box display="flex" gap={1} alignItems="center">
              <Button
                variant="outlined"
                size="small"
                onClick={async () => {
                  if (!currentUser?.uid) return;
                  try {
                    setIsLoadingPage(true);
                    const out = await liveMonitoringService.processStrictLatest(currentUser.uid, 5);
                    await loadCloudHistoryPage(currentUser.uid, 0);
                    setLastProcessedTime(new Date().toISOString());
                    await probeHasMore();
                  } catch (e) {
                    setError(e?.message || 'Failed to fetch latest');
                  } finally {
                    setIsLoadingPage(false);
                  }
                }}
              >
                {t('fetchLatest') || 'Fetch Latest (Newest 5)'}
              </Button>
              <Button
                variant={autoMonitoringEnabled ? 'contained' : 'outlined'}
                color={autoMonitoringEnabled ? 'primary' : 'inherit'}
                onClick={() => {
                  if (!currentUser?.uid) return;
                  if (!autoMonitoringEnabled) {
                    setAutoMonitoringEnabled(true);
                    // Start polling every 30s
                    liveMonitoringService.startAutoMonitoring(currentUser.uid, 30000);
                  } else {
                    setAutoMonitoringEnabled(false);
                    liveMonitoringService.stopAutoMonitoring();
                  }
                }}
                size="small"
              >
                {autoMonitoringEnabled ? (t('stopAuto') || 'Stop Auto') : (t('startAuto') || 'Start Auto')}
              </Button>
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
                        {/* Links to stored images when available (public Supabase URLs) */}
                        <Box display="flex" gap={0.5} width="100%" mt={0.5}>
                          {result.originalImage && result.originalImage.startsWith('http') && (
                            <Button href={result.originalImage} target="_blank" rel="noreferrer" size="small" endIcon={<OpenInNewIcon />}>
                              {t('original') || 'Original'}
                            </Button>
                          )}
                          {result.visualizationImage && result.visualizationImage.startsWith('http') && (
                            <Button href={result.visualizationImage} target="_blank" rel="noreferrer" size="small" endIcon={<OpenInNewIcon />}>
                              {t('visualization') || 'Visualization'}
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Fetch Latest button */}
        <Box textAlign="center" mt={2}>
          <Button
            variant="contained"
            onClick={async () => {
              if (currentUser?.uid) {
                try {
                  setIsLoadingPage(true);
                  const out = await liveMonitoringService.processStrictLatest(currentUser.uid, 5);
                  await loadCloudHistoryPage(currentUser.uid, 0);
                  setLastProcessedTime(new Date().toISOString());
                  await probeHasMore();
                } catch (e) {
                  setError(e?.message || 'Failed to fetch latest');
                } finally {
                  setIsLoadingPage(false);
                }
              }
            }}
          >
            {t('fetchLatest') || 'Fetch Latest (Newest 5)'}
          </Button>
        </Box>

        {/* Remove stray, duplicated Auto Processing Status fragment */}
        
        {/* Show more pagination with enhanced functionality */}
        {detectionHistory.length > 0 && (
          <Box display="flex" justifyContent="center" gap={2} mt={3}>
            <Button
                onClick={async () => {
                  if (currentUser?.uid) {
                    try {
                      setIsLoadingPage(true);
                      // Process next 5 images using the new service
                      const nextBatch = await liveMonitoringService.processNextBatch(currentUser.uid, drivePage + 1);
                      
                      if (nextBatch.length > 0) {
                        // Refresh the entire history to show new results
                        await loadCloudHistoryPage(currentUser.uid, 0);
                        setDrivePage(prev => prev + 1);
                        await probeHasMore();
                      } else {
                        // Fallback to old pagination method
                        if (isDriveFallback) {
                          loadDriveRecent(drivePage + 1);
                        } else {
                          setIsDriveFallback(true);
                          loadDriveRecent(0, { append: true });
                        }
                        // Also probe hasMore
                        await probeHasMore();
                      }
                    } catch (error) {
                      console.error('❌ Show more failed:', error);
                      setError(`Failed to load more images: ${error.message}`);
                    } finally {
                      setIsLoadingPage(false);
                    }
                  }
                }}
                disabled={isLoadingPage || isAutoProcessing || !hasMoreDisplay}
                startIcon={isLoadingPage ? <CircularProgress size={16} /> : null}
              >
                {isLoadingPage ? (t('processing') || 'Processing...') : (hasMoreDisplay ? (t('showMore') || 'Show More (Process Next 5)') : (t('noMore') || 'No more'))}
              </Button>
              
              <Button
                variant="text"
                onClick={() => {
                  if (currentUser?.uid) {
                    processLatestImagesAutomatically();
                  }
                }}
                disabled={isAutoProcessing || !isModelLoaded}
                startIcon={<RefreshIcon />}
                size="small"
              >
                {t('refresh') || 'Refresh'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
