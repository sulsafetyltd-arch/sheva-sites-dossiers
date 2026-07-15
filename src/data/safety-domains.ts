import { SafetyDomain, Severity } from '@/types/safety-report';

export interface CatalogDefect {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: string;
  regulationHint: string;
  recommendation: string;
  /** Keywords that help local matching / prompting */
  keywords: string[];
  /**
   * Visual scene cues used by the local image analyzer
   * (e.g. trench, asphalt, orange-ppe, dark-void, cable, barrier).
   */
  visualCues?: string[];
}

export interface DomainInfo {
  id: SafetyDomain;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  defects: CatalogDefect[];
}

const constructionDefects: CatalogDefect[] = [
  {
    id: 'c-scaffold',
    title: 'פיגום לא תקין / חוסר מגן צד',
    description: 'פיגום ללא מעקות בטיחות, ללא לוחות שלמים או ללא עיגון מספק.',
    severity: 'critical',
    category: 'עבודה בגובה',
    regulationHint: 'תקנות הבטיחות בעבודה (עבודות בנייה)',
    recommendation: 'הפסקת עבודה בגובה עד השלמת מעקות, לוחות ועיגון מאושר.',
    keywords: ['פיגום', 'גובה', 'מעקה', 'scaffold'],
    visualCues: ['metal-structure', 'height', 'edge-dense'],
  },
  {
    id: 'c-helmet',
    title: 'חוסר כובע מגן / ציוד מגן אישי',
    description: 'עובדים בשטח ללא קסדה, נעלי בטיחות או אפוד זוהר.',
    severity: 'high',
    category: 'ציוד מגן אישי',
    regulationHint: 'תקנות הבטיחות בעבודה – ציוד מגן אישי',
    recommendation: 'חיוב לבישת PPE מלא בכניסה לאתר והדרכת עובדים.',
    keywords: ['קסדה', 'כובע', 'ppe', 'אפוד', 'נעליים'],
    visualCues: ['person', 'missing-ppe'],
  },
  {
    id: 'c-opening',
    title: 'פתח רצפה / פיר פתוח ללא כיסוי',
    description: 'פתח במבנה או בקרקע ללא כיסוי יציב או גידור.',
    severity: 'critical',
    category: 'נפילה',
    regulationHint: 'תקנות הבטיחות בעבודה (עבודות בנייה)',
    recommendation: 'כיסוי מיידי עם שלט אזהרה וגידור היקפי.',
    keywords: ['פתח', 'פיר', 'בור', 'נפילה'],
    visualCues: ['dark-void', 'opening', 'edge-dense'],
  },
  {
    id: 'c-electrical',
    title: 'כבל חשמל חשוף / לוח זמני לא מאובטח',
    description: 'חיווט זמני, חיבורים חשופים או לוח חשמל ללא נעילה.',
    severity: 'critical',
    category: 'חשמל',
    regulationHint: 'תקנות החשמל ובטיחות בעבודה',
    recommendation: 'ניתוק מיידי, כיסוי/החלפת כבלים ותיקון לוח ע״י חשמלאי מוסמך.',
    keywords: ['חשמל', 'כבל', 'לוח', 'חיבור'],
    visualCues: ['cable', 'electrical'],
  },
  {
    id: 'c-debris',
    title: 'פסיעה חסומה / פסולת בנייה במעבר',
    description: 'חומרי בנייה, ברזל או פסולת חוסמים מעברים ושבילי מילוט.',
    severity: 'medium',
    category: 'סדר וניקיון',
    regulationHint: 'נהלי סדר וניקיון באתר בנייה',
    recommendation: 'פינוי מיידי של המעבר וסימון אזורי אחסון מסודרים.',
    keywords: ['פסולת', 'מעבר', 'חומרים', 'סדר'],
    visualCues: ['clutter', 'debris'],
  },
];

const infrastructureDefects: CatalogDefect[] = [
  {
    id: 'i-trench',
    title: 'חפירה / תעלת תשתיות ללא גידור',
    description: 'חפירה פתוחה ליד כביש או מדרכה ללא מחסומים, כיסוי או שילוט.',
    severity: 'critical',
    category: 'חפירות',
    regulationHint: 'תקנות הבטיחות בעבודה (עבודות בנייה) – חפירות; הנחיות בטיחות בדרכים',
    recommendation: 'גידור היקפי מיידי, כיסוי/מעבר בטוח להולכי רגל ושילוט אזהרה.',
    keywords: ['חפירה', 'תעלה', 'בור', 'גידור', 'trench', 'excavation'],
    visualCues: ['trench', 'dark-void', 'dirt', 'asphalt'],
  },
  {
    id: 'i-manhole',
    title: 'תא ביוב / שוחת תקשורת פתוחה',
    description: 'מכסה שוחה חסר, שבורה או מורם מעל פני הכביש/מדרכה.',
    severity: 'critical',
    category: 'שוחות',
    regulationHint: 'דרישות בטיחות תשתיות עירוניות ומניעת נפילה',
    recommendation: 'סגירה מיידית במכסה תקני או כיסוי זמני מאושר עם סימון.',
    keywords: ['שוחה', 'ביוב', 'מכסה', 'תא', 'manhole'],
    visualCues: ['dark-void', 'opening', 'asphalt', 'round-opening'],
  },
  {
    id: 'i-utilities-exposed',
    title: 'כבלים / צנרת תת-קרקעית חשופים',
    description: 'כבלי חשמל, תקשורת או צנרת גז/מים חשופים בחפירה או מעל פני הקרקע.',
    severity: 'critical',
    category: 'תשתיות חשופות',
    regulationHint: 'תקנות החשמל, גז וחוק התשתיות',
    recommendation: 'סימון, הרחקת אנשים, דיווח לבעל התשתית וכיסוי/הגנה מיידיים.',
    keywords: ['כבל', 'צנרת', 'גז', 'מים', 'תקשורת', 'חשמל', 'חשוף'],
    visualCues: ['cable', 'pipe', 'trench', 'dirt'],
  },
  {
    id: 'i-workzone',
    title: 'אזור עבודה בדרך ללא הפרדה/שילוט',
    description: 'עבודות בכביש או בשול ללא קונוסים, מחסומים או שילוט הכוונה מספקים.',
    severity: 'critical',
    category: 'עבודה בדרכים',
    regulationHint: 'הנחיות משרד התחבורה / רשויות לניהול אתרי עבודה בדרכים',
    recommendation: 'השלמת תוכנית הסדרי תנועה, מחסומים, תאורה ושילוט תקניים.',
    keywords: ['כביש', 'קונוס', 'מחסום', 'שילוט', 'תנועה', 'work zone'],
    visualCues: ['asphalt', 'barrier', 'road', 'orange-ppe', 'yellow-mark'],
  },
  {
    id: 'i-guardrail',
    title: 'מעקה בטיחות / מחסום דרך פגום',
    description: 'מעקה מתכת שבור, חסר עיגון או עם פתח מסוכן לאורך מדרכה/גשר.',
    severity: 'high',
    category: 'הגנות דרך',
    regulationHint: 'תקני מעקות בטיחות בדרכים וגשרים',
    recommendation: 'גידור זמני מיידי ותיקון/החלפת מעקה.',
    keywords: ['מעקה', 'מחסום', 'גשר', 'מעקה בטיחות', 'guardrail'],
    visualCues: ['metal-structure', 'barrier', 'edge-dense'],
  },
  {
    id: 'i-confined',
    title: 'כניסה לחלל מוקף ללא בקרות',
    description: 'עבודה בשוחה, תא או מנהלת תשתיות ללא בדיקת אטמוספרה / השגחה.',
    severity: 'critical',
    category: 'חלל מוקף',
    regulationHint: 'תקנות הבטיחות בעבודה – חללים מוקפים',
    recommendation: 'איסור כניסה עד היתר, מדידה, אוורור ומערכת השגחה.',
    keywords: ['חלל מוקף', 'שוחה', 'מנהרה', 'אטמוספרה', 'confined'],
    visualCues: ['dark-void', 'opening', 'underground'],
  },
  {
    id: 'i-overhead',
    title: 'קרבה מסוכנת לקווי מתח עיליים',
    description: 'ציוד הרמה או פיגום בקרבה לקווי חשמל עיליים ללא מרחק בטיחות.',
    severity: 'critical',
    category: 'חשמל עילי',
    regulationHint: 'תקנות החשמל – מרחקי בטיחות מקווי מתח',
    recommendation: 'הפסקת עבודה, מדידת מרחק ותיאום עם חברת החשמל.',
    keywords: ['מתח', 'עילי', 'קו חשמל', 'מנוף', 'overhead'],
    visualCues: ['cable', 'sky', 'height', 'metal-structure'],
  },
  {
    id: 'i-night-lighting',
    title: 'עבודת לילה בתשתיות ללא תאורה מספקת',
    description: 'אתר עבודה חשוך המקשה על זיהוי מכשולים והולכי רגל.',
    severity: 'high',
    category: 'תאורה',
    regulationHint: 'דרישות תאורה בעבודות לילה באתרי תשתיות',
    recommendation: 'השלמת תאורת עבודה ותאורת אזהרה לרכב והולכי רגל.',
    keywords: ['לילה', 'תאורה', 'חושך', 'עבודת לילה'],
    visualCues: ['low-light', 'dark-void', 'road'],
  },
  {
    id: 'i-traffic-ppe',
    title: 'עובדים ליד תנועה ללא ביגוד זוהר',
    description: 'עובדי תשתיות בקרבת כביש ללא אפוד מחזיר אור / קסדה.',
    severity: 'high',
    category: 'ציוד מגן',
    regulationHint: 'דרישות PPE בעבודה בדרכים',
    recommendation: 'חיוב ביגוד זוהר מלא והפרדה פיזית מהתנועה.',
    keywords: ['אפוד', 'זוהר', 'תנועה', 'ppe', 'כביש'],
    visualCues: ['person', 'missing-ppe', 'road', 'orange-ppe'],
  },
];

const factoryDefects: CatalogDefect[] = [
  {
    id: 'f-machine-guard',
    title: 'מכונה ללא מגן בטיחות',
    description: 'חלקים נעים חשופים ללא כיסוי מגן או ללא נעילת בטיחות (LOTO).',
    severity: 'critical',
    category: 'מכונות',
    regulationHint: 'תקנות הבטיחות בעבודה (מכונות)',
    recommendation: 'הפסקת הפעלה עד התקנת מגן ותהליך נעילה/תיוג.',
    keywords: ['מכונה', 'מגן', 'חלקים נעים', 'loto'],
  },
  {
    id: 'f-chemical',
    title: 'אחסון כימיקלים לא תקין',
    description: 'מיכלים ללא תווית, אחסון מעורב מסוכן או חוסר ספיגה.',
    severity: 'high',
    category: 'חומרים מסוכנים',
    regulationHint: 'תקנות החומרים המסוכנים ו-GHS',
    recommendation: 'הפרדה לפי התאמה כימית, תוויות וציוד חירום לספיגה.',
    keywords: ['כימיקל', 'מיכל', 'תווית', 'חומ״ס'],
  },
  {
    id: 'f-noise',
    title: 'חשיפה לרעש ללא אמצעי הגנה',
    description: 'אזור רעש גבוה ללא שלטי אזהרה או אטמי אוזניים זמינים.',
    severity: 'medium',
    category: 'היגיינה תעשייתית',
    regulationHint: 'תקנות הבטיחות בעבודה (רעש)',
    recommendation: 'שלטי חובה, אספקת אטמים ומדידת רמות רעש.',
    keywords: ['רעש', 'אוזניים', 'dB'],
  },
  {
    id: 'f-fire-ext',
    title: 'מטף כיבוי חסום / פג תוקף',
    description: 'מטף לא נגיש, ללא בדיקה תקופתית או מחוץ לתוקף.',
    severity: 'high',
    category: 'כיבוי אש',
    regulationHint: 'תקנות שירותי כבאות והצלה',
    recommendation: 'פינוי גישה, בדיקה והחלפת מטפים לפי לוח שנה.',
    keywords: ['מטף', 'כיבוי', 'אש', 'fire'],
  },
  {
    id: 'f-aisle',
    title: 'מעבר חירום חסום',
    description: 'משטחים/ציוד חוסמים יציאות חירום או מסדרונות מילוט.',
    severity: 'critical',
    category: 'מילוט',
    regulationHint: 'דרישות פינוי ומילוט במפעל',
    recommendation: 'פינוי מיידי של המעבר וסימון קווי מילוט.',
    keywords: ['יציאה', 'מילוט', 'חירום', 'מעבר'],
  },
];

const officeDefects: CatalogDefect[] = [
  {
    id: 'o-exit',
    title: 'יציאת חירום חסומה / לא מסומנת',
    description: 'דלת יציאה חסומה בריהוט או ללא שילוט/תאורה.',
    severity: 'critical',
    category: 'מילוט',
    regulationHint: 'תקנות שירותי כבאות – יציאות חירום',
    recommendation: 'פינוי מיידי, שילוט ותאורת חירום תקינה.',
    keywords: ['יציאה', 'חירום', 'דלת', 'שילוט'],
  },
  {
    id: 'o-cable',
    title: 'כבלים רופפים במעבר',
    description: 'כבלים על הרצפה היוצרים סיכון להחלקה/מעידה.',
    severity: 'medium',
    category: 'החלקה ומעידה',
    regulationHint: 'נהלי בטיחות במשרד',
    recommendation: 'העברת כבלים בתעלות / כיסויי מעבר ייעודיים.',
    keywords: ['כבל', 'רצפה', 'מעידה', 'החלקה'],
  },
  {
    id: 'o-extinguisher',
    title: 'ציוד כיבוי לא נגיש',
    description: 'מטף או גלאי מוסתרים מאחורי ארונות/ציוד משרדי.',
    severity: 'high',
    category: 'כיבוי אש',
    regulationHint: 'תקנות כיבוי אש במבני משרדים',
    recommendation: 'פינוי גישה ובדיקת תקינות ציוד כיבוי.',
    keywords: ['מטף', 'גלאי', 'כיבוי'],
  },
  {
    id: 'o-ergonomics',
    title: 'עומס יתר על שקעים / מאריכים',
    description: 'שימוש במאריכים מרובים או עומס חשמלי מסוכן.',
    severity: 'high',
    category: 'חשמל',
    regulationHint: 'תקנות החשמל',
    recommendation: 'הסרת מאריכים מיותרים והוספת נקודות חשמל קבועות.',
    keywords: ['שקע', 'מאריך', 'חשמל', 'עומס'],
  },
  {
    id: 'o-storage',
    title: 'אחסון גבוה לא יציב',
    description: 'קופסאות/ציוד מעל ארונות ללא עיגון או גישה בטוחה.',
    severity: 'medium',
    category: 'אחסון',
    regulationHint: 'נהלי בטיחות במשרד',
    recommendation: 'הורדת עומסים גבוהים ועיגון מדפים.',
    keywords: ['ארון', 'אחסון', 'גבוה', 'מדף'],
  },
];

const warehouseDefects: CatalogDefect[] = [
  {
    id: 'w-rack',
    title: 'מדף אחסון פגום / עומס יתר',
    description: 'מדפים עקומים, בולטים או עם משקל מעבר לתווית העומס.',
    severity: 'critical',
    category: 'אחסון',
    regulationHint: 'תקני מדפי אחסון תעשייתיים',
    recommendation: 'פינוי מדף מסוכן, בדיקת עומס ותיקון מבני.',
    keywords: ['מדף', 'מחסן', 'עומס', 'rack'],
  },
  {
    id: 'w-forklift',
    title: 'אזור מלגזה ללא הפרדה להולכי רגל',
    description: 'אין סימון מסלולים או מחסומים בין מלגזות להולכי רגל.',
    severity: 'high',
    category: 'תנועה במחסן',
    regulationHint: 'נהלי בטיחות מלגזות',
    recommendation: 'סימון מסלולים, מחסומים והדרכת מפעילים.',
    keywords: ['מלגזה', 'הולכי רגל', 'מסלול'],
  },
  {
    id: 'w-lighting',
    title: 'תאורה לקויה במעברים',
    description: 'אזורי אחסון חשוכים המקשים על זיהוי מכשולים.',
    severity: 'medium',
    category: 'תאורה',
    regulationHint: 'דרישות תאורת עבודה',
    recommendation: 'השלמת תאורה ובדיקת גופים פגומים.',
    keywords: ['תאורה', 'חושך', 'מעבר'],
  },
  {
    id: 'w-spill',
    title: 'נוזל/שמן על הרצפה',
    description: 'סיכון החלקה מנוזלים ללא שילוט או ניקוי.',
    severity: 'high',
    category: 'החלקה',
    regulationHint: 'נהלי סדר וניקיון',
    recommendation: 'ניקוי מיידי, שלט אזהרה ובדיקת מקור הדליפה.',
    keywords: ['שמן', 'נוזל', 'החלקה', 'רצפה'],
  },
];

const publicDefects: CatalogDefect[] = [
  {
    id: 'p-slip',
    title: 'משטח חלק / מדרגות ללא מעקה',
    description: 'סיכון החלקה או נפילה באזור ציבורי.',
    severity: 'high',
    category: 'נגישות ובטיחות',
    regulationHint: 'תקנות בטיחות במבנים ציבוריים',
    recommendation: 'תיקון משטח, התקנת מעקה ושלטי אזהרה.',
    keywords: ['מדרגות', 'מעקה', 'החלקה'],
  },
  {
    id: 'p-fire-route',
    title: 'מסלול מילוט לא ברור',
    description: 'חוסר שילוט מילוט או תאורת חירום באזור ציבורי.',
    severity: 'critical',
    category: 'מילוט',
    regulationHint: 'תקנות כיבוי אש במבנים ציבוריים',
    recommendation: 'השלמת שילוט ותאורת חירום לאורך המסלול.',
    keywords: ['מילוט', 'שילוט', 'חירום'],
  },
  {
    id: 'p-crowd',
    title: 'צפיפות / חסימת יציאות באירוע',
    description: 'ריהוט או ציוד המונעים פינוי מהיר.',
    severity: 'high',
    category: 'התקהלות',
    regulationHint: 'נהלי בטיחות באירועים',
    recommendation: 'פינוי מעברים ושמירה על רוחב יציאות תקני.',
    keywords: ['צפיפות', 'יציאה', 'אירוע'],
  },
];

const generalDefects: CatalogDefect[] = [
  {
    id: 'g-ppe',
    title: 'חוסר ציוד מגן אישי',
    description: 'עובדים ללא ציוד מגן מתאים לסביבת העבודה.',
    severity: 'high',
    category: 'ציוד מגן',
    regulationHint: 'תקנות ציוד מגן אישי',
    recommendation: 'אספקת PPE מתאים ואכיפת שימוש.',
    keywords: ['ppe', 'מגן', 'קסדה', 'כפפות'],
  },
  {
    id: 'g-housekeeping',
    title: 'ליקוי סדר וניקיון',
    description: 'בלגן, פסולת או מכשולים היוצרים סיכון.',
    severity: 'medium',
    category: 'סדר וניקיון',
    regulationHint: 'נהלי Housekeeping',
    recommendation: 'ניקוי מיידי והגדרת אזורי אחסון.',
    keywords: ['סדר', 'ניקיון', 'פסולת'],
  },
  {
    id: 'g-signage',
    title: 'שילוט בטיחות חסר או פגום',
    description: 'שלטי אזהרה, איסור או הכוונה חסרים או לא קריאים.',
    severity: 'medium',
    category: 'שילוט',
    regulationHint: 'דרישות שילוט בטיחות',
    recommendation: 'החלפת/התקנת שילוט תקני ובולט.',
    keywords: ['שלט', 'שילוט', 'אזהרה'],
  },
  {
    id: 'g-first-aid',
    title: 'ערכת עזרה ראשונה חסרה / ריקה',
    description: 'אין ערכה נגישה או חסרים פריטים חיוניים.',
    severity: 'medium',
    category: 'עזרה ראשונה',
    regulationHint: 'תקנות עזרה ראשונה במקום העבודה',
    recommendation: 'השלמת ערכה ומיקום גלוי עם סימון.',
    keywords: ['עזרה ראשונה', 'ערכת'],
  },
];

export const SAFETY_DOMAINS: DomainInfo[] = [
  {
    id: 'construction',
    label: 'אתר בנייה',
    shortLabel: 'בנייה',
    description: 'פיגומים, עבודה בגובה, חשמל זמני וציוד מגן',
    icon: 'HardHat',
    defects: constructionDefects,
  },
  {
    id: 'factory',
    label: 'מפעל / תעשייה',
    shortLabel: 'מפעל',
    description: 'מכונות, חומ״ס, רעש ומעברי מילוט',
    icon: 'Factory',
    defects: factoryDefects,
  },
  {
    id: 'office',
    label: 'משרדים',
    shortLabel: 'משרד',
    description: 'יציאות חירום, חשמל, אחסון והחלקה',
    icon: 'Building2',
    defects: officeDefects,
  },
  {
    id: 'warehouse',
    label: 'מחסן / לוגיסטיקה',
    shortLabel: 'מחסן',
    description: 'מדפים, מלגזות, תאורה ומעברים',
    icon: 'Warehouse',
    defects: warehouseDefects,
  },
  {
    id: 'public',
    label: 'מבנה ציבורי',
    shortLabel: 'ציבורי',
    description: 'מילוט, נגישות ובטיחות קהל',
    icon: 'Landmark',
    defects: publicDefects,
  },
  {
    id: 'infrastructure',
    label: 'תשתיות',
    shortLabel: 'תשתיות',
    description: 'חפירות, כבישים, שוחות, כבלים וצנרת',
    icon: 'Cable',
    defects: infrastructureDefects,
  },
  {
    id: 'general',
    label: 'כללי / אחר',
    shortLabel: 'כללי',
    description: 'ליקויי בטיחות כלליים בכל סביבה',
    icon: 'ShieldAlert',
    defects: generalDefects,
  },
];

export function getDomain(id: SafetyDomain): DomainInfo {
  return SAFETY_DOMAINS.find((d) => d.id === id) ?? SAFETY_DOMAINS[SAFETY_DOMAINS.length - 1];
}

export function getDefectCatalog(domain: SafetyDomain): CatalogDefect[] {
  const domainDefects = getDomain(domain).defects;
  if (domain === 'general') return domainDefects;
  return [...domainDefects, ...generalDefects];
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'קריטי',
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
};

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];
