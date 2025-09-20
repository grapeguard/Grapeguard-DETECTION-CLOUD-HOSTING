// Live Monitoring Service for managing live camera images and analysis results
// src/services/LiveMonitoringService.js

import { supabaseData, uploadImage } from './supabaseData';
import { v4 as uuidv4 } from 'uuid';

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

class LiveMonitoringService {
  // Save live monitoring image with analysis result
  async saveLiveImage(firebaseUserId, options) {
    const {
      originalImageDataUrl,
      visualizationImageDataUrl,
      analysisResult,
      cameraNumber,
      driveFileName,
      driveUploadTime
    } = options;

    if (!firebaseUserId) {
      throw new Error('Missing firebaseUserId');
    }

    const imageId = uuidv4();
    const folder = `live-monitoring/${firebaseUserId}/${imageId}`;

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

      // Save to live_monitoring_images table
      const { data, error } = await supabaseData
        .from('live_monitoring_images')
        .insert([{
          firebase_user_id: firebaseUserId,
          camera_number: cameraNumber,
          image_url: originalUrl,
          image_path: `${folder}/original.jpg`,
          analysis_result: analysisResult,
          disease_detected: analysisResult?.disease || null,
          confidence_score: analysisResult?.confidence || null,
          severity: analysisResult?.severity || null,
          detected_regions: analysisResult?.detectedRegions || 0,
          model_type: analysisResult?.modelType || 'AI (HF Space)',
          visualization_image: visUrl,
          drive_file_name: driveFileName,
          drive_upload_time: driveUploadTime,
          status: 'completed'
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        imageId: imageId,
        ...data,
        createdAt: data.created_at
      };

    } catch (error) {
      console.error('Live monitoring save failed:', error);
      throw error;
    }
  }

  // Get recent live monitoring images for a user
  async getRecentLiveImages(firebaseUserId, limit = 10, cameraNumber = null) {
    if (!firebaseUserId) return [];
    
    try {
      let query = supabaseData
        .from('live_monitoring_images')
        .select('*')
        .eq('firebase_user_id', firebaseUserId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (cameraNumber) {
        query = query.eq('camera_number', cameraNumber);
      }

      const { data: images, error } = await query;
      
      if (error) throw error;
      
      return (images || []).map(image => ({
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
        driveUploadTime: image.drive_upload_time,
        driveFileName: image.drive_file_name,
        modelType: image.model_type,
        type: 'live'
      }));
    } catch (error) {
      console.error('Failed to get recent live images:', error);
      return [];
    }
  }

  // Get latest image for each camera
  async getLatestCameraImages(firebaseUserId) {
    if (!firebaseUserId) return { camera1: null, camera2: null };
    
    try {
      const [camera1Result, camera2Result] = await Promise.all([
        this.getRecentLiveImages(firebaseUserId, 1, 1),
        this.getRecentLiveImages(firebaseUserId, 1, 2)
      ]);

      return {
        camera1: camera1Result[0] || null,
        camera2: camera2Result[0] || null
      };
    } catch (error) {
      console.error('Failed to get latest camera images:', error);
      return { camera1: null, camera2: null };
    }
  }

  // Get more live monitoring images (for SHOW MORE functionality)
  async getMoreLiveImages(firebaseUserId, offset = 0, limit = 10, cameraNumber = null) {
    if (!firebaseUserId) return [];
    
    try {
      let query = supabaseData
        .from('live_monitoring_images')
        .select('*')
        .eq('firebase_user_id', firebaseUserId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (cameraNumber) {
        query = query.eq('camera_number', cameraNumber);
      }

      const { data: images, error } = await query;
      
      if (error) throw error;
      
      return (images || []).map(image => ({
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
        driveUploadTime: image.drive_upload_time,
        driveFileName: image.drive_file_name,
        modelType: image.model_type,
        type: 'live'
      }));
    } catch (error) {
      console.error('Failed to get more live images:', error);
      return [];
    }
  }

  // Delete a live monitoring image
  async deleteLiveImage(firebaseUserId, imageId) {
    try {
      const { error } = await supabaseData
        .from('live_monitoring_images')
        .delete()
        .eq('id', imageId)
        .eq('firebase_user_id', firebaseUserId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to delete live image:', error);
      throw error;
    }
  }
}

const liveMonitoringService = new LiveMonitoringService();
export default liveMonitoringService;
