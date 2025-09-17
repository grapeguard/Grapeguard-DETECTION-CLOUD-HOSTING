// Working Google Drive Service for Your ESP32-CAM Setup
// src/services/GoogleDriveService.js

class GoogleDriveService {
  constructor() {
    this.apiKey = process.env.REACT_APP_GOOGLE_DRIVE_API_KEY;
    this.folderId = process.env.REACT_APP_DRIVE_FOLDER_ID;
    this.baseUrl = 'https://www.googleapis.com/drive/v3';
    
    console.log('🔧 GoogleDriveService initialized');
    console.log(`📁 Folder ID: ${this.folderId}`);
    console.log(`🔑 API Key: ${this.apiKey ? 'Present' : 'Missing'}`);
  }

  async testConnection() {
    try {
      console.log('🧪 Testing Google Drive API connection...');
      
      const response = await fetch(
        `${this.baseUrl}/files/${this.folderId}?fields=id,name&key=${this.apiKey}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API test failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ API connection successful:', data);
      
      return { success: true, folderName: data.name };
      
    } catch (error) {
      console.error('❌ API connection test failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getLatestCameraImages() {
    try {
      console.log('🔍 Fetching latest ESP32-CAM images...');
      
      // First, get the most recent date folder
      const dateFolders = await this.getDateFolders();
      
      if (dateFolders.length === 0) {
        console.log('📭 No date folders found');
        return { camera1: null, camera2: null };
      }
      
      // Get the most recent date folder
      const latestDateFolder = dateFolders[0];
      console.log(`📅 Using latest date folder: ${latestDateFolder.name}`);
      
      // Get images from the latest date folder
      const images = await this.getImagesFromFolder(latestDateFolder.id);
      
      // Categorize images by camera (based on _1 and _2 suffix)
      const categorized = this.categorizeImagesByCamera(images);
      
      return categorized;
      
    } catch (error) {
      console.error('❌ Error fetching camera images:', error);
      throw error;
    }
  }

  async getDateFolders() {
    try {
      const response = await fetch(
        `${this.baseUrl}/files?` +
        `q='${this.folderId}' in parents and ` +
        `mimeType='application/vnd.google-apps.folder' and ` +
        `trashed=false&` +
        `orderBy=name desc&` +
        `fields=files(id,name,createdTime)&` +
        `key=${this.apiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch date folders: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`📁 Found ${data.files?.length || 0} date folders:`, data.files?.map(f => f.name));
      
      return data.files || [];
      
    } catch (error) {
      console.error('❌ Error fetching date folders:', error);
      throw error;
    }
  }

  async getImagesFromFolder(folderId) {
    try {
      console.log(`📸 Getting images from folder: ${folderId}`);
      
      const response = await fetch(
        `${this.baseUrl}/files?` +
        `q='${folderId}' in parents and ` +
        `mimeType contains 'image/' and ` +
        `trashed=false&` +
        `orderBy=createdTime desc&` +
        `pageSize=20&` +
        `fields=files(id,name,createdTime,size,thumbnailLink,webViewLink)&` +
        `key=${this.apiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch images: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`📷 Found ${data.files?.length || 0} images:`, data.files?.map(f => f.name));
      
      return data.files || [];
      
    } catch (error) {
      console.error('❌ Error fetching images from folder:', error);
      throw error;
    }
  }

  categorizeImagesByCamera(images) {
    const cameras = { camera1: null, camera2: null };
    
    console.log('🎥 Categorizing images by camera...');
    
    // Your naming pattern: YYYYMMDD-HHMMSS_1.jpg or YYYYMMDD-HHMMSS_2.jpg
    images.forEach(image => {
      const fileName = image.name.toLowerCase();
      console.log(`   Checking: ${image.name}`);
      
      if (fileName.includes('_1.jpg')) {
        // Camera 1
        if (!cameras.camera1 || new Date(image.createdTime) > new Date(cameras.camera1.createdTime)) {
          cameras.camera1 = {
            id: image.id,
            name: image.name,
            createdTime: image.createdTime,
            size: image.size,
            thumbnailUrl: image.thumbnailLink,
            webViewLink: image.webViewLink,
            downloadUrl: `${this.baseUrl}/files/${image.id}?alt=media&key=${this.apiKey}`,
            isReal: true,
            camera: 1
          };
          console.log(`   ✅ Set as Camera 1: ${image.name}`);
        }
      } else if (fileName.includes('_2.jpg')) {
        // Camera 2
        if (!cameras.camera2 || new Date(image.createdTime) > new Date(cameras.camera2.createdTime)) {
          cameras.camera2 = {
            id: image.id,
            name: image.name,
            createdTime: image.createdTime,
            size: image.size,
            thumbnailUrl: image.thumbnailLink,
            webViewLink: image.webViewLink,
            downloadUrl: `${this.baseUrl}/files/${image.id}?alt=media&key=${this.apiKey}`,
            isReal: true,
            camera: 2
          };
          console.log(`   ✅ Set as Camera 2: ${image.name}`);
        }
      }
    });

    console.log('📊 Categorization result:', {
      camera1: cameras.camera1 ? cameras.camera1.name : 'None',
      camera2: cameras.camera2 ? cameras.camera2.name : 'None'
    });

    return cameras;
  }

  async downloadImageAsBlob(imageData) {
    try {
      console.log(`⬇️ Downloading image: ${imageData.name}`);
      
      const response = await fetch(imageData.downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log(`✅ Downloaded ${imageData.name}: ${blob.size} bytes`);
      
      return blob;
      
    } catch (error) {
      console.error(`❌ Failed to download ${imageData.name}:`, error);
      throw error;
    }
  }

  async getImageAsDataUrl(imageData) {
    try {
      const blob = await this.downloadImageAsBlob(imageData);
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
    } catch (error) {
      console.error(`❌ Failed to convert ${imageData.name} to data URL:`, error);
      throw error;
    }
  }
}

export default GoogleDriveService;