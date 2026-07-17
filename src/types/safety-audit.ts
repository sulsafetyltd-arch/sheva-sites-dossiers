export type RiskLevel = 'low' | 'medium' | 'high';
export type ReportStatus = 'draft' | 'final';
export type ChecklistStatus = 'ok' | 'not_ok' | 'na';
export type DefectSeverity = 'high' | 'medium' | 'low';
export type ReportType = 'workplace' | 'construction' | 'infrastructure';

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
  checklist?: Record<string, ChecklistItemState>;
  createdAt: string;
  updatedAt: string;
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
  sortOrder?: number;
  createdAt: string;
}

export interface SafetyAuditDefectPhoto {
  id: string;
  defectId: string;
  storagePath: string;
  caption?: string;
  takenAt?: string; // ISO
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

/** @deprecated use WORKPLACE_CHECKLIST_TOPICS or getChecklistTopics(type) */
export const CHECKLIST_TOPICS = WORKPLACE_CHECKLIST_TOPICS;

export function getChecklistTopics(type: ReportType = 'workplace'): ChecklistTopic[] {
  if (type === 'construction') return CONSTRUCTION_CHECKLIST_TOPICS;
  if (type === 'infrastructure') return INFRASTRUCTURE_CHECKLIST_TOPICS;
  return WORKPLACE_CHECKLIST_TOPICS;
}

export function reportTypeLabel(type: ReportType): string {
  if (type === 'construction') return 'אתר בנייה';
  if (type === 'infrastructure') return 'אתר תשתיות';
  return 'אתר עבודה';
}

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
