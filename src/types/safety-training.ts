export type TrainingCategory = 'general' | 'fire' | 'work_at_height';
export type TrainingStatus = 'draft' | 'final';

export interface SafetyTrainingSession {
  id: string;
  clientId: string;
  category: TrainingCategory;
  sessionNumber?: string;
  status: TrainingStatus;
  trainingDate: string;
  location?: string;
  topic: string;
  durationHours?: number;
  language?: string;
  notes?: string;
  instructorName?: string;
  instructorRole?: string;
  instructorPhone?: string;
  instructorLicenseNumber?: string;
  instructorSignatureDataUrl?: string;
  instructorSignedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyTrainingParticipant {
  id: string;
  sessionId: string;
  sortOrder: number;
  employeeName: string;
  employeeIdNumber?: string;
  employer?: string;
  jobTitle?: string;
  signatureStoragePath?: string;
  signedAt?: string;
  remarks?: string;
  createdAt: string;
}

export const TRAINING_CATEGORY_DETAILS: Record<
  TrainingCategory,
  { label: string; shortLabel: string; defaultTopic: string; content: string[] }
> = {
  general: {
    label: 'הדרכת בטיחות כללית',
    shortLabel: 'כללית',
    defaultTopic: 'הדרכת בטיחות כללית לעובדים',
    content: [
      'הכרת הסיכונים במקום העבודה וכללי התנהגות בטוחה',
      'שימוש בציוד מגן אישי ודיווח על מפגעים',
      'כללי חירום, עזרה ראשונה ודרכי מילוט',
      'איסור ביצוע עבודה ללא הכשרה, הסמכה או אישור מתאים',
    ],
  },
  fire: {
    label: 'הדרכת בטיחות אש',
    shortLabel: 'אש',
    defaultTopic: 'הדרכת בטיחות אש ומניעת דליקות',
    content: [
      'גורמי סיכון לדליקה ופעולות למניעתה',
      'זיהוי אמצעי כיבוי והתאמתם לסוג השריפה',
      'דיווח, פינוי ודרכי מילוט בשעת חירום',
      'הפעלה בטוחה של מטפה ללא סיכון עצמי',
    ],
  },
  work_at_height: {
    label: 'הדרכת עבודה בגובה',
    shortLabel: 'עבודה בגובה',
    defaultTopic: 'הדרכת בטיחות לעבודה בגובה',
    content: [
      'הערכת סיכונים ותכנון עבודה בגובה',
      'ציוד מגן אישי, רתמות, נקודות עיגון ומערכות בלימה',
      'עבודה בטוחה על סולמות, גגות, פיגומים ובמות הרמה',
      'בדיקות ציוד, חילוץ ותגובה במצב חירום',
    ],
  },
};

export const trainingCategoryLabel = (category: TrainingCategory) =>
  TRAINING_CATEGORY_DETAILS[category].label;
