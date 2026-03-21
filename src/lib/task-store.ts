import { Dossier, DossierTask } from '@/types/dossier';

const TASKS_KEY = 'fire-dossier-tasks';

function loadTasks(): Record<string, DossierTask[]> {
  const raw = localStorage.getItem(TASKS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveTasks(all: Record<string, DossierTask[]>) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(all));
}

export function getTasksForDossier(dossierId: string): DossierTask[] {
  return loadTasks()[dossierId] || [];
}

export function addTask(dossierId: string, task: Omit<DossierTask, 'id' | 'createdAt'>): DossierTask {
  const all = loadTasks();
  const newTask: DossierTask = {
    ...task,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString().split('T')[0],
  };
  all[dossierId] = [...(all[dossierId] || []), newTask];
  saveTasks(all);
  return newTask;
}

export function updateTask(dossierId: string, taskId: string, updates: Partial<DossierTask>): void {
  const all = loadTasks();
  const tasks = all[dossierId] || [];
  all[dossierId] = tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
  saveTasks(all);
}

export function deleteTask(dossierId: string, taskId: string): void {
  const all = loadTasks();
  all[dossierId] = (all[dossierId] || []).filter(t => t.id !== taskId);
  saveTasks(all);
}
