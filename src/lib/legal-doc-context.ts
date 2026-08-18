import type { ClientSide, Deal, Party } from '@/types/real-estate';
import { formatDateHe, formatMoney, formatShortDate } from '@/lib/real-estate-utils';
import type { OfficeProfile } from '@/lib/office-profile';

export interface DocContext {
  fileNumber: string;
  title: string;
  buyers: Party[];
  sellers: Party[];
  buyerNames: string;
  sellerNames: string;
  buyerIds: string;
  sellerIds: string;
  buyerAddresses: string;
  sellerAddresses: string;
  buyerPhones: string;
  sellerPhones: string;
  attorney: string;
  license: string;
  officeAddress: string;
  officeCity: string;
  secondAttorney: string;
  propertyAddress: string;
  propertyCity: string;
  block: string;
  parcel: string;
  subParcel: string;
  area: string;
  floor: string;
  rooms: string;
  rights: string;
  registryOffice: string;
  propertyType: string;
  consideration: string;
  considerationRaw: number;
  contractDate: string;
  contractDateShort: string;
  closingDate: string;
  openedAt: string;
  paymentsHtml: string;
  bankName: string;
  bankAddress: string;
  opposingCounsel: string;
  propertyDescription: string;
  dealType: string;
  clientSide: ClientSide;
  clientNames: string;
  clientIds: string;
  logo: string;
}

function named(parties: Party[]): string {
  return parties.map((p) => p.name.trim()).filter(Boolean).join(' ו') || '________';
}

function ids(parties: Party[]): string {
  return parties.map((p) => p.idNumber.trim()).filter(Boolean).join(' / ') || '________';
}

function addresses(parties: Party[]): string {
  return parties.map((p) => p.address.trim()).filter(Boolean).join(' ; ') || '________';
}

function phones(parties: Party[]): string {
  return parties.map((p) => p.phone.trim()).filter(Boolean).join(' ; ') || '________';
}

function blank(value: string | undefined): string {
  const v = (value ?? '').trim();
  return v || '________';
}

export function buildDocContext(deal: Deal, office: OfficeProfile): DocContext {
  const buyers = deal.parties.filter((p) => p.role === 'buyer' || p.role === 'tenant');
  const sellers = deal.parties.filter((p) => p.role === 'seller' || p.role === 'landlord');
  const banks = deal.parties.filter((p) => p.role === 'bank');
  const opposing = deal.parties.filter((p) => p.role === 'opposing_counsel');
  const attorney = office.attorneyName.trim() || deal.responsibleAttorney.trim() || '________';
  const dealTypeLabel =
    deal.type === 'combination' ? 'עסקת קומבינציה' :
    deal.type === 'rental' ? 'עסקת שכירות' :
    deal.type === 'gift' ? 'העברה במתנה' :
    'עסקת מכר';

  const paymentsHtml = deal.payments.length
    ? `<table class="legal-table"><thead><tr><th>תיאור</th><th>סכום</th><th>מועד</th></tr></thead><tbody>${deal.payments
        .map((p) => `<tr><td>${p.title || 'תשלום'}</td><td>${formatMoney(p.amount)}</td><td>${formatShortDate(p.dueDate)}</td></tr>`)
        .join('')}</tbody></table>`
    : '<p>לוח התשלומים ייקבע בנספח א\' להסכם זה.</p>';

  return {
    fileNumber: blank(deal.fileNumber),
    title: blank(deal.title),
    buyers,
    sellers,
    buyerNames: named(buyers),
    sellerNames: named(sellers),
    buyerIds: ids(buyers),
    sellerIds: ids(sellers),
    buyerAddresses: addresses(buyers),
    sellerAddresses: addresses(sellers),
    buyerPhones: phones(buyers),
    sellerPhones: phones(sellers),
    attorney,
    license: blank(office.license),
    officeAddress: blank(office.officeAddress),
    officeCity: blank(office.officeCity || deal.property.city),
    secondAttorney: blank(office.secondAttorneyName),
    propertyAddress: blank(deal.property.address),
    propertyCity: blank(deal.property.city),
    block: blank(deal.property.block),
    parcel: blank(deal.property.parcel),
    subParcel: blank(deal.property.subParcel),
    area: blank(deal.property.area),
    floor: blank(deal.property.floor),
    rooms: blank(deal.property.rooms),
    rights: blank(deal.property.rights),
    registryOffice: blank(deal.property.registryOffice),
    propertyType: deal.property.type === 'apartment' ? 'דירת מגורים' : deal.property.type === 'house' ? 'בית מגורים' : 'נכס מקרקעין',
    consideration: formatMoney(deal.consideration),
    considerationRaw: deal.consideration,
    contractDate: formatDateHe(deal.contractDate || deal.openedAt),
    contractDateShort: formatShortDate(deal.contractDate || deal.openedAt),
    closingDate: formatDateHe(deal.closingDate),
    openedAt: formatDateHe(deal.openedAt),
    paymentsHtml,
    bankName: named(banks),
    bankAddress: addresses(banks),
    opposingCounsel: named(opposing),
    propertyDescription: blank(deal.property.description || deal.notes),
    dealType: dealTypeLabel,
    clientSide: deal.clientSide,
    clientNames:
      deal.clientSide === 'seller' || deal.clientSide === 'landlord'
        ? named(sellers)
        : deal.clientSide === 'both'
          ? [named(buyers), named(sellers)].filter((n) => n !== '________').join(' ; ') || '________'
          : named(buyers),
    clientIds:
      deal.clientSide === 'seller' || deal.clientSide === 'landlord'
        ? ids(sellers)
        : deal.clientSide === 'both'
          ? [ids(buyers), ids(sellers)].filter((n) => n !== '________').join(' / ') || '________'
          : ids(buyers),
    logo: office.logoDataUrl?.trim() ?? '',
  };
}

export function missingDocFields(ctx: DocContext): string[] {
  const missing: string[] = [];
  if (ctx.buyerNames === '________') missing.push('שם הקונה');
  if (ctx.sellerNames === '________') missing.push('שם המוכר');
  if (ctx.buyerIds === '________') missing.push('ת.ז. קונה');
  if (ctx.sellerIds === '________') missing.push('ת.ז. מוכר');
  if (ctx.propertyAddress === '________') missing.push('כתובת הנכס');
  if (ctx.block === '________') missing.push('גוש');
  if (ctx.parcel === '________') missing.push('חלקה');
  if (ctx.attorney === '________') missing.push('שם עו״ד');
  return missing;
}
