import type { DocContext } from '@/lib/legal-doc-context';

export interface TemplateVariable {
  name: string;
  desc: string;
  group: string;
  value: (ctx: DocContext) => string;
}

function party(list: DocContext['buyers'], index: number, field: 'name' | 'idNumber' | 'address' | 'phone' | 'email'): string {
  const p = list[index];
  const v = p?.[field]?.trim();
  return v || '________';
}

function partyVariables(side: 'קונה' | 'מוכר', list: (ctx: DocContext) => DocContext['buyers']): TemplateVariable[] {
  const group = side === 'קונה' ? 'קונים' : 'מוכרים';
  const vars: TemplateVariable[] = [];
  for (let i = 0; i < 4; i += 1) {
    const n = i + 1;
    vars.push(
      { name: `שם_${side}_${n}`, desc: `שם מלא של ${side} ${n}`, group, value: (ctx) => party(list(ctx), i, 'name') },
      { name: `תעודת_זהות_${side}_${n}`, desc: `ת.ז. של ${side} ${n}`, group, value: (ctx) => party(list(ctx), i, 'idNumber') },
      { name: `כתובת_${side}_${n}`, desc: `כתובת של ${side} ${n}`, group, value: (ctx) => party(list(ctx), i, 'address') },
      { name: `טלפון_${side}_${n}`, desc: `טלפון של ${side} ${n}`, group, value: (ctx) => party(list(ctx), i, 'phone') },
      { name: `אימייל_${side}_${n}`, desc: `אימייל של ${side} ${n}`, group, value: (ctx) => party(list(ctx), i, 'email') },
    );
  }
  return vars;
}

function withIds(list: DocContext['buyers']): string {
  const rows = list
    .filter((p) => p.name.trim())
    .map((p) => `${p.name.trim()}${p.idNumber.trim() ? ` ת.ז. ${p.idNumber.trim()}` : ''}`);
  return rows.join(', ') || '________';
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: 'מספר_תיק', desc: 'מספר התיק במערכת', group: 'פרטי תיק', value: (c) => c.fileNumber },
  { name: 'שם_תיק', desc: 'שם התיק', group: 'פרטי תיק', value: (c) => c.title },
  { name: 'שם_לקוח', desc: 'שם הלקוח (הצד המיוצג)', group: 'פרטי תיק', value: (c) => c.clientNames },
  { name: 'תז_לקוח', desc: 'ת.ז. הלקוח (הצד המיוצג)', group: 'פרטי תיק', value: (c) => c.clientIds },
  { name: 'סוג_עסקה', desc: 'מהות העסקה', group: 'פרטי תיק', value: (c) => c.dealType },
  { name: 'תאריך_פתיחת_תיק', desc: 'תאריך פתיחת התיק', group: 'פרטי תיק', value: (c) => c.openedAt },

  { name: 'עורך_דין_מטפל', desc: 'שם עורך הדין המטפל', group: 'עורך דין', value: (c) => c.attorney },
  { name: 'רישיון_עורך_דין', desc: 'מספר רישיון עורך הדין', group: 'עורך דין', value: (c) => c.license },
  { name: 'כתובת_משרד', desc: 'כתובת המשרד', group: 'עורך דין', value: (c) => c.officeAddress },
  { name: 'עיר_משרד', desc: 'עיר החתימה של המשרד', group: 'עורך דין', value: (c) => c.officeCity },
  { name: 'עורך_דין_נוסף', desc: 'עורך דין נוסף במשרד', group: 'עורך דין', value: (c) => c.secondAttorney },
  { name: 'עורך_דין_צד_שכנגד', desc: 'בא-כוח הצד שכנגד', group: 'עורך דין', value: (c) => c.opposingCounsel },

  { name: 'כתובת_נכס', desc: 'כתובת הנכס', group: 'נכס', value: (c) => c.propertyAddress },
  { name: 'עיר_נכס', desc: 'עיר הנכס', group: 'נכס', value: (c) => c.propertyCity },
  { name: 'כתובת_נכס_מלאה', desc: 'כתובת + עיר', group: 'נכס', value: (c) => `${c.propertyAddress}, ${c.propertyCity}` },
  { name: 'סוג_נכס', desc: 'סוג הנכס', group: 'נכס', value: (c) => c.propertyType },
  { name: 'שטח_נכס', desc: 'שטח במ״ר', group: 'נכס', value: (c) => c.area },
  { name: 'קומה', desc: 'קומה', group: 'נכס', value: (c) => c.floor },
  { name: 'חדרים', desc: 'מספר חדרים', group: 'נכס', value: (c) => c.rooms },
  { name: 'תיאור_נכס', desc: 'תיאור הנכס / הערות', group: 'נכס', value: (c) => c.propertyDescription },

  { name: 'גוש', desc: 'מספר גוש', group: 'רישום', value: (c) => c.block },
  { name: 'חלקה', desc: 'מספר חלקה', group: 'רישום', value: (c) => c.parcel },
  { name: 'תת_חלקה', desc: 'מספר תת-חלקה', group: 'רישום', value: (c) => c.subParcel },
  { name: 'לשכת_רישום', desc: 'לשכת רישום המקרקעין', group: 'רישום', value: (c) => c.registryOffice },
  { name: 'סוג_זכות', desc: 'סוג הזכות (בעלות/חכירה)', group: 'רישום', value: (c) => c.rights },

  { name: 'כל_הקונים', desc: 'שמות כל הקונים', group: 'קונים', value: (c) => c.buyerNames },
  { name: 'כל_הקונים_עם_תז', desc: 'הקונים עם ת.ז.', group: 'קונים', value: (c) => withIds(c.buyers) },
  { name: 'תז_קונים', desc: 'ת.ז. של כל הקונים', group: 'קונים', value: (c) => c.buyerIds },
  { name: 'כתובות_קונים', desc: 'כתובות הקונים', group: 'קונים', value: (c) => c.buyerAddresses },
  { name: 'טלפוני_קונים', desc: 'טלפוני הקונים', group: 'קונים', value: (c) => c.buyerPhones },
  ...partyVariables('קונה', (c) => c.buyers),

  { name: 'כל_המוכרים', desc: 'שמות כל המוכרים', group: 'מוכרים', value: (c) => c.sellerNames },
  { name: 'כל_המוכרים_עם_תז', desc: 'המוכרים עם ת.ז.', group: 'מוכרים', value: (c) => withIds(c.sellers) },
  { name: 'תז_מוכרים', desc: 'ת.ז. של כל המוכרים', group: 'מוכרים', value: (c) => c.sellerIds },
  { name: 'כתובות_מוכרים', desc: 'כתובות המוכרים', group: 'מוכרים', value: (c) => c.sellerAddresses },
  { name: 'טלפוני_מוכרים', desc: 'טלפוני המוכרים', group: 'מוכרים', value: (c) => c.sellerPhones },
  ...partyVariables('מוכר', (c) => c.sellers),

  { name: 'סכום_עסקה', desc: 'סכום העסקה (מעוצב)', group: 'עסקה', value: (c) => c.consideration },
  { name: 'תאריך_חתימה', desc: 'תאריך חתימת ההסכם', group: 'עסקה', value: (c) => c.contractDate },
  { name: 'תאריך_חתימה_קצר', desc: 'תאריך חתימה (dd/mm/yyyy)', group: 'עסקה', value: (c) => c.contractDateShort },
  { name: 'מועד_מסירה', desc: 'מועד מסירת החזקה', group: 'עסקה', value: (c) => c.closingDate },
  { name: 'שם_בנק', desc: 'הבנק המלווה', group: 'עסקה', value: (c) => c.bankName },

  {
    name: 'תאריך_היום',
    desc: 'תאריך הפקת המסמך',
    group: 'תאריכים',
    value: () => new Date().toLocaleDateString('he-IL'),
  },
  {
    name: 'שנה_נוכחית',
    desc: 'השנה הנוכחית',
    group: 'תאריכים',
    value: () => String(new Date().getFullYear()),
  },
];

const VARIABLE_MAP = new Map(TEMPLATE_VARIABLES.map((v) => [v.name, v]));

/** Replaces {שם_משתנה} occurrences with values from the deal. Unknown names are left untouched. */
export function renderTemplateText(body: string, ctx: DocContext): string {
  return body.replace(/\{([^{}\n]+)\}/g, (match, rawName: string) => {
    const variable = VARIABLE_MAP.get(rawName.trim());
    return variable ? variable.value(ctx) : match;
  });
}

export function templateVariableGroups(): Array<[string, TemplateVariable[]]> {
  const map = new Map<string, TemplateVariable[]>();
  for (const v of TEMPLATE_VARIABLES) {
    const list = map.get(v.group) ?? [];
    list.push(v);
    map.set(v.group, list);
  }
  return [...map.entries()];
}

export function buildVariablesText(): string {
  const lines: string[] = [
    'רשימת משתנים זמינים לתבניות מסמכים — סולו נדלן',
    '=================================================',
    '',
    'כל משתנה נכתב בסוגריים מסולסלים, למשל: {מספר_תיק} או {שם_קונה_1}.',
    'המערכת מחליפה אוטומטית את המשתנים בנתונים האמיתיים מהתיק בעת ההפקה.',
    '',
  ];
  for (const [group, vars] of templateVariableGroups()) {
    lines.push(`--- ${group} ---`);
    for (const v of vars) lines.push(`{${v.name}} — ${v.desc}`);
    lines.push('');
  }
  lines.push(`סה"כ ${TEMPLATE_VARIABLES.length} משתנים זמינים.`);
  return lines.join('\n');
}

export function downloadVariablesList(): void {
  const blob = new Blob([buildVariablesText()], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'רשימת-משתנים-סולו-נדלן.txt';
  a.click();
  URL.revokeObjectURL(url);
}
