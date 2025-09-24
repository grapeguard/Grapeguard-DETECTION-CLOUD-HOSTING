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

    console.log('🔄 Starting upload process:', {
      analysisId,
      hasOriginal: !!originalImageDataUrl,
      hasVisualization: !!visualizationImageDataUrl,
      context,
      camera
    });

    // Upload images to Supabase Storage
    let originalUrl = null;
    let visUrl = null;

    try {
      // ALWAYS upload original image
      if (originalImageDataUrl) {
        console.log('📤 Uploading original image...');
        const originalBlob = await dataUrlToBlob(originalImageDataUrl);
        const originalFile = new File([originalBlob], 'original.jpg', { type: 'image/jpeg' });
        
        const originalUpload = await uploadImage(originalFile, 'grapeguard-images', folder);
        originalUrl = originalUpload.publicUrl;
        console.log('✅ Original image uploaded:', originalUrl?.substring(0, 50) + '...');
      }

      // FIXED: Always upload visualization image - use provided one or fallback to original
      const visualizationSource = visualizationImageDataUrl || originalImageDataUrl;
      if (visualizationSource) {
        console.log('📤 Uploading visualization image...');
        const visBlob = await dataUrlToBlob(visualizationSource);
        const visFile = new File([visBlob], 'visualization.jpg', { type: 'image/jpeg' });
        const visUpload = await uploadImage(visFile, 'grapeguard-images', folder);
        visUrl = visUpload.publicUrl;
        console.log('✅ Visualization image uploaded:', visUrl?.substring(0, 50) + '...');
      }

      // FIXED: Save to Supabase database with proper field mapping
      const detectionData = {
        type: context,
        image_url: originalUrl,
        image_path: `${folder}/original.jpg`,
        disease_detected: result?.disease || null,
        confidence_score: result?.confidence || null,
        severity: result?.severity || null,
        detected_regions: result?.detectedRegions || 0,
        healthy_area: result?.healthyArea || null,
        model_type: result?.modelType || 'AI (HF Space)',
        visualization_image: visUrl, // FIXED: Store visualization image URL properly
        camera: camera,
        // FIXED: Store origin metadata properly in JSON field
        analysis_result: {
          originDriveId: sourceMeta?.originDriveId || null,
          originDriveName: sourceMeta?.originDriveName || null,
          originCreatedTime: sourceMeta?.originCreatedTime || null,
          // Store full result for future reference
          fullDetectionResult: result
        }
      };

      console.log('💾 Saving to database:', {
        hasOriginalUrl: !!detectionData.image_url,
        hasVisualizationUrl: !!detectionData.visualization_image,
        disease: detectionData.disease_detected,
        confidence: detectionData.confidence_score
      });

      const savedDetection = await detectionService.createDetection(firebaseUserId, detectionData);

      console.log('✅ Saved to database:', {
        id: savedDetection.id,
        hasVisualizationInResponse: !!visUrl
      });

      return {
        id: savedDetection.id,
        analysisId: analysisId,
        image_url: originalUrl,
        visualizationImage: visUrl, // CRITICAL: Return the visualization URL
        ...detectionData,
        createdAt: savedDetection.created_at
      };

    } catch (error) {
      console.error('❌ Supabase upload/save failed:', error);
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
      console.log('📋 Fetching user analyses:', { userId: firebaseUserId, max, options });
      
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
      
      console.log('📋 Raw detections from DB:', detections?.length || 0);
      
      // FIXED: Map with proper field names and include visualization image
      const mapped = (detections || []).map(detection => {
        const mapped = {
          id: detection.id,
          disease: detection.disease_detected,
          confidence: detection.confidence_score,
          severity: detection.severity,
          detectedRegions: detection.detected_regions || 0,
          timestamp: detection.created_at,
          visualizationImage: detection.visualization_image || null, // CRITICAL: Include visualization
          originalImage: detection.image_url || null,
          modelType: detection.model_type || 'AI (HF Space)',
          type: detection.type,
          camera: detection.camera
        };
        
        console.log(`Item ${mapped.id}:`, {
          hasOriginal: !!mapped.originalImage,
          hasVisualization: !!mapped.visualizationImage,
          disease: mapped.disease
        });
        
        return mapped;
      });
      
      return mapped;
    } catch (error) {
      console.error('❌ Failed to list user analyses:', error);
      return [];
    }
  }

  // FIXED: Paginated list with proper field mapping and enhanced logging
  async listUserAnalysesPaged(firebaseUserId, pageSize = 10, page = 0, options = {}) {
    if (!firebaseUserId) return { items: [], hasMore: false };

    try {
      console.log('📄 Fetching paged analyses:', { 
        userId: firebaseUserId, 
        pageSize, 
        page, 
        options 
      });
      
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

      console.log('📄 Paged query result:', {
        itemCount: detections?.length || 0,
        totalCount: count,
        from,
        to
      });

      // FIXED: Map with correct field names and include visualization image
      const items = (detections || []).map(detection => {
        const mapped = {
          id: detection.id,
          disease: detection.disease_detected,
          confidence: detection.confidence_score,
          severity: detection.severity,
          detectedRegions: detection.detected_regions || 0,
          timestamp: detection.created_at,
          visualizationImage: detection.visualization_image || null, // CRITICAL: Include visualization
          originalImage: detection.image_url || null,
          modelType: detection.model_type || 'AI (HF Space)',
          type: detection.type,
          camera: detection.camera
        };
        
        // Debug logging for each item
        console.log(`📄 Mapped item ${mapped.id}:`, {
          hasOriginal: !!mapped.originalImage,
          hasVisualization: !!mapped.visualizationImage,
          visualizationUrl: mapped.visualizationImage?.substring(0, 50) + '...',
          disease: mapped.disease,
          confidence: mapped.confidence
        });
        
        return mapped;
      });

      const hasMore = typeof count === 'number' ? (to + 1) < count : items.length === pageSize;
      
      console.log('📄 Final paged result:', {
        itemsReturned: items.length,
        hasMore,
        visualizationCount: items.filter(i => !!i.visualizationImage).length
      });
      
      return { items, hasMore, total: count ?? null };
    } catch (error) {
      console.error('❌ Failed to list user analyses (paged):', error);
      return { items: [], hasMore: false };
    }
  }

  // FIXED: Fetch processed Drive IDs from analysis_result JSON
  async listProcessedDriveIds(firebaseUserId, limit = 2000) {
    if (!firebaseUserId) return new Set();
    try {
      console.log('🔍 Fetching processed Drive IDs...');
      
      const { data, error } = await supabaseData
        .from('detections')
        .select('analysis_result')
        .eq('firebase_user_id', firebaseUserId)
        .eq('type', 'live')
        .not('analysis_result->originDriveId', 'is', null)
        .limit(limit);
      
      if (error) throw error;
      
      const ids = new Set();
      (data || []).forEach(row => {
        const originId = row?.analysis_result?.originDriveId;
        if (originId) ids.add(originId);
      });
      
      console.log('🔍 Found processed Drive IDs:', ids.size);
      return ids;
    } catch (e) {
      console.warn('⚠️ Failed to fetch processed drive ids:', e?.message || e);
      return new Set();
    }
  }

  // FIXED: Add method to debug database schema
  async debugDatabaseSchema() {
    try {
      console.log('🔍 Debugging database schema...');
      
      const { data, error } = await supabaseData
        .from('detections')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('❌ Schema debug error:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const sample = data[0];
        console.log('🔍 Database columns found:', Object.keys(sample));
        console.log('🔍 Sample record:', sample);
      } else {
        console.log('🔍 No records found in database');
      }
    } catch (error) {
      console.error('❌ Schema debug failed:', error);
    }
  }
}

const analysisSupabaseService = new AnalysisSupabaseService();
export default analysisSupabaseService;
