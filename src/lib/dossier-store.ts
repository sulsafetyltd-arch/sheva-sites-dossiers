import { Dossier, DossierMeta } from '@/types/dossier';
import { BuildingTemplate } from '@/data/building-templates';
import { supabase } from '@/integrations/supabase/client';

export async function getAllDossiers(): Promise<DossierMeta[]> {
  const { data, error } = await supabase
    .from('dossiers')
    .select('id, name, status, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map(d => ({
    id: d.id,
    name: d.name,
    status: d.status as DossierMeta['status'],
    createdAt: d.created_at.split('T')[0],
    updatedAt: d.updated_at.split('T')[0],
  }));
}

export async function getDossier(id: string): Promise<Dossier | undefined> {
  const { data, error } = await supabase
    .from('dossiers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return undefined;

  return {
    id: data.id,
    name: data.name,
    status: data.status as Dossier['status'],
    createdAt: data.created_at.split('T')[0],
    updatedAt: data.updated_at.split('T')[0],
    data: (data.data as Record<string, any>) ?? {},
  };
}

export async function saveDossier(dossier: Dossier): Promise<void> {
  const { error } = await supabase
    .from('dossiers')
    .upsert({
      id: dossier.id,
      name: dossier.name,
      status: dossier.status,
      data: dossier.data as any,
    });

  if (error) throw error;
}

export async function deleteDossier(id: string): Promise<void> {
  const { error } = await supabase.from('dossiers').delete().eq('id', id);
  if (error) throw error;
}

export async function createDossier(name: string): Promise<Dossier> {
  const { data, error } = await supabase
    .from('dossiers')
    .insert({ name })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    status: data.status as Dossier['status'],
    createdAt: data.created_at.split('T')[0],
    updatedAt: data.updated_at.split('T')[0],
    data: (data.data as Record<string, any>) ?? {},
  };
}

export async function createDossierFromTemplate(name: string, template: BuildingTemplate): Promise<Dossier> {
  const { data, error } = await supabase
    .from('dossiers')
    .insert({ name, data: template.preloadData as any })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    status: data.status as Dossier['status'],
    createdAt: data.created_at.split('T')[0],
    updatedAt: data.updated_at.split('T')[0],
    data: (data.data as Record<string, any>) ?? {},
  };
}

export async function duplicateDossier(id: string): Promise<Dossier | undefined> {
  const source = await getDossier(id);
  if (!source) return undefined;

  const { data, error } = await supabase
    .from('dossiers')
    .insert({
      name: source.name + ' (העתק)',
      data: source.data as any,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    status: data.status as Dossier['status'],
    createdAt: data.created_at.split('T')[0],
    updatedAt: data.updated_at.split('T')[0],
    data: (data.data as Record<string, any>) ?? {},
  };
}
