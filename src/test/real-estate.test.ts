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
    expect(pack).toHaveLength(DOCUMENT_PACK_TITLES.length);
    expect(pack.find((d) => d.id === 'poa-seller')!.html).toContain('המוכר');
    expect(pack.find((d) => d.id === 'capital-gains')!.html).toContain('מס שבח');
    expect(pack.find((d) => d.id === 'trust')!.html).toContain('נאמנות');
    expect(pack.find((d) => d.id === 'deed')!.html).toContain('השטר הזה מעיד שבתמורה');
  });

  it('shows only the documents for the represented side', async () => {
    const { buildDocContext } = await import('@/lib/legal-doc-context');
    const { buildDocumentPack } = await import('@/data/legal-document-pack');
    const { representedSide } = await import('@/lib/document-audience');
    const deal = sampleDeal({
      clientSide: 'buyer',
      parties: [
        { id: 'b1', role: 'buyer', name: 'קונה בדיקה', idNumber: '1', phone: '', email: '', address: '', notes: '' },
        { id: 's1', role: 'seller', name: 'מוכר בדיקה', idNumber: '2', phone: '', email: '', address: '', notes: '' },
      ],
    });
    const ctx = buildDocContext(deal, {
      attorneyName: 'עו"ד בדיקה',
      license: '1',
      officeAddress: 'א',
      officeCity: 'ב',
      secondAttorneyName: '',
    });
    const buyerPack = buildDocumentPack(ctx, representedSide('buyer'));
    const sellerPack = buildDocumentPack(ctx, representedSide('seller'));
    const bothPack = buildDocumentPack(ctx, representedSide('both'));
    expect(buyerPack.some((d) => d.id === 'poa-buyer')).toBe(true);
    expect(buyerPack.some((d) => d.id === 'purchase-tax')).toBe(true);
    expect(buyerPack.some((d) => d.id === 'poa-seller')).toBe(false);
    expect(buyerPack.some((d) => d.id === 'capital-gains')).toBe(false);
    expect(sellerPack.some((d) => d.id === 'poa-seller')).toBe(true);
    expect(sellerPack.some((d) => d.id === 'capital-gains')).toBe(true);
    expect(sellerPack.some((d) => d.id === 'poa-buyer')).toBe(false);
    expect(sellerPack.some((d) => d.id === 'purchase-tax')).toBe(false);
    expect(bothPack.some((d) => d.id === 'poa-buyer')).toBe(true);
    expect(bothPack.some((d) => d.id === 'poa-seller')).toBe(true);
    expect(bothPack.length).toBeGreaterThan(buyerPack.length);
    expect(bothPack.length).toBeGreaterThan(sellerPack.length);
  });

  it('builds a rental pack for rental deals and hides rental docs from sale deals', async () => {
    const { buildDocContext } = await import('@/lib/legal-doc-context');
    const { buildDocumentPack } = await import('@/data/legal-document-pack');
    const deal = sampleDeal({
      type: 'rental',
      clientSide: 'both',
      parties: [
        { id: 't1', role: 'tenant', name: 'שוכר בדיקה', idNumber: '1', phone: '', email: '', address: '', notes: '' },
        { id: 'l1', role: 'landlord', name: 'משכיר בדיקה', idNumber: '2', phone: '', email: '', address: '', notes: '' },
      ],
    });
    const office = {
      attorneyName: 'עו"ד בדיקה',
      license: '1',
      officeAddress: 'א',
      officeCity: 'ב',
      secondAttorneyName: '',
    };
    const rentalPack = buildDocumentPack(buildDocContext(deal, office), 'both', 'rental');
    expect(rentalPack.some((d) => d.id === 'rental-agreement')).toBe(true);
    expect(rentalPack.some((d) => d.id === 'rental-note')).toBe(true);
    expect(rentalPack.some((d) => d.id === 'sale-agreement')).toBe(false);
    expect(rentalPack.some((d) => d.id === 'deed')).toBe(false);
    expect(rentalPack.find((d) => d.id === 'rental-agreement')!.html).toContain('שוכר בדיקה');
    expect(rentalPack.find((d) => d.id === 'rental-agreement')!.html).toContain('משכיר בדיקה');

    const salePack = buildDocumentPack(buildDocContext(sampleDeal(), office), 'both', 'purchase');
    expect(salePack.some((d) => d.id === 'rental-agreement')).toBe(false);
    expect(salePack.some((d) => d.id === 'sale-agreement')).toBe(true);
  });

  it('adds the office logo to document headers when set', async () => {
    const { buildDocContext } = await import('@/lib/legal-doc-context');
    const { buildDocumentPack } = await import('@/data/legal-document-pack');
    const ctx = buildDocContext(sampleDeal(), {
      attorneyName: 'עו"ד בדיקה',
      license: '1',
      officeAddress: 'א',
      officeCity: 'ב',
      secondAttorneyName: '',
      logoDataUrl: 'data:image/png;base64,AAAA',
    });
    const pack = buildDocumentPack(ctx);
    expect(pack.find((d) => d.id === 'fees')!.html).toContain('office-logo');
    expect(pack.find((d) => d.id === 'fees')!.html).toContain('data:image/png;base64,AAAA');
  });
});

describe('custom templates', () => {
  const office = {
    attorneyName: 'עו"ד בדיקה',
    license: '12345',
    officeAddress: 'הרצל 5, תל אביב',
    officeCity: 'תל אביב',
    secondAttorneyName: '',
  };
  const deal = () =>
    sampleDeal({
      parties: [
        { id: 'b1', role: 'buyer' as const, name: 'ישראל ישראלי', idNumber: '111', phone: '050-1111111', email: '', address: 'חיפה', notes: '' },
        { id: 's1', role: 'seller' as const, name: 'שרה כהן', idNumber: '222', phone: '', email: '', address: 'אשדוד', notes: '' },
      ],
    });

  it('replaces Hebrew curly-brace variables with deal data', async () => {
    const { buildDocContext } = await import('@/lib/legal-doc-context');
    const { renderTemplateText } = await import('@/lib/template-variables');
    const ctx = buildDocContext(deal(), office);
    const out = renderTemplateText(
      'תיק {מספר_תיק}: {שם_קונה_1} (ת.ז. {תעודת_זהות_קונה_1}) קונה מ-{כל_המוכרים} בגוש {גוש}. {לא_קיים}',
      ctx,
    );
    expect(out).toContain('2026-0001');
    expect(out).toContain('ישראל ישראלי');
    expect(out).toContain('111');
    expect(out).toContain('שרה כהן');
    expect(out).toContain('בגוש 1');
    expect(out).toContain('{לא_קיים}');
  });

  it('renders custom documents and filters them by audience', async () => {
    const { buildDocContext } = await import('@/lib/legal-doc-context');
    const { renderCustomDocuments } = await import('@/data/legal-document-pack');
    const ctx = buildDocContext(deal(), office);
    const templates = [
      { id: 't1', title: 'מכתב לקונה', audience: 'buyer' as const, body: 'שלום {שם_קונה_1}', updatedAt: '' },
      { id: 't2', title: 'מכתב למוכר', audience: 'seller' as const, body: 'שלום {שם_מוכר_1}', updatedAt: '' },
    ];
    const buyerDocs = renderCustomDocuments(ctx, templates, 'buyer');
    expect(buyerDocs).toHaveLength(1);
    expect(buyerDocs[0].title).toBe('מכתב לקונה');
    expect(buyerDocs[0].html).toContain('ישראל ישראלי');
    expect(buyerDocs[0].group).toBe('תבניות שלי');
    const allDocs = renderCustomDocuments(ctx, templates, 'both');
    expect(allDocs).toHaveLength(2);
  });

  it('lists every documented variable with a value function', async () => {
    const { TEMPLATE_VARIABLES, buildVariablesText } = await import('@/lib/template-variables');
    expect(TEMPLATE_VARIABLES.length).toBeGreaterThan(70);
    const text = buildVariablesText();
    for (const v of TEMPLATE_VARIABLES.slice(0, 5)) expect(text).toContain(`{${v.name}}`);
  });
});

describe('purchase tax calculator', () => {
  it('computes zero tax under the single-home exemption bracket', async () => {
    const { calcPurchaseTax } = await import('@/lib/purchase-tax');
    expect(calcPurchaseTax(1_500_000, true).total).toBe(0);
  });

  it('computes bracketed tax for a single home', async () => {
    const { calcPurchaseTax } = await import('@/lib/purchase-tax');
    const result = calcPurchaseTax(3_000_000, true);
    const expected = Math.round((2_347_040 - 1_978_745) * 0.035) + Math.round((3_000_000 - 2_347_040) * 0.05);
    expect(result.total).toBe(expected);
    expect(result.rows.length).toBe(3);
  });

  it('computes 8% flat start for an additional home', async () => {
    const { calcPurchaseTax } = await import('@/lib/purchase-tax');
    expect(calcPurchaseTax(2_000_000, false).total).toBe(160_000);
  });
});

describe('reminders and backup', () => {
  it('builds a valid ICS calendar with alarms', async () => {
    const { buildIcs, whatsappReminderLink } = await import('@/lib/ics');
    const deal = sampleDeal({
      tasks: [{ id: 't1', title: 'נסח טאבו', dueDate: '2026-02-10', done: false, priority: 'high', notes: '' }],
    });
    const items = collectCalendarItems([deal]);
    const ics = buildIcs(items);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260210');
    expect(ics).toContain('BEGIN:VALARM');
    expect(whatsappReminderLink('050-1234567', 'שלום')).toBe(
      `https://wa.me/972501234567?text=${encodeURIComponent('שלום')}`,
    );
  });

  it('exports and restores a backup file', async () => {
    const { buildBackup, restoreBackup } = await import('@/lib/backup');
    createDeal({ title: 'תיק לגיבוי', type: 'purchase' });
    const backup = buildBackup();
    expect(backup.app).toBe('solo-nadlan');
    expect(backup.deals.length).toBe(1);

    emptyStore();
    expect(getAllDeals().some((d) => d.title === 'תיק לגיבוי')).toBe(false);
    const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
    const result = await restoreBackup(file);
    expect(result.deals).toBe(1);
    expect(getAllDeals().some((d) => d.title === 'תיק לגיבוי')).toBe(true);
  });

  it('suggests statutory deadlines from contract and closing dates', async () => {
    const { suggestLegalDeadlines } = await import('@/lib/legal-deadlines');
    const deal = sampleDeal({ contractDate: '2026-03-01', closingDate: '2026-06-01' });

    const buyer = suggestLegalDeadlines(deal, 'buyer');
    const titles = buyer.map((s) => s.title);
    expect(titles).toContain('דיווח העסקה למיסוי מקרקעין (טופס 7002)');
    expect(titles).toContain('תשלום מס רכישה');
    expect(titles).not.toContain('הגשת שומה עצמית למס שבח');
    expect(buyer.find((s) => s.title.includes('דיווח העסקה'))?.dueDate).toBe('2026-03-31');
    expect(buyer.find((s) => s.title === 'תשלום מס רכישה')?.dueDate).toBe('2026-04-30');

    const seller = suggestLegalDeadlines(deal, 'seller');
    expect(seller.map((s) => s.title)).toContain('הגשת שומה עצמית למס שבח');
    expect(seller.map((s) => s.title)).not.toContain('תשלום מס רכישה');

    // Existing tasks are not duplicated.
    const withTask = sampleDeal({
      contractDate: '2026-03-01',
      tasks: [{ id: 't', title: 'תשלום מס רכישה', dueDate: '2026-04-01', done: false, priority: 'high', notes: '' }],
    });
    expect(suggestLegalDeadlines(withTask, 'buyer').map((s) => s.title)).not.toContain('תשלום מס רכישה');
  });

  it('finds conflicts of interest by id and by name', async () => {
    const { findConflicts } = await import('@/lib/conflict-check');
    const other = sampleDeal({ id: 'deal-2', fileNumber: '2026-0002' });
    other.parties = [
      { id: 'p1', role: 'seller', name: 'ישראל ישראלי', idNumber: '012345678', phone: '', email: '', address: '', notes: '' },
    ];
    const byId = findConflicts('אחר לגמרי', '12345678', 'deal-1', [other]);
    expect(byId).toHaveLength(0);
    const byIdExact = findConflicts('אחר לגמרי', '012345678', 'deal-1', [other]);
    expect(byIdExact).toHaveLength(1);
    expect(byIdExact[0].matchedBy).toBe('id');
    const byName = findConflicts('ישראל ישראלי', '', 'deal-1', [other]);
    expect(byName[0].matchedBy).toBe('name');
    // Same deal is excluded.
    expect(findConflicts('ישראל ישראלי', '', 'deal-2', [other])).toHaveLength(0);
  });

  it('round-trips intake form data through the code', async () => {
    const { encodeIntake, decodeIntake, extractIntakeCode } = await import('@/lib/intake');
    const code = encodeIntake({
      fileNumber: '2026-0001',
      role: 'buyer',
      people: [{ name: 'דנה כהן', idNumber: '123456789', phone: '0501234567', email: 'a@b.co', address: 'תל אביב' }],
      notes: 'יש משכנתא',
    });
    expect(code.startsWith('SN1:')).toBe(true);
    const decoded = decodeIntake(code);
    expect(decoded?.people[0].name).toBe('דנה כהן');
    expect(decoded?.notes).toBe('יש משכנתא');
    const inMessage = extractIntakeCode(`שלום, מילאתי את הטופס:\n\n${code}\n\nתודה`);
    expect(inMessage).toBe(code);
    expect(decodeIntake('לא קוד')).toBeNull();
  });

  it('calculates linkage, late interest and capital gains estimates', async () => {
    const { linkedAmount, lateInterest, estimateCapitalGains } = await import('@/lib/calculators');
    expect(linkedAmount(100000, 100, 110)).toBe(110000);
    expect(linkedAmount(0, 100, 110)).toBe(0);
    expect(lateInterest(100000, 10, 365)).toBe(10000);
    const gains = estimateCapitalGains({
      purchasePrice: 1000000,
      salePrice: 2000000,
      expenses: 100000,
      linkedPurchasePrice: 1200000,
    });
    expect(gains.realGain).toBe(700000);
    expect(gains.estimatedTax).toBe(175000);
  });

  it('builds an RTL Word export document', async () => {
    const { buildWordHtml } = await import('@/lib/word-export');
    const html = buildWordHtml('ייפוי כוח', '<h1>ייפוי כוח</h1><p>תוכן</p>');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('<h1>ייפוי כוח</h1>');
    expect(html).toContain('urn:schemas-microsoft-com:office:word');
  });
});
