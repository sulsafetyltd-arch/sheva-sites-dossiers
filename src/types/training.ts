export type TrainingLayerId =
  | 'law'
  | 'literature'
  | 'cases'
  | 'deliverable'
  | 'exam';

export interface TrainingModule {
  id: string;
  code: string;
  title: string;
  stageId: string;
  /** סימון ⚙️ — יתרון הנדסי/תכנוני */
  engineeringEdge?: boolean;
  /** רענון / מיפוי ממשקים בלבד */
  refreshOnly?: boolean;
  intro?: string;
  studyItems: string[];
  literature: string[];
  cases: string[];
  deliverable: string;
  exam: string;
}

export interface TrainingStage {
  id: string;
  code: string;
  title: string;
  months: string;
  intro?: string;
  moduleIds: string[];
}

export interface TrainingMilestone {
  id: string;
  month: number;
  title: string;
  /** מודולים שצריך להשלים כדי לסמן אוטומטית (אופציונלי) */
  relatedModuleIds?: string[];
}

export interface TrainingTool {
  name: string;
  note?: string;
}

export interface TrainingBook {
  author: string;
  titles: string[];
}

export interface ModuleProgress {
  layers: Partial<Record<TrainingLayerId, boolean>>;
  deliverableNotes: string;
  completedAt?: string;
  /** נצפה סרטון ההסבר של המודול */
  explainerWatchedAt?: string;
}

export interface TrainingProgress {
  modules: Record<string, ModuleProgress>;
  milestones: Record<string, boolean>;
  startedAt: string;
  updatedAt: string;
}

export const LAYER_ORDER: TrainingLayerId[] = [
  'law',
  'literature',
  'cases',
  'deliverable',
  'exam',
];

export const LAYER_LABEL: Record<TrainingLayerId, string> = {
  law: '1 · החוק והתקנות',
  literature: '2 · ספרות מקצועית',
  cases: '3 · פסיקה מכוננת',
  deliverable: '4 · תוצר מעשי',
  exam: '5 · מבחן עצמי (5 דקות)',
};
