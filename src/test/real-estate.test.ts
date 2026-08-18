import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, createDeal, deleteDeal, duplicateDeal, getAllDeals, getDeal, saveDeal } from '@/lib/real-estate-store';
import {
  collectCalendarItems,
  dealProgress,
  effectivePaymentStatus,
  feeAmount,
  formatMoney,
  isOverdueDate,
  monthlyReceivedFees,
  nextFileNumber,
  primaryClientName,
} from '@/lib/real-estate-utils';
import type { Deal, Payment } from '@/types/real-estate';
import { buildChecklist } from '@/data/real-estate-checklists';

function emptyStore() {
  localStorage.setItem(STORAGE_KEY, '[]');
}

function sampleDeal(overrides: Partial<Deal> = {}): Deal {
  const now = new Date().toISOString();
  return {
    id: 'deal-1',
    fileNumber: '2026-0001',
    title: 'רכישת דירה לדוגמה',
    type: 'purchase',
    status: 'due_diligence',
    clientSide: 'buyer',
    responsibleAttorney: 'עו"ד בדיקה',
    openedAt: '2026-01-01',
    consideration: 1000000,
    property: {
      address: 'הרצל 1',
      city: 'תל אביב',
      type: 'apartment',
      block: '1',
      parcel: '2',
      subParcel: '3',
      floor: '1',
      rooms: '3',
      area: '80',
      registryOffice: 'תל אביב',
      rights: 'בעלות',
      description: '',
    },
    parties: [],
    payments: [],
    tasks: [],
    documents: [],
    checklist: [],
    timeline: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeEach(() => {
  emptyStore();
});

afterEach(() => {
  localStorage.removeItem(STORAGE_KEY);
});

describe('real-estate utils', () => {
  it('formats ILS currency in Hebrew locale', () => {
    const formatted = formatMoney(2450000);
    expect(formatted.replace(/\u00a0/g, ' ')).toMatch(/2[,.]450[,.]000/);
    expect(formatted).toMatch(/₪|ILS/);
  });

  it('assigns sequential file numbers for the current year', () => {
    const year = new Date().getFullYear();
    expect(nextFileNumber([])).toBe(`${year}-0001`);
    expect(
      nextFileNumber([
        sampleDeal({ fileNumber: `${year}-0012` }),
        sampleDeal({ fileNumber: '2025-9999' }),
      ]),
    ).toBe(`${year}-0013`);
  });

  it('marks overdue pending payments and ignores paid ones', () => {
    const overdue: Payment = {
      id: 'p1',
      title: 'מקדמה',
      type: 'deposit',
      amount: 100,
      dueDate: '2020-01-01',
      status: 'pending',
      notes: '',
    };
    const paid: Payment = { ...overdue, id: 'p2', status: 'paid' };
    expect(effectivePaymentStatus(overdue)).toBe('overdue');
    expect(effectivePaymentStatus(paid)).toBe('paid');
    expect(isOverdueDate('2020-01-01')).toBe(true);
    expect(isOverdueDate('2099-01-01')).toBe(false);
  });

  it('computes deal progress from status, checklist, payments and documents', () => {
    const empty = sampleDeal({ status: 'intake', checklist: [], payments: [], documents: [] });
    expect(dealProgress(empty)).toBe(8);

    const closed = sampleDeal({ status: 'closed' });
    expect(dealProgress(closed)).toBe(100);

    const cancelled = sampleDeal({ status: 'cancelled' });
    expect(dealProgress(cancelled)).toBe(0);

    const checklist = buildChecklist().map((item, i) => ({ ...item, done: i < 10 }));
    const mid = sampleDeal({
      status: 'signed',
      checklist,
      payments: [
        { id: '1', title: 'a', type: 'deposit', amount: 1, dueDate: '2026-01-01', status: 'paid', notes: '' },
        { id: '2', title: 'b', type: 'consideration', amount: 1, dueDate: '2026-01-01', status: 'pending', notes: '' },
      ],
      documents: [
        { id: 'd1', title: 'x', category: 'contract', received: true, notes: '' },
        { id: 'd2', title: 'y', category: 'tabo', received: false, notes: '' },
      ],
    });
    const score = dealProgress(mid);
    expect(score).toBeGreaterThan(30);
    expect(score).toBeLessThan(90);
  });

  it('computes expected and received attorney fees', () => {
    const deals = [
      sampleDeal({
        status: 'signed',
        parties: [
          {
            id: 'c1',
            role: 'buyer',
            name: 'דנה לוי',
            idNumber: '1',
            phone: '',
            email: '',
            address: '',
            notes: '',
          },
        ],
        payments: [
          { id: '1', title: 'שכ"ט', type: 'fees', amount: 10000, dueDate: '2026-03-01', status: 'pending', notes: '' },
          { id: '2', title: 'שכ"ט שולם', type: 'fees', amount: 7000, dueDate: '2026-02-01', paidDate: '2026-02-10', status: 'paid', notes: '' },
          { id: '3', title: 'תמורה', type: 'consideration', amount: 999, dueDate: '2026-02-01', status: 'paid', notes: '' },
        ],
      }),
    ];
    expect(feeAmount(deals, { paid: false })).toBe(10000);
    expect(feeAmount(deals, { paid: true, year: 2026 })).toBe(7000);
    expect(monthlyReceivedFees(deals, 2026)[1].amount).toBe(7000);
    expect(primaryClientName(deals[0])).toBe('דנה לוי');
  });

  it('collects calendar items from tasks, payments and milestones', () => {
    const deal = sampleDeal({
      contractDate: '2026-03-01',
      tasks: [{ id: 't1', title: 'נסח', dueDate: '2026-02-10', done: false, priority: 'high', notes: '' }],
      payments: [
        { id: 'p1', title: 'מקדמה', type: 'deposit', amount: 50, dueDate: '2026-02-15', status: 'pending', notes: '' },
      ],
    });
    const items = collectCalendarItems([deal]);
    expect(items.map((i) => i.kind).sort()).toEqual(['milestone', 'payment', 'task']);
    expect(items[0].date <= items[items.length - 1].date).toBe(true);
  });
});

describe('real-estate store', () => {
  it('creates a deal with checklist, documents and default tasks', () => {
    const deal = createDeal({ title: 'רכישת משרד', type: 'purchase', consideration: 2000000 });
    expect(deal.fileNumber).toBe(`${new Date().getFullYear()}-0001`);
    expect(deal.status).toBe('intake');
    expect(deal.checklist.length).toBeGreaterThan(10);
    expect(deal.documents.length).toBeGreaterThan(3);
    expect(deal.payments.length).toBe(5);
    expect(getDeal(deal.id)?.title).toBe('רכישת משרד');
  });

  it('saves, duplicates and deletes deals', () => {
    const deal = createDeal({ title: 'מכירה', type: 'sale' });
    saveDeal({ ...deal, notes: 'עודכן' });
    expect(getDeal(deal.id)?.notes).toBe('עודכן');

    const copy = duplicateDeal(deal.id);
    expect(copy).toBeDefined();
    expect(copy?.fileNumber).toBe(`${new Date().getFullYear()}-0002`);
    expect(copy?.title).toContain('עותק');
    expect(getAllDeals()).toHaveLength(2);

    deleteDeal(deal.id);
    expect(getDeal(deal.id)).toBeUndefined();
    expect(getAllDeals()).toHaveLength(1);
  });
});

describe('legal document pack', () => {
  it('fills the full document set from party names', async () => {
    const { buildDocContext, missingDocFields } = await import('@/lib/legal-doc-context');
    const { buildDocumentPack, DOCUMENT_PACK_TITLES } = await import('@/data/legal-document-pack');
    const deal = sampleDeal({
      contractDate: '2026-07-06',
      consideration: 450000,
      parties: [
        { id: 'b1', role: 'buyer', name: 'אילעי שמואל ציון וקנין', idNumber: '326349933', phone: '', email: '', address: 'כרמיאל', notes: '' },
        { id: 's1', role: 'seller', name: 'אופק חרוץ', idNumber: '208948281', phone: '', email: '', address: 'בת ים', notes: '' },
      ],
      property: {
        address: 'מרחבים 1331/36',
        city: 'דימונה',
        type: 'apartment',
        block: '39522',
        parcel: '29',
        subParcel: '36',
        floor: '3',
        rooms: '3',
        area: '63',
        registryOffice: 'באר שבע',
        rights: 'בעלות',
        description: '',
      },
    });
    const ctx = buildDocContext(deal, {
      attorneyName: 'עו"ד אוריאל סולטן',
      license: '100206',
      officeAddress: 'הבנאים 9, אשדוד',
      officeCity: 'באר שבע',
      secondAttorneyName: 'עו"ד תמיר חיון',
    });
    expect(missingDocFields(ctx)).toEqual([]);
    const pack = buildDocumentPack(ctx);
    expect(pack.map((d) => d.title)).toEqual([...DOCUMENT_PACK_TITLES]);
    const sale = pack.find((d) => d.id === 'sale-agreement')!.html;
    expect(sale).toContain('אילעי שמואל ציון וקנין');
    expect(sale).toContain('אופק חרוץ');
    expect(sale).toContain('39522');
    expect(pack.find((d) => d.id === 'form-7000')!.html).toContain('7000');
    expect(pack.find((d) => d.id === 'deed')!.html).toContain('שטר מכר');
  });
});
