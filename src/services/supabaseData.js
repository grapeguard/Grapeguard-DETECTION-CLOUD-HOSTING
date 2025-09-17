// Supabase Data Service - Works with Firebase Auth
// src/services/supabaseData.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabaseData = createClient(supabaseUrl || '', supabaseKey || '', {
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

// Helper function to upload images to Supabase storage
export async function uploadImage(file, bucket = 'grapeguard-images', folder = 'detections') {
  try {
    const fileExt = file.name?.split('.').pop() || 'jpg';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { data, error } = await supabaseData.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabaseData.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return {
      path: data.path,
      publicUrl: publicUrl,
      fullPath: fileName
    };
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
}
