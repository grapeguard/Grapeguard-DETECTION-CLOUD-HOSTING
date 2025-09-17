// src/services/GoogleCloudStorageService.js
// Frontend helper for interacting with Google Cloud Storage
// - Listing recent analyses via public GCS JSON API
// - Uploading files via signed URLs returned by backend

const DEFAULT_LIST_PAGE_SIZE = 50;

class GoogleCloudStorageService {
  constructor() {
    this.bucketName = process.env.REACT_APP_GCS_BUCKET;
    this.backendBaseUrl = process.env.REACT_APP_BACKEND_BASE_URL; // e.g., your Hugging Face Space API base
    this.publicBaseUrl = `https://storage.googleapis.com/${this.bucketName}`;
    this.gcsListApi = `https://storage.googleapis.com/storage/v1/b/${this.bucketName}/o`;
  }

  // List objects under a prefix (public read bucket). Returns array of object metadata
  async listObjects(prefix, pageSize = DEFAULT_LIST_PAGE_SIZE) {
    const params = new URLSearchParams({
      prefix,
      maxResults: String(pageSize),
      fields: 'items(name,updated,size,mediaLink),nextPageToken'
    });
    const url = `${this.gcsListApi}?${params.toString()}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GCS listObjects failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    return data.items || [];
  }

  // Download a small JSON file (like metadata.json) from public bucket
  async downloadJson(objectPath) {
    const url = `${this.publicBaseUrl}/${encodeURIComponent(objectPath)}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GCS downloadJson failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  // Fetch a remote image URL and return a Blob (used to copy visualization into GCS)
  async fetchImageAsBlob(imageUrl) {
    const res = await fetch(imageUrl, { method: 'GET' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`fetchImageAsBlob failed: ${res.status} ${text}`);
    }
    return res.blob();
  }

  // Convert dataURL to Blob
  async dataUrlToBlob(dataUrl) {
    const res = await fetch(dataUrl);
    return res.blob();
  }

  // Ask backend to create signed URLs for uploads
  async getSignedUploadUrls(payload) {
    if (!this.backendBaseUrl) {
      throw new Error('Missing REACT_APP_BACKEND_BASE_URL for signed URL generation');
    }
    const res = await fetch(`${this.backendBaseUrl}/gcs/signed-urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`getSignedUploadUrls failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  // Upload a Blob to a signed URL (GCS signed PUT URL). Returns the public object URL
  async uploadWithSignedUrl({ signedUrl, contentType, body }) {
    const res = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Signed URL upload failed: ${res.status} ${text}`);
    }
    // Public URL should be the signedUrl path without query, but better return it from backend.
    return true;
  }
}

const googleCloudStorageService = new GoogleCloudStorageService();
export default googleCloudStorageService;


