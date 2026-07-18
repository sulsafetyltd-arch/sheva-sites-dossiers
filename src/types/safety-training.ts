export type TrainingCategory = 'general' | 'fire' | 'work_at_height';
export type TrainingStatus = 'draft' | 'final';
export type ParticipantIdDocumentType = 'id_card' | 'drivers_license';

export const HEIGHT_TRAINING_TOPICS = [
  'מבוא כללי',
  'מעל לפיגומים נייחים',
  'מעל גגות שטוחים בלבד',
  'מתוך במות הרמה מתרוממות ללא נהיגה ופיגומים ממוכנים',
  'מתוך סלים להרמת אדם',
  'מעל מבנה קונסטרוקציה',
  'בתוך מקום מוקף',
] as const;

export const HEIGHT_TRAINING_PROGRAM = [
  'מהי עבודה בגובה ומהן דרישות החוק',
  'זיהוי הסיכונים השונים הקיימים בעבודה בגובה והגורמים התורמים לתאונה',
  'הכרת השיטות להגנה מפני נפילה בעבודה בגובה',
  'תרגול שימוש ברתמות ובאמצעי מגן למניעת נפילה ולבלימת נפילה',
  'תרגול מעשי של עבודה בגובה ולמידה מאירועים',
  'עבודה בטוחה על סולמות, במות הרמה, סלי הרמה, פיגומים, גגות ומבני קונסטרוקציה',
] as const;

export const GENERAL_TRAINING_TOPICS = [
  'מדיניות הבטיחות וחובות העובד והמעסיק על פי חוק',
  'גורמי סיכון בסביבת העבודה ובתפקיד',
  'ציוד מגן אישי – חובת שימוש, התאמה ותקינות',
  'בטיחות בעבודה בגובה',
  'בטיחות בעבודה עם כלי עבודה וציוד מכני',
  'בטיחות בחשמל',
  'חומרים מסוכנים – זיהוי, שילוט, אחסון וטיפול',
  'בטיחות אש, דרכי מילוט ונקודת כינוס',
  'סדר וניקיון בסביבת העבודה',
  'הרמה ושינוע ידני של מטענים',
  'דיווח על מפגעים, כמעט תאונות ותאונות עבודה',
  'עזרה ראשונה, נוהלי חירום ומספרי חירום',
] as const;

export interface HeightTrainingFormDetails {
  companyName?: string;
  companyRegistrationNumber?: string;
  companyAddress?: string;
  companyPostalCode?: string;
  companyPhone?: string;
  managerName?: string;
  managerSignatureDataUrl?: string;
  translatorLanguage?: string;
  translatorName?: string;
  translatorSignatureDataUrl?: string;
  instructorIdNumber?: string;
  instructorExperienceYears?: number;
  instructorAuthorizationExpiry?: string;
  instructorAddress?: string;
  instructorEmail?: string;
  validFrom?: string;
  validUntil?: string;
  certificateScope?: string;
  selectedTopics?: string[];
  siteAddress?: string;
  startTime?: string;
  endTime?: string;
  instructorOrganization?: string;
  instructorStampDataUrl?: string;
  generalSelectedTopics?: string[];
  generalOtherTopic1?: string;
  generalOtherTopic2?: string;
}

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
  formDetails?: HeightTrainingFormDetails;
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
  firstName?: string;
  lastName?: string;
  fatherName?: string;
  birthYear?: number;
  address?: string;
  idDocumentType?: ParticipantIdDocumentType;
  idDocumentStoragePath?: string;
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
