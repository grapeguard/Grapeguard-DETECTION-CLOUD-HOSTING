// src/services/AnalysisHistoryService.js
// Stores analysis results in Google Cloud Storage using signed URLs from backend
// and lists recent analyses from a public GCS bucket.

import googleCloudStorageService from './GoogleCloudStorageService';

function safeJsonStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (_) {
    return JSON.stringify({});
  }
}

function buildObjectPaths({ userId, timestamp, id }) {
  const ts = new Date(timestamp || Date.now()).toISOString().replace(/[:.]/g, '-');
  const uid = userId || 'anonymous';
  const base = `analyses/${uid}/${ts}-${id}`;
  return {
    base,
    originalImagePath: `${base}/original.jpg`,
    visualizationImagePath: `${base}/visualization.jpg`,
    metadataPath: `${base}/metadata.json`
  };
}

class AnalysisHistoryService {
  // Save an analysis result to GCS; images can be data URLs or remote URLs
  async saveAnalysisResult(result, originalImage, visualizationImage, userId = null) {
    try {
      if (!googleCloudStorageService.bucketName) {
        return { success: false, error: 'Missing REACT_APP_GCS_BUCKET' };
      }

      const id = Date.now();
      const timestamp = new Date().toISOString();
      const { base, originalImagePath, visualizationImagePath, metadataPath } = buildObjectPaths({ userId, timestamp, id });

      // Prepare blobs
      const blobs = {};
      if (originalImage) {
        blobs.original = originalImage.startsWith('data:')
          ? await googleCloudStorageService.dataUrlToBlob(originalImage)
          : await googleCloudStorageService.fetchImageAsBlob(originalImage);
      }
      if (visualizationImage) {
        blobs.visualization = visualizationImage.startsWith('data:')
          ? await googleCloudStorageService.dataUrlToBlob(visualizationImage)
          : await googleCloudStorageService.fetchImageAsBlob(visualizationImage);
      }

      // Ask backend for signed URLs
      const signPayload = {
        objects: [
          blobs.original ? { path: originalImagePath, contentType: 'image/jpeg' } : null,
          blobs.visualization ? { path: visualizationImagePath, contentType: 'image/jpeg' } : null,
          { path: metadataPath, contentType: 'application/json' }
        ].filter(Boolean)
      };
      const signed = await googleCloudStorageService.getSignedUploadUrls(signPayload);
      const mapByPath = new Map((signed.urls || []).map(u => [u.path, u]));

      // Upload images
      if (blobs.original) {
        const u = mapByPath.get(originalImagePath);
        await googleCloudStorageService.uploadWithSignedUrl({ signedUrl: u.signedUrl, contentType: 'image/jpeg', body: blobs.original });
      }
      if (blobs.visualization) {
        const u = mapByPath.get(visualizationImagePath);
        await googleCloudStorageService.uploadWithSignedUrl({ signedUrl: u.signedUrl, contentType: 'image/jpeg', body: blobs.visualization });
      }

      // Build metadata
      const publicBase = googleCloudStorageService.publicBaseUrl;
      const metadata = {
        id,
        timestamp,
        userId: userId || null,
        disease: result?.disease || 'Unknown',
        confidence: result?.confidence ?? 0,
        severity: result?.severity || 'Unknown',
        detectedRegions: result?.detectedRegions ?? 0,
        healthyArea: result?.healthyArea ?? null,
        recommendations: result?.recommendations || [],
        visualizationImage: blobs.visualization ? `${publicBase}/${encodeURIComponent(visualizationImagePath)}` : (result?.visualizationImage || null),
        originalImage: blobs.original ? `${publicBase}/${encodeURIComponent(originalImagePath)}` : (originalImage || null)
      };

      // Upload metadata
      const metaUrl = mapByPath.get(metadataPath);
      const metaBlob = new Blob([safeJsonStringify(metadata)], { type: 'application/json' });
      await googleCloudStorageService.uploadWithSignedUrl({ signedUrl: metaUrl.signedUrl, contentType: 'application/json', body: metaBlob });

      return { success: true, id, basePath: base, metadata };
    } catch (error) {
      console.error('saveAnalysisResult error:', error);
      return { success: false, error: error?.message || String(error) };
    }
  }

  // Fetch recent analyses by listing metadata files in public bucket
  async getAnalysisHistory(userId = null, limit = 10) {
    const prefix = userId ? `analyses/${userId}/` : 'analyses/';
    let items = [];
    try {
      if (typeof googleCloudStorageService.listObjects === 'function') {
        items = await googleCloudStorageService.listObjects(prefix, 200);
      } else {
        // Fallback direct JSON API call if service instance is older/misloaded
        const bucket = googleCloudStorageService.bucketName || process.env.REACT_APP_GCS_BUCKET;
        if (!bucket) throw new Error('Missing REACT_APP_GCS_BUCKET');
        const params = new URLSearchParams({
          prefix,
          maxResults: '200',
          fields: 'items(name,updated,size,mediaLink),nextPageToken'
        });
        const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o?${params.toString()}`;
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`GCS list (fallback) failed: ${res.status} ${text}`);
        }
        const data = await res.json();
        items = data.items || [];
      }
    } catch (err) {
      console.error('getAnalysisHistory list error:', err);
      return [];
    }
    const metas = items.filter(it => it.name.endsWith('metadata.json'));
    // Sort by updated desc
    metas.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
    const top = metas.slice(0, limit);
    const results = [];
    for (const m of top) {
      try {
        const data = await googleCloudStorageService.downloadJson(m.name);
        results.push(data);
      } catch (_) {
        // skip broken
      }
    }
    return results;
  }
}

const analysisHistoryService = new AnalysisHistoryService();
export default analysisHistoryService;


