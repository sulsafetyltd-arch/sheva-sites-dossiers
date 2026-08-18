const DB_NAME = 'solo-nadlan-files';
const STORE = 'files';

export interface StoredFile {
  key: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  savedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function attachmentKey(dealId: string, docId: string): string {
  return `${dealId}:${docId}`;
}

export async function putFile(dealId: string, docId: string, file: File): Promise<StoredFile> {
  const db = await openDb();
  const record: StoredFile = {
    key: attachmentKey(dealId, docId),
    name: file.name,
    type: file.type,
    size: file.size,
    blob: file,
    savedAt: new Date().toISOString(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return record;
}

export async function getFile(dealId: string, docId: string): Promise<StoredFile | undefined> {
  const db = await openDb();
  const result = await new Promise<StoredFile | undefined>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(attachmentKey(dealId, docId));
    req.onsuccess = () => resolve(req.result as StoredFile | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function deleteFile(dealId: string, docId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(attachmentKey(dealId, docId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listDealFiles(dealId: string): Promise<StoredFile[]> {
  const db = await openDb();
  const all = await new Promise<StoredFile[]>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as StoredFile[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return all.filter((f) => f.key.startsWith(`${dealId}:`));
}

export function openStoredFile(file: StoredFile): void {
  const url = URL.createObjectURL(file.blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
