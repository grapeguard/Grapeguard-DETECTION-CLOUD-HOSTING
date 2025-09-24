// Working Google Drive Service for Your ESP32-CAM Setup
// src/services/GoogleDriveService.js

class GoogleDriveService {
  constructor() {
    this.apiKey = process.env.REACT_APP_GOOGLE_DRIVE_API_KEY;
    this.folderId = process.env.REACT_APP_DRIVE_FOLDER_ID;
    this.baseUrl = 'https://www.googleapis.com/drive/v3';
    // Optional backend proxy (Flask/Render or any server) to bypass CORS
    // Example: REACT_APP_PROXY_BASE_URL=https://your-backend.onrender.com
    this.proxyBase = process.env.REACT_APP_PROXY_BASE_URL || null;
    
    console.log('🔧 GoogleDriveService initialized');
    console.log(`📁 Folder ID: ${this.folderId}`);
    console.log(`🔑 API Key: ${this.apiKey ? 'Present' : 'Missing'}`);
  }

  async testConnection() {
    try {
      console.log('🧪 Testing Google Drive API connection...');
      
      const response = await fetch(
        `${this.baseUrl}/files/${this.folderId}?fields=id,name&supportsAllDrives=true&key=${this.apiKey}`
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
      const url = `${this.baseUrl}/files?` +
        `q='${this.folderId}' in parents and ` +
        `mimeType='application/vnd.google-apps.folder' and ` +
        `trashed=false&` +
        `orderBy=name desc&` +
        `fields=files(id,name,createdTime)&` +
        `supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives&` +
        `key=${this.apiKey}`;
      const response = await fetch(url);

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
      
      // Back-compat: return first page up to 100
      const url = `${this.baseUrl}/files?` +
        `q='${folderId}' in parents and ` +
        `mimeType contains 'image/' and ` +
        `trashed=false&` +
        `orderBy=createdTime desc&` +
        `pageSize=100&` +
        `fields=files(id,name,createdTime,size,thumbnailLink,webViewLink),nextPageToken&` +
        `supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives&` +
        `key=${this.apiKey}`;
      const response = await fetch(url);

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

  // New: paginated listing for folders, returns { files, nextPageToken }
  async getImagesFromFolderPage(folderId, pageToken = undefined, pageSize = 100) {
    try {
      const params = new URLSearchParams();
      params.set('q', `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`);
      params.set('orderBy', 'createdTime desc');
      params.set('pageSize', String(pageSize));
      params.set('fields', 'files(id,name,createdTime,size,thumbnailLink,webViewLink),nextPageToken');
      params.set('supportsAllDrives', 'true');
      params.set('includeItemsFromAllDrives', 'true');
      params.set('corpora', 'allDrives');
      params.set('key', this.apiKey);
      if (pageToken) params.set('pageToken', pageToken);
      const url = `${this.baseUrl}/files?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Failed to fetch images (paged): ${res.status} ${text}`);
      }
      const data = await res.json();
      return { files: data.files || [], nextPageToken: data.nextPageToken || null };
    } catch (err) {
      console.error('❌ Error fetching paged images:', err);
      throw err;
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
            downloadUrl: this.buildDownloadUrl(image.id),
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
            downloadUrl: this.buildDownloadUrl(image.id),
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
      // Build a valid download URL if not provided
      const url = imageData.downloadUrl || this.buildDownloadUrl(imageData.id);
      if (!url) {
        throw new Error('Missing download URL and file id');
      }
      const response = await fetch(url, { mode: 'cors' });
      
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
      // First try the direct content URL
      try {
        const blob = await this.downloadImageAsBlob(imageData);
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (primaryErr) {
        // Fallback: try thumbnailLink (usually public, lower resolution)
        if (imageData.thumbnailLink) {
          try {
            const thumbUrl = imageData.thumbnailLink;
            const res = await fetch(thumbUrl, { mode: 'cors' });
            if (!res.ok) throw new Error(`Thumbnail fetch failed: ${res.status}`);
            const blob = await res.blob();
            return await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (thumbErr) {
            console.warn('Thumbnail fallback failed:', thumbErr?.message || thumbErr);
            throw primaryErr; // rethrow original error
          }
        }
        throw primaryErr;
      }
      
    } catch (error) {
      console.error(`❌ Failed to convert ${imageData.name} to data URL:`, error);
      throw error;
    }
  }

  // Build a CORS-safe download URL, preferring backend proxy when configured
  buildDownloadUrl(fileId) {
    if (this.proxyBase) {
      const base = this.proxyBase.replace(/\/$/, '');
      return `${base}/drive/file/${encodeURIComponent(fileId)}`;
    }
    // Include supportsAllDrives to enable Shared Drives access
    return `${this.baseUrl}/files/${fileId}?alt=media&supportsAllDrives=true&key=${this.apiKey}`;
  }
}

export default GoogleDriveService;
