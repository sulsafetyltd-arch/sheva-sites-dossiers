import { newId } from '@/data/real-estate-checklists';
import type { OfficeProfile } from '@/lib/office-profile';

/**
 * Remote signature verification (אימות חתימה בהיוועדות חזותית):
 * the attorney runs a video meeting with the client, verifies identity,
 * reads the statutory warning, the client signs remotely, and the attorney
 * issues a verification certificate.
 */

export interface RemoteSignSteps {
  /** המסמך נשלח ללקוח */
  sent: boolean;
  /** פגישה מקוונת תואמה */
  scheduled: boolean;
  /** זהות אומתה מול תעודה בשיחת וידאו */
  identity: boolean;
  /** האזהרה הוקראה */
  warning: boolean;
  /** הלקוח חתם */
  signed: boolean;
}

export interface RemoteSignature {
  dataUrl: string;
  signedAt: string;
  name: string;
  idNumber: string;
}

export interface RemoteSignSession {
  id: string;
  docTitle: string;
  clientName: string;
  clientId: string;
  clientPhone: string;
  meetingLink: string;
  scheduledAt: string;
  fileNumber: string;
  notes: string;
  steps: RemoteSignSteps;
  signature?: RemoteSignature;
  createdAt: string;
  updatedAt: string;
}

export const REMOTE_SIGN_KEY = 'solo-remote-sign-v1';

export const STEP_LABELS: Array<{ key: keyof RemoteSignSteps; label: string; desc: string }> = [
  { key: 'sent', label: 'שליחת מסמך', desc: 'המסמך הדורש אימות נשלח ללקוח (וואטסאפ / דוא"ל)' },
  { key: 'scheduled', label: 'תיאום פגישה מקוונת', desc: 'נקבע מועד לשיחת וידאו (Zoom / Google Meet)' },
  { key: 'identity', label: 'בדיקת זהות', desc: 'הלקוח הציג תעודת זהות מול המצלמה וזוהה על ידי עורך הדין' },
  { key: 'warning', label: 'קריאת אזהרה', desc: 'עורך הדין הקריא את נוסח האזהרה הקבוע בחוק' },
  { key: 'signed', label: 'חתימה ואישור', desc: 'הלקוח חתם והמסמך מקבל תוקף משפטי מלא' },
];

export const STATUTORY_WARNING =
  'הנני מזהיר/ה אותך כי עליך להצהיר את האמת בלבד ואת האמת כולה, וכי אם לא תעשה/י כן תהיה/י צפוי/ה לעונשים הקבועים בחוק.';

export function emptySession(): RemoteSignSession {
  const now = new Date().toISOString();
  return {
    id: newId(),
    docTitle: '',
    clientName: '',
    clientId: '',
    clientPhone: '',
    meetingLink: '',
    scheduledAt: '',
    fileNumber: '',
    notes: '',
    steps: { sent: false, scheduled: false, identity: false, warning: false, signed: false },
    createdAt: now,
    updatedAt: now,
  };
}

export function getSessions(): RemoteSignSession[] {
  try {
    const raw = localStorage.getItem(REMOTE_SIGN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSession(session: RemoteSignSession): RemoteSignSession[] {
  const next = { ...session, updatedAt: new Date().toISOString() };
  const all = getSessions();
  const idx = all.findIndex((s) => s.id === next.id);
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);
  localStorage.setItem(REMOTE_SIGN_KEY, JSON.stringify(all));
  return all;
}

export function deleteSession(id: string): RemoteSignSession[] {
  const all = getSessions().filter((s) => s.id !== id);
  localStorage.setItem(REMOTE_SIGN_KEY, JSON.stringify(all));
  return all;
}

export function sessionProgress(session: RemoteSignSession): number {
  const done = Object.values(session.steps).filter(Boolean).length;
  return Math.round((done / STEP_LABELS.length) * 100);
}

/* ---- Client signing payload (returned from the /sign page) ---- */

export interface SignPayload {
  sessionId: string;
  name: string;
  idNumber: string;
  dataUrl: string;
  signedAt: string;
}

const SIGN_PREFIX = 'SNS:';

export function encodeSignPayload(payload: SignPayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return SIGN_PREFIX + btoa(binary);
}

/**
 * Normalize a pasted code: phone keyboards lowercase the prefix and
 * WhatsApp inserts line breaks in long messages, so be forgiving.
 */
function normalizeCode(code: string, prefix: string): string | null {
  const cleaned = code.replace(/\s+/g, '');
  const idx = cleaned.toUpperCase().indexOf(prefix.toUpperCase());
  if (idx >= 0) {
    const base64 = cleaned.slice(idx + prefix.length).match(/^[A-Za-z0-9+/=]+/)?.[0];
    if (base64) return prefix + base64;
  }
  // Partial copies often drop the prefix — accept a bare base64 JSON blob
  // ("eyJ" is base64 for '{"'); take the longest candidate in the text.
  const candidates = cleaned.match(/eyJ[A-Za-z0-9+/=]+/g) ?? [];
  const longest = candidates.sort((a, b) => b.length - a.length)[0];
  return longest ? prefix + longest : null;
}

export function decodeSignPayload(code: string): SignPayload | null {
  const normalized = normalizeCode(code, SIGN_PREFIX);
  if (!normalized) return null;
  try {
    const binary = atob(normalized.slice(SIGN_PREFIX.length));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed?.sessionId || !parsed?.dataUrl) return null;
    return {
      sessionId: String(parsed.sessionId),
      name: String(parsed.name ?? ''),
      idNumber: String(parsed.idNumber ?? ''),
      dataUrl: String(parsed.dataUrl),
      signedAt: String(parsed.signedAt ?? new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function extractSignCode(text: string): string | null {
  return normalizeCode(text, SIGN_PREFIX);
}

export function clientSignLink(session: RemoteSignSession, lawyerPhone: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  const params = new URLSearchParams({
    session: session.id,
    doc: session.docTitle,
    name: session.clientName,
    tz: session.clientId,
    phone: lawyerPhone,
  });
  return `${base}#/sign?${params.toString()}`;
}

/* ---- Verification certificate ---- */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * HTML for the attorney's signature-verification certificate
 * (אישור אימות חתימה שנערך בהיוועדות חזותית).
 */
export function buildVerificationCertificate(
  session: RemoteSignSession,
  office: OfficeProfile,
): string {
  const meetingDate = session.scheduledAt
    ? new Date(session.scheduledAt).toLocaleString('he-IL', { dateStyle: 'long', timeStyle: 'short' })
    : new Date().toLocaleDateString('he-IL', { dateStyle: 'long' });
  const signedDate = session.signature
    ? new Date(session.signature.signedAt).toLocaleString('he-IL', { dateStyle: 'long', timeStyle: 'short' })
    : '________';

  return `
    <div class="legal-head">
      ${office.logoDataUrl?.trim() ? `<img class="office-logo" src="${office.logoDataUrl}" alt="לוגו המשרד" />` : ''}
      <p class="office">משרד עו"ד ${esc(office.attorneyName || '________')} · רישיון ${esc(office.license || '________')} · ${esc(office.officeAddress || '________')}</p>
      ${session.fileNumber ? `<p class="file">תיק ${esc(session.fileNumber)}</p>` : ''}
      <h1>אישור אימות חתימה בהיוועדות חזותית</h1>
    </div>
    <p>אני הח"מ, עו"ד <strong>${esc(office.attorneyName || '________')}</strong>, בעל/ת רישיון מס' ${esc(office.license || '________')}, מאשר/ת בזאת כדלקמן:</p>
    <ol>
      <li>ביום ${esc(meetingDate)} קיימתי היוועדות חזותית (שיחת וידאו${session.meetingLink ? ' באמצעות קישור מאובטח' : ''}) עם <strong>${esc(session.clientName || '________')}</strong>, נושא/ת ת.ז מס' <strong>${esc(session.clientId || '________')}</strong> (להלן: "החותם/ת").</li>
      <li>במהלך ההיוועדות החזותית זיהיתי את החותם/ת באופן ודאי: החותם/ת הציג/ה בפניי את תעודת הזהות מקרוב אל מול המצלמה, השוויתי את פרטי התעודה ותמונתה לחזותו/ה, ווידאתי כי החותם/ת נמצא/ת לבדו/ה וכי הוא/היא פועל/ת מרצון חופשי.</li>
      <li>הזהרתי את החותם/ת כדין, בנוסח: "${STATUTORY_WARNING}"</li>
      <li>לאחר האזהרה, ביום ${esc(signedDate)}, חתם/ה החותם/ת לנגד עיניי, במהלך ההיוועדות החזותית, על המסמך: <strong>${esc(session.docTitle || '________')}</strong>.</li>
      <li>החתימה המופיעה על המסמך היא חתימת החותם/ת שנחתמה בפניי כאמור.</li>
    </ol>
    ${
      session.signature
        ? `<div class="sig-block" style="margin-top:16px;"><p><strong>חתימת החותם/ת (נחתמה בהיוועדות חזותית):</strong></p><img src="${session.signature.dataUrl}" alt="חתימת הלקוח" style="max-width:220px;max-height:90px;display:block;border-bottom:1px solid #999;" /><p style="margin:4px 0 0;">${esc(session.signature.name || session.clientName)} · ת.ז ${esc(session.signature.idNumber || session.clientId)}</p></div>`
        : ''
    }
    ${session.notes ? `<p><strong>הערות:</strong> ${esc(session.notes)}</p>` : ''}
    <table style="width:100%;margin-top:36px;border:none;">
      <tr>
        <td style="border:none;text-align:right;">
          <p>ולראיה באתי על החתום,</p>
          ${
            office.signatureDataUrl?.trim()
              ? `<img src="${office.signatureDataUrl}" alt="חתימת עו״ד" style="max-height:70px;display:block;margin-top:10px;" /><p>______________________</p>`
              : '<p style="margin-top:28px;">______________________</p>'
          }
          <p>עו"ד ${esc(office.attorneyName || '________')}, רישיון ${esc(office.license || '________')}</p>
          <p>תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
        </td>
      </tr>
    </table>
  `;
}
