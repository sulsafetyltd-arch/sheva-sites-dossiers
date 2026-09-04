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

/** שיעור מובנה בתוך האפליקציה */
export interface LessonSection {
  id: string;
  title: string;
  body: string;
  keyPoints: string[];
}

/** כרטיס חוק / תקנה — תקציר לימודי */
export interface StatuteCard {
  id: string;
  citation: string;
  title: string;
  summary: string;
  practiceTip: string;
}

/** תמצית ספרות מקצועית */
export interface LiteratureDigest {
  id: string;
  source: string;
  takeaways: string[];
}

/** תקציר פסיקה מכוננת */
export interface CaseBrief {
  id: string;
  citation: string;
  facts: string;
  holding: string;
  takeaway: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DeliverablePrompt {
  id: string;
  label: string;
  placeholder: string;
  minLength?: number;
}

/** תוכן לימוד מלא למודול — הכל נלמד באפליקציה */
export interface ModuleInteractiveContent {
  moduleId: string;
  learningGoal: string;
  lessons: LessonSection[];
  statutes: StatuteCard[];
  literatureDigests: LiteratureDigest[];
  caseBriefs: CaseBrief[];
  quiz: QuizQuestion[];
  deliverablePrompts: DeliverablePrompt[];
  /** ציון מינימלי לעבור את המבחן (0–1) */
  passScore: number;
}

export interface ModuleProgress {
  layers: Partial<Record<TrainingLayerId, boolean>>;
  deliverableNotes: string;
  completedAt?: string;
  /** נצפה סרטון ההסבר של המודול */
  explainerWatchedAt?: string;
  /** מזהי שיעורים/כרטיסים שנקראו */
  readIds?: string[];
  /** תשובות לטופס התוצר */
  deliverableAnswers?: Record<string, string>;
  /** תשובות אחרונות לחידון (אינדקס אפשרות) */
  quizAnswers?: Record<string, number>;
  /** ציון אחרון בחידון (0–1) */
  quizScore?: number;
  quizPassedAt?: string;
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
