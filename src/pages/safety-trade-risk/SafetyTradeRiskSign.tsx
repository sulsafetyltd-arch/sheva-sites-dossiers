import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SignaturePad from '@/components/dossier/SignaturePad';
import {
  completePublicTradeRisk,
  getPublicTradeRiskAssignment,
} from '@/lib/safety-trade-risk-store';
import { getTradeRiskDocument, openTradeRiskPdf } from '@/lib/trade-risk-documents';
import type { PublicTradeRiskAssignment } from '@/types/safety-trade-risk';

function normalizeToken(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  // Strip trailing punctuation WhatsApp/RTL sometimes appends to URLs.
  const cleaned = raw.trim().replace(/[)\].,;!?״"']+$/g, '');
  return cleaned || undefined;
}

export default function SafetyTradeRiskSign({ forcedToken }: { forcedToken?: string } = {}) {
  // forcedToken is used for /?tr=... public links via RootEntry
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = normalizeToken(forcedToken || routeToken || searchParams.get('tr'));
  const [assignment, setAssignment] = useState<PublicTradeRiskAssignment | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signature, setSignature] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedRead, setConfirmedRead] = useState(false);

  const document = useMemo(
    () => (assignment ? getTradeRiskDocument(assignment.tradeCode, assignment.languageCode) : undefined),
    [assignment],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!token) throw new Error('קישור החתימה אינו תקין');
        const result = await getPublicTradeRiskAssignment(token);
        if (cancelled) return;
        setAssignment(result);
        setSignerName(result.signerName || result.employeeName || '');
        setSignature(result.signatureDataUrl);
        setConfirmedRead(result.status === 'completed');
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'טעינת טופס החתימה נכשלה');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async () => {
    if (!token || !assignment) return;
    if (!confirmedRead) {
      setError('יש לאשר שקראתם את תמצית הסיכונים לפני החתימה');
      return;
    }
    if (!signerName.trim()) {
      setError('יש למלא שם מלא לחתימה');
      return;
    }
    if (!signature) {
      setError('יש לחתום במסגרת החתימה');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await completePublicTradeRisk(token, signerName.trim(), signature);
      setAssignment({
        ...assignment,
        status: 'completed',
        signerName: result.signerName || signerName.trim(),
        signatureDataUrl: signature,
        acknowledgedAt: result.acknowledgedAt || new Date().toISOString(),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'שמירת החתימה נכשלה');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen grid place-items-center bg-slate-50 p-6 text-slate-600">
        <div className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> טוען טופס חתימה…</div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div dir="rtl" className="min-h-screen grid place-items-center bg-slate-50 p-6">
        <div className="rounded-xl border bg-white p-6 max-w-md text-center space-y-2">
          <ShieldCheck className="w-8 h-8 mx-auto text-red-600" />
          <div className="font-semibold">לא ניתן לפתוח את הטופס</div>
          <div className="text-sm text-slate-600">{error || 'הקישור אינו תקין או שפג תוקפו'}</div>
        </div>
      </div>
    );
  }

  const completed = assignment.status === 'completed';

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <main className="container mx-auto max-w-xl p-4 space-y-4">
        <header className="rounded-2xl bg-[#0f2744] text-white p-5 space-y-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#f4c95d] text-[#0f2744] p-3"><FileText className="w-6 h-6" /></div>
            <div>
              <h1 className="text-xl font-bold">תמצית סיכונים לחתימה</h1>
              <p className="text-sm text-slate-300">{assignment.tradeLabel} · {assignment.languageLabel}</p>
            </div>
          </div>
          <div className="text-sm text-slate-200 space-y-1">
            <div>לקוח: {assignment.clientName}</div>
            <div>אתר בנייה: {assignment.siteName}{assignment.siteAddress ? ` · ${assignment.siteAddress}` : ''}</div>
            <div>עובד: {assignment.employeeName}{assignment.employeeIdNumber ? ` · ${assignment.employeeIdNumber}` : ''}</div>
          </div>
        </header>

        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

        {completed ? (
          <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-emerald-900">
              <CheckCircle2 className="w-5 h-5" /> החתימה נקלטה בהצלחה
            </div>
            <div className="text-sm text-emerald-900">
              נחתם על ידי {assignment.signerName}
              {assignment.acknowledgedAt
                ? ` ב־${new Date(assignment.acknowledgedAt).toLocaleString('he-IL')}`
                : ''}
            </div>
            {assignment.signatureDataUrl && (
              <img src={assignment.signatureDataUrl} alt="חתימת העובד" className="h-24 bg-white border rounded-md" />
            )}
            {document && (
              <Button variant="outline" onClick={() => void openTradeRiskPdf(document)}>
                פתח שוב את תמצית הסיכונים
              </Button>
            )}
          </section>
        ) : (
          <>
            <section className="rounded-xl border bg-white p-4 space-y-3">
              <h2 className="font-semibold">1. קריאת תמצית הסיכונים</h2>
              <p className="text-sm text-slate-600">
                יש לקרוא את המסמך במלואו ולהבין את הסיכונים בעבודה במקצוע שלכם לפני החתימה.
              </p>
              {document ? (
                <Button onClick={() => void openTradeRiskPdf(document).catch((cause) => {
                  setError(cause instanceof Error ? cause.message : 'פתיחת המסמך נכשלה');
                })}>
                  פתח תמצית סיכונים (PDF)
                </Button>
              ) : (
                <div className="text-sm text-red-700">המסמך אינו זמין בשפה שנבחרה</div>
              )}
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={confirmedRead}
                  onChange={(event) => setConfirmedRead(event.target.checked)}
                />
                <span>קראתי והבנתי את תמצית הסיכונים בעבודתי הספציפית ואני מתחייב לפעול לפיה</span>
              </label>
            </section>

            <section className="rounded-xl border bg-white p-4 space-y-3">
              <h2 className="font-semibold">2. חתימה דיגיטלית</h2>
              <Input
                value={signerName}
                onChange={(event) => setSignerName(event.target.value)}
                placeholder="שם מלא לחתימה"
              />
              <SignaturePad value={signature} onChange={(value) => setSignature(value ?? undefined)} width={340} height={140} />
              <Button className="w-full" disabled={submitting} onClick={() => void submit()}>
                {submitting ? 'שומר חתימה…' : 'אשר ושלח חתימה'}
              </Button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
