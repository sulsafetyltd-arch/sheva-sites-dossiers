export interface ContentBlock {
  id: string;
  category: 'procedure' | 'risk' | 'description';
  title: string;
  content: string;
  tags: string[];
  targetSection: string;
  targetField: string;
}

export const contentLibrary: ContentBlock[] = [
  // === PROCEDURES ===
  {
    id: 'proc-fire-general',
    category: 'procedure',
    title: 'נוהל תגובה כללי לשריפה',
    content: '1. הפעלת אזעקה באמצעות כפתור מצוקה הקרוב\n2. חיוג 102 - כיבוי אש\n3. פינוי מיידי של האזור הנפגע\n4. ניסיון כיבוי ראשוני רק אם בטוח לגשת\n5. סגירת דלתות אש לעיכוב התפשטות\n6. הכוונת כוחות כיבוי בהגעתם\n7. ספירת אנשים בנקודת כינוס',
    tags: ['שריפה', 'תגובה', 'כללי'],
    targetSection: 'procedures',
    targetField: 'fireResponse',
  },
  {
    id: 'proc-evacuation',
    category: 'procedure',
    title: 'נוהל פינוי שיטתי',
    content: '1. הודעה במערכת כריזה — הודעת פינוי\n2. פינוי שיטתי — קומה גבוהה תחילה\n3. שימוש בחדרי מדרגות מוגנים בלבד\n4. איסור מוחלט על שימוש במעליות\n5. סיוע לאנשים עם מוגבלויות\n6. בדיקת חדרים ושירותים לפני עזיבה\n7. התכנסות בנקודת כינוס מוגדרת\n8. ספירת נוכחים ודיווח למפקד האירוע',
    tags: ['פינוי', 'מדרגות', 'מוגבלויות'],
    targetSection: 'procedures',
    targetField: 'evacuationProcedure',
  },
  {
    id: 'proc-assembly',
    category: 'procedure',
    title: 'נוהל התכנסות בנקודת כינוס',
    content: 'התכנסות בנקודת כינוס מוגדרת. ספירת עובדים/דיירים לפי מחלקות/קומות. דיווח מיידי על חסרים למפקד האירוע. המתנה להוראות — אין לחזור למבנה ללא אישור.',
    tags: ['כינוס', 'ספירה'],
    targetSection: 'procedures',
    targetField: 'assemblyProcedure',
  },
  {
    id: 'proc-hazmat',
    category: 'procedure',
    title: 'נוהל תגובה לחומרים מסוכנים',
    content: '1. הרחקת כל האנשים מאזור הדליפה\n2. חיוג 102 ו-101\n3. סגירת שסתומי ניתוק (אם ניתן בבטחה)\n4. איוורור האזור — פתיחת חלונות ודלתות\n5. איסור הצתה, ניצוצות ושימוש בטלפונים ניידים\n6. המתנה לצוות חומ"ס מקצועי\n7. מתן מידע על סוג החומר לכוחות החילוץ',
    tags: ['חומ"ס', 'דליפה', 'גז'],
    targetSection: 'procedures',
    targetField: 'hazmatResponse',
  },
  {
    id: 'proc-firstaid',
    category: 'procedure',
    title: 'נוהל עזרה ראשונה',
    content: 'ערכות עזרה ראשונה פרושות בכל קומה. חובשים מוסמכים בכל משמרת. בעת פציעה: 1. הזעקת חובש, 2. חיוג 101 אם נדרש, 3. מתן טיפול ראשוני, 4. תיעוד האירוע.',
    tags: ['עזרה ראשונה', 'חובש'],
    targetSection: 'procedures',
    targetField: 'firstAid',
  },

  // === RISK DESCRIPTIONS ===
  {
    id: 'risk-kitchen-fire',
    category: 'risk',
    title: 'שריפת שמן בישול — מטבח',
    content: 'התלקחות שמן בישול במטבח מסחרי. סיכון גבוה בשעות פעילות מרביות.',
    tags: ['מטבח', 'שמן', 'אש'],
    targetSection: 'risks',
    targetField: '_row',
  },
  {
    id: 'risk-electrical-fire',
    category: 'risk',
    title: 'שריפה חשמלית — לוחות חשמל',
    content: 'קצר חשמלי או עומס יתר בלוח חשמל ראשי או משני. סיכון מוגבר במבנים ישנים.',
    tags: ['חשמל', 'קצר', 'לוח'],
    targetSection: 'risks',
    targetField: '_row',
  },
  {
    id: 'risk-gas-leak',
    category: 'risk',
    title: 'דליפת גז — מערכת LPG',
    content: 'דליפת גז ממערכת גז מרכזית או מכלים. סכנת פיצוץ והתלקחות.',
    tags: ['גז', 'דליפה', 'LPG'],
    targetSection: 'risks',
    targetField: '_row',
  },
  {
    id: 'risk-parking-fire',
    category: 'risk',
    title: 'שריפת רכב — חניון',
    content: 'שריפת רכב בחניון תת-קרקעי עם סכנת התפשטות וסכנת עשן כבד.',
    tags: ['חניון', 'רכב', 'עשן'],
    targetSection: 'risks',
    targetField: '_row',
  },

  // === BUILDING DESCRIPTIONS ===
  {
    id: 'desc-concrete-structure',
    category: 'description',
    title: 'מבנה בטון מזוין — תיאור סטנדרטי',
    content: 'שלד בטון מזוין. קירות חוץ מבלוקים עם חיפוי אבן/טיח. מחיצות פנים מגבס. רצפות שיש/קרמיקה. תקרה אקוסטית.',
    tags: ['בטון', 'מבנה', 'שלד'],
    targetSection: 'buildingDescription',
    targetField: 'constructionMaterials',
  },
  {
    id: 'desc-sprinkler-wet',
    category: 'description',
    title: 'מערכת ספרינקלרים רטובה — תיאור',
    content: 'מערכת ספרינקלרים רטובה בכל שטחי המסחר, המשרדים והמסדרונות. ראשי ספרינקלר K-80. לחץ עבודה: 4 אטמ. חדר משאבות ראשי במרתף.',
    tags: ['ספרינקלרים', 'מערכת רטובה'],
    targetSection: 'waterSystems',
    targetField: 'sprinklerSystem',
  },
  {
    id: 'desc-detection-system',
    category: 'description',
    title: 'מערכת גילוי אש אנלוגית-אדרסבילית',
    content: 'מערכת גילוי אש אנלוגית-אדרסבילית. גלאי עשן אופטיים בכל החללים. גלאי חום במטבחים ובחניון. כפתורי מצוקה ליד כל יציאת חירום. לוח בקרה בלובי הראשי.',
    tags: ['גילוי', 'גלאי', 'אזעקה'],
    targetSection: 'detection',
    targetField: 'detectorTypes',
  },
  {
    id: 'desc-emergency-lighting',
    category: 'description',
    title: 'תאורת חירום — תיאור סטנדרטי',
    content: 'תאורת חירום LED בכל מסדרונות, חדרי מדרגות ויציאות חירום. אוטונומיה: 3 שעות מינימום. בדיקה חודשית שגרתית.',
    tags: ['תאורה', 'חירום', 'LED'],
    targetSection: 'electrical',
    targetField: 'emergencyLighting',
  },
];

export const contentCategories = [
  { id: 'procedure', label: 'נהלים', icon: 'ClipboardList' },
  { id: 'risk', label: 'סיכונים', icon: 'AlertTriangle' },
  { id: 'description', label: 'תיאורים', icon: 'FileText' },
] as const;
