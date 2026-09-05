export type TrainingCategory = 'general' | 'fire' | 'work_at_height' | 'ramp_loading';
export type TrainingStatus = 'draft' | 'final';
export type ParticipantIdDocumentType = 'id_card' | 'drivers_license';

export type ConstructionInductionLanguage =
  | 'he' | 'ar' | 'en' | 'ru' | 'zh' | 'tr' | 'ti' | 'ro' | 'hi';

export type RampWorkLanguage = 'he' | 'en' | 'ar' | 'other';
export type RampTrainingLocationType = 'classroom' | 'on_site' | 'other';
export type RampTrainingMethod = 'lecture' | 'practical_demo' | 'video' | 'combined';
export type RampTrainingKind = 'initial' | 'annual' | 'after_procedure_change' | 'after_incident';
export type RampTrainerEvaluation = 'approved' | 'needs_refresh' | 'failed';

export const RAMP_FORM_META = {
  formId: 'SOL-FORM-001',
  version: '1.0',
  procedureId: 'SOL-WP-001',
  title: 'טופס הדרכה ואישור עובד מורשה',
  subtitle: 'עבודה בעמדת רמפה לטעינה ופריקת מטענים',
  retentionYears: 7,
} as const;

/** Client-specific form — shown only for Bio-Rad / ביוראד. */
export function isBioradClientName(name?: string | null): boolean {
  if (!name) return false;
  const normalized = name.toLowerCase().replace(/[\s\-_.]/g, '');
  return (
    normalized.includes('biorad')
    || normalized.includes('bio-rad'.replace(/-/g, ''))
    || name.includes('ביוראד')
    || name.includes('ביו ראד')
    || name.includes('ביו-ראד')
  );
}

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

/** SOL-FORM-001 Part B — topics covered in ramp-loading training. */
export const RAMP_TRAINING_TOPICS = [
  'מבנה עמדת הרמפה והאמצעים הקיימים (מעקה תיקני, לוח רגליים, שער מתנייע, שילוט)',
  'הסיכונים הקיימים: נפילה לעומק, פגיעה ממטענים נופלים, התנגשות עם רכבים',
  'נוהל הפעלה צעד-אחר-צעד: בדיקה לפני שימוש, פתיחת שער, העברת מטענים, סגירה',
  'איסורים מוחלטים: הסעת אדם, טיפוס על המעקה, חריגה מעבר למעקה',
  'חובת ציוד מגן אישי: נעלי בטיחות, אפוד זוהר, כפפות עבודה',
  'נוהל חירום: מקרה של נפילת אדם, נפילת חפץ, תקלה במעקה או בשער',
  'טלפונים לחירום: מד״א 101, כיבוי אש 102, משטרה 100',
  'פרטי קשר עם ממונה הבטיחות ומנהל המחסן',
  'חובת דיווח על תקלות וליקויים – למי, איך ומתי',
  'הדגמה במקום של הפעלת השער, נעילתו, ושימוש בציוד המגן',
  'מסירת עותק כתוב של נוהל העבודה (SOL-WP-001) לעובד',
] as const;

export const RAMP_QUIZ_QUESTIONS = [
  {
    id: 'q1' as const,
    prompt: 'מהו גובהו של אזן המעקה העליון בעמדת הרמפה?',
    options: [
      { value: '70', label: '70 ס״מ' },
      { value: '90', label: '90 ס״מ' },
      { value: '100-104', label: '100–104 ס״מ' },
      { value: '150', label: '150 ס״מ' },
    ],
  },
  {
    id: 'q2' as const,
    prompt: 'האם מותר להעביר אנשים על משטח הרמפה?',
    options: [
      { value: 'forbidden', label: 'לא, אסור בהחלט' },
      { value: 'manager_ok', label: 'כן, באישור מנהל' },
      { value: 'emergency', label: 'כן, במקרה חירום' },
    ],
  },
  {
    id: 'q3' as const,
    prompt: 'למי מדווחים על תקלה במעקה?',
    options: [
      { value: 'fix_self', label: 'מתקנים בעצמנו' },
      { value: 'report', label: 'מדווחים לממונה הבטיחות ולמנהל המחסן' },
      { value: 'continue', label: 'ממשיכים לעבוד' },
    ],
  },
  {
    id: 'q4' as const,
    prompt: 'מתי מותר לפתוח את שער הרמפה?',
    options: [
      { value: 'other_ok', label: 'באישור עובד אחר' },
      { value: 'vehicle_secured', label: 'רק כאשר רכב ההובלה במקום ומאובטח' },
      { value: 'anytime', label: 'בכל עת' },
    ],
  },
  {
    id: 'q5' as const,
    prompt: 'איזה ציוד מגן חובה ללבוש בעבודה ברמפה?',
    options: [
      { value: 'full_ppe', label: 'נעלי בטיחות + אפוד זוהר + כפפות' },
      { value: 'gloves_only', label: 'כפפות בלבד' },
      { value: 'none', label: 'ללא צורך' },
    ],
  },
] as const;

export interface RampQuizAnswers {
  q1?: string;
  q2?: string;
  q3?: string;
  q4?: string;
  q5?: string;
  q6?: string;
}

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
  generalTrainingRecordType?: 'annual_safety' | 'new_employee';
  constructionInductionLanguage?: ConstructionInductionLanguage;
  includeIdDocumentsInGroupPdf?: boolean;
  /** SOL-FORM-001 session fields */
  rampSelectedTopics?: string[];
  rampDurationMinutes?: number;
  rampLocationType?: RampTrainingLocationType;
  rampLocationOther?: string;
  rampMethods?: RampTrainingMethod[];
  rampTrainingKind?: RampTrainingKind;
  rampNextDueDate?: string;
  warehouseManagerName?: string;
  warehouseManagerSignatureDataUrl?: string;
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
  /** SOL-FORM-001 Part A */
  department?: string;
  startWorkDate?: string;
  mobilePhone?: string;
  workLanguage?: RampWorkLanguage;
  workLanguageOther?: string;
  /** SOL-FORM-001 Part D */
  rampQuiz?: RampQuizAnswers;
  trainerEvaluation?: RampTrainerEvaluation;
  refreshDate?: string;
  trainerNotes?: string;
  signedTime?: string;
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
  ramp_loading: {
    label: 'הדרכת עמדת רמפה (SOL-FORM-001)',
    shortLabel: 'רמפה',
    defaultTopic: 'עבודה בעמדת רמפה לטעינה ופריקת מטענים — נוהל SOL-WP-001',
    content: [...RAMP_TRAINING_TOPICS],
  },
};

export const trainingCategoryLabel = (category: TrainingCategory) =>
  TRAINING_CATEGORY_DETAILS[category].label;
