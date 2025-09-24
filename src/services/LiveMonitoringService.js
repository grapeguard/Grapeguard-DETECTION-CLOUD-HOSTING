// Enhanced Live Monitoring Service for ESP32 → Drive → Supabase → Detection Flow
// src/services/LiveMonitoringService.js

import GoogleDriveService from './GoogleDriveService';
import DetectronDiseaseService from './DetectronDiseaseService';
import analysisSupabaseService from './AnalysisSupabaseService';

class LiveMonitoringService {
  constructor() {
    this.driveService = new GoogleDriveService();
    this.detectionService = new DetectronDiseaseService();
    this.processedImages = new Set(); // Track processed image IDs to avoid duplicates
    this.isProcessing = false;
    this.pollingInterval = null;
    this.BATCH_SIZE = 5; // Process 5 images at a time
    
    console.log('🚀 LiveMonitoringService initialized');
  }

  /**
   * Initialize the service and load AI model
   */
  async initialize() {
    try {
      console.log('🤖 Initializing Live Monitoring Service...');
      
      // Load AI detection model
      const modelLoaded = await this.detectionService.loadModel();
      if (!modelLoaded) {
        throw new Error('Failed to load AI detection model');
      }
      
      console.log('✅ Live Monitoring Service ready');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Live Monitoring Service:', error);
      return false;
    }
  }

  /**
   * Start automatic monitoring of ESP32 images
   * @param {string} userId - Firebase user ID
   * @param {number} intervalMs - Polling interval in milliseconds (default: 30 seconds)
   */
  startAutoMonitoring(userId, intervalMs = 30000) {
    if (this.pollingInterval) {
      this.stopAutoMonitoring();
    }

    console.log(`🔄 Starting auto monitoring for user ${userId} (interval: ${intervalMs}ms)`);
    
    // Process immediately
    this.processLatestImages(userId);
    
    // Set up polling
    this.pollingInterval = setInterval(() => {
      this.processLatestImages(userId);
    }, intervalMs);
  }

  /**
   * Stop automatic monitoring
   */
  stopAutoMonitoring() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('⏹️ Auto monitoring stopped');
    }
  }

  /**
   * Process latest images from ESP32 cameras
   * @param {string} userId - Firebase user ID
   * @param {number} batchSize - Number of images to process
   * @returns {Promise<Array>} Processed results
   */
  async processLatestImages(userId, batchSize = this.BATCH_SIZE) {
    if (this.isProcessing) {
      console.log('⏳ Already processing images, skipping...');
      return [];
    }

    this.isProcessing = true;
    const results = [];

    try {
      console.log(`🔍 Processing latest ${batchSize} images for user ${userId}...`);

      // Get latest images from Drive
      const latestImages = await this.getUnprocessedImages(userId, batchSize);
      
      if (latestImages.length === 0) {
        console.log('📭 No new images to process');
        return [];
      }

      console.log(`📸 Found ${latestImages.length} new images to process`);

      // Process images in parallel for better performance
      const processingPromises = latestImages.map(imageData => 
        this.processIndividualImage(userId, imageData)
      );

      const processedResults = await Promise.allSettled(processingPromises);
      
      // Collect successful results
      processedResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
          // Mark as processed
          this.processedImages.add(latestImages[index].id);
        } else {
          console.error(`❌ Failed to process image ${latestImages[index].name}:`, result.reason);
        }
      });

      console.log(`✅ Successfully processed ${results.length}/${latestImages.length} images`);
      return results;

    } catch (error) {
      console.error('❌ Error in processLatestImages:', error);
      return [];
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get unprocessed images from Drive
   * @param {string} userId - Firebase user ID
   * @param {number} limit - Maximum number of images to fetch
   * @returns {Promise<Array>} Array of image data
   */
  async getUnprocessedImages(userId, limit = this.BATCH_SIZE) {
    try {
      // Get processed image IDs from Supabase to avoid reprocessing
      if (this.processedImages.size === 0) {
        const processedIds = await analysisSupabaseService.listProcessedDriveIds(userId);
        processedIds.forEach(id => this.processedImages.add(id));
        console.log(`📋 Loaded ${processedIds.size} previously processed image IDs`);
      }

      // Get latest date folders from Drive
      const dateFolders = await this.driveService.getDateFolders();
      if (dateFolders.length === 0) {
        return [];
      }

      const unprocessedImages = [];
      
      // Search through date folders (newest first) until we have enough unprocessed images
      for (const folder of dateFolders) {
        if (unprocessedImages.length >= limit) break;

        const folderImages = await this.driveService.getImagesFromFolder(folder.id);
        
        // Filter out already processed images
        const newImages = folderImages.filter(img => 
          !this.processedImages.has(img.id) && 
          (img.name.toLowerCase().includes('_1.jpg') || img.name.toLowerCase().includes('_2.jpg'))
        );

        unprocessedImages.push(...newImages);
        
        // Sort by creation time (newest first) and limit
        unprocessedImages.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
        
        if (unprocessedImages.length > limit) {
          unprocessedImages.splice(limit);
        }
      }

      return unprocessedImages.slice(0, limit);

    } catch (error) {
      console.error('❌ Error getting unprocessed images:', error);
      return [];
    }
  }

  /**
   * Process individual image: Download → Upload to Supabase → Detect → Store
   * @param {string} userId - Firebase user ID
   * @param {Object} imageData - Drive image data
   * @returns {Promise<Object>} Processing result
   */
  async processIndividualImage(userId, imageData) {
    try {
      console.log(`🔬 Processing image: ${imageData.name}`);

      // Step 1: Download image from Drive as data URL
      const imageDataUrl = await this.driveService.getImageAsDataUrl(imageData);
      
      // Step 2: Run AI detection
      const img = new Image();
      const detectionResult = await new Promise((resolve, reject) => {
        img.onload = async () => {
          try {
            const result = await this.detectionService.predict(img, true);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Image loading failed'));
        img.crossOrigin = 'anonymous';
        img.src = imageDataUrl;
      });

      // Step 3: Determine camera number from filename
      const cameraNumber = imageData.name.toLowerCase().includes('_2.jpg') ? 2 : 1;

      // Step 4: Upload to Supabase and store detection result
      const savedResult = await analysisSupabaseService.uploadImagesAndSave(userId, {
        originalImageDataUrl: imageDataUrl,
        visualizationImageDataUrl: detectionResult.visualizationImage || imageDataUrl,
        result: {
          disease: detectionResult.disease,
          confidence: detectionResult.confidence,
          severity: detectionResult.severity,
          detectedRegions: detectionResult.detectedRegions || 0,
          modelType: 'AI (HF Space)'
        },
        context: 'live',
        camera: cameraNumber,
        sourceMeta: {
          originDriveId: imageData.id,
          originDriveName: imageData.name,
          originCreatedTime: imageData.createdTime
        }
      });

      // Step 5: Return formatted result for UI
      const result = {
        id: savedResult.id,
        historyId: `sb_${savedResult.id}`,
        camera: cameraNumber,
        originalImage: savedResult.image_url,
        visualizationImage: savedResult.visualizationImage,
        detection: {
          disease: detectionResult.disease,
          confidence: detectionResult.confidence,
          severity: detectionResult.severity,
          detectedRegions: detectionResult.detectedRegions || 0
        },
        timestamp: savedResult.createdAt || new Date().toISOString(),
        driveUploadTime: imageData.createdTime,
        driveFileName: imageData.name,
        modelType: 'AI (HF Space)'
      };

      console.log(`✅ Successfully processed ${imageData.name}: ${detectionResult.disease} (${detectionResult.confidence}%)`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to process image ${imageData.name}:`, error);
      throw error;
    }
  }

  /**
   * Get recent analysis results for Live Monitoring display
   * @param {string} userId - Firebase user ID
   * @param {number} limit - Number of results to fetch
   * @returns {Promise<Array>} Recent analysis results
   */
  async getRecentAnalysis(userId, limit = 5) {
    try {
      const { items } = await analysisSupabaseService.listUserAnalysesPaged(userId, limit, 0, { type: 'live' });
      
      return items.map(item => ({
        id: item.id,
        historyId: `sb_${item.id}`,
        camera: item.camera,
        originalImage: item.originalImage,
        visualizationImage: item.visualizationImage,
        detection: {
          disease: item.disease,
          confidence: item.confidence,
          severity: item.severity,
          detectedRegions: item.detectedRegions || 0
        },
        timestamp: item.timestamp,
        modelType: item.modelType || 'AI (HF Space)'
      }));
    } catch (error) {
      console.error('❌ Error getting recent analysis:', error);
      return [];
    }
  }

  /**
   * Process next batch of images (for "Show More" functionality)
   * @param {string} userId - Firebase user ID
   * @param {number} page - Page number (0-based)
   * @returns {Promise<Array>} Next batch of processed images
   */
  async processNextBatch(userId, page = 0) {
    console.log(`📄 Processing next batch (page ${page}) for user ${userId}...`);
    
    // Calculate offset based on page
    const offset = page * this.BATCH_SIZE;
    
    // Get next batch of unprocessed images
    const nextImages = await this.getUnprocessedImages(userId, this.BATCH_SIZE);
    
    if (nextImages.length === 0) {
      console.log('📭 No more images to process');
      return [];
    }

    // Process the batch
    return await this.processLatestImages(userId, nextImages.length);
  }

  /**
   * Check if service is currently processing
   * @returns {boolean} Processing status
   */
  isCurrentlyProcessing() {
    return this.isProcessing;
  }

  /**
   * Get processing statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      processedImagesCount: this.processedImages.size,
      isProcessing: this.isProcessing,
      isAutoMonitoring: !!this.pollingInterval
    };
  }

  /**
   * Reset processed images cache (useful for testing)
   */
  resetProcessedCache() {
    this.processedImages.clear();
    console.log('🔄 Processed images cache reset');
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopAutoMonitoring();
    this.processedImages.clear();
    console.log('🧹 LiveMonitoringService destroyed');
  }
}

// Create singleton instance
const liveMonitoringService = new LiveMonitoringService();
export default liveMonitoringService;
