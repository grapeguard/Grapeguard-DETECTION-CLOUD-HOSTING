// CloudStorageAPIService.js - Replace direct GCS calls with API calls
// src/services/CloudStorageAPIService.js

import axios from 'axios';

class CloudStorageAPIService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'https://your-api-endpoint.render.com';
    this.uploadEndpoint = `${this.baseURL}/api/upload-analysis`;
    this.imagesEndpoint = `${this.baseURL}/api/recent-images`;
  }

  // Upload analysis images via API
  async uploadAnalysisImages(originalImageDataURL, visualizationImageDataURL, analysisMetadata = {}) {
    try {
      const formData = new FormData();
      
      // Convert data URLs to blobs
      if (originalImageDataURL) {
        const originalBlob = await this.dataURLToBlob(originalImageDataURL);
        formData.append('originalImage', originalBlob, 'original.jpg');
      }
      
      if (visualizationImageDataURL) {
        const visualizationBlob = await this.dataURLToBlob(visualizationImageDataURL);
        formData.append('visualizationImage', visualizationBlob, 'visualization.jpg');
      }
      
      // Add metadata
      formData.append('metadata', JSON.stringify({
        disease: analysisMetadata.disease,
        confidence: analysisMetadata.confidence,
        severity: analysisMetadata.severity,
        timestamp: analysisMetadata.timestamp || new Date().toISOString(),
        detectedRegions: analysisMetadata.detectedRegions || 0
      }));

      const response = await axios.post(this.uploadEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });

      if (response.data.success) {
        return [
          {
            type: 'original',
            success: true,
            url: response.data.originalImageUrl,
            fileName: response.data.originalFileName,
            bucket: response.data.bucket
          },
          {
            type: 'visualization',
            success: true,
            url: response.data.visualizationImageUrl,
            fileName: response.data.visualizationFileName,
            bucket: response.data.bucket
          }
        ];
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Failed to upload analysis images:', error);
      return [
        { type: 'original', success: false, error: error.message },
        { type: 'visualization', success: false, error: error.message }
      ];
    }
  }

  // Get recent images via API
  async getRecentImages(limit = 20) {
    try {
      const response = await axios.get(`${this.imagesEndpoint}?limit=${limit}`, {
        timeout: 10000, // 10 second timeout
      });
      
      if (response.data.success) {
        return response.data.images.map(img => ({
          id: img.id,
          name: img.name,
          url: img.url,
          created: img.created,
          metadata: img.metadata || {},
          size: img.size,
          disease: img.metadata?.disease,
          confidence: parseFloat(img.metadata?.confidence) || 0,
          severity: img.metadata?.severity,
          timestamp: img.created,
          type: img.metadata?.type || 'unknown',
          detectedRegions: parseInt(img.metadata?.detectedRegions) || 0
        }));
      } else {
        throw new Error(response.data.error || 'Failed to fetch images');
      }
    } catch (error) {
      console.error('Failed to fetch recent images:', error);
      return [];
    }
  }

  // Check if service is available
  async isAvailable() {
    try {
      const response = await axios.get(`${this.baseURL}/api/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.warn('Cloud storage API not available:', error.message);
      return false;
    }
  }

  // Get service status
  async getStatus() {
    try {
      const available = await this.isAvailable();
      return {
        available,
        endpoint: this.baseURL,
        initialized: true
      };
    } catch (error) {
      return {
        available: false,
        endpoint: this.baseURL,
        initialized: false,
        error: error.message
      };
    }
  }

  // Convert data URL to Blob
  async dataURLToBlob(dataURL) {
    const response = await fetch(dataURL);
    return response.blob();
  }

  // Cleanup old images via API
  async deleteOldImages(daysOld = 30) {
    try {
      const response = await axios.delete(`${this.baseURL}/api/cleanup-images`, {
        data: { daysOld },
        timeout: 30000,
      });
      
      if (response.data.success) {
        console.log(`Cleaned up ${response.data.deletedCount} old images`);
      }
    } catch (error) {
      console.error('Failed to cleanup old images:', error);
    }
  }
}

// Create singleton instance
const cloudStorageAPIService = new CloudStorageAPIService();

export default cloudStorageAPIService;
