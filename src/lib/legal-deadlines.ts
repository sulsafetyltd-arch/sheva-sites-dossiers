import type { Deal, DealTask } from '@/types/real-estate';
import type { RepresentedSide } from '@/lib/document-audience';
import { newId } from '@/data/real-estate-checklists';

interface DeadlineRule {
  title: string;
  /** Days offset from the anchor date. */
  offsetDays: number;
  anchor: 'contract' | 'closing';
  sides: RepresentedSide[];
  notes: string;
  rentalRelevant?: boolean;
}

/**
 * Statutory and practice deadlines in Israeli real-estate transactions,
 * anchored to the contract signing date or the closing date.
 */
const RULES: DeadlineRule[] = [
  {
    title: 'רישום הערת אזהרה לטובת הקונה',
    offsetDays: 3,
    anchor: 'contract',
    sides: ['buyer', 'both'],
    notes: 'מומלץ מיד לאחר החתימה — מגן על הקונה מעסקאות נוגדות',
  },
  {
    title: 'דיווח העסקה למיסוי מקרקעין (טופס 7002)',
    offsetDays: 30,
    anchor: 'contract',
    sides: ['buyer', 'seller', 'both'],
    notes: 'חובה חוקית: דיווח תוך 30 יום מיום החתימה (סעיף 73 לחוק מיסוי מקרקעין)',
  },
  {
    title: 'הגשת שומה עצמית למס שבח',
    offsetDays: 30,
    anchor: 'contract',
    sides: ['seller', 'both'],
    notes: 'במסגרת הדיווח למיסוי מקרקעין — כולל בקשות פטור ככל שרלוונטי',
  },
  {
    title: 'תשלום מס רכישה',
    offsetDays: 60,
    anchor: 'contract',
    sides: ['buyer', 'both'],
    notes: 'תוך 60 יום מיום החתימה — לאחר קבלת שובר מרשות המסים',
  },
  {
    title: 'קבלת אישור עירייה (היעדר חובות) לטאבו',
    offsetDays: -21,
    anchor: 'closing',
    sides: ['seller', 'both'],
    notes: 'להזמין מראש — נדרש לרישום העברת הזכויות',
  },
  {
    title: 'קבלת אישורי מסים (מס שבח + מס רכישה) לרישום',
    offsetDays: -14,
    anchor: 'closing',
    sides: ['buyer', 'seller', 'both'],
    notes: 'לוודא שהאישורים התקבלו לפני מועד המסירה',
  },
  {
    title: 'פרוטוקול מסירת חזקה + קריאת מונים',
    offsetDays: 0,
    anchor: 'closing',
    sides: ['buyer', 'seller', 'both'],
    notes: 'ביום המסירה — חתימת שני הצדדים על הפרוטוקול',
    rentalRelevant: true,
  },
  {
    title: 'הגשת בקשה לרישום העברת זכויות בטאבו',
    offsetDays: 14,
    anchor: 'closing',
    sides: ['buyer', 'both'],
    notes: 'לאחר המסירה, עם כל האישורים: שטרי מכר, אישורי מסים, אישור עירייה',
  },
];

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export interface DeadlineSuggestion {
  title: string;
  dueDate: string;
  notes: string;
}

/**
 * Compute the statutory-deadline tasks relevant to this deal.
 * Tasks whose title already exists on the deal are skipped.
 */
export function suggestLegalDeadlines(deal: Deal, side: RepresentedSide): DeadlineSuggestion[] {
  const suggestions: DeadlineSuggestion[] = [];
  const existing = new Set(deal.tasks.map((t) => t.title.trim()));
  for (const rule of RULES) {
    if (deal.type === 'rental' && !rule.rentalRelevant) continue;
    if (!rule.sides.includes(side)) continue;
    const anchorDate = rule.anchor === 'contract' ? deal.contractDate : deal.closingDate;
    if (!anchorDate) continue;
    if (existing.has(rule.title)) continue;
    suggestions.push({ title: rule.title, dueDate: addDays(anchorDate, rule.offsetDays), notes: rule.notes });
  }
  return suggestions.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function buildDeadlineTasks(suggestions: DeadlineSuggestion[]): DealTask[] {
  return suggestions.map((s) => ({
    id: newId(),
    title: s.title,
    dueDate: s.dueDate,
    done: false,
    priority: 'high' as const,
    notes: s.notes,
  }));
}
