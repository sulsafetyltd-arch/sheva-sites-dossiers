export interface BuildingTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  buildingType: string;
  preloadData: Record<string, any>;
}

export const buildingTemplates: BuildingTemplate[] = [
  {
    id: 'commercial-center',
    name: 'מרכז מסחרי',
    icon: '🏬',
    description: 'קניון, מרכז קניות, מתחם מסחרי',
    buildingType: 'commercial',
    preloadData: {
      generalDetails: {
        buildingType: 'commercial',
        operatingHours: '08:00-22:00',
      },
      waterSystems: {
        sprinklerSystem: 'מערכת ספרינקלרים רטובה בכל שטחי המסחר',
        extinguisherTypes: 'אבקה ABC, CO2 (חדרי חשמל), קצף AFFF (מטבחים)',
      },
      detection: {
        detectorTypes: 'גלאי עשן אופטיים בחללי מסחר, גלאי חום במטבחים ובחניון',
      },
      contacts: [
        { id: crypto.randomUUID(), name: '', role: 'מנהל מתחם', phone: '', email: '', available: '24/7', category: 'site_manager' },
        { id: crypto.randomUUID(), name: '', role: 'ממונה בטיחות אש', phone: '', email: '', available: 'ימים א-ה', category: 'safety_officer' },
        { id: crypto.randomUUID(), name: '', role: 'קבלן מערכות כיבוי', phone: '', email: '', available: '', category: 'fire_contractor' },
      ],
      risks: [
        { id: crypto.randomUUID(), area: 'מטבחים', hazard: 'שריפת שמן בישול', location: 'קומת מסחר', likelihood: 'בינונית', severity: 'גבוהה', riskScore: 'גבוה', controls: 'מערכת כיבוי אוטומטית, מטפי קצף', responsible: '' },
        { id: crypto.randomUUID(), area: 'חניון תת-קרקעי', hazard: 'שריפת רכב', location: 'מרתפים', likelihood: 'נמוכה', severity: 'גבוהה', riskScore: 'בינוני', controls: 'ספרינקלרים, שאיבת עשן', responsible: '' },
      ],
    },
  },
  {
    id: 'office-building',
    name: 'בניין משרדים',
    icon: '🏢',
    description: 'מגדל משרדים, בניין עסקים',
    buildingType: 'office',
    preloadData: {
      generalDetails: {
        buildingType: 'office',
        operatingHours: '07:00-20:00',
      },
      waterSystems: {
        sprinklerSystem: 'מערכת ספרינקלרים רטובה בכל הקומות',
      },
      detection: {
        detectorTypes: 'גלאי עשן אופטיים בכל המשרדים והמסדרונות',
      },
      contacts: [
        { id: crypto.randomUUID(), name: '', role: 'מנהל בניין', phone: '', email: '', available: '', category: 'site_manager' },
        { id: crypto.randomUUID(), name: '', role: 'ממונה בטיחות', phone: '', email: '', available: '', category: 'safety_officer' },
      ],
      risks: [
        { id: crypto.randomUUID(), area: 'חדר שרתים', hazard: 'שריפה חשמלית', location: '', likelihood: 'נמוכה', severity: 'בינונית', riskScore: 'בינוני', controls: 'מערכת כיבוי גז, גלאי עשן כפולים', responsible: '' },
      ],
    },
  },
  {
    id: 'industrial-facility',
    name: 'מתקן תעשייתי',
    icon: '🏭',
    description: 'מפעל, אזור תעשייה',
    buildingType: 'industrial',
    preloadData: {
      generalDetails: {
        buildingType: 'industrial',
        operatingHours: '24/7 - עבודה במשמרות',
      },
      contacts: [
        { id: crypto.randomUUID(), name: '', role: 'מנהל מפעל', phone: '', email: '', available: '', category: 'site_manager' },
        { id: crypto.randomUUID(), name: '', role: 'ממונה בטיחות', phone: '', email: '', available: '', category: 'safety_officer' },
        { id: crypto.randomUUID(), name: '', role: 'מנהל תחזוקה', phone: '', email: '', available: '', category: 'maintenance_manager' },
      ],
      risks: [
        { id: crypto.randomUUID(), area: 'אזור ייצור', hazard: 'שריפה ממכונות', location: '', likelihood: 'בינונית', severity: 'גבוהה', riskScore: 'גבוה', controls: 'ספרינקלרים, מטפים, הדרכות', responsible: '' },
        { id: crypto.randomUUID(), area: 'מחסן חומרים', hazard: 'חומרים מסוכנים', location: '', likelihood: 'נמוכה', severity: 'קריטית', riskScore: 'גבוה', controls: 'אחסון תקני, שילוט, ציוד חומ"ס', responsible: '' },
      ],
    },
  },
  {
    id: 'logistics-warehouse',
    name: 'מחסן לוגיסטי',
    icon: '📦',
    description: 'מחסן, מרכז לוגיסטי, מרלו"ג',
    buildingType: 'industrial',
    preloadData: {
      generalDetails: {
        buildingType: 'industrial',
        operatingHours: '06:00-22:00',
      },
      waterSystems: {
        sprinklerSystem: 'מערכת ספרינקלרים ESFR לאחסון גבוה',
      },
      contacts: [
        { id: crypto.randomUUID(), name: '', role: 'מנהל מחסן', phone: '', email: '', available: '', category: 'site_manager' },
        { id: crypto.randomUUID(), name: '', role: 'ממונה בטיחות', phone: '', email: '', available: '', category: 'safety_officer' },
      ],
      risks: [
        { id: crypto.randomUUID(), area: 'אזור אחסון', hazard: 'שריפת מדפים', location: '', likelihood: 'בינונית', severity: 'גבוהה', riskScore: 'גבוה', controls: 'ספרינקלרים ESFR, מרווחי אש', responsible: '' },
        { id: crypto.randomUUID(), area: 'רמפות פריקה', hazard: 'שריפה מרכבי הובלה', location: '', likelihood: 'נמוכה', severity: 'בינונית', riskScore: 'בינוני', controls: 'מטפים, ריצפה עמידת אש', responsible: '' },
      ],
    },
  },
  {
    id: 'educational-building',
    name: 'מבנה חינוך',
    icon: '🏫',
    description: 'בית ספר, אוניברסיטה, מכללה',
    buildingType: 'public',
    preloadData: {
      generalDetails: {
        buildingType: 'public',
        operatingHours: '07:00-18:00',
      },
      assembly: {
        evacuationPlan: 'פינוי כיתה-כיתה בליווי מורה אחראי. ספירת תלמידים בנקודת כינוס.',
        specialNeeds: 'תלמידים עם מוגבלויות - ליווי צמוד ומסלולי פינוי נגישים',
      },
      contacts: [
        { id: crypto.randomUUID(), name: '', role: 'מנהל מוסד', phone: '', email: '', available: '', category: 'site_manager' },
        { id: crypto.randomUUID(), name: '', role: 'ממונה בטיחות', phone: '', email: '', available: '', category: 'safety_officer' },
      ],
      risks: [
        { id: crypto.randomUUID(), area: 'מעבדות', hazard: 'שריפה כימית', location: '', likelihood: 'נמוכה', severity: 'בינונית', riskScore: 'בינוני', controls: 'ציוד מגן, מטפים, נהלי בטיחות', responsible: '' },
      ],
    },
  },
  {
    id: 'residential-tower',
    name: 'מגדל מגורים',
    icon: '🏠',
    description: 'בניין מגורים רב-קומות',
    buildingType: 'residential',
    preloadData: {
      generalDetails: {
        buildingType: 'residential',
        operatingHours: '24/7',
      },
      assembly: {
        evacuationPlan: 'פינוי דירה-דירה. ירידה בחדרי מדרגות מוגנים. אין שימוש במעליות.',
        specialNeeds: 'דיירים קשישים ובעלי מוגבלויות - רשימה מעודכנת אצל ועד הבית',
      },
      contacts: [
        { id: crypto.randomUUID(), name: '', role: 'ועד בית', phone: '', email: '', available: '', category: 'owner' },
        { id: crypto.randomUUID(), name: '', role: 'חברת ניהול', phone: '', email: '', available: '', category: 'site_manager' },
      ],
      risks: [
        { id: crypto.randomUUID(), area: 'חדרי חשמל', hazard: 'שריפה חשמלית', location: 'מרתף', likelihood: 'נמוכה', severity: 'גבוהה', riskScore: 'בינוני', controls: 'גלאי עשן, מטפי CO2', responsible: '' },
        { id: crypto.randomUUID(), area: 'חניון', hazard: 'שריפת רכב', location: 'מרתף', likelihood: 'נמוכה', severity: 'גבוהה', riskScore: 'בינוני', controls: 'ספרינקלרים, שאיבת עשן', responsible: '' },
      ],
    },
  },
];
