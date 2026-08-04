import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  finalizeReport,
  getFinalPdfSignedUrl,
  getPublicUrl,
  loadReportView,
  reopenReport,
} from '@/lib/safety-audit-store';
import type { SafetyAuditDefect, SafetyAuditReport } from '@/types/safety-audit';
import {
  EDUCATION_APPROVALS,
  EDUCATION_KIND_LABELS,
  educationApprovalByKey,
  type EducationInstitutionKind,
} from '@/data/education-moe-catalog';
import {
  CONSTRUCTION_GENERAL_NOTES,
  EDUCATION_GENERAL_NOTES,
  defectLifecycleLabel,
  defectSeverityLabel,
  getChecklistTopics,
  isReportLocked,
  reportStatusLabel,
  reportTypeLabel,
} from '@/types/safety-audit';
import { useSafetyAuth } from '@/contexts/SafetyAuthContext';
import { Button } from '@/components/ui/button';
import { createPdfBlob, downloadPdfBlob, exportToPdf } from '@/lib/pdf-export';
import { Download, Lock, LockOpen, Mail, MessageCircle, Share2, X } from 'lucide-react';

const riskLabel: Record<string, string> = {
  low: 'נמוך',
  medium: 'בינוני',
  high: 'גבוה',
};

type ReportPhoto = {
  id: string;
  storagePath: string;
  caption?: string;
  defectDescription: string;
  severity: string;
  checklistTopicKey?: string;
  defectId: string;
  photoKind?: 'before' | 'after';
};

const PhotoThumb = ({ src, alt }: { src: string; alt: string }) => (
  <img
    src={src}
    alt={alt}
    className="h-[68px] w-[92px] object-cover rounded border border-slate-200 bg-slate-50 mx-auto"
  />
);

const SafetyAuditPreview = () => {
  const { id } = useParams();
  const { isAdmin } = useSafetyAuth();
  const [report, setReport] = useState<SafetyAuditReport | null>(null);
  const [defects, setDefects] = useState<SafetyAuditDefect[]>([]);
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [fromSnapshot, setFromSnapshot] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareFallback, setShareFallback] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [finalPdfUrl, setFinalPdfUrl] = useState<string | null>(null);

  const reload = async () => {
    if (!id) throw new Error('מזהה הדוח חסר');
    const view = await loadReportView(id);
    setReport(view.report);
    setDefects(view.defects);
    setPhotos(view.photos);
    setFromSnapshot(view.fromSnapshot);
    setLoadError(null);
    const pdfUrl = await getFinalPdfSignedUrl(view.report);
    setFinalPdfUrl(pdfUrl);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!id) throw new Error('מזהה הדוח חסר');
        const view = await loadReportView(id);
        if (cancelled) return;
        setReport(view.report);
        setDefects(view.defects);
        setPhotos(view.photos);
        setFromSnapshot(view.fromSnapshot);
        setLoadError(null);
        const pdfUrl = await getFinalPdfSignedUrl(view.report);
        if (!cancelled) setFinalPdfUrl(pdfUrl);
      } catch (cause) {
        if (!cancelled) {
          setLoadError(cause instanceof Error ? cause.message : 'טעינת הדוח נכשלה');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const photosByDefect = useMemo(() => {
    const map: Record<string, ReportPhoto[]> = {};
    for (const p of photos) {
      (map[p.defectId] ??= []).push(p);
    }
    return map;
  }, [photos]);

  const photosByTopic = useMemo(() => {
    const map: Record<string, ReportPhoto[]> = {};
    for (const p of photos) {
      if (!p.checklistTopicKey) continue;
      (map[p.checklistTopicKey] ??= []).push(p);
    }
    return map;
  }, [photos]);

  const onExport = async () => {
    const el = document.getElementById('printable');
    if (!el) return;
    setExporting(true);
    try {
      await exportToPdf(el, `דוח-ביקורת-בטיחות-${report?.reportNumber || 'ללא-מספר'}.pdf`);
      setShareMessage(null);
    } catch (cause) {
      setShareMessage(cause instanceof Error ? cause.message : 'יצירת ה־PDF נכשלה');
    } finally {
      setExporting(false);
    }
  };

  const pdfFileName = () =>
    `דוח-בטיחות-${report?.reportNumber || 'ללא-מספר'}-${report?.siteName || report?.projectName || 'אתר'}.pdf`
      .replace(/[\\/:*?"<>|]/g, '-');

  const shareText = () =>
    `שלום, מצורף דו״ח ביקורת בטיחות ${report?.reportNumber || ''} עבור ${report?.recipient || 'הלקוח'}, באתר ${report?.siteName || report?.projectName || ''}.`;

  const getPdf = async () => {
    const element = document.getElementById('printable');
    if (!element) throw new Error('לא ניתן ליצור את קובץ הדוח');
    return createPdfBlob(element);
  };

  const onShare = async () => {
    setSharing(true);
    setShareMessage(null);
    try {
      const blob = await getPdf();
      const file = new File([blob], pdfFileName(), { type: 'application/pdf' });
      const shareData: ShareData = {
        title: `דו״ח ביקורת בטיחות ${report?.reportNumber || ''}`,
        text: shareText(),
        files: [file],
      };

      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        setShareMessage('הדוח הועבר לשיתוף');
      } else {
        downloadPdfBlob(blob, pdfFileName());
        setShareFallback(true);
        setShareMessage('ה־PDF הורד. בחר WhatsApp או מייל וצרף את הקובץ שהורד.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareFallback(true);
      setShareMessage(error instanceof Error ? error.message : 'השיתוף נכשל');
    } finally {
      setSharing(false);
    }
  };

  const shareViaWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, '_blank', 'noopener,noreferrer');
  };

  const shareViaEmail = () => {
    const subject = `דו״ח ביקורת בטיחות ${report?.reportNumber || ''}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${shareText()}\n\nיש לצרף להודעה את קובץ ה-PDF שהורד.`)}`;
  };

  const onFinalize = async () => {
    if (!report || !id) return;
    if (!window.confirm('לנעול את הדוח כגרסה סופית? לאחר הנעילה לא ניתן יהיה לערוך אותו (מנהל יוכל לפתוח מחדש).')) {
      return;
    }
    setLocking(true);
    setShareMessage(null);
    try {
      const blob = await getPdf();
      const saved = await finalizeReport(id, { pdfBlob: blob });
      setReport(saved);
      await reload();
      setShareMessage('הדוח ננעל ונשמרה גרסת PDF קבועה');
    } catch (cause) {
      setShareMessage(cause instanceof Error ? cause.message : 'נעילת הדוח נכשלה');
    } finally {
      setLocking(false);
    }
  };

  const onReopen = async () => {
    if (!report || !id) return;
    if (!window.confirm('לפתוח מחדש את הדוח לעריכה?')) return;
    setLocking(true);
    setShareMessage(null);
    try {
      await reopenReport(id);
      await reload();
      setShareMessage('הדוח נפתח מחדש לעריכה');
    } catch (cause) {
      setShareMessage(cause instanceof Error ? cause.message : 'פתיחה מחדש נכשלה');
    } finally {
      setLocking(false);
    }
  };

  if (loading) return <div className="p-4" dir="rtl">טוען…</div>;
  if (loadError || !report) {
    return (
      <div className="p-6 text-center space-y-3" dir="rtl">
        <div className="text-red-700">{loadError || 'הדוח לא נמצא'}</div>
        <Link to="/safety" className="underline text-slate-600">חזרה ללקוחות</Link>
      </div>
    );
  }

  const locked = isReportLocked(report);
  const isConstruction = report.reportType === 'construction';
  const isInfrastructure = report.reportType === 'infrastructure';
  const isRailway = report.reportType === 'railway';
  const isBuildingSurvey = report.reportType === 'building_survey';
  const isEducation = report.reportType === 'education_institution';
  const isProjectReport = isConstruction || isInfrastructure || isRailway || isBuildingSurvey || isEducation;
  const railwayDetails = report.domainDetails ?? {};
  const topics = getChecklistTopics(report.reportType);
  const siteTitle = report.projectName || report.siteName || '—';
  const openCount = defects.filter((d) => (d.status ?? 'open') === 'open').length;
  const fixedCount = defects.filter((d) => d.status === 'fixed').length;
  const verifiedCount = defects.filter((d) => d.status === 'verified').length;

  const reportHeading = isEducation
    ? 'הבטחת תנאים בטיחותיים במוסדות חינוך'
    : `דו״ח ביקורת בטיחות — ${reportTypeLabel(report.reportType)}`;

  const statusMark = (key: string, want: 'ok' | 'not_ok' | 'na') => {
    const s = report.checklist?.[key]?.status;
    return s === want ? '☑' : '☐';
  };

  const formatSignDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('he-IL') : 'טרם נחתם';

  return (
    <div dir="rtl" className="min-h-screen bg-[#e8edf2]">
      <div className="mx-auto max-w-[920px] p-3 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="space-y-1">
            <Link to={`/safety/editor/${report.id}`} className="text-sm underline text-slate-600">
              ← {locked ? 'צפייה בעורך (נעול)' : 'חזרה לעריכה'}
            </Link>
            <h1 className="text-xl font-bold text-slate-800">תצוגה לשליחה ללקוח</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 ${locked ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border'}`}>
                {reportStatusLabel(report.status)}
              </span>
              {fromSnapshot && <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5">מוצג מגרסה נעולה</span>}
              {report.finalizedAt && (
                <span className="text-slate-500">
                  ננעל {new Date(report.finalizedAt).toLocaleString('he-IL')}
                  {report.finalizedBy ? ` ע״י ${report.finalizedBy}` : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!locked && (
              <Button onClick={() => void onFinalize()} disabled={locking || exporting || sharing} className="gap-1">
                <Lock className="w-4 h-4" />
                {locking ? 'נועל…' : 'נעל וסיים דוח'}
              </Button>
            )}
            {locked && isAdmin && (
              <Button variant="outline" onClick={() => void onReopen()} disabled={locking} className="gap-1">
                <LockOpen className="w-4 h-4" />
                פתח מחדש
              </Button>
            )}
            {finalPdfUrl && (
              <Button asChild variant="outline" className="gap-1">
                <a href={finalPdfUrl} target="_blank" rel="noreferrer">
                  <Download className="w-4 h-4" />
                  PDF נעול
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={onExport} disabled={exporting || sharing} className="gap-1">
              <Download className="w-4 h-4" />
              {exporting ? 'מייצא…' : 'הורד PDF'}
            </Button>
            <Button onClick={() => void onShare()} disabled={sharing || exporting} className="gap-1 min-w-[120px]">
              <Share2 className="w-4 h-4" />
              {sharing ? 'מכין…' : 'שתף דוח'}
            </Button>
          </div>
        </div>

        {(shareFallback || shareMessage) && (
          <div className="print:hidden rounded-xl border bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm text-slate-700">{shareMessage}</div>
              <button type="button" onClick={() => { setShareFallback(false); setShareMessage(null); }} aria-label="סגור">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            {shareFallback && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button type="button" onClick={shareViaWhatsApp} className="gap-1 bg-[#25D366] hover:bg-[#1fb857] text-white">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </Button>
                <Button type="button" variant="outline" onClick={shareViaEmail} className="gap-1">
                  <Mail className="w-4 h-4" /> מייל
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1"
                  onClick={async () => downloadPdfBlob(await getPdf(), pdfFileName())}
                >
                  <Download className="w-4 h-4" /> הורד שוב
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto rounded-sm">
        <article
          id="printable"
          className="report-sheet bg-white text-slate-900 shadow-lg print:shadow-none overflow-hidden mx-auto"
          style={{ fontFamily: 'Heebo, Arial, sans-serif', width: 794, minWidth: 794 }}
        >
          {/* Letterhead */}
          <header className="bg-[#0f2744] text-white px-6 sm:px-8 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs tracking-[0.2em] text-slate-300 mb-1">סול בטיחות בע״מ</div>
                <h2 className="text-xl sm:text-2xl font-bold leading-snug">
                  {reportHeading}
                </h2>
                <div className="mt-2 text-sm text-slate-200">{siteTitle}</div>
              </div>
              <div className="text-sm text-left space-y-1 bg-white/10 rounded-lg px-4 py-3 min-w-[160px]">
                <div>
                  <span className="text-slate-300">מס׳ דו״ח</span>
                  <div className="font-semibold">{report.reportNumber || '—'}</div>
                </div>
                <div>
                  <span className="text-slate-300">תאריך</span>
                  <div className="font-semibold">{report.auditDate || report.date || '—'}</div>
                </div>
                <div className="text-xs text-amber-200 pt-1">{reportTypeLabel(report.reportType)}</div>
              </div>
            </div>
          </header>

          <div className="px-6 sm:px-8 py-6 space-y-7 text-[13px] leading-relaxed">
            <div className="flex flex-wrap justify-between gap-2 border-b border-slate-200 pb-3 text-sm">
              <div>
                <span className="text-slate-500">לכבוד:</span>{' '}
                <span className="font-medium">{report.recipient || '________________'}</span>
              </div>
              <div className="text-slate-500">ממונה בטיחות: {report.auditor || 'שלומי סולטן'} · מ.ר 26352</div>
            </div>

            {!isProjectReport && (
              <section>
                <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">
                  1. סיכום מנהלים
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <div className="text-xs text-slate-500 mb-1">דירוג סיכון כולל</div>
                    <div className="font-semibold">
                      {report.riskLevel ? riskLabel[report.riskLevel] : 'לא צוין'}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <div className="text-xs text-slate-500 mb-1">נדרשת פעולה מיידית</div>
                    <div className={`font-semibold ${report.immediateAction ? 'text-red-700' : 'text-emerald-700'}`}>
                      {report.immediateAction ? 'כן' : 'לא'}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 min-h-[64px] whitespace-pre-wrap bg-white">
                  {report.executiveSummary || '—'}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">
                {isProjectReport ? 'פרטי הביקורת' : '2. פרטי הביקורת'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {isConstruction ? (
                  <>
                    <MetaRow label="פרויקט / אתר" value={siteTitle} />
                    <MetaRow label="גוש / מגרש" value={`${report.block || '—'} / ${report.parcel || '—'}`} />
                    <MetaRow label="מבצע הביקורת" value={`${report.auditor || '—'} (${report.auditorRole || 'ממונה בטיחות'})`} />
                    <MetaRow label="מנהל עבודה" value={report.siteManager || '—'} />
                    <MetaRow label="תאריך ביקורת" value={report.auditDate || '—'} />
                    <MetaRow label="מספר פועלים" value={String(report.workersCount ?? '—')} />
                  </>
                ) : isBuildingSurvey ? (
                  <>
                    <MetaRow label="שם המבנה / המוסד" value={siteTitle} />
                    <MetaRow label="כתובת" value={railwayDetails.buildingAddress || '—'} />
                    <MetaRow label="איש קשר" value={`${railwayDetails.buildingContactName || '—'} · ${railwayDetails.buildingContactPhone || '—'}`} />
                    <MetaRow label="תאריך הסקר" value={report.auditDate || '—'} />
                    <MetaRow label="אישור כיבוי אש" value={railwayDetails.fireApprovalDate || 'חסר'} />
                    <MetaRow label="אישור מהנדס מבנים" value={railwayDetails.structuralApprovalDate || 'חסר'} />
                    <MetaRow label="אישור חשמלאי מוסמך" value={railwayDetails.electricalApprovalDate || 'חסר'} />
                    <MetaRow label="תוקף הסקר" value={railwayDetails.approvalValidUntil || '—'} />
                  </>
                ) : isEducation ? (
                  <>
                    <MetaRow label="שם המוסד" value={siteTitle} />
                    <MetaRow
                      label="סוג המוסד"
                      value={
                        railwayDetails.institutionKind
                          ? EDUCATION_KIND_LABELS[railwayDetails.institutionKind as EducationInstitutionKind]
                          : '—'
                      }
                    />
                    <MetaRow label="הישוב / הבעלות" value={railwayDetails.ownership || '—'} />
                    <MetaRow label="סמל המוסד" value={railwayDetails.institutionSymbol || '—'} />
                    <MetaRow label="כתובת" value={railwayDetails.buildingAddress || '—'} />
                    <MetaRow label="מספר תלמידים" value={railwayDetails.studentsCount || '—'} />
                    <MetaRow label="שנת הקמה" value={railwayDetails.yearBuilt || '—'} />
                    <MetaRow label="טלפון המוסד" value={railwayDetails.institutionPhone || '—'} />
                    <MetaRow label="מנהל/ת / גננת" value={railwayDetails.principalName || '—'} />
                    <MetaRow label="מפקח/ת כללי" value={railwayDetails.inspectorName || '—'} />
                    <MetaRow label="תאריך המבדק" value={report.auditDate || '—'} />
                    <MetaRow label="עורך המבדק" value={`${report.auditor || '—'} (${report.auditorRole || 'עורך מבדק'})`} />
                    <MetaRow label="משתתפים מהמוסד" value={railwayDetails.institutionParticipants || '—'} />
                    <MetaRow label="משתתפים מהרשות" value={railwayDetails.authorityParticipants || '—'} />
                  </>
                ) : isRailway ? (
                  <>
                    <MetaRow label="אתר רכבת ישראל" value={siteTitle} />
                    <MetaRow label="ק״מ רכבתי" value={`מ־${railwayDetails.railwayKmFrom || '—'} ועד ${railwayDetails.railwayKmTo || '—'}`} />
                    <MetaRow label="שם הקבלן המבצע" value={report.contractor || '—'} />
                    <MetaRow label="מנהל עבודה" value={report.siteManager || '—'} />
                    <MetaRow label="ממונה בטיחות מטעם המבצע" value={report.auditor || '—'} />
                    <MetaRow label="תאריך הביקורת" value={report.auditDate || '—'} />
                    <MetaRow label="לידי" value={railwayDetails.attention || '—'} />
                    <MetaRow label="לידיעה" value={railwayDetails.copyTo || '—'} />
                  </>
                ) : isInfrastructure ? (
                  <>
                    <MetaRow label="שם הפרויקט / אתר התשתיות" value={siteTitle} />
                    <MetaRow label="מבצע הבנייה (קבלן)" value={report.contractor || '—'} />
                    <MetaRow label="ממונה הבטיחות" value={`${report.auditor || '—'} (${report.auditorRole || 'ממונה בטיחות'})`} />
                    <MetaRow label="מנהל עבודה" value={report.siteManager || '—'} />
                    <MetaRow label="תאריך הביקורת" value={report.auditDate || '—'} />
                    <MetaRow label="מלווה הביקורת" value={report.attendees || '—'} />
                    <MetaRow label="מספר עובדים" value={String(report.workersCount ?? '—')} />
                  </>
                ) : (
                  <>
                    <MetaRow label="שם האתר / כתובת" value={report.siteName || '—'} />
                    <MetaRow label="שם המבצע (הקבלן)" value={report.contractor || '—'} />
                    <MetaRow label="תאריך הביקורת" value={report.auditDate || '—'} />
                    <MetaRow label="עורך הביקורת" value={report.auditor || '—'} />
                    <MetaRow label="נוכחים" value={report.attendees || '—'} />
                    <MetaRow label="מנהל עבודה" value={report.siteManager || '—'} />
                    <MetaRow label="שעות עבודה" value={report.workHours || '—'} />
                    <MetaRow label="מספר עובדים" value={String(report.workersCount ?? '—')} />
                    <MetaRow label="שלב עבודה" value={report.workStage || '—'} />
                  </>
                )}
              </div>
              {isProjectReport && report.workStagesDetail && (
                <div className="mt-3 rounded-lg border border-slate-200 p-3 bg-slate-50">
                  <div className="text-xs text-slate-500 mb-1">
                    {isInfrastructure ? 'תיאור העבודות המתבצעות בעת הביקורת' : 'שלבי עבודה'}
                  </div>
                  <div className="whitespace-pre-wrap">{report.workStagesDetail}</div>
                </div>
              )}
            </section>

            {isRailway && (railwayDetails.participants?.length ?? 0) > 0 && (
              <section className="pdf-keep-together">
                <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">
                  משתתפים בסיור
                </h3>
                <table className="w-full table-fixed border-collapse text-[11px]">
                  <thead><tr className="bg-[#0f2744] text-white">
                    <th className="border p-2 w-10">#</th><th className="border p-2">שם</th>
                    <th className="border p-2">תפקיד</th><th className="border p-2">הערות / הסמכה</th>
                  </tr></thead>
                  <tbody>{railwayDetails.participants?.map((participant, index) => (
                    <tr key={`${participant.name}-${index}`}>
                      <td className="border p-2 text-center">{index + 1}</td>
                      <td className="border p-2">{participant.name}</td>
                      <td className="border p-2">{participant.role || ''}</td>
                      <td className="border p-2">{participant.notes || ''}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </section>
            )}

            {isRailway && (railwayDetails.previousFindings?.length ?? 0) > 0 && (
              <section>
                <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">
                  ליקויים מביקור קודם מתאריך {railwayDetails.previousVisitDate || '—'}
                </h3>
                <div className="text-[10px] mb-2">רמת סיכון 3 — אדום, אסור לעבוד · רמה 2 — צהוב, נדרש תיקון · רמה 1 — ירוק, סיכון קביל</div>
                <table className="w-full table-fixed border-collapse text-[10px]">
                  <thead><tr className="bg-[#0f2744] text-white">
                    <th className="border p-2 w-8">#</th><th className="border p-2">מהות הליקוי ומיקומו</th>
                    <th className="border p-2">הנחיות</th><th className="border p-2">סטטוס</th>
                    <th className="border p-2">אחראי ומועד</th>
                  </tr></thead>
                  <tbody>{railwayDetails.previousFindings?.map((finding, index) => (
                    <tr key={index} className="avoid-break">
                      <td className="border p-2 text-center">{index + 1}</td>
                      <td className="border p-2">{finding.description}</td>
                      <td className="border p-2">{finding.instructions || ''}</td>
                      <td className="border p-2">{finding.status || ''}</td>
                      <td className="border p-2">{finding.responsible || ''}{finding.dueDate ? ` · ${finding.dueDate}` : ''}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </section>
            )}

            {!isEducation && (
            <section>
              <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">
                {isConstruction ? 'ממצאי הביקורת' : isInfrastructure ? 'רשימת בדיקה' : isRailway ? 'טבלת בדיקה — אתרי רכבת ישראל' : isBuildingSurvey ? 'א. אזורים ונושאים לבדיקת בטיחות המבנה' : '3. רשימת בדיקה'}
              </h3>

              {isConstruction ? (
                <div className="rounded-lg border border-slate-300 overflow-hidden">
                  <table className="w-full table-fixed border-collapse text-[10px] leading-[1.35]">
                    <colgroup>
                      <col style={{ width: '4%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '23%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '29%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '13%' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#0f2744] text-white">
                        <th className="border border-slate-600 p-1.5">#</th>
                        <th className="border border-slate-600 p-2">פרק</th>
                        <th className="border border-slate-600 p-2 text-right">מהות הבדיקה</th>
                        <th className="border border-slate-600 p-2">סטטוס</th>
                        <th className="border border-slate-600 p-2 text-right">ממצאים והמלצות</th>
                        <th className="border border-slate-600 p-2">אחראי</th>
                        <th className="border border-slate-600 p-2">צילום</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topics.map((t, idx) => {
                        const item = report.checklist?.[t.key];
                        const rowPhotos = photosByTopic[t.key] ?? [];
                        const notOk = item?.status === 'not_ok';
                        return (
                          <tr key={t.key} className={`avoid-break ${notOk ? 'bg-red-50/70' : idx % 2 ? 'bg-slate-50' : 'bg-white'}`}>
                            <td className="border border-slate-200 p-1.5 text-center align-top">{idx + 1}</td>
                            <td className="border border-slate-200 p-1.5 align-top break-words">{t.chapter}</td>
                            <td className="border border-slate-200 p-1.5 align-top font-medium break-words">{t.title}</td>
                            <td className="border border-slate-200 p-1.5 text-center align-top">
                              <span className={`inline-block rounded px-1.5 py-0.5 font-semibold ${notOk ? 'bg-red-100 text-red-800' : item?.status === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                {notOk ? 'לא תקין' : item?.status === 'ok' ? 'תקין' : 'לא סומן'}
                              </span>
                            </td>
                            <td className="border border-slate-200 p-2 align-top">
                              <div>{item?.findings || ''}</div>
                              {item?.notes ? <div className="text-slate-500 mt-1">{item.notes}</div> : null}
                            </td>
                            <td className="border border-slate-200 p-1.5 align-top break-words">{item?.responsible || ''}</td>
                            <td className="border border-slate-200 p-1.5 align-top">
                              {rowPhotos.length === 0 ? (
                                <span className="text-slate-400">—</span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {rowPhotos.slice(0, 1).map((p) => (
                                    <PhotoThumb key={p.id} src={getPublicUrl(p.storagePath)} alt={t.title} />
                                  ))}
                                  {rowPhotos.length > 1 && <span className="text-[9px] text-slate-500 text-center">+{rowPhotos.length - 1} תמונות</span>}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : isRailway ? (
                <div className="rounded-lg border border-slate-300 overflow-hidden">
                  <table className="w-full table-fixed border-collapse text-[9px] leading-[1.3]">
                    <colgroup>
                      <col style={{ width: '4%' }} /><col style={{ width: '35%' }} />
                      <col style={{ width: '6%' }} /><col style={{ width: '6%' }} /><col style={{ width: '6%' }} />
                      <col style={{ width: '20%' }} /><col style={{ width: '11%' }} /><col style={{ width: '12%' }} />
                    </colgroup>
                    <thead><tr className="bg-[#0f2744] text-white">
                      <th className="border p-1">#</th><th className="border p-1">הנושא הנבדק</th>
                      <th className="border p-1">כן</th><th className="border p-1">לא</th><th className="border p-1">ל״ר</th>
                      <th className="border p-1">הערות / תמונות</th><th className="border p-1">תאריך גמר</th>
                      <th className="border p-1">אחראי ביצוע</th>
                    </tr></thead>
                    <tbody>{topics.map((topic, index) => {
                      const item = report.checklist?.[topic.key];
                      const defect = defects.find((entry) => entry.checklistTopicKey === topic.key);
                      const rowPhotos = photosByTopic[topic.key] ?? [];
                      return (
                        <tr key={topic.key} className={`avoid-break ${item?.status === 'not_ok' ? 'bg-red-50' : index % 2 ? 'bg-slate-50' : ''}`}>
                          <td className="border p-1 text-center">{index + 1}</td>
                          <td className="border p-1"><div className="text-[8px] text-slate-500">{topic.chapter}</div>{topic.title}</td>
                          <td className="border p-1 text-center">{statusMark(topic.key, 'ok')}</td>
                          <td className="border p-1 text-center">{statusMark(topic.key, 'not_ok')}</td>
                          <td className="border p-1 text-center">{statusMark(topic.key, 'na')}</td>
                          <td className="border p-1">
                            {item?.notes || defect?.description || ''}
                            {rowPhotos.slice(0, 1).map((photo) => <PhotoThumb key={photo.id} src={getPublicUrl(photo.storagePath)} alt={topic.title} />)}
                          </td>
                          <td className="border p-1">{defect?.dueDate || ''}</td>
                          <td className="border p-1">{defect?.responsible || item?.responsible || ''}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-300 overflow-hidden">
                  <table className="w-full table-fixed border-collapse text-[11px]">
                    <colgroup>
                      <col style={{ width: '35%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '28%' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#0f2744] text-white">
                        <th className="border border-slate-600 p-2 text-right">נושא הבדיקה</th>
                        <th className="border border-slate-600 p-2 w-14">תקין</th>
                        <th className="border border-slate-600 p-2 w-16">לא תקין</th>
                        <th className="border border-slate-600 p-2 w-20">לא רלוונטי</th>
                        <th className="border border-slate-600 p-2 text-right">הערות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topics.map((t, idx) => (
                        <tr key={t.key} className={idx % 2 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-200 p-2">
                            {t.chapter && <div className="text-[9px] text-slate-500 mb-0.5">{t.chapter}</div>}
                            {t.title}
                          </td>
                          <td className="border border-slate-200 p-2 text-center">{statusMark(t.key, 'ok')}</td>
                          <td className="border border-slate-200 p-2 text-center">{statusMark(t.key, 'not_ok')}</td>
                          <td className="border border-slate-200 p-2 text-center">{statusMark(t.key, 'na')}</td>
                          <td className="border border-slate-200 p-2">{report.checklist?.[t.key]?.notes || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            )}

            {isEducation && (
              <section>
                <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">
                  פרק 1 — אישורים ובדיקות תקופתיות שנבדקו
                </h3>
                {(railwayDetails.selectedApprovalKeys?.length ?? 0) === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    לא נבחרו אישורים רלוונטיים למוסד זה
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-300 overflow-hidden">
                    <table className="w-full border-collapse text-[10px] leading-[1.35]">
                      <thead>
                        <tr className="bg-[#0f2744] text-white">
                          <th className="border border-slate-600 p-2 w-10">#</th>
                          <th className="border border-slate-600 p-2 text-right">אישור / בדיקה</th>
                          <th className="border border-slate-600 p-2 text-right">בודק</th>
                          <th className="border border-slate-600 p-2">סטטוס</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(railwayDetails.selectedApprovalKeys ?? []).map((key, index) => {
                          const item = educationApprovalByKey(key) ?? EDUCATION_APPROVALS.find((a) => a.key === key);
                          const status = railwayDetails.approvalStatuses?.[key]?.status;
                          const statusLabel =
                            status === 'presented' ? 'הוצג' : status === 'missing' ? 'לא הוצג' : status === 'na' ? 'לא רלוונטי' : '—';
                          return (
                            <tr key={key} className={index % 2 ? 'bg-slate-50' : 'bg-white'}>
                              <td className="border border-slate-200 p-2 text-center">{item?.code || index + 1}</td>
                              <td className="border border-slate-200 p-2">{item?.title || key}</td>
                              <td className="border border-slate-200 p-2">{item?.inspector || '—'}</td>
                              <td className="border border-slate-200 p-2 text-center font-semibold">{statusLabel}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {!isConstruction && (
              <section>
                <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">
                  {isRailway
                    ? `ריכוז ליקויים מביקור נוכחי מתאריך ${report.auditDate || report.date}`
                    : isBuildingSurvey
                      ? 'ממצאים והערות לסקר בטיחות המבנה'
                      : isEducation
                        ? 'פירוט הממצאים לפי קדימות טיפול'
                    : '4. ליקויים, מפגעים ופעולות מתקנות'}
                </h3>
                {defects.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2 text-[10px]">
                    <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5">פתוחים: {openCount}</span>
                    <span className="rounded-full bg-sky-100 text-sky-900 px-2 py-0.5">תוקנו: {fixedCount}</span>
                    <span className="rounded-full bg-emerald-100 text-emerald-900 px-2 py-0.5">אומתו: {verifiedCount}</span>
                  </div>
                )}
                <div className="rounded-lg border border-slate-300 overflow-hidden">
                  <table className="w-full table-fixed border-collapse text-[10px] leading-[1.35]">
                    <colgroup>
                      <col style={{ width: '4%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '20%' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#0f2744] text-white">
                        <th className="border border-slate-600 p-2 w-8">#</th>
                        <th className="border border-slate-600 p-2 text-right">תיאור הליקוי</th>
                        {isEducation && <th className="border border-slate-600 p-2 text-right">סעיף מנחה</th>}
                        <th className="border border-slate-600 p-2">{isEducation ? 'קדימות' : 'חומרה'}</th>
                        <th className="border border-slate-600 p-2">סטטוס</th>
                        <th className="border border-slate-600 p-2 text-right">פעולה מתקנת</th>
                        <th className="border border-slate-600 p-2">אחראי</th>
                        <th className="border border-slate-600 p-2">יעד</th>
                        <th className="border border-slate-600 p-2 w-[130px]">תיעוד צילומי</th>
                      </tr>
                    </thead>
                    <tbody>
                      {defects.length === 0 && (
                        <tr>
                          <td className="border border-slate-200 p-3 text-center text-slate-500" colSpan={isEducation ? 9 : 8}>
                            לא תועדו ליקויים
                          </td>
                        </tr>
                      )}
                      {defects.map((d, idx) => {
                        const rowPhotos = photosByDefect[d.id] ?? [];
                        const beforePhotos = rowPhotos.filter((p) => (p.photoKind ?? 'before') !== 'after');
                        const afterPhotos = rowPhotos.filter((p) => p.photoKind === 'after');
                        const guidingTopic = d.checklistTopicKey
                          ? topics.find((topic) => topic.key === d.checklistTopicKey)
                          : undefined;
                        const lifecycle = d.status ?? 'open';
                        return (
                          <tr key={d.id} className={`avoid-break ${idx % 2 ? 'bg-slate-50' : 'bg-white'}`}>
                            <td className="border border-slate-200 p-2 text-center align-top">{idx + 1}</td>
                            <td className="border border-slate-200 p-2 align-top">{d.description}</td>
                            {isEducation && (
                              <td className="border border-slate-200 p-2 align-top text-[9px]">
                                {guidingTopic
                                  ? `${guidingTopic.chapter ? `${guidingTopic.chapter} · ` : ''}${guidingTopic.title}`
                                  : '—'}
                              </td>
                            )}
                            <td className="border border-slate-200 p-2 text-center align-top">
                              <span
                                className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                                  d.severity === 'high'
                                    ? 'bg-red-100 text-red-800'
                                    : d.severity === 'medium'
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {defectSeverityLabel(d.severity, report.reportType)}
                              </span>
                            </td>
                            <td className="border border-slate-200 p-2 text-center align-top">
                              <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                                lifecycle === 'verified'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : lifecycle === 'fixed'
                                    ? 'bg-sky-100 text-sky-900'
                                    : 'bg-amber-100 text-amber-900'
                              }`}>
                                {defectLifecycleLabel(lifecycle)}
                              </span>
                            </td>
                            <td className="border border-slate-200 p-2 align-top">{d.correctiveAction || '—'}</td>
                            <td className="border border-slate-200 p-2 align-top">{d.responsible || '—'}</td>
                            <td className="border border-slate-200 p-2 align-top whitespace-nowrap">{d.dueDate || '—'}</td>
                            <td className="border border-slate-200 p-1.5 align-top">
                              {rowPhotos.length === 0 ? (
                                <span className="text-slate-400">—</span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {(beforePhotos[0] ? [beforePhotos[0]] : rowPhotos.slice(0, 1)).map((p) => (
                                    <PhotoThumb key={p.id} src={getPublicUrl(p.storagePath)} alt={d.description} />
                                  ))}
                                  {afterPhotos[0] && (
                                    <div>
                                      <div className="text-[8px] text-emerald-800 text-center mb-0.5">אחרי</div>
                                      <PhotoThumb src={getPublicUrl(afterPhotos[0].storagePath)} alt={`אחרי — ${d.description}`} />
                                    </div>
                                  )}
                                  {rowPhotos.length > (afterPhotos[0] ? 2 : 1) && (
                                    <span className="text-[9px] text-slate-500 text-center">+{rowPhotos.length - (afterPhotos[0] ? 2 : 1)}</span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {isConstruction && defects.length > 0 && photos.some((p) => !p.checklistTopicKey) && (
              <section>
                <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">
                  ליקויים נוספים עם תיעוד
                </h3>
                <div className="space-y-3">
                  {defects
                    .filter((d) => !d.checklistTopicKey)
                    .map((d, idx) => (
                      <div key={d.id} className="rounded-lg border border-slate-200 p-3 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="text-xs text-slate-500">ליקוי #{idx + 1}</div>
                          <div className="font-medium">{d.description}</div>
                          <div className="text-slate-600">{d.correctiveAction}</div>
                          <div className="text-xs text-slate-500">
                            חומרה: {defectSeverityLabel(d.severity, report.reportType)} · אחראי: {d.responsible || '—'}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(photosByDefect[d.id] ?? []).map((p) => (
                            <PhotoThumb key={p.id} src={getPublicUrl(p.storagePath)} alt={d.description} />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {isConstruction ? (
              <section className="text-xs space-y-1 text-slate-700">
                <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">
                  הערות כלליות
                </h3>
                <ol className="list-decimal pr-5 space-y-1">
                  {CONSTRUCTION_GENERAL_NOTES.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ol>
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
                  <div>• ממצאי המבדק נכונים ליום המבדק בלבד.</div>
                  <div>• אבקש לתקן את הליקויים ולעדכן את הח״מ.</div>
                </div>
              </section>
            ) : isEducation ? (
              <section className="text-xs space-y-1 text-slate-700">
                <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">
                  הערות וסדרי קדימויות
                </h3>
                <ol className="list-decimal pr-5 space-y-1">
                  {EDUCATION_GENERAL_NOTES.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ol>
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
                  <div>• ממצאי המבדק נכונים ליום המבדק בלבד.</div>
                  <div>• יש לטפל במפגעי קדימות 0 ו־1 באופן מיידי, ובקדימות 2 במסגרת תכנית עבודה.</div>
                </div>
              </section>
            ) : (
              <section className="text-xs space-y-2 text-slate-700">
                <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">
                  {isBuildingSurvey ? 'הצהרת המאשר ותוקף האישור' : 'אסמכתאות והצהרה'}
                </h3>
                {isBuildingSurvey ? (
                  <>
                    <div className={`rounded-lg border-2 p-4 text-center text-lg font-bold ${
                      railwayDetails.approvalDecision === 'approved'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : railwayDetails.approvalDecision === 'not_approved'
                          ? 'border-red-500 bg-red-50 text-red-800'
                          : 'border-amber-500 bg-amber-50 text-amber-900'
                    }`}>
                      {railwayDetails.approvalDecision === 'approved'
                        ? 'מאשר את בטיחות המבנה'
                        : railwayDetails.approvalDecision === 'not_approved'
                          ? 'לא מאשר את בטיחות המבנה'
                          : 'טרם נקבעה החלטת המאשר'}
                    </div>
                    <p>
                      הריני מצהיר כי בדקתי את כל הסעיפים המפורטים לעיל. אין אפשרות לאשר בטיחות
                      על תנאי או בכפוף לתיקונים. ללא אישורי כיבוי אש, מהנדס מבנים וחשמלאי מוסמך
                      בתוקף — האישור אינו תקף.
                    </p>
                    <ul className="list-disc pr-5 space-y-1">
                      <li>באחריות המנהלים והמדריכים לשמור על בטיחות השוהים במבנה.</li>
                      <li>אין להדליק אש בחדרים ובחללי המבנה.</li>
                      <li>אין לטפל בחשמל גלוי אלא באמצעות אדם מוסמך.</li>
                      <li>יש לדווח מיד למנהל על כל מפגע בטיחותי.</li>
                      <li>תוקף האישור לשנה קלנדרית אחת ויש לחדשו מדי שנה.</li>
                    </ul>
                  </>
                ) : (
                  <p>
                    {isRailway
                      ? 'המבדק מדגמי ואין לראות ברשימת ההערות מיפוי מלא של כל הפרות הבטיחות באתר. על הקבלן לבצע פעולה מתקנת ולדווח על הביצוע.'
                      : 'הדו״ח משקף את מצב האתר במועד הביקורת בלבד, על סמך הנראה לעין ולפי המידע שנמסר לעורך. ליקויים בדרגת חומרה ״גבוהה״ מחייבים טיפול מיידי.'}
                  </p>
                )}
              </section>
            )}

            {/* Signatures */}
            <section className="pt-2">
              <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-4">
                חתימות
              </h3>
              <div className={`grid grid-cols-1 gap-6 ${isBuildingSurvey ? '' : 'sm:grid-cols-2'}`}>
                {!isBuildingSurvey && <SignatureBox
                  title="מנהל עבודה"
                  name={report.siteManager}
                  signatureUrl={report.siteManagerSignatureUrl}
                  signedAt={formatSignDate(report.siteManagerSignedAt)}
                />}
                <SignatureBox
                  title={isBuildingSurvey ? 'מאשר סקר בטיחות המבנה' : report.auditorRole || 'ממונה בטיחות'}
                  name={report.auditor || 'שלומי סולטן'}
                  signatureUrl={report.auditorSignatureUrl}
                  stampUrl={report.auditorStampUrl}
                  signedAt={formatSignDate(report.auditorSignedAt)}
                  subtitle={[
                    'סול בטיחות בע״מ',
                    report.auditorRole || 'ממונה בטיחות',
                    isBuildingSurvey && railwayDetails.approverLicenseNumber
                      ? `מ.ר ${railwayDetails.approverLicenseNumber}`
                      : undefined,
                    report.auditorPhone,
                  ].filter(Boolean).join(' · ')}
                />
              </div>
            </section>
          </div>

          <footer className="bg-slate-50 border-t border-slate-200 px-6 sm:px-8 py-4 text-[11px] text-slate-500 flex flex-wrap justify-between gap-2">
            <div>סול בטיחות בע״מ · דוח ביקורת בטיחות</div>
            <div>
              {report.reportNumber} · {report.auditDate || report.date}
            </div>
          </footer>
        </article>
        </div>
      </div>
    </div>
  );
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 border-b border-slate-100 py-1.5">
      <span className="text-slate-500 min-w-[110px] shrink-0">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function SignatureBox({
  title,
  name,
  signatureUrl,
  stampUrl,
  signedAt,
  subtitle,
}: {
  title: string;
  name?: string;
  signatureUrl?: string;
  stampUrl?: string;
  signedAt: string;
  subtitle?: string;
}) {
  return (
    <div className="avoid-break rounded-xl border border-slate-300 bg-slate-50/80 p-4 min-h-[170px] flex flex-col">
      <div className="text-xs text-slate-500 mb-1">{title}</div>
      <div className="font-semibold text-sm mb-2">{name || '____________________'}</div>
      <div className="flex-1 flex items-center justify-center gap-3 border border-dashed border-slate-300 rounded-lg bg-white min-h-[88px] mb-2 px-2">
        {signatureUrl && (
          <img src={signatureUrl} alt={`חתימת ${title}`} className="max-h-20 max-w-[55%] object-contain" />
        )}
        {stampUrl && (
          <img src={stampUrl} alt={`חותמת ${title}`} className="max-h-20 max-w-[40%] object-contain mix-blend-multiply" />
        )}
        {!signatureUrl && !stampUrl && (
          <span className="text-slate-400 text-xs">ממתין לחתימה דיגיטלית</span>
        )}
      </div>
      <div className="text-xs text-slate-500">תאריך: {signedAt}</div>
      {subtitle && <div className="text-[11px] text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );
}

export default SafetyAuditPreview;
