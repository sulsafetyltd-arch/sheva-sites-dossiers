import { DefectPhoto } from '@/types/safety-report';

/**
 * In-memory / IndexedDB photo binary cache.
 * Avoids stuffing large data-URLs into localStorage (QuotaExceededError),
 * which was breaking AI analysis after capturing photos.
 */

const memory = new Map<string, string>(); // photoId -> dataUrl
const DB_NAME = 'safety-photo-cache';
const STORE = 'photos';

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function cachePhotoDataUrl(photoId: string, dataUrl: string): Promise<void> {
  if (!photoId || !dataUrl) return;
  memory.set(photoId, dataUrl);
  const db = await openDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(dataUrl, photoId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  } finally {
    db.close();
  }
}

export async function getCachedPhotoDataUrl(photoId: string): Promise<string | undefined> {
  if (memory.has(photoId)) return memory.get(photoId);
  const db = await openDb();
  if (!db) return undefined;
  try {
    const value = await new Promise<string | undefined>((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(photoId);
      req.onsuccess = () => resolve(req.result as string | undefined);
      req.onerror = () => resolve(undefined);
    });
    if (value) memory.set(photoId, value);
    return value;
  } catch {
    return undefined;
  } finally {
    db.close();
  }
}

/** Resolve the best in-session source for analysis (prefer cached data URL). */
export async function resolvePhotoForAnalysis(photo: DefectPhoto): Promise<string> {
  const cached = await getCachedPhotoDataUrl(photo.id);
  if (cached) return cached;
  if (photo.previewUrl?.startsWith('data:')) return photo.previewUrl;
  if (photo.url?.startsWith('data:')) return photo.url;
  if (photo.previewUrl) return photo.previewUrl;
  return photo.url;
}

/**
 * Strip heavy fields before localStorage persistence.
 * Keep http(s) cloud URLs; drop large data/blob preview payloads.
 */
export function slimPhotosForStorage(photos: DefectPhoto[]): DefectPhoto[] {
  return photos.map((p) => {
    const urlIsRemote = /^https?:\/\//i.test(p.url);
    const urlIsData = p.url?.startsWith('data:');
    return {
      id: p.id,
      url: urlIsRemote ? p.url : urlIsData ? `local://${p.id}` : p.url,
      caption: p.caption,
      timestamp: p.timestamp,
      // never persist mega data-URLs into localStorage
      previewUrl: undefined,
    };
  });
}

export async function deleteCachedPhoto(photoId: string): Promise<void> {
  memory.delete(photoId);
  const db = await openDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(photoId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  } finally {
    db.close();
  }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
