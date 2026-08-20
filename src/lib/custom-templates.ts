import type { DocAudience } from '@/lib/document-audience';

export interface CustomTemplate {
  id: string;
  title: string;
  audience: DocAudience;
  body: string;
  updatedAt: string;
}

export const CUSTOM_TEMPLATES_KEY = 'solo-custom-templates-v1';

export function getCustomTemplates(): CustomTemplate[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomTemplate(template: CustomTemplate): CustomTemplate[] {
  const next = { ...template, updatedAt: new Date().toISOString() };
  const all = getCustomTemplates();
  const idx = all.findIndex((t) => t.id === next.id);
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(all));
  return all;
}

export function deleteCustomTemplate(id: string): CustomTemplate[] {
  const all = getCustomTemplates().filter((t) => t.id !== id);
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(all));
  return all;
}

export const STARTER_TEMPLATES: Array<Omit<CustomTemplate, 'id' | 'updatedAt'>> = [
  {
    title: 'מכתב פתיחת תיק ללקוח',
    audience: 'both',
    body: `לכבוד {שם_לקוח}

הנדון: פתיחת תיק {מספר_תיק} — {סוג_עסקה} בנכס {כתובת_נכס_מלאה}

הרינו לאשר כי משרדנו קיבל על עצמו את הטיפול המשפטי בעסקה שבנדון (גוש {גוש}, חלקה {חלקה}).

במסגרת הטיפול נבצע בין היתר: בדיקת נסח טאבו ומצב הזכויות, עריכת ההסכם וניהול המשא ומתן, טיפול בדיווחי המס, רישום הערת אזהרה והשלמת רישום הזכויות.

לצורך קידום הטיפול נבקשכם להעביר למשרדנו: צילום תעודת זהות, נסח רישום עדכני ככל שקיים, ופרטי איש קשר בבנק המלווה.

נשמח לעמוד לרשותכם בכל שאלה.

בכבוד רב,
עו"ד {עורך_דין_מטפל}, רישיון {רישיון_עורך_דין}
{כתובת_משרד}`,
  },
  {
    title: 'עדכון התקדמות תיק',
    audience: 'both',
    body: `לכבוד {שם_לקוח}

הנדון: עדכון סטטוס — תיק {מספר_תיק} ({כתובת_נכס_מלאה})

בהמשך לטיפולנו בעסקה שבנדון, הרינו לעדכן:

1. ________
2. ________
3. ________

הפעולות הבאות הנדרשות מכם: ________

נמשיך לעדכן בכל התפתחות.

בכבוד רב,
עו"ד {עורך_דין_מטפל}
{כתובת_משרד} · תאריך: {תאריך_היום}`,
  },
  {
    title: 'אישור קבלת מסמכים',
    audience: 'both',
    body: `אישור קבלת מסמכים

תיק {מספר_תיק} · {כתובת_נכס_מלאה} · גוש {גוש} חלקה {חלקה}

הריני לאשר כי ביום {תאריך_היום} התקבלו במשרדי המסמכים הבאים מאת {שם_לקוח}:

1. ________
2. ________
3. ________

המסמכים יישמרו בתיק וישמשו לצורך הטיפול בעסקה בלבד.

עו"ד {עורך_דין_מטפל}, רישיון {רישיון_עורך_דין}
חתימה: ________`,
  },
  {
    title: 'אישור מסירת חזקה',
    audience: 'both',
    body: `אישור מסירת חזקה

אנו הח"מ:
המוכר/ים: {כל_המוכרים_עם_תז}
הקונה/ים: {כל_הקונים_עם_תז}

מאשרים בזה כי ביום {תאריך_היום} נמסרה החזקה בנכס {כתובת_נכס_מלאה} (גוש {גוש}, חלקה {חלקה}, תת-חלקה {תת_חלקה}) מהמוכר/ים לקונה/ים, בהתאם להסכם המכר מיום {תאריך_חתימה_קצר}.

מצב הנכס במסירה: ________
מוני חשמל / מים / גז: ________ / ________ / ________
מפתחות שנמסרו: ________

חתימת המוכר/ים: ________    חתימת הקונה/ים: ________`,
  },
  {
    title: 'תזכורת תשלום שכר טרחה',
    audience: 'both',
    body: `לכבוד {שם_לקוח}

הנדון: שכר טרחה — תיק {מספר_תיק}

בהתאם להסכם שכר הטרחה שנחתם בינינו במסגרת הטיפול בעסקה בנכס {כתובת_נכס_מלאה}, נבקש להסדיר את התשלום שטרם שולם.

סכום לתשלום: ________
מועד אחרון: ________

לנוחותכם ניתן לשלם בהעברה בנקאית או בתיאום מול המשרד.

בכבוד רב,
עו"ד {עורך_דין_מטפל}
{כתובת_משרד}`,
  },
];
