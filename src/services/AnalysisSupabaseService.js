import { supabaseData, uploadImage, detectionService } from './supabaseData';
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

  async getLatestLivePerCamera(firebaseUserId) {
    if (!firebaseUserId) return { camera1: null, camera2: null };

    try {
      const [cam1, cam2] = await Promise.all([
        supabaseData
          .from('live_detections')
          .select('*')
          .eq('firebase_user_id', firebaseUserId)
          .eq('camera', 1)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseData
          .from('live_detections')
          .select('*')
          .eq('firebase_user_id', firebaseUserId)
          .eq('camera', 2)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      const mapLive = (row) => (!row || row.error || !row.data) ? null : {
        id: row.data.id,
        disease: row.data.disease_detected,
        confidence: row.data.confidence_score,
        severity: row.data.severity,
        timestamp: row.data.created_at,
        visualizationImage: row.data.visualization_url || null,
        originalImage: row.data.original_url || null,
        camera: row.data.camera,
        drive_created_at: row.data.drive_created_at,
        drive_file_id: row.data.drive_file_id
      };

      return {
        camera1: mapLive(cam1),
        camera2: mapLive(cam2)
      };
    } catch (error) {
      console.error('Failed to get latest live per camera:', error);
      return { camera1: null, camera2: null };
    }
  }

  async listLiveHistory(firebaseUserId, limit = 10, from = 0) {
    if (!firebaseUserId) return [];

    try {
      const to = from + limit - 1;
      const { data, error } = await supabaseData
        .from('live_detections')
        .select('*')
        .eq('firebase_user_id', firebaseUserId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return (data || []).map(detection => ({
        id: detection.id,
        disease: detection.disease_detected,
        confidence: detection.confidence_score,
        severity: detection.severity,
        timestamp: detection.created_at,
        visualizationImage: detection.visualization_url || null,
        originalImage: detection.original_url || null,
        camera: detection.camera,
        drive_created_at: detection.drive_created_at,
        drive_file_id: detection.drive_file_id
      }));
    } catch (error) {
      console.error('Failed to list live history:', error);
      return [];
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

  async listUserAnalysesByType(firebaseUserId, type = null, max = 20) {
    if (!firebaseUserId) return [];
    
    try {
      let query = supabaseData
        .from('detections')
        .select('*')
        .eq('firebase_user_id', firebaseUserId);

      if (type) {
        query = query.eq('type', type);
      }

      const { data: detections, error } = await query
        .order('created_at', { ascending: false })
        .limit(max);

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
      console.error('Failed to list user analyses by type:', error);
      return [];
    }
  }

  async listLiveDetections(firebaseUserId, max = 20) {
    if (!firebaseUserId) return [];
    
    try {
      const { data: liveDetections, error } = await supabaseData
        .from('live_detections')
        .select('*')
        .eq('firebase_user_id', firebaseUserId)
        .order('created_at', { ascending: false })
        .limit(max);

      if (error) throw error;
      
      // Map to LiveCameraFeed format
      return (liveDetections || []).map(detection => ({
        id: detection.id,
        disease: detection.disease_detected,
        confidence: detection.confidence_score,
        severity: detection.severity,
        timestamp: detection.created_at,
        visualizationImage: detection.visualization_url || null,
        originalImage: detection.original_url || null,
        camera: detection.camera,
        drive_created_at: detection.drive_created_at,
        drive_file_id: detection.drive_file_id
      }));
    } catch (error) {
      console.error('Failed to list live detections:', error);
      return [];
    }
  }
}

const analysisSupabaseService = new AnalysisSupabaseService();
export default analysisSupabaseService;
