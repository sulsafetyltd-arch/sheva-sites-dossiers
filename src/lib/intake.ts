import type { PartyRole } from '@/types/real-estate';

export interface IntakePerson {
  name: string;
  idNumber: string;
  phone: string;
  email: string;
  address: string;
}

export interface IntakeData {
  fileNumber: string;
  role: PartyRole;
  people: IntakePerson[];
  notes: string;
}

const PREFIX = 'SN1:';

/** Unicode-safe base64 for the intake payload. */
export function encodeIntake(data: IntakeData): string {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return PREFIX + btoa(binary);
}

export function decodeIntake(code: string): IntakeData | null {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  try {
    const binary = atob(trimmed.slice(PREFIX.length));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || !Array.isArray(parsed.people)) return null;
    return {
      fileNumber: String(parsed.fileNumber ?? ''),
      role: (parsed.role ?? 'buyer') as PartyRole,
      people: parsed.people.map((p: Partial<IntakePerson>) => ({
        name: String(p.name ?? ''),
        idNumber: String(p.idNumber ?? ''),
        phone: String(p.phone ?? ''),
        email: String(p.email ?? ''),
        address: String(p.address ?? ''),
      })),
      notes: String(parsed.notes ?? ''),
    };
  } catch {
    return null;
  }
}

/** Extract an intake code from free text (e.g. a pasted WhatsApp message). */
export function extractIntakeCode(text: string): string | null {
  const match = text.match(/SN1:[A-Za-z0-9+/=]+/);
  return match ? match[0] : null;
}

export function intakeLink(fileNumber: string, role: PartyRole, lawyerPhone: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  const params = new URLSearchParams({ file: fileNumber, role, phone: lawyerPhone });
  return `${base}#/intake?${params.toString()}`;
}
