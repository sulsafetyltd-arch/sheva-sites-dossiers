import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardPaste,
  Copy,
  FileDown,
  MessageCircle,
  Plus,
  Printer,
  ShieldCheck,
  Trash2,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, ProgressBar } from '@/components/real-estate/Field';
import {
  STATUTORY_WARNING,
  STEP_LABELS,
  buildVerificationCertificate,
  clientSignLink,
  decodeSignPayload,
  deleteSession,
  emptySession,
  extractSignCode,
  getSessions,
  saveSession,
  sessionProgress,
  type RemoteSignSession,
} from '@/lib/remote-sign';
import { getOfficeProfile } from '@/lib/office-profile';
import { downloadAsWord, printHtmlDocument } from '@/lib/word-export';
import soloLogoUrl from '@/assets/solo-logo.svg';

function waPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
}

const RemoteSignPage = () => {
  const [sessions, setSessions] = useState<RemoteSignSession[]>(() => getSessions());
  const [editing, setEditing] = useState<RemoteSignSession | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const office = useMemo(() => {
    const profile = getOfficeProfile();
    return { ...profile, logoDataUrl: profile.logoDataUrl?.trim() ? profile.logoDataUrl : soloLogoUrl };
  }, []);
  const lawyerPhone = (office.officePhone ?? '').replace(/\D/g, '');

  const persist = (session: RemoteSignSession) => {
    setSessions(saveSession(session));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          אימות חתימה מרחוק בהיוועדות חזותית: שולחים ללקוח קישור, מתאמים שיחת וידאו (Zoom / Google Meet),
          מזהים אותו מול תעודת זהות, מקריאים את האזהרה — והוא חותם מהטלפון. בסוף מופק «אישור אימות חתימה» חתום על ידכם.
        </p>
        <Button className="gap-2" onClick={() => setEditing(emptySession())}>
          <Plus className="w-4 h-4" />
          אימות חדש
        </Button>
      </div>

      <div className="re-card p-4 text-sm">
        <p className="font-medium mb-1">כך זה עובד — 5 שלבים:</p>
        <ol className="grid sm:grid-cols-5 gap-2 text-xs text-muted-foreground list-none">
          {STEP_LABELS.map((step, i) => (
            <li key={step.key} className="rounded-lg border bg-muted/30 p-2">
              <span className="font-semibold text-foreground">{i + 1}. {step.label}</span>
              <br />
              {step.desc}
            </li>
          ))}
        </ol>
      </div>

      {editing && (
        <section className="re-card p-5 space-y-3">
          <h2 className="font-semibold">פתיחת אימות חתימה חדש</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="שם המסמך לאימות">
              <Input
                value={editing.docTitle}
                onChange={(e) => setEditing({ ...editing, docTitle: e.target.value })}
                placeholder="למשל: ייפוי כוח בלתי חוזר / תצהיר"
              />
            </Field>
            <Field label="מספר תיק (רשות)">
              <Input value={editing.fileNumber} onChange={(e) => setEditing({ ...editing, fileNumber: e.target.value })} />
            </Field>
            <Field label="שם הלקוח החותם">
              <Input value={editing.clientName} onChange={(e) => setEditing({ ...editing, clientName: e.target.value })} />
            </Field>
            <Field label="ת.ז הלקוח">
              <Input inputMode="numeric" value={editing.clientId} onChange={(e) => setEditing({ ...editing, clientId: e.target.value })} />
            </Field>
            <Field label="טלפון הלקוח (לוואטסאפ)">
              <Input inputMode="tel" value={editing.clientPhone} onChange={(e) => setEditing({ ...editing, clientPhone: e.target.value })} placeholder="050-0000000" />
            </Field>
            <Field label="מועד הפגישה המקוונת">
              <Input type="datetime-local" value={editing.scheduledAt} onChange={(e) => setEditing({ ...editing, scheduledAt: e.target.value })} />
            </Field>
            <Field label="קישור לשיחת הווידאו (Zoom / Meet)" className="md:col-span-2">
              <Input dir="ltr" value={editing.meetingLink} onChange={(e) => setEditing({ ...editing, meetingLink: e.target.value })} placeholder="https://meet.google.com/..." />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={!editing.docTitle.trim() || !editing.clientName.trim()}
              onClick={() => {
                persist(editing);
                setOpenId(editing.id);
                setEditing(null);
                toast.success('האימות נפתח — שלחו ללקוח את הקישור לחתימה');
              }}
            >
              פתיחת האימות
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>ביטול</Button>
          </div>
        </section>
      )}

      <section className="re-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">אימותים ({sessions.length})</h2>
        </div>
        {sessions.length === 0 && (
          <p className="px-5 py-12 text-center text-muted-foreground text-sm">
            אין אימותים עדיין — לחצו «אימות חדש» כדי להתחיל
          </p>
        )}
        <div className="divide-y">
          {sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              open={openId === session.id}
              onToggle={() => setOpenId(openId === session.id ? null : session.id)}
              onChange={persist}
              onDelete={() => {
                setSessions(deleteSession(session.id));
                toast.success('האימות נמחק');
              }}
              lawyerPhone={lawyerPhone}
              office={office}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

function SessionRow({
  session,
  open,
  onToggle,
  onChange,
  onDelete,
  lawyerPhone,
  office,
}: {
  session: RemoteSignSession;
  open: boolean;
  onToggle: () => void;
  onChange: (s: RemoteSignSession) => void;
  onDelete: () => void;
  lawyerPhone: string;
  office: ReturnType<typeof getOfficeProfile>;
}) {
  const [code, setCode] = useState('');
  const [showCert, setShowCert] = useState(false);
  const progress = sessionProgress(session);
  const complete = progress === 100;
  const link = clientSignLink(session, lawyerPhone);

  const inviteText = `שלום ${session.clientName},\nלצורך אימות חתימה מרחוק על המסמך «${session.docTitle}» נקיים שיחת וידאו${
    session.scheduledAt ? ` ביום ${new Date(session.scheduledAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}` : ''
  }.${session.meetingLink ? `\nקישור לשיחה: ${session.meetingLink}` : ''}\n\nבמהלך השיחה נא להכין תעודת זהות. לחתימה מהטלפון היכנסו לקישור:\n${link}\n\nמשרד עו"ד ${office.attorneyName}`;

  const importCode = () => {
    const extracted = extractSignCode(code) ?? code.trim();
    const payload = decodeSignPayload(extracted);
    if (!payload) {
      toast.error('הקוד אינו תקין — הדביקו את ההודעה המלאה מהלקוח');
      return;
    }
    if (payload.sessionId !== session.id) {
      toast.error('הקוד שייך לאימות אחר — בדקו שהודבק הקוד הנכון');
      return;
    }
    onChange({
      ...session,
      steps: { ...session.steps, signed: true },
      signature: {
        dataUrl: payload.dataUrl,
        signedAt: payload.signedAt,
        name: payload.name,
        idNumber: payload.idNumber,
      },
    });
    setCode('');
    toast.success('החתימה נקלטה — אפשר להפיק את אישור האימות');
  };

  const certHtml = buildVerificationCertificate(session, office);

  return (
    <div className="px-5 py-3 space-y-3">
      <button className="w-full flex flex-wrap items-center justify-between gap-2 text-right" onClick={onToggle}>
        <div className="min-w-0">
          <p className="font-medium flex items-center gap-2">
            {complete ? <CheckCircle2 className="w-4 h-4 text-success" /> : <ShieldCheck className="w-4 h-4 text-primary" />}
            {session.docTitle} — {session.clientName}
          </p>
          <p className="text-xs text-muted-foreground">
            {session.fileNumber && `תיק ${session.fileNumber} · `}
            {session.scheduledAt
              ? `פגישה: ${new Date(session.scheduledAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}`
              : 'טרם נקבעה פגישה'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-28 hidden sm:block"><ProgressBar value={progress} /></div>
          <Badge variant={complete ? 'default' : 'secondary'}>{complete ? 'הושלם' : `${progress}%`}</Badge>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t pt-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                navigator.clipboard?.writeText(link);
                toast.success('הקישור לחתימה הועתק');
              }}
            >
              <Copy className="w-4 h-4" />
              העתקת קישור חתימה ללקוח
            </Button>
            <a
              href={`https://wa.me/${session.clientPhone ? waPhone(session.clientPhone) : ''}?text=${encodeURIComponent(inviteText)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-emerald-700"
                onClick={() => onChange({ ...session, steps: { ...session.steps, sent: true } })}
              >
                <MessageCircle className="w-4 h-4" />
                שליחת הזמנה בוואטסאפ
              </Button>
            </a>
            {session.meetingLink && (
              <a href={session.meetingLink} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="gap-2">
                  <Video className="w-4 h-4" />
                  פתיחת שיחת הווידאו
                </Button>
              </a>
            )}
            <Button variant="ghost" size="sm" className="text-destructive gap-2 mr-auto" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
              מחיקה
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            {STEP_LABELS.map((step, i) => (
              <label key={step.key} className="flex items-start gap-2 rounded-lg border p-2.5 text-sm cursor-pointer hover:bg-muted/40">
                <Checkbox
                  className="mt-0.5"
                  checked={session.steps[step.key]}
                  onCheckedChange={(checked) =>
                    onChange({ ...session, steps: { ...session.steps, [step.key]: Boolean(checked) } })
                  }
                />
                <span>
                  <span className="font-medium">{i + 1}. {step.label}</span>
                  <br />
                  <span className="text-xs text-muted-foreground">{step.desc}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium mb-1">נוסח האזהרה להקראה בשיחה:</p>
            <p className="text-muted-foreground">"{STATUTORY_WARNING}"</p>
          </div>

          {!session.signature && (
            <div className="flex gap-2 items-end">
              <Field label="קליטת קוד החתימה שהלקוח החזיר" className="flex-1">
                <Input
                  dir="ltr"
                  className="font-mono text-xs"
                  placeholder="הדביקו את ההודעה / הקוד (SNS:...)"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </Field>
              <Button variant="outline" className="gap-2" disabled={!code.trim()} onClick={importCode}>
                <ClipboardPaste className="w-4 h-4" />
                קליטת החתימה
              </Button>
            </div>
          )}

          {session.signature && (
            <div className="rounded-lg border p-3 flex items-center gap-4">
              <img src={session.signature.dataUrl} alt="חתימת הלקוח" className="max-h-16 border-b" />
              <div className="text-sm">
                <p className="font-medium">החתימה התקבלה</p>
                <p className="text-xs text-muted-foreground">
                  {session.signature.name} · ת.ז {session.signature.idNumber} ·{' '}
                  {new Date(session.signature.signedAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
            </div>
          )}

          <Field label="הערות לאישור (רשות)">
            <Textarea rows={2} value={session.notes} onChange={(e) => onChange({ ...session, notes: e.target.value })} />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button variant={showCert ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setShowCert((v) => !v)}>
              <ShieldCheck className="w-4 h-4" />
              {showCert ? 'הסתרת האישור' : 'תצוגת אישור האימות'}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadAsWord(`אישור אימות חתימה - ${session.clientName}`, certHtml)}>
              <FileDown className="w-4 h-4" />
              הורדה כ-Word
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => printHtmlDocument(`אישור אימות חתימה - ${session.clientName}`, certHtml)}
            >
              <Printer className="w-4 h-4" />
              הדפסה / PDF
            </Button>
          </div>

          {showCert && (
            <div className="legal-print-root">
              <article className="legal-doc" dangerouslySetInnerHTML={{ __html: certHtml }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RemoteSignPage;
