import type { Deal, PartyRole } from '@/types/real-estate';
import { getAllDeals } from '@/lib/real-estate-store';

export interface ConflictMatch {
  dealId: string;
  fileNumber: string;
  dealTitle: string;
  partyName: string;
  role: PartyRole;
  matchedBy: 'id' | 'name';
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function normalizeId(id: string): string {
  return id.replace(/\D/g, '');
}

/**
 * Search all other deals for a party with the same ID number (exact digits)
 * or the same full name. Used to flag potential conflicts of interest
 * before taking on a client or an opposing party.
 */
export function findConflicts(
  name: string,
  idNumber: string,
  excludeDealId: string,
  deals: Deal[] = getAllDeals(),
): ConflictMatch[] {
  const targetName = normalizeName(name);
  const targetId = normalizeId(idNumber);
  if (!targetName && !targetId) return [];

  const matches: ConflictMatch[] = [];
  for (const deal of deals) {
    if (deal.id === excludeDealId) continue;
    for (const party of deal.parties) {
      const byId = Boolean(targetId) && normalizeId(party.idNumber) === targetId;
      const byName = Boolean(targetName) && targetName.length >= 4 && normalizeName(party.name) === targetName;
      if (!byId && !byName) continue;
      matches.push({
        dealId: deal.id,
        fileNumber: deal.fileNumber,
        dealTitle: deal.title,
        partyName: party.name,
        role: party.role,
        matchedBy: byId ? 'id' : 'name',
      });
    }
  }
  return matches;
}
