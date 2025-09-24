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
      sourceMeta = null, // optional: { originDriveId, originDriveName, originCreatedTime }
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

      // Always upload a visualization image: if not produced by AI, reuse original
      const visualizationSource = visualizationImageDataUrl || originalImageDataUrl || null;
      if (visualizationSource) {
        const visBlob = await dataUrlToBlob(visualizationSource);
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
        camera: camera,
        // Persist origin metadata for Drive-based ingestion
        originDriveId: sourceMeta?.originDriveId || null,
        originDriveName: sourceMeta?.originDriveName || null,
        originCreatedTime: sourceMeta?.originCreatedTime || null
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

  // Paginated list with explicit range and count for "Show more"
  async listUserAnalysesPaged(firebaseUserId, pageSize = 10, page = 0, options = {}) {
    if (!firebaseUserId) return { items: [], hasMore: false };

    try {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabaseData
        .from('detections')
        .select('*', { count: 'exact' })
        .eq('firebase_user_id', firebaseUserId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (options.type) {
        query = query.eq('type', options.type);
      }

      const { data: detections, error, count } = await query;
      if (error) throw error;

      const items = (detections || []).map(detection => ({
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

      const hasMore = typeof count === 'number' ? (to + 1) < count : items.length === pageSize;
      return { items, hasMore, total: count ?? null };
    } catch (error) {
      console.error('Failed to list user analyses (paged):', error);
      return { items: [], hasMore: false };
    }
  }

  // Fetch processed Drive IDs stored in analysis_result JSON
  async listProcessedDriveIds(firebaseUserId, limit = 2000) {
    if (!firebaseUserId) return new Set();
    try {
      const { data, error } = await supabaseData
        .from('detections')
        .select('analysis_result')
        .eq('firebase_user_id', firebaseUserId)
        .eq('type', 'live')
        .not('analysis_result->>originDriveId', 'is', null)
        .limit(limit);
      if (error) throw error;
      const ids = new Set();
      (data || []).forEach(row => {
        const originId = row?.analysis_result?.originDriveId;
        if (originId) ids.add(originId);
      });
      return ids;
    } catch (e) {
      console.warn('Failed to fetch processed drive ids:', e?.message || e);
      return new Set();
    }
  }
}

const analysisSupabaseService = new AnalysisSupabaseService();
export default analysisSupabaseService;
