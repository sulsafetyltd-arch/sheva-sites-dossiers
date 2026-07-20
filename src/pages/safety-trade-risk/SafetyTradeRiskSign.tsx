import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Download, FileText, Loader2, Share2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SignaturePad from '@/components/dossier/SignaturePad';
import {
  completePublicTradeRisk,
  getPublicTradeRiskAssignment,
} from '@/lib/safety-trade-risk-store';
import { getTradeRiskDocument, openTradeRiskPdf } from '@/lib/trade-risk-documents';
import {
  DECLARATION_TEXT,
  buildSignedTradeRiskPdfFile,
  downloadPdfFile,
  sharePdfFile,
} from '@/lib/trade-risk-signed-pdf';
import type { PublicTradeRiskAssignment } from '@/types/safety-trade-risk';

function normalizeToken(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/[)\].,;!?״"']+$/g, '');
  return cleaned || undefined;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function SafetyTradeRiskSign({ forcedToken }: { forcedToken?: string } = {}) {
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = normalizeToken(forcedToken || routeToken || searchParams.get('tr'));
  const [assignment, setAssignment] = useState<PublicTradeRiskAssignment | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerIdNumber, setSignerIdNumber] = useState('');
  const [declarationDate, setDeclarationDate] = useState(today());
  const [contractorName, setContractorName] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [signature, setSignature] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
        setSignerIdNumber(result.signerIdNumber || result.employeeIdNumber || '');
        setDeclarationDate(result.declarationDate || today());
        setContractorName(result.contractorName || result.clientName || '');
        setInstructorName(result.instructorName || '');
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

  const buildSignedPdf = async (current: PublicTradeRiskAssignment = assignment!) => {
    if (!current || !document) {
      throw new Error('לא ניתן ליצור את ה־PDF החתום');
    }
    return buildSignedTradeRiskPdfFile({
      assignment: current,
      document,
    });
  };

  const submit = async () => {
    if (!token || !assignment) return;
    if (!confirmedRead) {
      setError('יש לאשר שקראתם את תמצית הסיכונים לפני החתימה');
      return;
    }
    if (!signerName.trim() || !signerIdNumber.trim() || !contractorName.trim() || !instructorName.trim()) {
      setError('יש למלא את כל שדות הצהרת העובד');
      return;
    }
    if (!signature) {
      setError('יש לחתום במסגרת החתימה');
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await completePublicTradeRisk(token, {
        signerName: signerName.trim(),
        signerIdNumber: signerIdNumber.trim(),
        declarationDate,
        contractorName: contractorName.trim(),
        instructorName: instructorName.trim(),
        signatureDataUrl: signature,
      });
      setAssignment({
        ...assignment,
        status: 'completed',
        signerName: result.signerName || signerName.trim(),
        signerIdNumber: result.signerIdNumber || signerIdNumber.trim(),
        declarationDate: result.declarationDate || declarationDate,
        contractorName: result.contractorName || contractorName.trim(),
        instructorName: result.instructorName || instructorName.trim(),
        signatureDataUrl: signature,
        acknowledgedAt: result.acknowledgedAt || new Date().toISOString(),
      });
      setMessage('החתימה נשמרה. ניתן להוריד או לשלוח את ה־PDF עם הפרטים המוטמעים בטופס.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'שמירת החתימה נכשלה');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadSigned = async () => {
    if (!assignment) return;
    setPreparingPdf(true);
    setError(null);
    try {
      const current: PublicTradeRiskAssignment = {
        ...assignment,
        signerName: assignment.signerName || signerName,
        signerIdNumber: assignment.signerIdNumber || signerIdNumber,
        declarationDate: assignment.declarationDate || declarationDate,
        contractorName: assignment.contractorName || contractorName,
        instructorName: assignment.instructorName || instructorName,
        signatureDataUrl: assignment.signatureDataUrl || signature,
      };
      downloadPdfFile(await buildSignedPdf(current));
      setMessage('ה־PDF החתום הורד — הפרטים מוטמעים בטופס המקורי');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'יצירת ה־PDF נכשלה');
    } finally {
      setPreparingPdf(false);
    }
  };

  const shareSigned = async () => {
    if (!assignment) return;
    setPreparingPdf(true);
    setError(null);
    try {
      const current: PublicTradeRiskAssignment = {
        ...assignment,
        signerName: assignment.signerName || signerName,
        signerIdNumber: assignment.signerIdNumber || signerIdNumber,
        declarationDate: assignment.declarationDate || declarationDate,
        contractorName: assignment.contractorName || contractorName,
        instructorName: assignment.instructorName || instructorName,
        signatureDataUrl: assignment.signatureDataUrl || signature,
      };
      const file = await buildSignedPdf(current);
      const mode = await sharePdfFile(
        file,
        `תמצית סיכונים חתומה — ${assignment.tradeLabel}`,
        `מצורף עותק חתום של תמצית הסיכונים למקצוע ${assignment.tradeLabel} באתר ${assignment.siteName}.`,
      );
      setMessage(mode === 'shared' ? 'ה־PDF החתום נשלח' : 'ה־PDF הורד — ניתן לצרף אותו בוואטסאפ/מייל');
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(cause instanceof Error ? cause.message : 'שיתוף ה־PDF נכשל');
      }
    } finally {
      setPreparingPdf(false);
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
  const displayName = assignment.signerName || signerName;
  const displayId = assignment.signerIdNumber || signerIdNumber;
  const displayDate = assignment.declarationDate || declarationDate;
  const displayContractor = assignment.contractorName || contractorName;
  const displayInstructor = assignment.instructorName || instructorName;
  const displaySignature = assignment.signatureDataUrl || signature;

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
            <div>עובד רשום: {assignment.employeeName}{assignment.employeeIdNumber ? ` · ${assignment.employeeIdNumber}` : ''}</div>
          </div>
        </header>

        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm whitespace-pre-wrap">{error}</div>}
        {message && <div className="rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm whitespace-pre-wrap">{message}</div>}

        {completed ? (
          <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-emerald-900">
              <CheckCircle2 className="w-5 h-5" /> הצהרת העובד נקלטה בהצלחה
            </div>
            <div className="text-sm text-emerald-900 space-y-1">
              <div>שם: {displayName}</div>
              <div>ת.ז./דרכון: {displayId}</div>
              <div>תאריך: {displayDate}</div>
              <div>קבלן: {displayContractor}</div>
              <div>מבצע הדרכה: {displayInstructor}</div>
              {assignment.acknowledgedAt && (
                <div>נשמר ב־{new Date(assignment.acknowledgedAt).toLocaleString('he-IL')}</div>
              )}
            </div>
            {displaySignature && (
              <img src={displaySignature} alt="חתימת העובד" className="h-24 bg-white border rounded-md" />
            )}
            <div className="flex flex-wrap gap-2">
              <Button disabled={preparingPdf || !document} onClick={() => void downloadSigned()}>
                <Download className="w-4 h-4 ml-1" />
                {preparingPdf ? 'מכין PDF…' : 'הורד PDF חתום'}
              </Button>
              <Button variant="secondary" disabled={preparingPdf || !document} onClick={() => void shareSigned()}>
                <Share2 className="w-4 h-4 ml-1" />
                שלח העתק PDF
              </Button>
              {document && (
                <Button variant="outline" onClick={() => void openTradeRiskPdf(document)}>
                  פתח תמצית מקורית
                </Button>
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-xl border bg-white p-4 space-y-3">
              <h2 className="font-semibold">1. קריאת תמצית הסיכונים</h2>
              <p className="text-sm text-slate-600">
                יש לקרוא את המסמך במלואו ולהבין את הסיכונים בעבודה במקצוע שלכם לפני מילוי ההצהרה.
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
                <span>{DECLARATION_TEXT}</span>
              </label>
            </section>

            <section className="rounded-xl border bg-white p-4 space-y-3">
              <h2 className="font-semibold">2. הצהרת עובד — פרטים לחתימה</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-xs space-y-1 sm:col-span-2">
                  <span>פרטי העובד — שם ומשפחה *</span>
                  <Input value={signerName} onChange={(event) => setSignerName(event.target.value)} placeholder="שם מלא" />
                </label>
                <label className="text-xs space-y-1">
                  <span>מס׳ ת.ז. / דרכון *</span>
                  <Input value={signerIdNumber} onChange={(event) => setSignerIdNumber(event.target.value)} placeholder="מספר זהות" />
                </label>
                <label className="text-xs space-y-1">
                  <span>תאריך *</span>
                  <Input type="date" value={declarationDate} onChange={(event) => setDeclarationDate(event.target.value)} />
                </label>
                <label className="text-xs space-y-1">
                  <span>שם הקבלן *</span>
                  <Input value={contractorName} onChange={(event) => setContractorName(event.target.value)} placeholder="שם הקבלן" />
                </label>
                <label className="text-xs space-y-1">
                  <span>מבצע ההדרכה *</span>
                  <Input value={instructorName} onChange={(event) => setInstructorName(event.target.value)} placeholder="שם מבצע ההדרכה" />
                </label>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium">חתימת העובד *</div>
                <SignaturePad value={signature} onChange={(value) => setSignature(value ?? undefined)} width={340} height={140} />
              </div>
              <Button className="w-full" disabled={submitting} onClick={() => void submit()}>
                {submitting ? 'שומר הצהרה…' : 'אשר, חתום ושמור'}
              </Button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
