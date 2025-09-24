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
      // ALWAYS upload original image
      if (originalImageDataUrl) {
        const originalBlob = await dataUrlToBlob(originalImageDataUrl);
        const originalFile = new File([originalBlob], 'original.jpg', { type: 'image/jpeg' });
        
        const originalUpload = await uploadImage(originalFile, 'grapeguard-images', folder);
        originalUrl = originalUpload.publicUrl;
      }

      // FIXED: Always upload visualization image - use provided one or fallback to original
      const visualizationSource = visualizationImageDataUrl || originalImageDataUrl || null;
      if (visualizationSource) {
        const visBlob = await dataUrlToBlob(visualizationSource);
        const visFile = new File([visBlob], 'visualization.jpg', { type: 'image/jpeg' });
        const visUpload = await uploadImage(visFile, 'grapeguard-images', folder);
        visUrl = visUpload.publicUrl;
      }

      // FIXED: Save to Supabase database with proper field mapping
      const detectionData = {
        type: context,
        image_url: originalUrl,
        image_path: `${folder}/original.jpg`,
        disease_detected: result?.disease || null, // FIXED: Use correct column name
        confidence_score: result?.confidence || null, // FIXED: Use correct column name
        severity: result?.severity || null,
        detected_regions: result?.detectedRegions || 0, // FIXED: Use snake_case
        healthy_area: result?.healthyArea || null, // FIXED: Use snake_case
        model_type: result?.modelType || 'AI (HF Space)', // FIXED: Use snake_case
        visualization_image: visUrl, // FIXED: Store visualization image URL
        camera: camera,
        // FIXED: Store origin metadata properly
        analysis_result: {
          originDriveId: sourceMeta?.originDriveId || null,
          originDriveName: sourceMeta?.originDriveName || null,
          originCreatedTime: sourceMeta?.originCreatedTime || null,
          // Store full result for future reference
          ...result
        }
      };

      const savedDetection = await detectionService.createDetection(firebaseUserId, detectionData);

      return {
        id: savedDetection.id,
        analysisId: analysisId,
        image_url: originalUrl,
        visualizationImage: visUrl, // Return the visualization URL
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
      
      // FIXED: Map with proper field names and include visualization image
      return (detections || []).map(detection => ({
        id: detection.id,
        disease: detection.disease_detected, // FIXED: Use correct column name
        confidence: detection.confidence_score, // FIXED: Use correct column name
        severity: detection.severity,
        detectedRegions: detection.detected_regions, // FIXED: Use snake_case
        timestamp: detection.created_at,
        visualizationImage: detection.visualization_image || null, // FIXED: Include visualization
        originalImage: detection.image_url || null,
        modelType: detection.model_type || 'AI (HF Space)', // FIXED: Use snake_case
        type: detection.type,
        camera: detection.camera
      }));
    } catch (error) {
      console.error('Failed to list user analyses:', error);
      return [];
    }
  }

  // FIXED: Paginated list with proper field mapping
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

      // FIXED: Map with correct field names and include visualization image
      const items = (detections || []).map(detection => ({
        id: detection.id,
        disease: detection.disease_detected, // FIXED: Use correct column name
        confidence: detection.confidence_score, // FIXED: Use correct column name
        severity: detection.severity,
        detectedRegions: detection.detected_regions || 0, // FIXED: Use snake_case
        timestamp: detection.created_at,
        visualizationImage: detection.visualization_image || null, // FIXED: Include visualization
        originalImage: detection.image_url || null,
        modelType: detection.model_type || 'AI (HF Space)', // FIXED: Use snake_case
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

  // FIXED: Fetch processed Drive IDs from analysis_result JSON
  async listProcessedDriveIds(firebaseUserId, limit = 2000) {
    if (!firebaseUserId) return new Set();
    try {
      const { data, error } = await supabaseData
        .from('detections')
        .select('analysis_result')
        .eq('firebase_user_id', firebaseUserId)
        .eq('type', 'live')
        .not('analysis_result->originDriveId', 'is', null) // FIXED: Use -> for JSON access
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
