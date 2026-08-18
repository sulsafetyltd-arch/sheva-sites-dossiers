import type { ClientSide } from '@/types/real-estate';

/** Who the generated document is for: the buyer, the seller, or both parties. */
export type DocAudience = 'buyer' | 'seller' | 'both';

/** Who the attorney represents on this file. */
export type RepresentedSide = 'buyer' | 'seller' | 'both';

export function representedSide(clientSide: ClientSide): RepresentedSide {
  if (clientSide === 'seller' || clientSide === 'landlord') return 'seller';
  if (clientSide === 'buyer' || clientSide === 'tenant') return 'buyer';
  return 'both';
}

export function documentVisibleForSide(audience: DocAudience, represented: RepresentedSide): boolean {
  if (represented === 'both') return true;
  return audience === 'both' || audience === represented;
}

export const REPRESENTED_SIDE_LABEL: Record<RepresentedSide, string> = {
  buyer: 'ייצוג קונה',
  seller: 'ייצוג מוכר',
  both: 'ייצוג שני הצדדים',
};
