import { supabaseData, uploadImage, detectionService, liveMonitoringService } from './supabaseData';
import { v4 as uuidv4 } from 'uuid';

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

class AnalysisSupabaseService {
  async uploadImagesAndSave(firebaseUserId, options) {
    const {
      originalImageDataUrl, // string data URL
      visualizationImageDataUrl, // string data URL (optional)
      result, // detection result object
      context = 'manual', // 'manual' | 'live'
      camera = null,
    } = options;

    if (!firebaseUserId) {
      throw new Error('Missing firebaseUserId');
    }

    const analysisId = uuidv4();
    const folder = `analyses/${firebaseUserId}/${analysisId}`;

    // Upload images to Supabase Storage
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

      // Save to Supabase database
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
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
  }

  async listUserAnalyses(firebaseUserId, max = 20, options = {}) {
    if (!firebaseUserId) return [];
    
    try {
      // Query directly with user filter to ensure only user's data is returned
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
      
      // Map to AnalysisHistory card format
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

  // Live monitoring specific methods
  async saveLiveMonitoringImage(firebaseUserId, imageData) {
    const analysisId = uuidv4();
    const folder = `live-monitoring/${firebaseUserId}/${analysisId}`;

    // Upload images to Supabase Storage
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

      // Save to live monitoring table
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

  async getLatestLiveImages(firebaseUserId, limit = 10, cameraNumber = null) {
    try {
      const images = await liveMonitoringService.getLatestImages(firebaseUserId, limit, cameraNumber);
      
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
      return [];
    }
  }

  async getLatestImageByCamera(firebaseUserId, cameraNumber) {
    try {
      const image = await liveMonitoringService.getLatestImageByCamera(firebaseUserId, cameraNumber);
      
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
      return null;
    }
  }

  async getMoreLiveImages(firebaseUserId, offset = 0, limit = 10, cameraNumber = null) {
    try {
      const images = await liveMonitoringService.getMoreImages(firebaseUserId, offset, limit, cameraNumber);
      
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
      return [];
    }
  }
}

const analysisSupabaseService = new AnalysisSupabaseService();
export default analysisSupabaseService;
