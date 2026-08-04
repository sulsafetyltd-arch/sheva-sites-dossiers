import {
  EDUCATION_SECTIONS,
} from '@/data/education-moe-catalog';

export type RiskLevel = 'low' | 'medium' | 'high';
export type ReportStatus = 'draft' | 'final';
export type ChecklistStatus = 'ok' | 'not_ok' | 'na';
export type DefectSeverity = 'high' | 'medium' | 'low';
/** Lifecycle of a finding after the audit visit. */
export type DefectLifecycleStatus = 'open' | 'fixed' | 'verified';
export type DefectPhotoKind = 'before' | 'after';
export type ReportType =
  | 'workplace'
  | 'construction'
  | 'infrastructure'
  | 'railway'
  | 'building_survey'
  | 'education_institution';

export interface SafetyAuditClient {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItemState {
  status: ChecklistStatus;
  notes?: string;
  findings?: string;
  responsible?: string;
}

export interface SafetyAuditReport {
  id: string;
  clientId: string;
  reportType: ReportType;
  reportNumber?: string;
  date: string; // ISO date
  recipient?: string;
  riskLevel?: RiskLevel;
  immediateAction?: boolean;
  executiveSummary?: string;
  siteName?: string;
  /** Construction: project name */
  projectName?: string;
  /** Construction: גוש */
  block?: string;
  /** Construction: מגרש */
  parcel?: string;
  contractor?: string;
  auditDate?: string; // ISO date
  auditor?: string;
  auditorRole?: string;
  auditorPhone?: string;
  attendees?: string;
  siteManager?: string;
  workHours?: string;
  workersCount?: number;
  workStage?: string;
  /** Construction: free-text work stages */
  workStagesDetail?: string;
  status: ReportStatus;
  siteManagerSignatureUrl?: string;
  auditorSignatureUrl?: string;
  auditorStampUrl?: string;
  siteManagerSignedAt?: string;
  auditorSignedAt?: string;
  /** Set when the report is formally finalized/locked. */
  finalizedAt?: string;
  finalizedBy?: string;
  finalizedByUserId?: string;
  /** Immutable copy of report + defects + photos at finalize time. */
  finalSnapshot?: SafetyAuditFinalSnapshot;
  /** Storage path of the PDF generated at finalize time. */
  finalPdfPath?: string;
  checklist?: Record<string, ChecklistItemState>;
  domainDetails?: RailwayReportDetails;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyAuditFinalSnapshot {
  version: 1;
  capturedAt: string;
  report: SafetyAuditReport;
  defects: SafetyAuditDefect[];
  photos: Array<SafetyAuditDefectPhoto & {
    defectDescription?: string;
    severity?: string;
    checklistTopicKey?: string;
  }>;
}

export interface RailwayTourParticipant {
  name: string;
  role?: string;
  notes?: string;
}

export interface RailwayPreviousFinding {
  description: string;
  instructions?: string;
  status?: string;
  responsible?: string;
  dueDate?: string;
}

export interface RailwayReportDetails {
  attention?: string;
  copyTo?: string;
  railwayKmFrom?: string;
  railwayKmTo?: string;
  previousVisitDate?: string;
  participants?: RailwayTourParticipant[];
  previousFindings?: RailwayPreviousFinding[];
  buildingAddress?: string;
  buildingContactName?: string;
  buildingContactPhone?: string;
  fireApprovalDate?: string;
  structuralApprovalDate?: string;
  electricalApprovalDate?: string;
  approvalDecision?: 'approved' | 'not_approved';
  approvalValidUntil?: string;
  approverLicenseNumber?: string;
  /** Education institution (משרד החינוך) */
  ownership?: string;
  institutionSymbol?: string;
  studentsCount?: string;
  yearBuilt?: string;
  institutionPhone?: string;
  principalName?: string;
  inspectorName?: string;
  institutionParticipants?: string;
  authorityParticipants?: string;
  /** גן ילדים / בית ספר / פנימייה / כפר נוער */
  institutionKind?: 'kindergarten' | 'school' | 'boarding' | 'youth_village' | 'other';
  /** Selected chapter-1 approval keys from the MoE pool */
  selectedApprovalKeys?: string[];
  /** Status notes per selected approval */
  approvalStatuses?: Record<string, { status?: 'presented' | 'missing' | 'na'; notes?: string }>;
  /** Selected MoE section keys the auditor chose to examine */
  selectedSectionKeys?: string[];
}

export interface SafetyAuditDefect {
  id: string;
  reportId: string;
  checklistTopicKey?: string;
  description: string;
  severity: DefectSeverity;
  correctiveAction?: string;
  responsible?: string;
  dueDate?: string; // ISO date
  /** open → fixed → verified */
  status: DefectLifecycleStatus;
  fixedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  resolutionNotes?: string;
  sortOrder?: number;
  createdAt: string;
}

export interface SafetyAuditDefectPhoto {
  id: string;
  defectId: string;
  storagePath: string;
  caption?: string;
  takenAt?: string; // ISO
  /** before = audit finding; after = proof of repair */
  photoKind: DefectPhotoKind;
  createdAt: string;
}

export interface ChecklistTopic {
  key: string;
  title: string;
  chapter?: string;
  defaultFindings?: string;
  defaultResponsible?: string;
}

/** Workplace / אתר עבודה — original 10-topic checklist */
export const WORKPLACE_CHECKLIST_TOPICS: ChecklistTopic[] = [
  { key: 'traffic_and_signage', title: 'הסדרי תנועה ושילוט הכוונה' },
  { key: 'heavy_machinery_insurance', title: 'כלים הנדסיים בשטח – ביטוח ורישיונות בתוקף' },
  { key: 'portable_tools', title: 'כלי עבודה מטלטלים – תקינות ובדיקות' },
  { key: 'safety_signage', title: 'שילוט בטיחות ואזהרה' },
  { key: 'electric', title: 'חשמל – לוחות, כבילה והארקה' },
  { key: 'ppe', title: 'ציוד מגן אישי (קסדה, נעליים, אפוד, רתמות)' },
  { key: 'fencing', title: 'גידור והפרדת אזור העבודה' },
  { key: 'hygiene', title: 'גהות – מנוחה, הפסקות, שירותים ומי שתייה' },
  { key: 'training', title: 'הדרכות בטיחות והחתמת עובדים בשפה מובנת' },
  { key: 'management', title: 'ניהול עבודה ופיקוח בטיחותי באתר' },
];

/** Construction / אתר בנייה — 26-item checklist from construction form */
export const CONSTRUCTION_CHECKLIST_TOPICS: ChecklistTopic[] = [
  {
    key: 'c_order',
    chapter: 'כללי',
    title: 'סדר וארגון באתר',
    defaultResponsible: 'מנהל העבודה',
    defaultFindings: 'יש לוודא שאתר הבנייה יהיה סגור בעת העבודה בו.',
  },
  {
    key: 'c_ppe',
    chapter: 'כללי',
    title: 'ציוד מגן אישי כולל ציוד לעבודה בגובה',
    defaultResponsible: 'מנהל העבודה',
    defaultFindings:
      'אבקש לוודא שהעובדים בגובה עם רתמות בטיחות בכל עבודה הדורשת הירתמות! יש לוודא שכלל העובדים עובדים עם קסדה תקנית ונעלי בטיחות כנדרש בתקנה.',
  },
  {
    key: 'c_safety_file',
    chapter: 'כללי',
    title: 'תיק בטיחות באתר + תוכנית ארגון אתר',
    defaultResponsible: 'מנהל העבודה',
    defaultFindings: 'אבקש לעדכן את תיק הבטיחות.',
  },
  {
    key: 'c_general_register',
    chapter: 'כללי',
    title: 'פנקס כללי',
    defaultResponsible: 'מנהל העבודה',
    defaultFindings: 'באחריות מנהל העבודה לעדכן את הפנקס הכללי + פנקס עגורן.',
  },
  {
    key: 'c_appointments',
    chapter: 'כללי',
    title: 'מינוי מנהל עבודה + עוזר בטיחות לאתר',
    defaultResponsible: 'בעלים',
    defaultFindings: 'חובה על עוזר הבטיחות למלא את רשימת התיוג מידי יום ולתייקם בתיק הבטיחות של האתר.',
  },
  {
    key: 'c_training',
    chapter: 'כללי',
    title: 'קיום הדרכות והסמכות (גובה, חשמל, אישורי עבודה)',
    defaultResponsible: 'מנהל העבודה',
    defaultFindings: 'באחריות מנהל העבודה לוודא אישורי הדרכה, עבודה והסמכות לעובדים בתוקף.',
  },
  {
    key: 'c_hygiene',
    chapter: 'כללי',
    title: 'גהות תעסוקתית (ניקיון שירותים, מטבחון, מקום מנוחה ואוכל מוצל)',
    defaultResponsible: 'מנהל העבודה',
  },
  {
    key: 'c_signage',
    chapter: 'כללי',
    title: 'שילוט',
    defaultResponsible: 'מנהל העבודה',
    defaultFindings:
      'יש להציג שלט, במקום בולט לעין, בו יצוינו: שם מבצע הבנייה ומענו, שם מנהל העבודה ומענו (כולל מס׳ טלפון נייד), ומהות העבודה.',
  },
  {
    key: 'c_extension_cable',
    chapter: 'כלי עבודה מטלטלים',
    title: 'תקינות כבל מאריך חשמלי כולל קיום פחת',
    defaultResponsible: 'מנהל עבודה',
    defaultFindings: 'באחריות מנהל העבודה לוודא תקינות כבלי החשמל לפני תחילת עבודה.',
  },
  {
    key: 'c_earthing',
    chapter: 'חשמל',
    title: 'הארקות',
    defaultResponsible: 'מנהל עבודה',
    defaultFindings: 'קיים אישור בתיק הבטיחות.',
  },
  {
    key: 'c_electric_cabinet',
    chapter: 'חשמל',
    title: 'ארון חשמל',
    defaultResponsible: 'מנהל עבודה',
    defaultFindings: 'באחריות מנהל העבודה לוודא קיום בדיקות באתר.',
  },
  {
    key: 'c_sockets',
    chapter: 'חשמל',
    title: 'תקינות שקעים',
    defaultResponsible: 'מנהל עבודה',
    defaultFindings: 'באחריות מנהל העבודה לוודא תקינות השקעים.',
  },
  {
    key: 'c_ladders',
    chapter: 'סולמות',
    title: 'תקינות הסולם',
    defaultResponsible: 'מנהל עבודה',
    defaultFindings:
      'לפי ת"י 1847 תקן סולמות סעיף 6.2.6: תיקונים בסולמות ייעשו ע"י היצרן. במקרה של סולם פגום יש לשלוח לתיקון אצל היצרן — מנהל העבודה לא רשאי לתקנו!',
  },
  {
    key: 'c_lifting_gear',
    chapter: 'אביזרי הרמה',
    title: 'בדיקה ע"י בודק מוסמך לאביזרים + תיעוד בדיקת אביזר הרמה כל 6 חודשים',
    defaultResponsible: 'מנהל עבודה',
    defaultFindings: 'באחריות מנהל העבודה לבדוק תוקף האישורים.',
  },
  {
    key: 'c_crane',
    chapter: 'עגורן',
    title: 'המצאות תסקיר מנוף',
    defaultResponsible: 'מנהל עבודה',
    defaultFindings: 'אבקש שלפני תחילת עבודת העגורנים יש לבדוק את תקינותם ולרשום בפנקס העגורן.',
  },
  {
    key: 'c_machinery',
    chapter: 'כלים הנדסיים',
    title: 'רישיונות כלים הנדסיים',
    defaultResponsible: 'מנהל עבודה',
    defaultFindings: 'באחריות מנהל העבודה לוודא רישיונות וביטוחים לציוד ההנדסי.',
  },
  {
    key: 'c_scaffolding',
    chapter: 'פיגומים',
    title: 'יציבות הפיגומים',
    defaultResponsible: 'מנהל עבודה',
    defaultFindings: 'באחריות מנהל העבודה לוודא בדיקה של הפיגומים וחוזקם כולל הדיאגונלים שלהם.',
  },
  {
    key: 'c_stair_lighting',
    chapter: 'חדרי מדרגות',
    title: 'תאורת חדרי מדרגות',
    defaultResponsible: 'מנהל עבודה',
    defaultFindings: 'באחריות מנהל העבודה לוודא תקינות התאורה בחדרי המדרגות.',
  },
  {
    key: 'c_building_rail',
    chapter: 'מעקות',
    title: 'מעקה לבניין',
    defaultResponsible: 'מנהל עבודה',
    defaultFindings:
      'באחריות מנהל העבודה לוודא בדיקת שלמות המעקות כנדרש. יש להתקין מעקות בטיחות בגרמי המדרגות ובמשטחי העבודה (בגובה של לפחות 1.10 מ\') ובשאר מקומות עם הפרשי גובה העולים על 2 מטרים.',
  },
  {
    key: 'c_roof_rail',
    chapter: 'מעקות',
    title: 'מעקה לגג',
    defaultResponsible: 'מנהל עבודה',
    defaultFindings:
      'באחריות מנהל העבודה לוודא בדיקת שלמות המעקות באופן תמידי. יש לוודא שהעובדים בגג עובדים עם צמ"א כנדרש בעבודה בגובה, וכן להתקין מערכות למניעת נפילה כנדרש.',
  },
  {
    key: 'c_work_platforms',
    chapter: 'משטחי עבודה',
    title: 'משטחי עבודה בבניין',
    defaultResponsible: 'מנהל עבודה',
    defaultFindings:
      'יש להתקין גידורים למשטחי עבודה ומדרכי מעבר בחתך ובגובה הנדרש בתקנות, ויחוברו לזקפים באופן שיימנע ניתוקם המקרי. לא יהיו משטחי דריכה מאולתרים.',
  },
  {
    key: 'c_utility_shafts',
    chapter: 'פירים',
    title: 'פירי תשתיות',
    defaultResponsible: 'מנהל עבודה',
    defaultFindings:
      'מסביב לפתח ברצפה, במשטח עבודה, במדרכת מעבר, ברצפות פיגום, בגג, במסלול מדרגות או בפיר מעלית יותקן גידור או מכסה בעל חוזק מתאים למניעת נפילת אדם, חומרים או ציוד.',
  },
  {
    key: 'c_elevator_shafts',
    chapter: 'פירים',
    title: 'פירי מעליות',
    defaultResponsible: 'מנהל עבודה',
    defaultFindings: 'באחריות מנהל העבודה לוודא שפירי המעליות סגורים.',
  },
  {
    key: 'c_fire',
    chapter: 'כיבוי אש',
    title: 'המצאות מטפים וציוד כיבוי אש',
    defaultResponsible: 'מנהל עבודה',
  },
  {
    key: 'c_perimeter',
    chapter: 'גידור',
    title: 'גידור היקפי של האתר',
    defaultResponsible: 'מנהל עבודה',
  },
  {
    key: 'c_first_aid',
    chapter: 'עזרה ראשונה וחירום',
    title: 'ארון עזרה ראשונה',
    defaultResponsible: 'מנהל עבודה',
  },
];

/** Infrastructure / אתר תשתיות — checklist from the supplied infrastructure audit form */
export const INFRASTRUCTURE_CHECKLIST_TOPICS: ChecklistTopic[] = [
  { key: 'i_1_1', chapter: 'ניהול, מסמכים והיתרים', title: 'מינוי מנהל עבודה בתוקף ורישומו בפנקס הכללי' },
  { key: 'i_1_2', chapter: 'ניהול, מסמכים והיתרים', title: 'הודעה על פעולת בנייה למינהל הבטיחות והבריאות התעסוקתית' },
  { key: 'i_1_3', chapter: 'ניהול, מסמכים והיתרים', title: 'פנקס כללי מעודכן וזמין באתר' },
  { key: 'i_1_4', chapter: 'ניהול, מסמכים והיתרים', title: 'תוכנית ניהול בטיחות / סקר סיכונים עדכני לפרויקט' },
  { key: 'i_1_5', chapter: 'ניהול, מסמכים והיתרים', title: 'תוכנית ארגון אתר עדכנית ותואמת את המצב בשטח' },
  { key: 'i_1_6', chapter: 'ניהול, מסמכים והיתרים', title: 'היתרי עבודה נדרשים (חפירה, עבודה בחום, כניסה למקום מוקף)' },
  { key: 'i_1_7', chapter: 'ניהול, מסמכים והיתרים', title: 'רשימת קבלני משנה מאושרת ואישורי בטיחות נלווים' },
  { key: 'i_2_1', chapter: 'גידור, שילוט והסדרי תנועה', title: 'גידור היקפי תקין, שלם ויציב סביב אזורי העבודה' },
  { key: 'i_2_2', chapter: 'גידור, שילוט והסדרי תנועה', title: 'שלט אתר הכולל את פרטי מבצע הבנייה ומנהל העבודה' },
  { key: 'i_2_3', chapter: 'גידור, שילוט והסדרי תנועה', title: 'שילוט אזהרה והכוונה בהתאם לסיכונים ובשפות הרלוונטיות' },
  { key: 'i_2_4', chapter: 'גידור, שילוט והסדרי תנועה', title: 'הסדרי תנועה זמניים מאושרים בעבודה בסמוך לדרך פעילה' },
  { key: 'i_2_5', chapter: 'גידור, שילוט והסדרי תנועה', title: 'הפרדה בין הולכי רגל לכלי רכב וצמ״ה, ומעברים בטוחים' },
  { key: 'i_2_6', chapter: 'גידור, שילוט והסדרי תנועה', title: 'תאורה, סימון ואמצעי התרעה בשעות חשכה ובראות לקויה' },
  { key: 'i_3_1', chapter: 'עבודות עפר, חפירות ותשתיות תת־קרקעיות', title: 'אישורי חפירה ותיאום עם בעלי תשתיות (חשמל, מים, תקשורת, גז)' },
  { key: 'i_3_2', chapter: 'עבודות עפר, חפירות ותשתיות תת־קרקעיות', title: 'איתור וסימון תשתיות תת־קרקעיות בשטח טרם תחילת החפירה' },
  { key: 'i_3_3', chapter: 'עבודות עפר, חפירות ותשתיות תת־קרקעיות', title: 'דיפון או שיפוע דפנות בהתאם לעומק החפירה ולסוג הקרקע' },
  { key: 'i_3_4', chapter: 'עבודות עפר, חפירות ותשתיות תת־קרקעיות', title: 'הרחקת ערימות עפר, ציוד ועומסים משפת החפירה' },
  { key: 'i_3_5', chapter: 'עבודות עפר, חפירות ותשתיות תת־קרקעיות', title: 'אמצעי ירידה ועלייה תקינים לחפירה ובמרחקים הנדרשים' },
  { key: 'i_3_6', chapter: 'עבודות עפר, חפירות ותשתיות תת־קרקעיות', title: 'גידור, כיסוי וסימון חפירות פתוחות, לרבות בגמר יום העבודה' },
  { key: 'i_3_7', chapter: 'עבודות עפר, חפירות ותשתיות תת־קרקעיות', title: 'בדיקת יציבות דפנות לאחר גשם או הפסקת עבודה ממושכת' },
  { key: 'i_4_1', chapter: 'ציוד מכני הנדסי (צמ״ה) וכלי הרמה', title: 'תסקירי בדיקה בתוקף לכלי הרמה ולאביזרי הרמה' },
  { key: 'i_4_2', chapter: 'ציוד מכני הנדסי (צמ״ה) וכלי הרמה', title: 'מפעילים בעלי רישיונות והסמכות מתאימים' },
  { key: 'i_4_3', chapter: 'ציוד מכני הנדסי (צמ״ה) וכלי הרמה', title: 'עגורנאי / אתת מוסמך בהתאם לסוג העבודה' },
  { key: 'i_4_4', chapter: 'ציוד מכני הנדסי (צמ״ה) וכלי הרמה', title: 'התקני התרעת נסיעה לאחור ונצנצים תקינים בכלים' },
  { key: 'i_4_5', chapter: 'ציוד מכני הנדסי (צמ״ה) וכלי הרמה', title: 'שמירת מרחקי בטיחות מעובדים רגליים ומשפת החפירה' },
  { key: 'i_5_1', chapter: 'עבודה בגובה, פיגומים וסולמות', title: 'הדרכת עבודה בגובה בתוקף לעובדים הרלוונטיים' },
  { key: 'i_5_2', chapter: 'עבודה בגובה, פיגומים וסולמות', title: 'ציוד מגן אישי לעבודה בגובה תקין, תקני ונבדק' },
  { key: 'i_5_3', chapter: 'עבודה בגובה, פיגומים וסולמות', title: 'פיגומים תקינים שנבדקו ואושרו בהתאם לנדרש' },
  { key: 'i_5_4', chapter: 'עבודה בגובה, פיגומים וסולמות', title: 'סולמות תקינים, מקובעים ובאורך מתאים' },
  { key: 'i_5_5', chapter: 'עבודה בגובה, פיגומים וסולמות', title: 'אמצעים למניעת נפילה מפתחים, פירים ותאי בקרה' },
  { key: 'i_6_1', chapter: 'חשמל באתר וקרבה לקווי מתח', title: 'לוח חשמל זמני תקין הכולל מפסקי מגן (פחת)' },
  { key: 'i_6_2', chapter: 'חשמל באתר וקרבה לקווי מתח', title: 'כבלים מוגנים, מורמים ומרוחקים ממים ומדרכי נסיעה' },
  { key: 'i_6_3', chapter: 'חשמל באתר וקרבה לקווי מתח', title: 'עבודות חשמל מבוצעות על ידי חשמלאי מוסמך בלבד' },
  { key: 'i_6_4', chapter: 'חשמל באתר וקרבה לקווי מתח', title: 'שמירת מרחקי בטיחות מקווי מתח עיליים ותת־קרקעיים' },
  { key: 'i_7_1', chapter: 'ציוד מגן אישי (צמ״א)', title: 'קסדות מגן, נעלי בטיחות ואפודים זוהרים לכלל השוהים באתר' },
  { key: 'i_7_2', chapter: 'ציוד מגן אישי (צמ״א)', title: 'ציוד ייעודי בהתאם לסיכון: מגני שמיעה, משקפי מגן, מסכות וכפפות' },
  { key: 'i_7_3', chapter: 'ציוד מגן אישי (צמ״א)', title: 'שימוש בפועל בציוד המגן ואכיפה על ידי מנהל העבודה' },
  { key: 'i_8_1', chapter: 'חומרים מסוכנים, דלקים וכיבוי אש', title: 'אחסון דלקים ושמנים במאצרות והרחק ממקורות הצתה' },
  { key: 'i_8_2', chapter: 'חומרים מסוכנים, דלקים וכיבוי אש', title: 'גיליונות בטיחות (SDS) זמינים לחומרים שבשימוש' },
  { key: 'i_8_3', chapter: 'חומרים מסוכנים, דלקים וכיבוי אש', title: 'מטפי כיבוי זמינים, תקינים ובתוקף בסמוך למוקדי סיכון' },
  { key: 'i_9_1', chapter: 'רווחת עובדים ועזרה ראשונה', title: 'מי שתייה קרירים בכמות מספקת ובנגישות לעובדים' },
  { key: 'i_9_2', chapter: 'רווחת עובדים ועזרה ראשונה', title: 'הצללה ואזורי מנוחה בהתאם לתנאי מזג האוויר' },
  { key: 'i_9_3', chapter: 'רווחת עובדים ועזרה ראשונה', title: 'שירותים תקינים ונקיים בקרבת אזור העבודה' },
  { key: 'i_9_4', chapter: 'רווחת עובדים ועזרה ראשונה', title: 'ערכת עזרה ראשונה מלאה וזמינה, ומגיש עזרה ראשונה באתר' },
  { key: 'i_10_1', chapter: 'הדרכות, כשירויות ומודעות עובדים', title: 'הדרכת בטיחות לעובדים ורישום בפנקס הדרכה חתום' },
  { key: 'i_10_2', chapter: 'הדרכות, כשירויות ומודעות עובדים', title: 'הדרכות ייעודיות לסיכוני האתר (חפירות, גובה, מקום מוקף)' },
  { key: 'i_10_3', chapter: 'הדרכות, כשירויות ומודעות עובדים', title: 'מסירת מידע על סיכונים בשפה המובנת לעובדים' },
  { key: 'i_10_4', chapter: 'הדרכות, כשירויות ומודעות עובדים', title: 'כשירות בעלי תפקידים ייעודיים (אתתים, מגישי עזרה ראשונה, חשמלאים)' },
];

/** Israel Railways sites — 30-item checklist from the supplied audit form */
export const RAILWAY_CHECKLIST_TOPICS: ChecklistTopic[] = [
  { key: 'r_01', chapter: 'ניהול ותיעוד', title: 'קיום תוכנית לניהול הבטיחות וסקרי סיכונים עדכניים בהתאם לתקנות תוכנית לניהול הבטיחות, תשע״ג–2013' },
  { key: 'r_02', chapter: 'ניהול ותיעוד', title: 'מינוי מנהל עבודה והודעה על פעולת בנייה בהתאם לתקנות הבטיחות בעבודה (עבודות בנייה), 1988' },
  { key: 'r_03', chapter: 'ניהול ותיעוד', title: 'נוכחות מנהל העבודה באתר בעת ביצוע עבודות' },
  { key: 'r_04', chapter: 'ניהול ותיעוד', title: 'שילוט תקין באתר: מבצע הבנייה, מנהל העבודה, מהות העבודה וטלפוני חירום' },
  { key: 'r_05', chapter: 'ניהול ותיעוד', title: 'הדרכת כלל המועסקים והנמצאים באתר, בדגש על קרבת מסילה וסביבה מסילתית חשמלית, וניהול פנקס הדרכות' },
  { key: 'r_06', chapter: 'ניהול ותיעוד', title: 'ניהול פנקס כללי, רישומי מינויים, תאונות, תסקירים, חפירות, פיגומים וכלים הנדסיים' },
  { key: 'r_07', chapter: 'מסילה והפרדה', title: 'שלמות ותקינות גידור האתר וגדר ההפרדה ממסילה פעילה, כולל שילוט מתאים' },
  { key: 'r_08', chapter: 'מסילה והפרדה', title: 'עבודה בקרבת מסילה בהתאם לצו הבטיחות 56415, נספח הבטיחות והוראות רכבת ישראל, ובנוכחות בעלי תפקידים מוסמכים' },
  { key: 'r_09', chapter: 'חירום ומיגון', title: 'אמצעי כיבוי אש מתאימים לסוג וכמות מטען האש באתר ובסביבתו' },
  { key: 'r_10', chapter: 'חירום ומיגון', title: 'ציוד מגן אישי, בגדי עבודה, מכנסיים ארוכים ונעלי בטיחות תקניות' },
  { key: 'r_11', chapter: 'מסילה והפרדה', title: 'הגנות מפגיעה במשתמשי רציפים, לרבות נפילה או התעופפות חפצים, ציוד וגצי ריתוך' },
  { key: 'r_12', chapter: 'חשמל ומכונות', title: 'סיכונים בסביבה מסילתית חשמלית ועבודה לפי נוהל רכבת 73-01-01 „עבודה בסביבה חשמלית”' },
  { key: 'r_13', chapter: 'חשמל ומכונות', title: 'בטיחות בחשמל: כבלים, הארקות, תסקירי גנרטורים, לוחות וכלים חשמליים ושקעים תעשייתיים' },
  { key: 'r_14', chapter: 'חשמל ומכונות', title: 'מיגון וגידור חלקים מסתובבים או נעים בציוד ובמכונות' },
  { key: 'r_15', chapter: 'חפירות וגובה', title: 'הגנה וכיסוי בורות פתוחים וגידור הפרשי גובה, בדגש על קרבת מסילות פעילות' },
  { key: 'r_16', chapter: 'חפירות וגובה', title: 'אישור בכתב לחפירות בקרבת מסילה וביצוע חפירות ועבודות עפר בהתאם לתקנות' },
  { key: 'r_17', chapter: 'חפירות וגובה', title: 'עבודות קידוח: גידור, כיסוי פתחים, ארגון סביבת עבודה ושימוש ברתמות לפי הצורך' },
  { key: 'r_18', chapter: 'חפירות וגובה', title: 'פיגומים בהתאם לתקנות, בדגש על פיגומים בקרבת מסילה, סימון, בדיקה והגנה מנפילה' },
  { key: 'r_19', chapter: 'חפירות וגובה', title: 'עבודה בגובה: אישורים והדרכות בתוקף, ציוד מגן ואמצעי הגנה מנפילת אדם או חפצים' },
  { key: 'r_20', chapter: 'הרמה וצמ״ה', title: 'עגורנים ומכונות הרמה בקרבת מסילה: תוכנית הנפה, תסקירים, אתת מוסמך, אביזרי הרמה והפעלה מורשית' },
  { key: 'r_21', chapter: 'הרמה וצמ״ה', title: 'הפעלת צמ״ה וכלים באתר בקרבת מסילה: רישיונות, ביטוח, תסקירים, פנסים מהבהבים וזמזם נסיעה לאחור' },
  { key: 'r_22', chapter: 'הרמה וצמ״ה', title: 'הפעלת משאבת בטון בקרבת מסילה וקווי מתח גבוה ומקום מוסדר לניקוי הצינור' },
  { key: 'r_23', chapter: 'אש וסיכונים', title: 'עבודות באש גלויה: ציוד מגן, סביבת עבודה, מניעת התפשטות, צופה אש, כיבוי והדרכת עובדים' },
  { key: 'r_24', chapter: 'אש וסיכונים', title: 'סקר סיכונים לפני פעילות בעלת השלכה על בטיחות עובדים, מסילות או משתמשי רציפים' },
  { key: 'r_25', chapter: 'תנאי אתר וחירום', title: 'תאורה מתאימה לעבודה בחשכה, בלילה או בתנאי ראות מוגבלת' },
  { key: 'r_26', chapter: 'תנאי אתר וחירום', title: 'טיפול במפגעים כלליים, דרכי גישה, פסולת, גופים חודרים ותנאי החלקה' },
  { key: 'r_27', chapter: 'תנאי אתר וחירום', title: 'בטיחות בעת מנוחה, תפילות והפסקות והרחקה מפעילות צמ״ה, הרמה ושינוע' },
  { key: 'r_28', chapter: 'תנאי אתר וחירום', title: 'דרכי התקשרות למצבי חירום ושילוט מספרי החירום הרכבתיים במקומות בולטים' },
  { key: 'r_29', chapter: 'תנאי אתר וחירום', title: 'התאמת הפעילות למזג אוויר קיצוני: חום, רוח, אובך, גשם, ערפל, קור, בוץ ושיטפון' },
  { key: 'r_30', chapter: 'תנאי אתר וחירום', title: 'היערכות לטיפול רפואי: ערכות עזרה ראשונה, מגיש עזרה ראשונה, נגישות, שילוט והזעקת כוחות' },
];

/** Annual building safety survey — Annex 3 supplied form */
export const BUILDING_SURVEY_CHECKLIST_TOPICS: ChecklistTopic[] = [
  { key: 'bs_01', chapter: 'אזורים לבדיקה', title: 'חדרי כיתות ומסדרונות' },
  { key: 'bs_02', chapter: 'אזורים לבדיקה', title: 'סדנאות' },
  { key: 'bs_03', chapter: 'אזורים לבדיקה', title: 'חצר' },
  { key: 'bs_04', chapter: 'אזורים לבדיקה', title: 'מדרגות' },
  { key: 'bs_05', chapter: 'אזורים לבדיקה', title: 'מטבח' },
  { key: 'bs_06', chapter: 'אזורים לבדיקה', title: 'מסעדה / מזנון' },
  { key: 'bs_07', chapter: 'אזורים לבדיקה', title: 'מרתף' },
  { key: 'bs_08', chapter: 'אזורים לבדיקה', title: 'כל מקום אחר בעל סיכון בטיחותי' },
  { key: 'bs_09a', chapter: 'כיבוי אש', title: 'קיום אישור כיבוי אש בתוקף' },
  { key: 'bs_09b', chapter: 'כיבוי אש', title: 'קיום מילוטים וממלטים משריפה' },
  { key: 'bs_09c', chapter: 'כיבוי אש', title: 'קיום ותקינות ציוד גילוי וכיבוי אש' },
  { key: 'bs_10a', chapter: 'בטיחות מבנה', title: 'אישור מהנדס / הנדסאי מבנים או קונסטרוקציה הרשום בפנקס' },
  { key: 'bs_10b', chapter: 'בטיחות מבנה', title: 'תקינות ובטיחות חלונות' },
  { key: 'bs_10c', chapter: 'בטיחות מבנה', title: 'תקינות ובטיחות דלתות' },
  { key: 'bs_11', chapter: 'מערכות וציוד', title: 'תקינות מערכות חשמל על פי אישור חשמלאי מוסמך' },
  { key: 'bs_12', chapter: 'מערכות וציוד', title: 'תקינות מכונות וכלי עבודה' },
  { key: 'bs_13a', chapter: 'כלים טעוני בדיקה', title: 'מעלית' },
  { key: 'bs_13b', chapter: 'כלים טעוני בדיקה', title: 'דרגנוע' },
  { key: 'bs_13c', chapter: 'כלים טעוני בדיקה', title: 'אביזרי הרמה' },
  { key: 'bs_13d', chapter: 'כלים טעוני בדיקה', title: 'מכונות הרמה' },
  { key: 'bs_13e', chapter: 'כלים טעוני בדיקה', title: 'כלי לחץ' },
  { key: 'bs_14', chapter: 'ניהול ושילוט', title: 'שילוט בטיחות מתאים ותקין' },
  { key: 'bs_15', chapter: 'ניהול ושילוט', title: 'חוזים והסדרי בטיחות עם קבלני משנה: מטבח, ניקיון ותחזוקה' },
];

/**
 * Ministry of Education guiding checklist — section-level catalog.
 * Auditors pick relevant sections; they do not walk the full list.
 */
export const EDUCATION_INSTITUTION_CHECKLIST_TOPICS: ChecklistTopic[] = EDUCATION_SECTIONS.map((section) => ({
  key: section.key,
  chapter: `פרק ${section.chapter} — ${section.chapterTitle}`,
  title: `${section.sectionCode} — ${section.title}`,
  defaultFindings: section.specification,
}));

export const EDUCATION_GENERAL_NOTES: string[] = [
  'הממצאים אותרו מתוך השוואת המצב הקיים עם סטנדרטים ברשימות המנחות לעריכת מבדק של משרד החינוך.',
  'קדימות 0 — מפגע חמור המחייב סגירה מיידית של המקום עד אישור המשך שימוש.',
  'קדימות 1 — מפגע בטיחותי המחייב הסרה מיידית.',
  'קדימות 2 — ליקוי בטיחותי לטיפול במסגרת תכנית עבודה סדורה של הרשות/הבעלות.',
  'יש לנהל את הבטיחות במוסדות חינוך כמוגדר בחוזר מנכ״ל משרד החינוך.',
  'יש להמציא את האישורים הנדרשים לפי ריכוז הבדיקות התקופתיות (פרק 1).',
];

/** @deprecated use WORKPLACE_CHECKLIST_TOPICS or getChecklistTopics(type) */
export const CHECKLIST_TOPICS = WORKPLACE_CHECKLIST_TOPICS;

export function getChecklistTopics(type: ReportType = 'workplace'): ChecklistTopic[] {
  if (type === 'construction') return CONSTRUCTION_CHECKLIST_TOPICS;
  if (type === 'infrastructure') return INFRASTRUCTURE_CHECKLIST_TOPICS;
  if (type === 'railway') return RAILWAY_CHECKLIST_TOPICS;
  if (type === 'building_survey') return BUILDING_SURVEY_CHECKLIST_TOPICS;
  if (type === 'education_institution') return EDUCATION_INSTITUTION_CHECKLIST_TOPICS;
  return WORKPLACE_CHECKLIST_TOPICS;
}

export function reportTypeLabel(type: ReportType): string {
  if (type === 'construction') return 'אתר בנייה';
  if (type === 'infrastructure') return 'אתר תשתיות';
  if (type === 'railway') return 'אתרי רכבת ישראל';
  if (type === 'building_survey') return 'סקר בטיחות למבנה';
  if (type === 'education_institution') return 'מבדק בטיחות במוסדות חינוך';
  return 'אתר עבודה';
}

export function defectLifecycleLabel(status: DefectLifecycleStatus): string {
  if (status === 'verified') return 'אומת';
  if (status === 'fixed') return 'תוקן';
  return 'פתוח';
}

export function reportStatusLabel(status: ReportStatus): string {
  return status === 'final' ? 'סופי / נעול' : 'טיוטה';
}

export function isReportLocked(report: Pick<SafetyAuditReport, 'status'>): boolean {
  return report.status === 'final';
}

/** Defect severity labels — MoE priority scale for education audits. */
export function defectSeverityLabel(
  severity: DefectSeverity,
  reportType?: ReportType,
): string {
  if (reportType === 'education_institution') {
    if (severity === 'high') return 'קדימות 0 — סגירה מיידית';
    if (severity === 'medium') return 'קדימות 1 — הסרה מיידית';
    return 'קדימות 2 — תכנית עבודה';
  }
  if (reportType === 'railway') {
    if (severity === 'high') return '3 — אדום, אסור לעבוד';
    if (severity === 'medium') return '2 — צהוב, נדרש תיקון';
    return '1 — ירוק, סיכון קביל';
  }
  if (severity === 'high') return 'גבוהה';
  if (severity === 'medium') return 'בינונית';
  return 'נמוכה';
}

export const CORRECTIVE_ACTION_SUGGESTIONS = [
  'להפסיק את העבודה באופן מיידי עד להסרת הסיכון ואישור חידוש העבודה',
  'לגדר ולבודד את אזור הסיכון ולהציב שילוט אזהרה מתאים',
  'לתקן את המפגע בהתאם לתקנות, לתקן ולהוראות היצרן',
  'להוציא את הציוד הפגום משימוש עד לתיקונו ואישור תקינותו',
  'להחליף את הציוד או האביזר הפגום בציוד תקין ותקני',
  'להזמין בדיקה ואישור של בודק מוסמך או בעל מקצוע מורשה',
  'להשלים ולעדכן את האישורים, ההיתרים והתיעוד הנדרשים',
  'לבצע הדרכת בטיחות וריענון לעובדים ולתעד את ההדרכה',
  'לספק ציוד מגן אישי מתאים ולוודא שימוש ואכיפה בפועל',
  'לשפר את הסדר והניקיון ולפנות מכשולים מדרכי הגישה והמעבר',
  'לבצע תיקון ובדיקת חשמל באמצעות חשמלאי מוסמך',
  'להפריד בין הולכי רגל לכלי רכב וליישם הסדרי תנועה בטוחים',
  'לדפן, לשפע או לכסות את החפירה ולמנוע גישה בלתי מורשית',
  'לתעד את השלמת הטיפול בצילום ולעדכן את ממונה הבטיחות',
] as const;

export const CONSTRUCTION_GENERAL_NOTES: string[] = [
  'באחריות מנהל העבודה לוודא בדיקת מכשירי חשמל תקינים ובטוחים לשימוש; יש לוודא תקינות מעקות בטיחות בבניין ובגג.',
  'באחריות מנהל העבודה לוודא לפני תחילת העבודה ציוד מגן אישי לכל העובדים באתר הבנייה.',
  'באחריות מנהל העבודה לוודא אישורים בטיחותיים באתר הבנייה.',
  'באחריות מנהל העבודה לוודא הדרכת עובדים לפני תחילת העבודה.',
  'באחריות מנהל העבודה לוודא אישורי עבודה לגובה לעובדים ולקבלני משנה — עובד ללא אישור לגובה להוציאו מהאתר עד שיקבל הסמכה כנדרש.',
  'אביזרי הרמה, מנופים, פיגומים תלויים ובמות הרמה — יופעלו רק לאחר הצגת תסקיר בודק מוסמך ורישיונות מתאימים.',
  'כלים הנדסיים וכלי רכב ייכנסו לאתר העבודה עם רישיונות רכב תקפים, רישיון נהיגה ותעודת ביטוח בתוקף.',
  'באתר הבנייה יש להשתמש בכבלי מאריכים לחשמל מסוג HO7RN-F; כל השקעים והתקעים יהיו מושקעים.',
  'באחריות מנהל העבודה לרשום כל הפעולות באתר הבנייה בתיק הבטיחות ובפנקס הכללי.',
  'באחריות מנהל העבודה לבדוק פנקס עגורן.',
  'באחריות מנהל העבודה לוודא שפירי התשתיות סגורים ומגודרים כנדרש בתקנה.',
  'באחריות מנהל העבודה לוודא עבודה על משטחי עבודה תקינים ולא מאולתרים וכן יש לגדרם כנדרש בתקנות הבנייה.',
  'אבקש לדווח לח״מ על כל מפגע בטיחות באתר.',
  'באחריות מנהל העבודה לוודא ביצוע של רשימת התיוג פעמיים ביום ע״י עוזר הבטיחות באתר.',
];
