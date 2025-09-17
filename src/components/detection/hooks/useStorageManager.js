// Fixed Storage Manager Hook - Store ACTUAL images for manual detection history
// src/components/detection/hooks/useStorageManager.js

import { useCallback } from 'react';

export const useStorageManager = (analysisHistory, setAnalysisHistory) => {
  
  const getStorageSize = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length;
      }
    }
    return total;
  };

  const isStorageQuotaExceeded = (dataToStore) => {
    const currentSize = getStorageSize();
    const newDataSize = JSON.stringify(dataToStore).length;
    const maxSize = 3 * 1024 * 1024; // REDUCED to 3MB to allow image storage
    
    return (currentSize + newDataSize) > maxSize;
  };

  // FIXED: Store ACTUAL images but compress them for storage
  const compressImage = (imageDataUrl) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      // Attempt to avoid taint when possible
      try { img.crossOrigin = 'anonymous'; } catch (_) {}
      
      img.onload = () => {
        // Compress to 300x300 for history preview
        const maxSize = 300;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 70% quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => resolve(null);
      img.src = imageDataUrl;
    });
  };

  const compressHistoryItem = async (item) => {
    // FIXED: Compress but KEEP the actual images for display
    const compressed = {
      id: item.id,
      disease: item.disease,
      confidence: item.confidence,
      severity: item.severity,
      marathi: item.marathi,
      timestamp: item.timestamp,
      detectedRegions: item.detectedRegions,
      healthyArea: item.healthyArea,
      modelType: item.modelInfo?.type || 'Unknown',
      detectionDetails: {
        processingTime: item.detectionDetails?.processingTime || 0,
        modelVersion: item.detectionDetails?.modelVersion || '1.0.0',
        totalDetections: item.detectionDetails?.totalDetections || 0
      }
    };

    try {
      // FIXED: Compress and store ACTUAL images
      if (item.visualizationImage) {
        compressed.visualizationImage = await compressImage(item.visualizationImage);
        compressed.hasVisualization = true;
      } else if (item.currentVisualization) {
        compressed.visualizationImage = await compressImage(item.currentVisualization);
        compressed.hasVisualization = true;
      }
      
      if (item.image) {
        compressed.originalImage = await compressImage(item.image);
      }
      
      // Store both for display priority
      if (compressed.visualizationImage) {
        compressed.currentVisualization = compressed.visualizationImage;
      }
      if (compressed.originalImage && !compressed.visualizationImage) {
        compressed.image = compressed.originalImage;
      }
      
    } catch (error) {
      console.error('Error compressing images:', error);
      // Fallback: mark as having visualization but don't store image
      compressed.hasVisualization = !!(item.visualizationImage || item.currentVisualization);
    }
    
    return compressed;
  };

  const saveToHistory = useCallback(async (newResult, selectedImage, modelInfo) => {
    try {
      console.log('💾 Saving to manual detection history with ACTUAL images...');
      console.log('📊 Result data:', newResult);
      console.log('🖼️ Selected image:', selectedImage ? 'Present' : 'Missing');
      console.log('🤖 Visualization:', newResult.visualizationImage ? 'Present' : 'Missing');
      
      const historyItem = {
        id: Date.now(),
        ...newResult,
        timestamp: new Date().toISOString(),
        image: selectedImage, // KEEP original uploaded image
        modelInfo: modelInfo,
        // FIXED: Ensure visualization is properly stored
        currentVisualization: newResult.visualizationImage || newResult.currentVisualization,
        hasVisualization: !!(newResult.visualizationImage || newResult.currentVisualization)
      };
      
      console.log('📝 History item before compression:', {
        id: historyItem.id,
        disease: historyItem.disease,
        hasOriginalImage: !!historyItem.image,
        hasVisualization: !!historyItem.currentVisualization,
        visualizationSize: historyItem.currentVisualization ? historyItem.currentVisualization.length : 0
      });
      
      // FIXED: Compress the item but KEEP actual images
      const compressedItem = await compressHistoryItem(historyItem);
      
      console.log('📦 Compressed item:', {
        id: compressedItem.id,
        disease: compressedItem.disease,
        hasOriginalImage: !!compressedItem.originalImage,
        hasVisualization: !!compressedItem.visualizationImage,
        compressedSize: compressedItem.visualizationImage ? compressedItem.visualizationImage.length : 0
      });
      
      // Add to beginning and keep last 8 items (reduced for storage)
      const updatedHistory = [compressedItem, ...analysisHistory].slice(0, 8);
      
      // Check storage quota
      if (isStorageQuotaExceeded(updatedHistory)) {
        console.warn('⚠️ Storage quota would be exceeded, keeping only 5 recent items');
        const reducedHistory = updatedHistory.slice(0, 5);
        setAnalysisHistory(reducedHistory);
        localStorage.setItem('diseaseAnalysisHistory', JSON.stringify(reducedHistory));
      } else {
        setAnalysisHistory(updatedHistory);
        localStorage.setItem('diseaseAnalysisHistory', JSON.stringify(updatedHistory));
      }
      
      console.log('✅ Successfully saved to manual detection history with actual images');
      
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('💾 Storage quota exceeded, clearing old history');
        
        // Create minimal item without images if storage is full
        const minimalItem = {
          id: Date.now(),
          disease: newResult.disease,
          confidence: newResult.confidence,
          severity: newResult.severity,
          timestamp: new Date().toISOString(),
          modelType: modelInfo?.type || 'Unknown',
          hasVisualization: false
        };
        
        setAnalysisHistory([minimalItem]);
        localStorage.setItem('diseaseAnalysisHistory', JSON.stringify([minimalItem]));
        
        alert('Storage full! Cleared old analysis history to save new result.');
      } else {
        console.error('Failed to save to history:', error);
      }
    }
  }, [analysisHistory, setAnalysisHistory]);

  return {
    saveToHistory,
    compressHistoryItem,
    getStorageSize,
    isStorageQuotaExceeded
  };
};
