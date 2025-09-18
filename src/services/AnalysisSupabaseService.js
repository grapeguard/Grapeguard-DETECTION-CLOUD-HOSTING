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
      throw error;
    }
  }

  async listUserAnalyses(firebaseUserId, max = 20) {
    if (!firebaseUserId) return [];
    
    try {
      // Query directly with user filter to ensure only user's data is returned
      const { data: detections, error } = await supabaseData
        .from('detections')
        .select('*')
        .eq('firebase_user_id', firebaseUserId)
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
      console.error('Failed to list user analyses:', error);
      return [];
    }
  }
}

const analysisSupabaseService = new AnalysisSupabaseService();
export default analysisSupabaseService;
