import { DossierTask } from '@/types/dossier';
import { supabase } from '@/integrations/supabase/client';

export async function getTasksForDossier(dossierId: string): Promise<DossierTask[]> {
  const { data, error } = await supabase
    .from('dossier_tasks')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map(t => ({
    id: t.id,
    title: t.title,
    status: t.status as DossierTask['status'],
    assignee: t.assignee ?? undefined,
    deadline: t.deadline ?? undefined,
    createdAt: t.created_at.split('T')[0],
  }));
}

export async function addTask(
  dossierId: string,
  task: Omit<DossierTask, 'id' | 'createdAt'>,
): Promise<DossierTask> {
  const { data, error } = await supabase
    .from('dossier_tasks')
    .insert({
      dossier_id: dossierId,
      title: task.title,
      status: task.status,
      assignee: task.assignee ?? null,
      deadline: task.deadline ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    status: data.status as DossierTask['status'],
    assignee: data.assignee ?? undefined,
    deadline: data.deadline ?? undefined,
    createdAt: data.created_at.split('T')[0],
  };
}

export async function updateTask(
  _dossierId: string,
  taskId: string,
  updates: Partial<DossierTask>,
): Promise<void> {
  const { error } = await supabase
    .from('dossier_tasks')
    .update({
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.assignee !== undefined && { assignee: updates.assignee }),
      ...(updates.deadline !== undefined && { deadline: updates.deadline }),
    })
    .eq('id', taskId);

  if (error) throw error;
}

export async function deleteTask(_dossierId: string, taskId: string): Promise<void> {
  const { error } = await supabase
    .from('dossier_tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
}
