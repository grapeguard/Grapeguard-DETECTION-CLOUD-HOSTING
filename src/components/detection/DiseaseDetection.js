// COMPLETELY FIXED DiseaseDetection.js - Removed CQ.listLiveHistory Error
// src/components/detection/DiseaseDetection.js

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  LinearProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Videocam as LiveIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';
import DetectronDiseaseService from '../../services/DetectronDiseaseService';
import ImageUploadSection from './ImageUploadSection';
import ResultsSection from './ResultsSection';
import AnalysisHistory from './AnalysisHistory';
import LiveCameraFeed from '../live-monitoring/LiveCameraFeed';
import { useStorageManager } from './hooks/useStorageManager';
import { useAuth } from '../../context/AuthContext';
import analysisSupabaseService from '../../services/AnalysisSupabaseService';

export default function DiseaseDetection() {
  const location = useLocation();
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  
  // Support tab navigation from alerts
  const [activeTab, setActiveTab] = useState(() => {
    if (location.state?.tab !== undefined) {
      return location.state.tab; // 0 = Manual, 1 = Live
    }
    return 0; // Default to Manual Upload
  });
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  
  // Initialize analysis history from localStorage immediately and keep it persistent
  const [analysisHistory, setAnalysisHistory] = useState(() => {
    try {
      const savedHistory = localStorage.getItem('diseaseAnalysisHistory');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        console.log('📋 Loaded analysis history on init:', parsedHistory.length, 'items');
        return parsedHistory.slice(0, 10); // Limit to 10 items
      }
      return [];
    } catch (error) {
      console.error('Failed to load history on init:', error);
      localStorage.removeItem('diseaseAnalysisHistory');
      return [];
    }
  });
  
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [detectionService] = useState(new DetectronDiseaseService());
  const [modelInfo, setModelInfo] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [refreshingModel, setRefreshingModel] = useState(false);

  const { saveToHistory } = useStorageManager(analysisHistory, setAnalysisHistory);

  // FIXED: Load cloud history (Supabase) per user - REMOVED problematic CQ.listLiveHistory call
  const [cloudHistory, setCloudHistory] = useState([]);

  const loadCloudHistory = async (uid) => {
    try {
      if (!uid) { 
        setCloudHistory([]); 
        return; 
      }
      console.log('Loading cloud history for user:', uid);
      
      // FIXED: Using correct service method instead of non-existent CQ.listLiveHistory
      const items = await analysisSupabaseService.listUserAnalyses(uid, 10);
      console.log('Loaded cloud history items:', items.length);
      setCloudHistory(items);
    } catch (e) {
      console.error('Failed to load Supabase history:', e);
      // Don't crash the app, just log the error
      setCloudHistory([]);
    }
  };

  // FIXED: Proper useEffect with correct dependency
  useEffect(() => {
    if (currentUser?.uid) {
      loadCloudHistory(currentUser.uid);
    } else {
      setCloudHistory([]);
    }
  }, [currentUser?.uid]);

  // Load AI model on component mount
  useEffect(() => {
    const initializeModel = async () => {
      console.log('🔄 Initializing AI service (HF Space)...');
      setAnalysisProgress(10);
      setModelError(null);
      
      try {
        const loaded = await detectionService.loadModel();
        setModelLoaded(loaded);
        setAnalysisProgress(100);
        
        if (loaded) {
          const info = detectionService.getModelInfo();
          setModelInfo(info);
          console.log('✅ Detection service ready:', info);
          setModelError(null);
        } else {
          setModelError('AI service unavailable. Please check your internet and try again.');
          console.error('❌ AI model failed to load');
        }
      } catch (error) {
        console.error('❌ Model initialization failed:', error);
        setModelError(`Service connection failed: ${error.message}`);
        setModelLoaded(false);
      }
      
      setTimeout(() => setAnalysisProgress(0), 1000);
    };

    initializeModel();
  }, [detectionService]);

  const refreshModel = async () => {
    setRefreshingModel(true);
    setAnalysisProgress(0);
    setModelError(null);
    
    try {
      setAnalysisProgress(30);
      const loaded = await detectionService.loadModel();
      setModelLoaded(loaded);
      
      if (loaded) {
        const info = detectionService.getModelInfo();
        setModelInfo(info);
        setAnalysisProgress(100);
        setModelError(null);
        console.log('✅ Model refreshed successfully');
      } else {
        setModelError('AI service unavailable. Please check your internet and try again.');
        console.error('❌ Model refresh failed');
      }
    } catch (error) {
      console.error('Model refresh failed:', error);
      setModelError(`Service connection failed: ${error.message}`);
      setModelLoaded(false);
    } finally {
      setRefreshingModel(false);
      setTimeout(() => setAnalysisProgress(0), 1000);
    }
  };

  // Enhanced AI analysis - only if model is loaded
  const runAnalysis = async () => {
    if (!selectedImage) return;
    
    // Block analysis if model not loaded
    if (!modelLoaded || modelError) {
      setResults({
        disease: t('modelNotAvailable'),
        confidence: 0,
        severity: "Error",
        marathi: "मॉडेल उपलब्ध नाही",
        recommendations: [
          "Check your internet connection",
          "Refresh the model status",
          "Try again in a few minutes",
          "Contact support if problem persists"
        ],
        detectedRegions: 0,
        healthyArea: 0,
        visualizationImage: null,
        detectionDetails: {
          error: modelError || "Model not loaded",
          modelInfo: null
        }
      });
      return;
    }
    
    setAnalyzing(true);
    setAnalysisProgress(0);
    
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const analysisPromise = new Promise((resolve, reject) => {
        img.onload = async () => {
          try {
            console.log('🤖 Running AI disease analysis...');
            
            setAnalysisProgress(20);
            await new Promise(resolve => setTimeout(resolve, 800));
            
            setAnalysisProgress(40);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setAnalysisProgress(60);
            const result = await detectionService.predict(img, true);
            
            setAnalysisProgress(90);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            setAnalysisProgress(100);
            resolve(result);
          } catch (error) {
            console.error('Analysis failed:', error);
            reject(error);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
      });
      
      img.src = selectedImage;
      const result = await analysisPromise;
      
      const finalResult = {
        ...result,
        currentImage: selectedImage,
        currentVisualization: result.visualizationImage
      };
      
      setResults(finalResult);
      saveToHistory(result, selectedImage, modelInfo);

      // Save to Supabase (Storage + Database) for the logged-in user
      try {
        if (currentUser?.uid) {
          await analysisSupabaseService.uploadImagesAndSave(currentUser.uid, {
            originalImageDataUrl: selectedImage,
            visualizationImageDataUrl: result.visualizationImage || null,
            result: finalResult,
            context: 'manual'
          });
          // Refresh cloud history after save
          loadCloudHistory(currentUser.uid);
        }
      } catch (persistErr) {
        console.error('Failed to persist analysis to Supabase:', persistErr);
      }
      
    } catch (error) {
      console.error('Analysis failed:', error);
      
      const errorResult = {
        disease: t('analysisError'),
        confidence: 0,
        severity: "Unknown",
        marathi: "विश्लेषण त्रुटी",
        recommendations: [
          "Please try again with a different image",
          "Ensure good lighting and clear focus",
          "Check your internet connection",
          "Contact support if problem persists"
        ],
        detectedRegions: 0,
        healthyArea: 0,
        visualizationImage: null,
        detectionDetails: {
          error: error.message,
          modelInfo: modelInfo
        }
      };
      setResults(errorResult);
      saveToHistory(errorResult, selectedImage, modelInfo);
      try {
        if (currentUser?.uid) {
          await analysisSupabaseService.uploadImagesAndSave(currentUser.uid, {
            originalImageDataUrl: selectedImage,
            visualizationImageDataUrl: null,
            result: errorResult,
            context: 'manual'
          });
          loadCloudHistory(currentUser.uid);
        }
      } catch (_) {}
    } finally {
      setAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const handleImageUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image too large! Please use an image smaller than 5MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target.result);
        setResults(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === 1) {
      setSelectedImage(null);
      setResults(null);
    }
  };

  return (
    <div style={{ padding: '0', backgroundColor: '#f8fafc' }}>
      {/* Mode Selection Tabs + Model Status - Combined in One Row */}
      <Card elevation={2} style={{ backgroundColor: 'white', borderRadius: '12px', marginBottom: '2rem' }}>
        <CardContent style={{ padding: '1rem' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {/* Left Side - Mode Tabs */}
            <Box flex={1}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                indicatorColor="primary"
                style={{ marginBottom: '0.5rem' }}
              >
                <Tab 
                  label={t('manualUpload')}
                  icon={<UploadIcon />}
                  style={{ textTransform: 'none', fontWeight: 600 }}
                />
                <Tab 
                  label={t('liveCameraMonitoring')}
                  icon={<LiveIcon />}
                  style={{ textTransform: 'none', fontWeight: 600 }}
                />
              </Tabs>
              
              <Typography variant="body2" color="textSecondary">
                {activeTab === 0 
                  ? t('manualUploadDescription')
                  : t('liveCameraDescription')
                }
              </Typography>
            </Box>

            {/* Right Side - Compact Model Status */}
            <Box display="flex" alignItems="center" gap={2} style={{ minWidth: '300px', justifyContent: 'flex-end' }}>
              <Box display="flex" alignItems="center" gap={1}>
                {modelLoaded ? (
                  <CheckCircleIcon style={{ color: '#22c55e' }} />
                ) : (
                  <ErrorIcon style={{ color: '#ef4444' }} />
                )}
                
                <Box>
                  <Typography variant="body2" style={{ fontWeight: 600, color: '#1f2937' }}>
                    {modelLoaded ? 'Detectron2 Model' : (modelInfo?.type || t('detectronModel'))}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {modelLoaded ? 'Ready for Detection' : t('aiModelLoading')}
                  </Typography>
                </Box>
              </Box>
              
              <Button
                size="small"
                onClick={refreshModel}
                disabled={refreshingModel}
                startIcon={refreshingModel ? <CircularProgress size={16} /> : <RefreshIcon />}
                style={{ 
                  color: '#6b7280',
                  borderColor: '#6b7280',
                  minWidth: 'auto',
                  padding: '0.5rem'
                }}
                variant="outlined"
              >
                {refreshingModel ? '' : t('refreshModel')}
              </Button>
            </Box>
          </Box>

          {/* Progress Bar */}
          {analysisProgress > 0 && (
            <Box mt={1.5}>
              <LinearProgress 
                variant="determinate" 
                value={analysisProgress} 
                style={{ height: '4px', borderRadius: '2px' }}
              />
              <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginTop: '0.25rem' }}>
                {refreshingModel ? t('refreshingModel') : t('processing')}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Model Error Alert */}
      {modelError && (
        <Alert 
          severity="error" 
          style={{ 
            backgroundColor: '#fef2f2', 
            border: '1px solid #fca5a5',
            marginBottom: '2rem'
          }}
        >
          <Typography variant="body2">
            <strong>{t('detectronServerError')}:</strong> {modelError}
          </Typography>
          <Typography variant="body2" style={{ marginTop: '0.5rem' }}>
            Please check your internet connection and try again.
          </Typography>
        </Alert>
      )}

      {/* Tab Content */}
      {activeTab === 0 ? (
        <>
          {/* Manual Upload Mode */}
          <Box sx={{ display: 'flex', gap: 3, marginBottom: '2rem', height: '700px' }}>
            <ImageUploadSection 
              selectedImage={selectedImage}
              onImageUpload={handleImageUpload}
              onImageClear={() => setSelectedImage(null)}
              onRunAnalysis={runAnalysis}
              analyzing={analyzing}
              modelLoaded={modelLoaded}
              results={results}
              modelError={modelError}
            />

            <ResultsSection 
              selectedImage={selectedImage}
              analyzing={analyzing}
              results={results}
              modelInfo={modelInfo}
              showVisualization={true}
              modelError={modelError}
            />
          </Box>

          {/* Show per-user cloud history from Supabase */}
          <AnalysisHistory 
            analysisHistory={cloudHistory}
            setAnalysisHistory={setCloudHistory}
            autoLoadFromCloud={false}
          />
        </>
      ) : (
        <>
          {/* Live Monitoring Mode */}
          <LiveCameraFeed />
        </>
      )}
    </div>
  );
}
