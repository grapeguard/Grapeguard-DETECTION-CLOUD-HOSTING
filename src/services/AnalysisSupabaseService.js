// FIXED AnalysisSupabaseService.js - Handles RLS Context Properly
// src/services/AnalysisSupabaseService.js

import { supabaseData, uploadImage, detectionService, liveMonitoringService } from './supabaseData';
import { v4 as uuidv4 } from 'uuid';

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

class AnalysisSupabaseService {
  // FIXED: Helper method to set user context for RLS
  async setUserContext(firebaseUserId) {
    try {
      await supabaseData.rpc('set_claim', {
        claim: 'sub',
        value: firebaseUserId
      });
    } catch (error) {
      console.warn('Could not set user context:', error);
      // Continue without setting context - queries will still work with explicit filtering
    }
  }

  async uploadImagesAndSave(firebaseUserId, options) {
    const {
      originalImageDataUrl,
      visualizationImageDataUrl,
      result,
      context = 'manual',
      camera = null,
    } = options;

    if (!firebaseUserId) {
      throw new Error('Missing firebaseUserId');
    }

    const analysisId = uuidv4();
    const folder = `analyses/${firebaseUserId}/${analysisId}`;

    let originalUrl = null;
    let visUrl = null;

    try {
      if (originalImageDataUrl) {
        const originalBlob = await dataUrlToBlob(originalImageDataUrl);
        const originalFile = new File([originalBlob], 'original.jpg', { type: 'image/jpeg' });
        
        const originalUpload = await uploadImage(originalFile, 'grapeguard-images', folder);
        originalUrl = originalUpload.publicUrl;
      }

      if (visualizationImageDataUrl) {
        const visBlob = await dataUrlToBlob(visualizationImageDataUrl);
        const visFile = new File([visBlob], 'visualization.jpg', { type: 'image/jpeg' });
        
        const visUpload = await uploadImage(visFile, 'grapeguard-images', folder);
        visUrl = visUpload.publicUrl;
      }

      const detectionData = {
        type: context,
        image_url: originalUrl,
        image_path: `${folder}/original.jpg`,
        disease: result?.disease || null,
        confidence: result?.confidence || null,
        severity: result?.severity || null,
        detectedRegions: result?.detectedRegions || 0,
        healthyArea: result?.healthyArea || null,
        modelType: result?.modelType || 'AI (HF Space)',
        visualizationImage: visUrl,
        camera: camera
      };

      const savedDetection = await detectionService.createDetection(firebaseUserId, detectionData);

      return {
        id: savedDetection.id,
        analysisId: analysisId,
        ...detectionData,
        createdAt: savedDetection.created_at
      };

    } catch (error) {
      console.error('Supabase upload/save failed:', error);
      throw error;
    }
  }

  async listUserAnalyses(firebaseUserId, max = 20, options = {}) {
    if (!firebaseUserId) return [];
    
    try {
      // Set user context for RLS
      await this.setUserContext(firebaseUserId);

      let query = supabaseData
        .from('detections')
        .select('*')
        .eq('firebase_user_id', firebaseUserId)
        .order('created_at', { ascending: false })
        .limit(max);

      if (options.type) {
        query = query.eq('type', options.type);
      }

      const { data: detections, error } = await query;
      
      if (error) throw error;
      
      return (detections || []).map(detection => ({
        id: detection.id,
        disease: detection.disease_detected,
        confidence: detection.confidence_score,
        severity: detection.severity,
        timestamp: detection.created_at,
        visualizationImage: detection.visualization_image || null,
        originalImage: detection.image_url || null,
        modelType: detection.model_type || 'AI (HF Space)',
        type: detection.type,
        camera: detection.camera
      }));
    } catch (error) {
      console.error('Failed to list user analyses:', error);
      return [];
    }
  }

  async saveLiveMonitoringImage(firebaseUserId, imageData) {
    const analysisId = uuidv4();
    const folder = `live-monitoring/${firebaseUserId}/${analysisId}`;

    let originalUrl = null;
    let visUrl = null;

    try {
      if (imageData.originalImageDataUrl) {
        const originalBlob = await dataUrlToBlob(imageData.originalImageDataUrl);
        const originalFile = new File([originalBlob], 'original.jpg', { type: 'image/jpeg' });
        
        const originalUpload = await uploadImage(originalFile, 'grapeguard-images', folder);
        originalUrl = originalUpload.publicUrl;
      }

      if (imageData.visualizationImageDataUrl) {
        const visBlob = await dataUrlToBlob(imageData.visualizationImageDataUrl);
        const visFile = new File([visBlob], 'visualization.jpg', { type: 'image/jpeg' });
        
        const visUpload = await uploadImage(visFile, 'grapeguard-images', folder);
        visUrl = visUpload.publicUrl;
      }

      const liveImageData = {
        cameraNumber: imageData.cameraNumber,
        imageUrl: originalUrl,
        imagePath: `${folder}/original.jpg`,
        analysisResult: imageData.result,
        disease: imageData.result?.disease || null,
        confidence: imageData.result?.confidence || null,
        severity: imageData.result?.severity || null,
        detectedRegions: imageData.result?.detectedRegions || 0,
        modelType: imageData.result?.modelType || 'AI (HF Space)',
        visualizationImage: visUrl,
        driveFileName: imageData.driveFileName || null,
        driveUploadTime: imageData.driveUploadTime || null
      };

      const savedImage = await liveMonitoringService.saveLiveImage(firebaseUserId, liveImageData);

      return {
        id: savedImage.id,
        analysisId: analysisId,
        ...liveImageData,
        createdAt: savedImage.created_at
      };

    } catch (error) {
      console.error('Live monitoring image save failed:', error);
      throw error;
    }
  }

  // FIXED: Get latest live images with proper error handling
  async getLatestLiveImages(firebaseUserId, limit = 10, cameraNumber = null) {
    if (!firebaseUserId) {
      console.log('No firebaseUserId provided');
      return [];
    }

    try {
      console.log('AnalysisSupabaseService.getLatestLiveImages called:', { firebaseUserId, limit, cameraNumber });
      
      // Set user context for RLS
      await this.setUserContext(firebaseUserId);
      
      const images = await liveMonitoringService.getLatestImages(firebaseUserId, limit, cameraNumber);
      console.log('Retrieved images from service:', images);
      
      return images.map(image => ({
        id: image.id,
        camera: image.camera_number,
        originalImage: image.image_url,
        visualizationImage: image.visualization_image,
        detection: {
          disease: image.disease_detected,
          confidence: image.confidence_score,
          severity: image.severity,
          detectedRegions: image.detected_regions
        },
        timestamp: image.created_at,
        modelType: image.model_type,
        driveFileName: image.drive_file_name,
        driveUploadTime: image.drive_upload_time
      }));
    } catch (error) {
      console.error('Failed to get latest live images:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  // FIXED: Get latest image by camera with proper error handling
  async getLatestImageByCamera(firebaseUserId, cameraNumber) {
    if (!firebaseUserId) {
      console.log('No firebaseUserId provided');
      return null;
    }

    try {
      console.log('AnalysisSupabaseService.getLatestImageByCamera called:', { firebaseUserId, cameraNumber });
      
      // Set user context for RLS
      await this.setUserContext(firebaseUserId);
      
      const image = await liveMonitoringService.getLatestImageByCamera(firebaseUserId, cameraNumber);
      console.log('Retrieved camera image from service:', image);
      
      if (!image) return null;

      return {
        id: image.id,
        camera: image.camera_number,
        originalImage: image.image_url,
        visualizationImage: image.visualization_image,
        detection: {
          disease: image.disease_detected,
          confidence: image.confidence_score,
          severity: image.severity,
          detectedRegions: image.detected_regions
        },
        timestamp: image.created_at,
        modelType: image.model_type,
        driveFileName: image.drive_file_name,
        driveUploadTime: image.drive_upload_time
      };
    } catch (error) {
      console.error('Failed to get latest image by camera:', error);
      // Return null instead of throwing to prevent UI crashes
      return null;
    }
  }

  // FIXED: Get more live images with proper error handling
  async getMoreLiveImages(firebaseUserId, offset = 0, limit = 10, cameraNumber = null) {
    if (!firebaseUserId) {
      console.log('No firebaseUserId provided');
      return [];
    }

    try {
      console.log('AnalysisSupabaseService.getMoreLiveImages called:', { firebaseUserId, offset, limit, cameraNumber });
      
      // Set user context for RLS
      await this.setUserContext(firebaseUserId);
      
      const images = await liveMonitoringService.getMoreImages(firebaseUserId, offset, limit, cameraNumber);
      console.log('Retrieved more images from service:', images);
      
      return images.map(image => ({
        id: image.id,
        camera: image.camera_number,
        originalImage: image.image_url,
        visualizationImage: image.visualization_image,
        detection: {
          disease: image.disease_detected,
          confidence: image.confidence_score,
          severity: image.severity,
          detectedRegions: image.detected_regions
        },
        timestamp: image.created_at,
        modelType: image.model_type,
        driveFileName: image.drive_file_name,
        driveUploadTime: image.drive_upload_time
      }));
    } catch (error) {
      console.error('Failed to get more live images:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }
}

const analysisSupabaseService = new AnalysisSupabaseService();
export default analysisSupabaseService;
