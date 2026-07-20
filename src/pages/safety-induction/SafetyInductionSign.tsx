import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Download, FileText, Loader2, Share2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SignaturePad from '@/components/dossier/SignaturePad';
import {
  CONSTRUCTION_INDUCTION_DOCUMENTS,
  openConstructionInductionPdf,
} from '@/lib/construction-induction-documents';
import {
  completePublicInduction,
  getPublicInductionAssignment,
} from '@/lib/safety-induction-store';
import {
  INDUCTION_DECLARATION_POINTS,
  buildSignedInductionPdfFile,
} from '@/lib/induction-signed-pdf';
import { downloadPdfFile, sharePdfFile } from '@/lib/trade-risk-signed-pdf';
import type { PublicInductionAssignment } from '@/types/safety-induction';

function normalizeToken(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  return raw.trim().replace(/[)\].,;!?״"']+$/g, '') || undefined;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function SafetyInductionSign({ forcedToken }: { forcedToken?: string } = {}) {
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = normalizeToken(forcedToken || routeToken || searchParams.get('ci'));
  const sheetRef = useRef<HTMLDivElement>(null);

  const [assignment, setAssignment] = useState<PublicInductionAssignment | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerIdNumber, setSignerIdNumber] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [declarationDate, setDeclarationDate] = useState(today());
  const [companyName, setCompanyName] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [siteManagerName, setSiteManagerName] = useState('');
  const [heightValidUntil, setHeightValidUntil] = useState('');
  const [signature, setSignature] = useState<string | undefined>();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const document = useMemo(
    () => CONSTRUCTION_INDUCTION_DOCUMENTS.find((item) => item.code === assignment?.languageCode),
    [assignment],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!token) throw new Error('קישור החתימה אינו תקין');
        const result = await getPublicInductionAssignment(token);
        if (cancelled) return;
        setAssignment(result);
        setSignerName(result.signerName || result.employeeName || '');
        setSignerIdNumber(result.signerIdNumber || result.employeeIdNumber || '');
        setJobTitle(result.jobTitle || result.employeeJobTitle || '');
        setDeclarationDate(result.declarationDate || today());
        setCompanyName(result.companyName || result.clientName || '');
        setInstructorName(result.instructorName || '');
        setSiteManagerName(result.siteManagerName || '');
        setHeightValidUntil(result.heightTrainingValidUntil || '');
        setSignature(result.signatureDataUrl);
        setConfirmed(result.status === 'completed');
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'טעינת הטופס נכשלה');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const buildPdf = async () => {
    if (!assignment || !document || !sheetRef.current) throw new Error('לא ניתן ליצור PDF חתום');
    return buildSignedInductionPdfFile({
      assignment,
      document,
      sheetElement: sheetRef.current,
    });
  };

  const submit = async () => {
    if (!token || !assignment) return;
    if (!confirmed) {
      setError('יש לאשר את הצהרת העובד לפני החתימה');
      return;
    }
    if (!signerName.trim() || !signerIdNumber.trim() || !jobTitle.trim()
      || !companyName.trim() || !instructorName.trim() || !siteManagerName.trim()) {
      setError('יש למלא את כל שדות הצהרת העובד');
      return;
    }
    if (!signature) {
      setError('יש לחתום במסגרת החתימה');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await completePublicInduction(token, {
        signerName: signerName.trim(),
        signerIdNumber: signerIdNumber.trim(),
        jobTitle: jobTitle.trim(),
        declarationDate,
        companyName: companyName.trim(),
        instructorName: instructorName.trim(),
        siteManagerName: siteManagerName.trim(),
        heightTrainingValidUntil: heightValidUntil || undefined,
        signatureDataUrl: signature,
      });
      setAssignment({
        ...assignment,
        status: 'completed',
        signerName: result.signerName || signerName.trim(),
        signerIdNumber: result.signerIdNumber || signerIdNumber.trim(),
        jobTitle: result.jobTitle || jobTitle.trim(),
        declarationDate: result.declarationDate || declarationDate,
        companyName: result.companyName || companyName.trim(),
        instructorName: result.instructorName || instructorName.trim(),
        siteManagerName: result.siteManagerName || siteManagerName.trim(),
        heightTrainingValidUntil: result.heightTrainingValidUntil || heightValidUntil || undefined,
        signatureDataUrl: signature,
        acknowledgedAt: result.acknowledgedAt || new Date().toISOString(),
        certificateNumber: result.certificateNumber,
      });
      setMessage('החתימה נשמרה. ניתן להוריד או לשלוח את ה־PDF המלא החתום.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'שמירת החתימה נכשלה');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadSigned = async () => {
    setPreparingPdf(true);
    setError(null);
    try {
      downloadPdfFile(await buildPdf());
      setMessage('ה־PDF המלא החתום הורד למכשיר');
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
      const file = await buildPdf();
      const mode = await sharePdfFile(
        file,
        `הוראות בטיחות חתומות — ${assignment.siteName}`,
        `מצורף עותק חתום של הוראות הבטיחות לעובד חדש באתר ${assignment.siteName}.`,
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
          <div className="text-sm text-slate-600">{error || 'הקישור אינו תקין'}</div>
        </div>
      </div>
    );
  }

  const completed = assignment.status === 'completed';
  const dName = assignment.signerName || signerName;
  const dId = assignment.signerIdNumber || signerIdNumber;
  const dJob = assignment.jobTitle || jobTitle;
  const dDate = assignment.declarationDate || declarationDate;
  const dCompany = assignment.companyName || companyName;
  const dInstructor = assignment.instructorName || instructorName;
  const dManager = assignment.siteManagerName || siteManagerName;
  const dHeight = assignment.heightTrainingValidUntil || heightValidUntil;
  const dSignature = assignment.signatureDataUrl || signature;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <main className="container mx-auto max-w-xl p-4 space-y-4">
        <header className="rounded-2xl bg-[#0f2744] text-white p-5 space-y-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#f4c95d] text-[#0f2744] p-3"><FileText className="w-6 h-6" /></div>
            <div>
              <h1 className="text-xl font-bold">הוראות בטיחות לעובד חדש</h1>
              <p className="text-sm text-slate-300">{assignment.languageLabel}</p>
            </div>
          </div>
          <div className="text-sm text-slate-200 space-y-1">
            <div>לקוח: {assignment.clientName}</div>
            <div>אתר בנייה: {assignment.siteName}{assignment.siteAddress ? ` · ${assignment.siteAddress}` : ''}</div>
            <div>עובד רשום: {assignment.employeeName}</div>
          </div>
        </header>

        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm whitespace-pre-wrap">{error}</div>}
        {message && <div className="rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm whitespace-pre-wrap">{message}</div>}

        {completed ? (
          <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-emerald-900">
              <CheckCircle2 className="w-5 h-5" /> ההצהרה נקלטה בהצלחה
            </div>
            <div className="text-sm text-emerald-900 space-y-1">
              <div>שם: {dName}</div>
              <div>ת.ז.: {dId}</div>
              <div>מקצוע: {dJob}</div>
              <div>תאריך: {dDate}</div>
              <div>חברה: {dCompany}</div>
              <div>מדריך: {dInstructor}</div>
              <div>מנהל עבודה: {dManager}</div>
              {dHeight && <div>תוקף הדרכת גובה: {dHeight}</div>}
            </div>
            {dSignature && <img src={dSignature} alt="חתימת העובד" className="h-24 bg-white border rounded-md" />}
            <div className="flex flex-wrap gap-2">
              <Button disabled={preparingPdf || !document} onClick={() => void downloadSigned()}>
                <Download className="w-4 h-4 ml-1" /> {preparingPdf ? 'מכין PDF…' : 'הורד PDF מלא חתום'}
              </Button>
              <Button variant="secondary" disabled={preparingPdf || !document} onClick={() => void shareSigned()}>
                <Share2 className="w-4 h-4 ml-1" /> שלח העתק PDF
              </Button>
              {document && (
                <Button variant="outline" onClick={() => void openConstructionInductionPdf(document)}>
                  פתח מסמך מקורי
                </Button>
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-xl border bg-white p-4 space-y-3">
              <h2 className="font-semibold">1. קריאת הוראות הבטיחות</h2>
              <p className="text-sm text-slate-600">יש לקרוא את המסמך במלואו לפני מילוי ההצהרה והחתימה.</p>
              {document && (
                <Button onClick={() => void openConstructionInductionPdf(document).catch((cause) => {
                  setError(cause instanceof Error ? cause.message : 'פתיחת המסמך נכשלה');
                })}>
                  פתח הוראות בטיחות (PDF)
                </Button>
              )}
              <div className="space-y-2 text-sm">
                {INDUCTION_DECLARATION_POINTS.map((point, index) => (
                  <p key={point}><span className="font-semibold">{index + 1}. </span>{point}</p>
                ))}
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>הריני מאשר בחתימתי את האמור לעיל ומתחייב לפעול על פיו</span>
              </label>
            </section>

            <section className="rounded-xl border bg-white p-4 space-y-3">
              <h2 className="font-semibold">2. פרטי העובד והמדריך</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-xs space-y-1 sm:col-span-2">שם העובד *<Input value={signerName} onChange={(e) => setSignerName(e.target.value)} /></label>
                <label className="text-xs space-y-1">תעודת זהות *<Input value={signerIdNumber} onChange={(e) => setSignerIdNumber(e.target.value)} /></label>
                <label className="text-xs space-y-1">מקצוע העובד *<Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} /></label>
                <label className="text-xs space-y-1">תאריך *<Input type="date" value={declarationDate} onChange={(e) => setDeclarationDate(e.target.value)} /></label>
                <label className="text-xs space-y-1">תוקף הדרכה לגובה<Input type="date" value={heightValidUntil} onChange={(e) => setHeightValidUntil(e.target.value)} /></label>
                <label className="text-xs space-y-1 sm:col-span-2">שם החברה / הקבלן *<Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></label>
                <label className="text-xs space-y-1">שם המדריך *<Input value={instructorName} onChange={(e) => setInstructorName(e.target.value)} /></label>
                <label className="text-xs space-y-1">שם מנהל עבודה *<Input value={siteManagerName} onChange={(e) => setSiteManagerName(e.target.value)} /></label>
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

        <div className="fixed -left-[9999px] top-0 w-[720px] pointer-events-none" aria-hidden>
          <div ref={sheetRef} className="bg-white text-black p-8 space-y-4" dir="rtl" style={{ fontFamily: 'Heebo, Arial, sans-serif' }}>
            <div className="text-center border-b pb-3 space-y-1">
              <div className="text-xl font-bold">הצהרת עובד חדש — הוראות בטיחות באתר בנייה</div>
              <div className="text-sm">{dCompany} · אתר {assignment.siteName}</div>
              <div className="text-sm text-slate-700">{assignment.languageLabel}</div>
            </div>
            <div className="text-sm space-y-2">
              {INDUCTION_DECLARATION_POINTS.map((point, index) => (
                <p key={point}><strong>{index + 1}. </strong>{point}</p>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm border rounded-lg p-4">
              <div><strong>שם העובד:</strong> {dName || '—'}</div>
              <div><strong>תעודת זהות:</strong> {dId || '—'}</div>
              <div><strong>מקצוע העובד:</strong> {dJob || '—'}</div>
              <div><strong>תאריך:</strong> {dDate || '—'}</div>
              <div><strong>שם המדריך:</strong> {dInstructor || '—'}</div>
              <div><strong>שם מנהל עבודה:</strong> {dManager || '—'}</div>
              <div className="col-span-2"><strong>שם החברה:</strong> {dCompany || '—'}</div>
              {dHeight && <div className="col-span-2"><strong>תוקף הדרכה לעבודה בגובה:</strong> {dHeight}</div>}
            </div>
            <div>
              <div className="font-semibold text-sm mb-1">חתימת העובד:</div>
              {dSignature ? <img src={dSignature} alt="" className="h-28 border rounded bg-white object-contain" /> : <div className="h-28 border rounded" />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
