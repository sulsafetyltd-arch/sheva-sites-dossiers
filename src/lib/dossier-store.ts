import { Dossier, DossierMeta } from '@/types/dossier';
import { demoDossier } from '@/data/demo-dossier';

const STORAGE_KEY = 'fire-dossiers';

function loadAll(): Dossier[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    // Initialize with demo
    const initial = [demoDossier];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(raw);
}

function saveAll(dossiers: Dossier[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dossiers));
}

export function getAllDossiers(): DossierMeta[] {
  return loadAll().map(({ id, name, status, createdAt, updatedAt }) => ({
    id, name, status, createdAt, updatedAt,
  }));
}

export function getDossier(id: string): Dossier | undefined {
  return loadAll().find(d => d.id === id);
}

export function saveDossier(dossier: Dossier): void {
  const all = loadAll();
  const idx = all.findIndex(d => d.id === dossier.id);
  dossier.updatedAt = new Date().toISOString().split('T')[0];
  if (idx >= 0) {
    all[idx] = dossier;
  } else {
    all.push(dossier);
  }
  saveAll(all);
}

export function deleteDossier(id: string): void {
  saveAll(loadAll().filter(d => d.id !== id));
}

export function createDossier(name: string): Dossier {
  const dossier: Dossier = {
    id: crypto.randomUUID(),
    name,
    status: 'draft',
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
    data: {},
  };
  saveDossier(dossier);
  return dossier;
}

export function duplicateDossier(id: string): Dossier | undefined {
  const source = getDossier(id);
  if (!source) return undefined;
  const copy: Dossier = {
    ...source,
    id: crypto.randomUUID(),
    name: source.name + ' (העתק)',
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
    status: 'draft',
  };
  saveDossier(copy);
  return copy;
}
