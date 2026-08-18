import { buildChecklist, buildDefaultPayments, buildDocuments, newId } from '@/data/real-estate-checklists';
import { buildDemoDeals } from '@/data/real-estate-demo';
import type { Deal, DealStatus, DealType, Property } from '@/types/real-estate';
import { nextFileNumber, todayIso } from '@/lib/real-estate-utils';

export const STORAGE_KEY = 'real-estate-deals-v1';

function emptyProperty(): Property {
  return {
    address: '',
    city: '',
    type: 'apartment',
    block: '',
    parcel: '',
    subParcel: '',
    floor: '',
    rooms: '',
    area: '',
    registryOffice: '',
    rights: 'בעלות',
    description: '',
  };
}

function readRaw(): Deal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(deals: Deal[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
}

export function seedDemoIfEmpty(): Deal[] {
  const existing = readRaw();
  if (existing.length > 0) return existing;
  const seeded = buildDemoDeals();
  writeRaw(seeded);
  return seeded;
}

export function getAllDeals(): Deal[] {
  const deals = seedDemoIfEmpty();
  return [...deals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getDeal(id: string): Deal | undefined {
  return getAllDeals().find((d) => d.id === id);
}

export function saveDeal(deal: Deal): Deal {
  const next = { ...deal, updatedAt: new Date().toISOString() };
  const deals = readRaw();
  const idx = deals.findIndex((d) => d.id === next.id);
  if (idx >= 0) deals[idx] = next;
  else deals.unshift(next);
  writeRaw(deals);
  return next;
}

export function deleteDeal(id: string): void {
  writeRaw(readRaw().filter((d) => d.id !== id));
}

export function createDeal(input: {
  title: string;
  type?: DealType;
  consideration?: number;
  attorney?: string;
}): Deal {
  const existing = readRaw();
  const now = new Date().toISOString();
  const consideration = input.consideration ?? 0;
  const deal: Deal = {
    id: newId(),
    fileNumber: nextFileNumber(existing),
    title: input.title.trim(),
    type: input.type ?? 'purchase',
    status: 'intake',
    clientSide: input.type === 'sale' ? 'seller' : input.type === 'rental' ? 'tenant' : 'buyer',
    responsibleAttorney: input.attorney ?? '',
    openedAt: todayIso(),
    consideration,
    property: emptyProperty(),
    parties: [],
    payments: consideration > 0 ? buildDefaultPayments(consideration) : [],
    tasks: [
      {
        id: newId(),
        title: 'הזמנת נסח טאבו עדכני',
        dueDate: todayIso(),
        done: false,
        priority: 'high',
        notes: '',
      },
      {
        id: newId(),
        title: 'אימות זהות הלקוח וחתימה על ייפוי כוח',
        dueDate: todayIso(),
        done: false,
        priority: 'high',
        notes: '',
      },
    ],
    documents: buildDocuments(),
    checklist: buildChecklist(),
    timeline: [
      {
        id: newId(),
        date: now,
        title: 'תיק נפתח',
        body: `נפתח תיק "${input.title.trim()}"`,
      },
    ],
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
  saveDeal(deal);
  return deal;
}

export function duplicateDeal(id: string): Deal | undefined {
  const source = getDeal(id);
  if (!source) return undefined;
  const existing = readRaw();
  const now = new Date().toISOString();
  const copy: Deal = {
    ...structuredClone(source),
    id: newId(),
    fileNumber: nextFileNumber(existing),
    title: `${source.title} (עותק)`,
    status: 'intake' as DealStatus,
    openedAt: todayIso(),
    createdAt: now,
    updatedAt: now,
    timeline: [
      {
        id: newId(),
        date: now,
        title: 'תיק שוכפל',
        body: `שוכפל מתיק ${source.fileNumber}`,
      },
    ],
  };
  saveDeal(copy);
  return copy;
}

export function addTimeline(deal: Deal, title: string, body = ''): Deal {
  deal.timeline = [
    { id: newId(), date: new Date().toISOString(), title, body },
    ...deal.timeline,
  ];
  return saveDeal(deal);
}

export function resetDemoData(): Deal[] {
  localStorage.removeItem(STORAGE_KEY);
  return seedDemoIfEmpty();
}
