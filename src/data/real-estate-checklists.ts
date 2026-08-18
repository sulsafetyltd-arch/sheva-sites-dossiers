import type { ChecklistItem, DocumentItem, Payment } from '@/types/real-estate';

export function newId(): string {
  return crypto.randomUUID();
}

export const CHECKLIST_TEMPLATE: Array<Pick<ChecklistItem, 'label' | 'group'>> = [
  { group: 'זיהוי וזכויות', label: 'נסח טאבו עדכני (עד 30 יום)' },
  { group: 'זיהוי וזכויות', label: 'בדיקת שעבודים, עיקולים והערות אזהרה' },
  { group: 'זיהוי וזכויות', label: 'אישור זכויות מחברה משכנת / רמ"י (אם רלוונטי)' },
  { group: 'זיהוי וזכויות', label: 'אימות זהות הצדדים (ת.ז / דרכון / ח.פ)' },
  { group: 'זיהוי וזכויות', label: 'בדיקת דיירות מוגנת / שוכרים בנכס' },
  { group: 'תכנון ובנייה', label: 'תיק בניין והיתר בנייה' },
  { group: 'תכנון ובנייה', label: 'בדיקת חריגות בנייה ושימוש חורג' },
  { group: 'תכנון ובנייה', label: 'תקנון בית משותף / הסכם שיתוף' },
  { group: 'תכנון ובנייה', label: 'מפת מדידה / תשריט בית משותף' },
  { group: 'רשויות ומסים', label: 'אישור עירייה להעברת זכויות' },
  { group: 'רשויות ומסים', label: 'בדיקת היטל השבחה' },
  { group: 'רשויות ומסים', label: 'יתרות ארנונה ומים' },
  { group: 'רשויות ומסים', label: 'שומת מס רכישה / מקדמה' },
  { group: 'רשויות ומסים', label: 'אישור מס שבח / טופס 50' },
  { group: 'מימון וביטוח', label: 'אישור עקרוני למשכנתא' },
  { group: 'מימון וביטוח', label: 'ייפוי כוח בלתי חוזר לבנק / לעו"ד' },
  { group: 'מימון וביטוח', label: 'ביטוח מבנה / חיים למשכנתא' },
  { group: 'חוזה וסגירה', label: 'טיוטת הסכם ונספחים' },
  { group: 'חוזה וסגירה', label: 'תנאים מתלים סומנו וסוכמו' },
  { group: 'חוזה וסגירה', label: 'מועד מסירה ורישום נקבעו' },
];

export const DOCUMENT_TEMPLATE: Array<Pick<DocumentItem, 'title' | 'category'>> = [
  { title: 'הסכם מכר / שכירות', category: 'contract' },
  { title: 'נספח תשלומים', category: 'appendix' },
  { title: 'נסח טאבו', category: 'tabo' },
  { title: 'ייפוי כוח נוטריוני', category: 'poa' },
  { title: 'אישור עירייה', category: 'planning' },
  { title: 'שומת מס רכישה', category: 'tax' },
  { title: 'התכתבות עם הצד שכנגד', category: 'correspondence' },
];

export function buildChecklist(): ChecklistItem[] {
  return CHECKLIST_TEMPLATE.map((item) => ({
    id: newId(),
    label: item.label,
    group: item.group,
    done: false,
    notes: '',
  }));
}

export function buildDocuments(): DocumentItem[] {
  return DOCUMENT_TEMPLATE.map((item) => ({
    id: newId(),
    title: item.title,
    category: item.category,
    received: false,
    notes: '',
  }));
}

export function buildDefaultPayments(consideration: number): Payment[] {
  const deposit = Math.round(consideration * 0.1);
  const second = Math.round(consideration * 0.4);
  const balance = consideration - deposit - second;
  const purchaseTax = Math.round(consideration * 0.035);
  const fees = Math.round(consideration * 0.015);

  const today = new Date();
  const iso = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  return [
    { id: newId(), title: 'מקדמה בחתימת ההסכם', type: 'deposit', amount: deposit, dueDate: iso(7), status: 'pending', notes: '10% מהתמורה' },
    { id: newId(), title: 'תשלום שני — לאחר תנאים מתלים', type: 'consideration', amount: second, dueDate: iso(45), status: 'pending', notes: '40% מהתמורה' },
    { id: newId(), title: 'יתרה במסירה / רישום', type: 'consideration', amount: balance, dueDate: iso(90), status: 'pending', notes: 'יתרת התמורה' },
    { id: newId(), title: 'מס רכישה (אומדן)', type: 'purchase_tax', amount: purchaseTax, dueDate: iso(50), status: 'pending', notes: 'אומדן בלבד — יש לעדכן לפי שומה' },
    { id: newId(), title: 'שכר טרחת עו"ד', type: 'fees', amount: fees, dueDate: iso(7), status: 'pending', notes: '1.5% + מע"מ לפי הסכם שכ"ט' },
  ];
}
