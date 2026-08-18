import { buildChecklist, newId } from '@/data/real-estate-checklists';
import type { ChecklistItem, Deal } from '@/types/real-estate';

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function markChecklist(doneLabels: string[]): ChecklistItem[] {
  return buildChecklist().map((item) =>
    doneLabels.some((label) => item.label.includes(label))
      ? { ...item, done: true }
      : item,
  );
}

export function buildDemoDeals(): Deal[] {
  const now = new Date().toISOString();

  const ramatGan: Deal = {
    id: newId(),
    fileNumber: '2026-0142',
    title: 'רכישת דירה — ביאליק 12, רמת גן',
    type: 'purchase',
    status: 'due_diligence',
    clientSide: 'buyer',
    responsibleAttorney: 'עו"ד מיכל ברק',
    openedAt: daysFromNow(-18),
    consideration: 2450000,
    property: {
      address: 'ביאליק 12, דירה 7',
      city: 'רמת גן',
      type: 'apartment',
      block: '6158',
      parcel: '42',
      subParcel: '7',
      floor: '3',
      rooms: '4',
      area: '98',
      registryOffice: 'תל אביב',
      rights: 'בעלות',
      description: 'דירת 4 חדרים בבניין משנות ה-90, ממ"ד, חניה במגרש.',
    },
    parties: [
      {
        id: newId(),
        role: 'buyer',
        name: 'יונתן ודנה לוי',
        idNumber: '034567890 / 028765432',
        phone: '052-4441122',
        email: 'levy.family@example.com',
        address: 'הרצל 8, גבעתיים',
        notes: 'לקוחות המשרד — רכישה ראשונה',
      },
      {
        id: newId(),
        role: 'seller',
        name: 'אברהם כהן',
        idNumber: '012345678',
        phone: '050-7778899',
        email: 'a.cohen@example.com',
        address: 'ביאליק 12, רמת גן',
        notes: '',
      },
      {
        id: newId(),
        role: 'opposing_counsel',
        name: 'עו"ד רונית שמיר',
        idNumber: '',
        phone: '03-5551212',
        email: 'ronit@example-law.co.il',
        address: 'רוטשילד 45, תל אביב',
        notes: '',
      },
      {
        id: newId(),
        role: 'broker',
        name: 'רי/מקס השרון',
        idNumber: '515123456',
        phone: '03-6123344',
        email: 'office@example-remax.co.il',
        address: '',
        notes: '2% + מע"מ מהמוכר',
      },
    ],
    payments: [
      { id: newId(), title: 'מקדמה בחתימה', type: 'deposit', amount: 245000, dueDate: daysFromNow(12), status: 'pending', notes: '10%' },
      { id: newId(), title: 'תשלום שני', type: 'consideration', amount: 980000, dueDate: daysFromNow(50), status: 'pending', notes: 'לאחר הסרת תנאים מתלים' },
      { id: newId(), title: 'יתרה במסירה', type: 'consideration', amount: 1225000, dueDate: daysFromNow(95), status: 'pending', notes: '' },
      { id: newId(), title: 'מס רכישה (אומדן)', type: 'purchase_tax', amount: 42000, dueDate: daysFromNow(55), status: 'pending', notes: 'דירה יחידה — מדרגות מס' },
      { id: newId(), title: 'שכר טרחה', type: 'fees', amount: 36750, dueDate: daysFromNow(12), status: 'pending', notes: 'כולל מע"מ' },
    ],
    tasks: [
      { id: newId(), title: 'הזמנת נסח טאבו מקוון', dueDate: daysFromNow(-2), done: false, priority: 'high', notes: 'לשכת ת"א' },
      { id: newId(), title: 'בדיקת תיק בניין בעיריית רמת גן', dueDate: daysFromNow(5), done: false, priority: 'high', notes: '' },
      { id: newId(), title: 'קבלת טיוטת הסכם מעו"ד המוכר', dueDate: daysFromNow(8), done: false, priority: 'medium', notes: '' },
    ],
    documents: [
      { id: newId(), title: 'הסכם מכר', category: 'contract', received: false, notes: '' },
      { id: newId(), title: 'נסח טאבו', category: 'tabo', received: false, notes: 'הוזמן' },
      { id: newId(), title: 'ייפוי כוח נוטריוני', category: 'poa', received: true, date: daysFromNow(-10), notes: '' },
    ],
    checklist: markChecklist(['אימות זהות', 'ייפוי כוח']),
    timeline: [
      { id: newId(), date: isoDaysAgo(18), title: 'תיק נפתח', body: 'פגישת היכרות עם בני הזוג לוי.' },
      { id: newId(), date: isoDaysAgo(12), title: 'ייפוי כוח נחתם', body: 'נחתם ייפוי כוח בלתי חוזר במשרד.' },
      { id: newId(), date: isoDaysAgo(3), title: 'הוזמן נסח טאבו', body: 'הזמנה מקוונת — ממתין לקבלה.' },
    ],
    notes: 'הלקוחות מעוניינים בכניסה עד סוף השנה. יש לבדוק חריגת מרפסת שנסגרה.',
    createdAt: isoDaysAgo(18),
    updatedAt: now,
  };

  const herzliya: Deal = {
    id: newId(),
    fileNumber: '2026-0138',
    title: 'מכירת בית פרטי — הנביאים 4, הרצליה',
    type: 'sale',
    status: 'signed',
    clientSide: 'seller',
    responsibleAttorney: 'עו"ד אלון שדה',
    openedAt: daysFromNow(-46),
    contractDate: daysFromNow(-14),
    closingDate: daysFromNow(22),
    registrationDate: daysFromNow(40),
    consideration: 4800000,
    property: {
      address: 'הנביאים 4',
      city: 'הרצליה',
      type: 'house',
      block: '6521',
      parcel: '18',
      subParcel: '',
      floor: '',
      rooms: '6',
      area: '220 / מגרש 480',
      registryOffice: 'הרצליה',
      rights: 'בעלות',
      description: 'בית דו-משפחתי עם גינה, מחסן ו-2 חניות.',
    },
    parties: [
      {
        id: newId(),
        role: 'seller',
        name: 'משפחת אברמוביץ',
        idNumber: '015556667 / 016667778',
        phone: '054-2211000',
        email: 'abram@example.com',
        address: 'הנביאים 4, הרצליה',
        notes: 'מוכרים לצורך מעבר לצפון',
      },
      {
        id: newId(),
        role: 'buyer',
        name: 'חברת נוף הים בע"מ',
        idNumber: '516778899',
        phone: '09-9554433',
        email: 'legal@nofhayam.example',
        address: 'הברזל 19, רמת החייל',
        notes: 'רוכשת באמצעות מורשה חתימה',
      },
      {
        id: newId(),
        role: 'bank',
        name: 'בנק לאומי — סניף הרצליה',
        idNumber: '',
        phone: '09-9501111',
        email: '',
        address: '',
        notes: 'משכנתא קיימת ~820,000 ₪ — יש לתאם סילוק',
      },
    ],
    payments: [
      { id: newId(), title: 'מקדמה שהתקבלה', type: 'deposit', amount: 480000, dueDate: daysFromNow(-14), paidDate: daysFromNow(-14), status: 'paid', notes: 'הופקד בנאמנות' },
      { id: newId(), title: 'תשלום שני', type: 'consideration', amount: 1920000, dueDate: daysFromNow(10), status: 'pending', notes: 'כנגד מחיקת משכנתא' },
      { id: newId(), title: 'יתרה במסירה', type: 'consideration', amount: 2400000, dueDate: daysFromNow(22), status: 'pending', notes: '' },
      { id: newId(), title: 'מס שבח (אומדן)', type: 'capital_gains', amount: 0, dueDate: daysFromNow(16), status: 'pending', notes: 'פטור דירת מגורים מזכה — לבדוק' },
      { id: newId(), title: 'שכר טרחה', type: 'fees', amount: 72000, dueDate: daysFromNow(-14), paidDate: daysFromNow(-10), status: 'paid', notes: '' },
    ],
    tasks: [
      { id: newId(), title: 'תיאום סילוק משכנתא עם לאומי', dueDate: daysFromNow(6), done: false, priority: 'high', notes: '' },
      { id: newId(), title: 'הגשת דיווח מס שבח', dueDate: daysFromNow(16), done: false, priority: 'high', notes: 'תוך 30 יום מחתימה' },
      { id: newId(), title: 'הכנת ייפוי כוח לרישום', dueDate: daysFromNow(20), done: false, priority: 'medium', notes: '' },
    ],
    documents: [
      { id: newId(), title: 'הסכם מכר חתום', category: 'contract', received: true, date: daysFromNow(-14), notes: '' },
      { id: newId(), title: 'נספח נאמנות', category: 'appendix', received: true, date: daysFromNow(-14), notes: '' },
      { id: newId(), title: 'נסח טאבו', category: 'tabo', received: true, date: daysFromNow(-30), notes: '' },
      { id: newId(), title: 'אישור יתרת משכנתא', category: 'other', received: false, notes: '' },
    ],
    checklist: markChecklist(['נסח טאבו', 'שעבודים', 'אימות זהות', 'טיוטת הסכם', 'תנאים מתלים', 'ייפוי כוח']),
    timeline: [
      { id: newId(), date: isoDaysAgo(46), title: 'תיק נפתח', body: 'ייצוג המוכרים.' },
      { id: newId(), date: isoDaysAgo(14), title: 'נחתם הסכם מכר', body: 'חתימה במשרד הקונה. מקדמה בנאמנות.' },
    ],
    notes: 'יש לוודא שהקונה היא חברה פעילה ושיש פרוטוקול מורשי חתימה.',
    createdAt: isoDaysAgo(46),
    updatedAt: isoDaysAgo(1),
  };

  const telAvivOffice: Deal = {
    id: newId(),
    fileNumber: '2026-0151',
    title: 'שכירות משרד — הארבעה 28, תל אביב',
    type: 'rental',
    status: 'negotiation',
    clientSide: 'tenant',
    responsibleAttorney: 'עו"ד מיכל ברק',
    openedAt: daysFromNow(-9),
    consideration: 18000,
    property: {
      address: 'הארבעה 28, קומה 11',
      city: 'תל אביב-יפו',
      type: 'office',
      block: '7102',
      parcel: '5',
      subParcel: '112',
      floor: '11',
      rooms: '',
      area: '145',
      registryOffice: 'תל אביב',
      rights: 'שכירות — 5 שנים + אופציה',
      description: 'משרד מוכן, 8 עמדות, חדר ישיבות, 2 חניות.',
    },
    parties: [
      {
        id: newId(),
        role: 'tenant',
        name: 'סטודיו נור בע"מ',
        idNumber: '516001122',
        phone: '03-7178800',
        email: 'hello@nor.example',
        address: '',
        notes: 'לקוחה קיימת',
      },
      {
        id: newId(),
        role: 'landlord',
        name: 'מגדלי הארבעה בע"מ',
        idNumber: '512334455',
        phone: '03-6099000',
        email: 'leases@example.com',
        address: '',
        notes: '',
      },
    ],
    payments: [
      { id: newId(), title: 'דמי שכירות חודשיים', type: 'consideration', amount: 18000, dueDate: daysFromNow(20), status: 'pending', notes: '+ מע"מ + דמי ניהול' },
      { id: newId(), title: 'פיקדון / ערבות בנקאית', type: 'deposit', amount: 54000, dueDate: daysFromNow(20), status: 'pending', notes: '3 חודשים' },
      { id: newId(), title: 'שכר טרחה', type: 'fees', amount: 8500, dueDate: daysFromNow(3), status: 'pending', notes: '' },
    ],
    tasks: [
      { id: newId(), title: 'הערות לטיוטת הסכם השכירות', dueDate: daysFromNow(2), done: false, priority: 'high', notes: 'סעיפי יציאה והשבה' },
      { id: newId(), title: 'בדיקת היתר לשימוש משרדי', dueDate: daysFromNow(7), done: false, priority: 'medium', notes: '' },
    ],
    documents: [
      { id: newId(), title: 'טיוטת הסכם שכירות', category: 'contract', received: true, date: daysFromNow(-4), notes: '' },
      { id: newId(), title: 'תשריט המושכר', category: 'appendix', received: false, notes: '' },
    ],
    checklist: markChecklist(['אימות זהות']),
    timeline: [
      { id: newId(), date: isoDaysAgo(9), title: 'תיק נפתח', body: 'ייצוג השוכרת במשא ומתן.' },
      { id: newId(), date: isoDaysAgo(4), title: 'התקבלה טיוטה', body: 'טיוטה ראשונה מהמשכיר.' },
    ],
    notes: 'לבקש תקרת הצמדה והחרגת שיפוץ ראשוני.',
    createdAt: isoDaysAgo(9),
    updatedAt: isoDaysAgo(2),
  };

  const rishon: Deal = {
    id: newId(),
    fileNumber: '2026-0120',
    title: 'עסקת קומבינציה — מגרש בראשון לציון',
    type: 'combination',
    status: 'negotiation',
    clientSide: 'seller',
    responsibleAttorney: 'עו"ד אלון שדה',
    openedAt: daysFromNow(-60),
    consideration: 0,
    property: {
      address: 'המעפילים 3',
      city: 'ראשון לציון',
      type: 'plot',
      block: '3921',
      parcel: '77',
      subParcel: '',
      floor: '',
      rooms: '',
      area: '1,120',
      registryOffice: 'ראשון לציון',
      rights: 'בעלות — ייעוד מגורים',
      description: 'מגרש לבניין 8 קומות. יזם מציע 32% תמורה בעין.',
    },
    parties: [
      {
        id: newId(),
        role: 'seller',
        name: 'עיזבון המנוח יצחק פרידמן',
        idNumber: '',
        phone: '052-9001122',
        email: '',
        address: '',
        notes: '4 יורשים — נדרש צו קיום צוואה',
      },
      {
        id: newId(),
        role: 'buyer',
        name: 'יזמות דרום השפלה בע"מ',
        idNumber: '514556677',
        phone: '08-6789900',
        email: 'dev@example.com',
        address: '',
        notes: '',
      },
    ],
    payments: [
      { id: newId(), title: 'מקדמה ליזם — הוצאות תכנון', type: 'deposit', amount: 150000, dueDate: daysFromNow(30), status: 'pending', notes: 'אם ייחתם' },
      { id: newId(), title: 'שכר טרחה — שלב משא ומתן', type: 'fees', amount: 25000, dueDate: daysFromNow(-5), status: 'overdue', notes: '' },
    ],
    tasks: [
      { id: newId(), title: 'השלמת צו קיום צוואה', dueDate: daysFromNow(-8), done: false, priority: 'high', notes: 'חסרה הסכמת יורש אחד' },
      { id: newId(), title: 'חוות דעת שמאי לתמורת הקומבינציה', dueDate: daysFromNow(14), done: false, priority: 'medium', notes: '' },
    ],
    documents: [
      { id: newId(), title: 'מזכר הבנות', category: 'contract', received: false, notes: '' },
      { id: newId(), title: 'צו קיום צוואה', category: 'other', received: false, notes: '' },
      { id: newId(), title: 'נסח טאבו', category: 'tabo', received: true, date: daysFromNow(-40), notes: '' },
    ],
    checklist: markChecklist(['נסח טאבו']),
    timeline: [
      { id: newId(), date: isoDaysAgo(60), title: 'תיק נפתח', body: 'פנייה מהיורשים.' },
      { id: newId(), date: isoDaysAgo(21), title: 'פגישה עם היזם', body: 'הוצגה הצעת 32% + 2 דירות.' },
    ],
    notes: 'אין לחתום לפני הסדרת הייצוג מול כל היורשים.',
    createdAt: isoDaysAgo(60),
    updatedAt: isoDaysAgo(5),
  };

  return [ramatGan, herzliya, telAvivOffice, rishon];
}
