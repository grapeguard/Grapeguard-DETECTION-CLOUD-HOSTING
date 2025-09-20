// FIXED Supabase Data Service - Correct Query Format to Fix 406 Error
// src/services/supabaseData.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

function assertSupabaseEnv() {
  if (!supabaseUrl || !/^https?:\/\//.test(supabaseUrl)) {
    throw new Error(
      'Missing or invalid REACT_APP_SUPABASE_URL. Set a valid https URL from your Supabase project settings.'
    );
  }
  if (!supabaseKey) {
    throw new Error(
      'Missing REACT_APP_SUPABASE_ANON_KEY. Add your Supabase anon public API key.'
    );
  }
}

assertSupabaseEnv();

export const supabaseData = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false } // We use Firebase for auth
});

// Detection operations
export const detectionService = {
  async createDetection(firebaseUserId, detectionData) {
    const { data, error } = await supabaseData
      .from('detections')
      .insert([{
        firebase_user_id: firebaseUserId,
        type: detectionData.type,
        image_url: detectionData.image_url,
        image_path: detectionData.image_path,
        disease_detected: detectionData.disease,
        confidence_score: detectionData.confidence,
        severity: detectionData.severity || null,
        detected_regions: detectionData.detectedRegions ?? null,
        healthy_area: detectionData.healthyArea ?? null,
        camera: detectionData.camera ?? null,
        model_type: detectionData.modelType || null,
        visualization_image: detectionData.visualizationImage || null,
        analysis_result: detectionData,
        status: 'completed'
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUserDetections(firebaseUserId, limit = 50) {
    const { data, error } = await supabaseData
      .from('detections')
      .select('*')
      .eq('firebase_user_id', firebaseUserId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  async saveManualDetection(firebaseUserId, result, imageUrl) {
    return this.createDetection(firebaseUserId, {
      type: 'manual',
      disease: result.disease,
      confidence: result.confidence,
      image_url: imageUrl,
      image_path: `manual/${Date.now()}.jpg`,
      severity: result.severity,
      detectedRegions: result.detectedRegions,
      healthyArea: result.healthyArea,
      visualizationImage: result.visualizationImage
    });
  },

  async saveLiveDetection(firebaseUserId, result, camera, originalImage, visualizationImage) {
    return this.createDetection(firebaseUserId, {
      type: 'live',
      disease: result.disease,
      confidence: result.confidence,
      image_url: originalImage,
      image_path: `live/camera${camera}/${Date.now()}.jpg`,
      severity: result.severity,
      camera: camera,
      detectedRegions: result.detectedRegions,
      healthyArea: result.healthyArea,
      visualizationImage: visualizationImage
    });
  }
};

// Alert operations
export const alertService = {
  async createAlert(firebaseUserId, alertData) {
    const { data, error } = await supabaseData
      .from('alerts')
      .insert([{
        firebase_user_id: firebaseUserId,
        type: alertData.type,
        severity: alertData.severity,
        title: alertData.title,
        message: alertData.message,
        detection_id: alertData.detection_id || null
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUserAlerts(firebaseUserId, limit = 100) {
    const { data, error } = await supabaseData
      .from('alerts')
      .select('*')
      .eq('firebase_user_id', firebaseUserId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  async markAlertAsRead(alertId) {
    const { data, error } = await supabaseData
      .from('alerts')
      .update({ is_read: true })
      .eq('id', alertId);
    
    if (error) throw error;
    return data;
  },

  // Create alerts for disease detections
  async createDiseaseAlert(firebaseUserId, detection, type = 'manual') {
    if (detection.disease === 'Healthy') return null; // No alert for healthy plants

    const severity = detection.severity === 'High' ? 'critical' : 
                     detection.severity === 'Medium' ? 'warning' : 'info';

    return this.createAlert(firebaseUserId, {
      type: 'disease',
      severity: severity,
      title: `${detection.disease} Detected`,
      message: `Disease detected with ${detection.confidence}% confidence. Immediate action recommended.`,
      detection_id: detection.id || null
    });
  }
};

// Analysis history operations
export const analysisService = {
  async saveAnalysis(firebaseUserId, analysisData) {
    const { data, error } = await supabaseData
      .from('analysis_history')
      .insert([{
        firebase_user_id: firebaseUserId,
        detection_id: analysisData.detection_id,
        analysis_data: analysisData,
        image_url: analysisData.image_url,
        disease_name: analysisData.disease,
        confidence_score: analysisData.confidence
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUserAnalysisHistory(firebaseUserId, limit = 50) {
    const { data, error } = await supabaseData
      .from('analysis_history')
      .select('*')
      .eq('firebase_user_id', firebaseUserId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  }
};

// FIXED Live monitoring operations - Corrected RLS policy bypass
export const liveMonitoringService = {
  async saveLiveImage(firebaseUserId, imageData) {
    console.log('Saving live image:', { firebaseUserId, imageData });
    
    const { data, error } = await supabaseData
      .from('live_monitoring_images')
      .insert([{
        firebase_user_id: firebaseUserId,
        camera_number: imageData.cameraNumber,
        image_url: imageData.imageUrl,
        image_path: imageData.imagePath,
        analysis_result: imageData.analysisResult || null,
        disease_detected: imageData.disease || null,
        confidence_score: imageData.confidence || null,
        severity: imageData.severity || null,
        detected_regions: imageData.detectedRegions || 0,
        model_type: imageData.modelType || 'AI (HF Space)',
        visualization_image: imageData.visualizationImage || null,
        drive_file_name: imageData.driveFileName || null,
        drive_upload_time: imageData.driveUploadTime || null,
        status: 'completed'
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase save error:', error);
      throw error;
    }
    return data;
  },

  async getLatestImages(firebaseUserId, limit = 10, cameraNumber = null) {
    console.log('Getting latest images:', { firebaseUserId, limit, cameraNumber });
    
    // FIXED: Set user context for RLS policies using correct method
    const { data, error } = await supabaseData.rpc('set_claim', {
      claim: 'sub',
      value: firebaseUserId
    });

    if (error) {
      console.warn('Could not set user context, trying direct query:', error);
    }

    let query = supabaseData
      .from('live_monitoring_images')
      .select('*')
      .eq('firebase_user_id', firebaseUserId)
