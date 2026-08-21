import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import type {
  CalendarItem,
  ClientSide,
  Deal,
  DealStatus,
  DealType,
  DocumentCategory,
  DocumentStatus,
  PartyRole,
  Payment,
  PaymentStatus,
  PaymentType,
  PropertyType,
  TaskPriority,
} from '@/types/real-estate';

export const DEAL_TYPE_LABEL: Record<DealType, string> = {
  sale: 'מכר (מוכר)',
  purchase: 'רכישה (קונה)',
  rental: 'שכירות',
  gift: 'מתנה',
  combination: 'קומבינציה',
  inheritance: 'ירושה / העברה',
};

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  intake: 'פתיחת תיק',
  due_diligence: 'בדיקות מקדימות',
  negotiation: 'משא ומתן',
  signed: 'נחתם הסכם',
  conditions: 'תנאים מתלים',
  closing: 'לקראת סגירה',
  registration: 'רישום זכויות',
  closed: 'נסגר',
  cancelled: 'בוטל',
};

export const CLIENT_SIDE_LABEL: Record<ClientSide, string> = {
  buyer: 'קונה',
  seller: 'מוכר',
  both: 'שני הצדדים',
  tenant: 'שוכר',
  landlord: 'משכיר',
};

export const PARTY_ROLE_LABEL: Record<PartyRole, string> = {
  buyer: 'קונה',
  seller: 'מוכר',
  tenant: 'שוכר',
  landlord: 'משכיר',
  broker: 'מתווך',
  opposing_counsel: 'עו"ד הצד שכנגד',
  bank: 'בנק / משכנתא',
  guarantor: 'ערב',
  other: 'אחר',
};

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  apartment: 'דירה',
  house: 'בית פרטי',
  plot: 'מגרש',
  office: 'משרד',
  store: 'חנות',
  warehouse: 'מחסן / תעשייה',
  other: 'אחר',
};

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  consideration: 'תמורה',
  deposit: 'מקדמה',
  purchase_tax: 'מס רכישה',
  betterment: 'היטל השבחה',
  capital_gains: 'מס שבח',
  fees: 'שכ"ט',
  broker: 'תיווך',
  other: 'אחר',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'ממתין',
  paid: 'שולם',
  overdue: 'באיחור',
  waived: 'ויתור',
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'נמוכה',
  medium: 'בינונית',
  high: 'גבוהה',
};

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  missing: 'טרם התקבל',
  draft: 'טיוטה',
  sent: 'נשלח לחתימה',
  signed: 'חתום',
  filed: 'הוגש לרשות',
};

export const DOCUMENT_CATEGORY_LABEL: Record<DocumentCategory, string> = {
  contract: 'הסכם',
  appendix: 'נספח',
  tabo: 'טאבו',
  tax: 'מס',
  planning: 'תכנון / עירייה',
  poa: 'ייפוי כוח',
  correspondence: 'התכתבות',
  other: 'אחר',
};

export const ACTIVE_STATUSES: DealStatus[] = [
  'intake',
  'due_diligence',
  'negotiation',
  'signed',
  'conditions',
  'closing',
  'registration',
];

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDateHe(iso?: string): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'd בMMMM yyyy', { locale: he });
  } catch {
    return iso;
  }
}

export function formatShortDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'dd/MM/yyyy');
  } catch {
    return iso;
  }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isOverdueDate(iso: string, done = false): boolean {
  if (!iso || done) return false;
  try {
    return isBefore(parseISO(iso), startOfDay(new Date()));
  } catch {
    return false;
  }
}

export function effectivePaymentStatus(payment: Payment): PaymentStatus {
  if (payment.status === 'paid' || payment.status === 'waived') return payment.status;
  if (isOverdueDate(payment.dueDate)) return 'overdue';
  return 'pending';
}

export function dealProgress(deal: Deal): number {
  const checklistTotal = deal.checklist.length;
  const checklistDone = deal.checklist.filter((c) => c.done).length;
  const paymentsTotal = deal.payments.length;
  const paymentsDone = deal.payments.filter((p) => p.status === 'paid' || p.status === 'waived').length;
  const docsTotal = deal.documents.length;
  const docsDone = deal.documents.filter((d) => d.received).length;

  const statusScore: Record<DealStatus, number> = {
    intake: 8,
    due_diligence: 20,
    negotiation: 32,
    signed: 48,
    conditions: 60,
    closing: 75,
    registration: 88,
    closed: 100,
    cancelled: 0,
  };

  if (deal.status === 'closed') return 100;
  if (deal.status === 'cancelled') return 0;

  const parts: number[] = [statusScore[deal.status]];
  if (checklistTotal) parts.push((checklistDone / checklistTotal) * 100);
  if (paymentsTotal) parts.push((paymentsDone / paymentsTotal) * 100);
  if (docsTotal) parts.push((docsDone / docsTotal) * 100);

  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

export function propertyLabel(deal: Deal): string {
  const { address, city, block, parcel, subParcel } = deal.property;
  const gush = [block, parcel, subParcel].filter(Boolean).join('/');
  const loc = [address, city].filter(Boolean).join(', ');
  if (loc && gush) return `${loc} · גוש/חלקה ${gush}`;
  return loc || (gush ? `גוש/חלקה ${gush}` : 'נכס ללא כתובת');
}

export function collectCalendarItems(deals: Deal[]): CalendarItem[] {
  const items: CalendarItem[] = [];

  for (const deal of deals) {
    for (const task of deal.tasks) {
      if (!task.dueDate) continue;
      items.push({
        id: `task-${task.id}`,
        dealId: deal.id,
        dealTitle: deal.title,
        fileNumber: deal.fileNumber,
        kind: 'task',
        title: task.title,
        date: task.dueDate,
        done: task.done,
      });
    }
    for (const payment of deal.payments) {
      if (!payment.dueDate) continue;
      items.push({
        id: `pay-${payment.id}`,
        dealId: deal.id,
        dealTitle: deal.title,
        fileNumber: deal.fileNumber,
        kind: 'payment',
        title: payment.title,
        date: payment.dueDate,
        done: payment.status === 'paid' || payment.status === 'waived',
        amount: payment.amount,
      });
    }
    const milestones: Array<[string | undefined, string]> = [
      [deal.contractDate, 'חתימת הסכם'],
      [deal.closingDate, 'מועד מסירה / סגירה'],
      [deal.registrationDate, 'רישום זכויות'],
    ];
    for (const [date, title] of milestones) {
      if (!date) continue;
      items.push({
        id: `ms-${deal.id}-${title}`,
        dealId: deal.id,
        dealTitle: deal.title,
        fileNumber: deal.fileNumber,
        kind: 'milestone',
        title,
        date,
        done: deal.status === 'closed',
      });
    }
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

export function statusBadgeClass(status: DealStatus): string {
  switch (status) {
    case 'closed':
      return 'bg-success/10 text-success border-success/20';
    case 'cancelled':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'closing':
    case 'registration':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'signed':
    case 'conditions':
      return 'bg-primary/10 text-primary border-primary/20';
    default:
      return 'bg-secondary text-secondary-foreground border-transparent';
  }
}

export function nextFileNumber(existing: Deal[]): string {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  let max = 0;
  for (const deal of existing) {
    if (!deal.fileNumber.startsWith(prefix)) continue;
    const n = Number(deal.fileNumber.slice(prefix.length));
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

const CLIENT_ROLES: PartyRole[] = ['buyer', 'seller', 'tenant', 'landlord'];

export function primaryClientName(deal: Deal): string {
  const preferred = CLIENT_ROLES.filter((role) => {
    if (deal.clientSide === 'both') return true;
    if (deal.clientSide === 'buyer') return role === 'buyer';
    if (deal.clientSide === 'seller') return role === 'seller';
    if (deal.clientSide === 'tenant') return role === 'tenant';
    if (deal.clientSide === 'landlord') return role === 'landlord';
    return false;
  });
  const match =
    deal.parties.find((p) => preferred.includes(p.role) && p.name.trim()) ??
    deal.parties.find((p) => CLIENT_ROLES.includes(p.role) && p.name.trim());
  return match?.name || '—';
}

export function propertySummary(deal: Deal): string {
  const { address, city, type } = deal.property;
  const kind = PROPERTY_TYPE_LABEL[type];
  const loc = [address, city].filter(Boolean).join(', ');
  return loc ? `${kind} · ${loc}` : kind;
}

export function isOpenDeal(deal: Deal): boolean {
  return ACTIVE_STATUSES.includes(deal.status);
}

export function feeAmount(deals: Deal[], opts: { paid: boolean; year?: number }): number {
  return deals.reduce((sum, deal) => {
    return (
      sum +
      deal.payments
        .filter((p) => p.type === 'fees')
        .filter((p) => (opts.paid ? p.status === 'paid' : p.status !== 'paid' && p.status !== 'waived'))
        .filter((p) => {
          if (opts.year == null) return true;
          const date = opts.paid ? p.paidDate || p.dueDate : p.dueDate;
          return date?.startsWith(String(opts.year));
        })
        .reduce((s, p) => s + (p.amount || 0), 0)
    );
  }, 0);
}

export function monthlyReceivedFees(deals: Deal[], year: number): Array<{ month: number; label: string; amount: number }> {
  const labels = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
  const amounts = Array.from({ length: 12 }, () => 0);
  for (const deal of deals) {
    for (const payment of deal.payments) {
      if (payment.type !== 'fees' || payment.status !== 'paid') continue;
      const date = payment.paidDate || payment.dueDate;
      if (!date?.startsWith(String(year))) continue;
      const month = Number(date.slice(5, 7)) - 1;
      if (month >= 0 && month < 12) amounts[month] += payment.amount || 0;
    }
  }
  return labels.map((label, month) => ({ month, label, amount: amounts[month] }));
}

export function listClients(deals: Deal[]): Array<{
  name: string;
  phone: string;
  email: string;
  role: PartyRole;
  deals: number;
}> {
  const map = new Map<string, { name: string; phone: string; email: string; role: PartyRole; deals: number }>();
  for (const deal of deals) {
    for (const party of deal.parties) {
      if (!CLIENT_ROLES.includes(party.role) || !party.name.trim()) continue;
      const key = party.idNumber || party.name;
      const prev = map.get(key);
      if (prev) prev.deals += 1;
      else map.set(key, { name: party.name, phone: party.phone, email: party.email, role: party.role, deals: 1 });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'he'));
}

export function alertCount(deals: Deal[]): number {
  return collectCalendarItems(deals).filter((i) => !i.done && isOverdueDate(i.date)).length;
}

/** Documents that block closing: everything not yet signed or filed in an active post-signing deal. */
export function unsignedDocsSummary(deal: Deal): { signed: number; total: number } {
  const total = deal.documents.length;
  const signed = deal.documents.filter((d) => d.status === 'signed' || d.status === 'filed').length;
  return { signed, total };
}
