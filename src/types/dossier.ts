export type DossierStatus = 'draft' | 'complete';

export interface DossierMeta {
  id: string;
  name: string;
  status: DossierStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Dossier extends DossierMeta {
  data: Record<string, any>;
}

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select';

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  fullWidth?: boolean;
}

export interface RepeatableConfig {
  columns: { key: string; label: string; type: FieldType }[];
}

export interface SectionConfig {
  id: string;
  title: string;
  icon: string;
  fields?: FieldConfig[];
  repeatable?: RepeatableConfig;
  description?: string;
}
