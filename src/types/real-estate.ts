export type DealType =
  | 'sale'
  | 'purchase'
  | 'rental'
  | 'gift'
  | 'combination'
  | 'inheritance';

export type DealStatus =
  | 'intake'
  | 'due_diligence'
  | 'negotiation'
  | 'signed'
  | 'conditions'
  | 'closing'
  | 'registration'
  | 'closed'
  | 'cancelled';

export type ClientSide = 'buyer' | 'seller' | 'both' | 'tenant' | 'landlord';

export type PartyRole =
  | 'buyer'
  | 'seller'
  | 'tenant'
  | 'landlord'
  | 'broker'
  | 'opposing_counsel'
  | 'bank'
  | 'guarantor'
  | 'other';

export type PropertyType =
  | 'apartment'
  | 'house'
  | 'plot'
  | 'office'
  | 'store'
  | 'warehouse'
  | 'other';

export type PaymentType =
  | 'consideration'
  | 'deposit'
  | 'purchase_tax'
  | 'betterment'
  | 'capital_gains'
  | 'fees'
  | 'broker'
  | 'other';

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'waived';

export type TaskPriority = 'low' | 'medium' | 'high';

export type DocumentStatus = 'missing' | 'draft' | 'sent' | 'signed' | 'filed';

export type DocumentCategory =
  | 'contract'
  | 'appendix'
  | 'tabo'
  | 'tax'
  | 'planning'
  | 'poa'
  | 'correspondence'
  | 'other';

export interface Party {
  id: string;
  role: PartyRole;
  name: string;
  idNumber: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export interface Property {
  address: string;
  city: string;
  type: PropertyType;
  block: string;
  parcel: string;
  subParcel: string;
  floor: string;
  rooms: string;
  area: string;
  registryOffice: string;
  rights: string;
  description: string;
}

export interface Payment {
  id: string;
  title: string;
  type: PaymentType;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  notes: string;
}

export interface DealTask {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
  doneAt?: string;
  priority: TaskPriority;
  notes: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: DocumentCategory;
  received: boolean;
  /** Signature/filing workflow status. Absent on old data — treated as 'missing'. */
  status?: DocumentStatus;
  date?: string;
  notes: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  group: string;
  done: boolean;
  notes: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  body: string;
}

export interface Deal {
  id: string;
  fileNumber: string;
  title: string;
  type: DealType;
  status: DealStatus;
  clientSide: ClientSide;
  responsibleAttorney: string;
  openedAt: string;
  contractDate?: string;
  closingDate?: string;
  registrationDate?: string;
  consideration: number;
  property: Property;
  parties: Party[];
  payments: Payment[];
  tasks: DealTask[];
  documents: DocumentItem[];
  checklist: ChecklistItem[];
  timeline: TimelineEvent[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DealMeta {
  id: string;
  fileNumber: string;
  title: string;
  type: DealType;
  status: DealStatus;
  city: string;
  consideration: number;
  updatedAt: string;
}

export interface CalendarItem {
  id: string;
  dealId: string;
  dealTitle: string;
  fileNumber: string;
  kind: 'task' | 'payment' | 'milestone';
  title: string;
  date: string;
  done: boolean;
  amount?: number;
}
