import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getReport, listDefects, listReportPhotos, getPublicUrl } from '@/lib/safety-audit-store';
import type { SafetyAuditDefect, SafetyAuditReport } from '@/types/safety-audit';
import {
  CONSTRUCTION_GENERAL_NOTES,
  getChecklistTopics,
  reportTypeLabel,
} from '@/types/safety-audit';
import { Button } from '@/components/ui/button';
import { exportToPdf } from '@/lib/pdf-export';

const severityLabel: Record<string, string> = {
  high: 'גבוהה',
  medium: 'בינונית',
  low: 'נמוכה',
};

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
};

const PhotoThumb = ({ src, alt }: { src: string; alt: string }) => (
  <img
    src={src}
    alt={alt}
    className="h-20 w-28 object-cover rounded border border-slate-200 bg-slate-50"
  />
);

const SafetyAuditPreview = () => {
  const { id } = useParams();
  const [report, setReport] = useState<SafetyAuditReport | null>(null);
  const [defects, setDefects] = useState<SafetyAuditDefect[]>([]);
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const r = await getReport(id);
      const d = await listDefects(id);
      const p = await listReportPhotos(id);
      setReport(r);
      setDefects(d);
      setPhotos(p);
    })();
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
    } finally {
      setExporting(false);
    }
  };

  if (!report) return <div className="p-4" dir="rtl">טוען…</div>;

  const isConstruction = report.reportType === 'construction';
  const topics = getChecklistTopics(report.reportType);
  const siteTitle = report.projectName || report.siteName || '—';

  const statusMark = (key: string, want: 'ok' | 'not_ok' | 'na') => {
    const s = report.checklist?.[key]?.status;
    return s === want ? '☑' : '☐';
  };

  const formatSignDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('he-IL') : report.auditDate || report.date || '—';

  return (
    <div dir="rtl" className="min-h-screen bg-[#e8edf2]">
      <div className="container mx-auto max-w-[920px] p-3 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="space-y-1">
            <Link to={`/safety/editor/${report.id}`} className="text-sm underline text-slate-600">
              ← חזרה לעריכה
            </Link>
            <h1 className="text-xl font-bold text-slate-800">תצוגה לשליחה ללקוח</h1>
          </div>
          <Button onClick={onExport} disabled={exporting} className="min-w-[140px]">
            {exporting ? 'מייצא PDF…' : 'ייצוא PDF'}
          </Button>
        </div>

        <article
          id="printable"
          className="bg-white text-slate-900 shadow-lg print:shadow-none overflow-hidden"
          style={{ fontFamily: 'Heebo, Arial, sans-serif' }}
        >
          {/* Letterhead */}
          <header className="bg-[#0f2744] text-white px-6 sm:px-8 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs tracking-[0.2em] text-slate-300 mb-1">סול בטיחות בע״מ</div>
                <h2 className="text-xl sm:text-2xl font-bold leading-snug">
                  {isConstruction
                    ? 'דו״ח ביקורת בטיחות — אתר בנייה'
                    : 'דו״ח ביקורת בטיחות — אתר עבודה'}
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

            {!isConstruction && (
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
                {isConstruction ? 'פרטי הביקורת' : '2. פרטי הביקורת'}
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
              {isConstruction && report.workStagesDetail && (
                <div className="mt-3 rounded-lg border border-slate-200 p-3 bg-slate-50">
                  <div className="text-xs text-slate-500 mb-1">שלבי עבודה</div>
                  <div className="whitespace-pre-wrap">{report.workStagesDetail}</div>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">
                {isConstruction ? 'ממצאי הביקורת' : '3. רשימת בדיקה'}
              </h3>

              {isConstruction ? (
                <div className="overflow-x-auto rounded-lg border border-slate-300">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#0f2744] text-white">
                        <th className="border border-slate-600 p-2 w-8">#</th>
                        <th className="border border-slate-600 p-2">פרק</th>
                        <th className="border border-slate-600 p-2 text-right">מהות הבדיקה</th>
                        <th className="border border-slate-600 p-2 w-12">תקין</th>
                        <th className="border border-slate-600 p-2 w-14">לא תקין</th>
                        <th className="border border-slate-600 p-2 text-right">ממצאים והמלצות</th>
                        <th className="border border-slate-600 p-2">אחראי</th>
                        <th className="border border-slate-600 p-2 w-[120px]">תיעוד צילומי</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topics.map((t, idx) => {
                        const item = report.checklist?.[t.key];
                        const rowPhotos = photosByTopic[t.key] ?? [];
                        const notOk = item?.status === 'not_ok';
                        return (
                          <tr key={t.key} className={notOk ? 'bg-red-50/70' : idx % 2 ? 'bg-slate-50' : 'bg-white'}>
                            <td className="border border-slate-200 p-2 text-center align-top">{idx + 1}</td>
                            <td className="border border-slate-200 p-2 align-top whitespace-nowrap">{t.chapter}</td>
                            <td className="border border-slate-200 p-2 align-top font-medium">{t.title}</td>
                            <td className="border border-slate-200 p-2 text-center align-top">{statusMark(t.key, 'ok')}</td>
                            <td className="border border-slate-200 p-2 text-center align-top">{statusMark(t.key, 'not_ok')}</td>
                            <td className="border border-slate-200 p-2 align-top">
                              <div>{item?.findings || ''}</div>
                              {item?.notes ? <div className="text-slate-500 mt-1">{item.notes}</div> : null}
                            </td>
                            <td className="border border-slate-200 p-2 align-top">{item?.responsible || ''}</td>
                            <td className="border border-slate-200 p-1.5 align-top">
                              {rowPhotos.length === 0 ? (
                                <span className="text-slate-400">—</span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {rowPhotos.map((p) => (
                                    <PhotoThumb key={p.id} src={getPublicUrl(p.storagePath)} alt={t.title} />
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-300">
                  <table className="w-full border-collapse text-xs">
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
                          <td className="border border-slate-200 p-2">{t.title}</td>
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

            {!isConstruction && (
              <section>
                <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">
                  4. ליקויים, מפגעים ופעולות מתקנות
                </h3>
                <div className="overflow-x-auto rounded-lg border border-slate-300">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#0f2744] text-white">
                        <th className="border border-slate-600 p-2 w-8">#</th>
                        <th className="border border-slate-600 p-2 text-right">תיאור הליקוי</th>
                        <th className="border border-slate-600 p-2">חומרה</th>
                        <th className="border border-slate-600 p-2 text-right">פעולה מתקנת</th>
                        <th className="border border-slate-600 p-2">אחראי</th>
                        <th className="border border-slate-600 p-2">יעד</th>
                        <th className="border border-slate-600 p-2 w-[130px]">תיעוד צילומי</th>
                      </tr>
                    </thead>
                    <tbody>
                      {defects.length === 0 && (
                        <tr>
                          <td className="border border-slate-200 p-3 text-center text-slate-500" colSpan={7}>
                            לא תועדו ליקויים
                          </td>
                        </tr>
                      )}
                      {defects.map((d, idx) => {
                        const rowPhotos = photosByDefect[d.id] ?? [];
                        return (
                          <tr key={d.id} className={idx % 2 ? 'bg-slate-50' : 'bg-white'}>
                            <td className="border border-slate-200 p-2 text-center align-top">{idx + 1}</td>
                            <td className="border border-slate-200 p-2 align-top">{d.description}</td>
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
                                {severityLabel[d.severity] || d.severity}
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
                                  {rowPhotos.map((p) => (
                                    <PhotoThumb key={p.id} src={getPublicUrl(p.storagePath)} alt={d.description} />
                                  ))}
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
                    .filter((d) => !d.checklistTopicKey || (photosByDefect[d.id]?.length ?? 0) > 0)
                    .map((d, idx) => (
                      <div key={d.id} className="rounded-lg border border-slate-200 p-3 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="text-xs text-slate-500">ליקוי #{idx + 1}</div>
                          <div className="font-medium">{d.description}</div>
                          <div className="text-slate-600">{d.correctiveAction}</div>
                          <div className="text-xs text-slate-500">
                            חומרה: {severityLabel[d.severity]} · אחראי: {d.responsible || '—'}
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
            ) : (
              <section className="text-xs space-y-2 text-slate-700">
                <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">
                  אסמכתאות והצהרה
                </h3>
                <p>
                  הדו״ח משקף את מצב האתר במועד הביקורת בלבד, על סמך הנראה לעין ולפי המידע שנמסר לעורך.
                  ליקויים בדרגת חומרה ״גבוהה״ מחייבים טיפול מיידי.
                </p>
              </section>
            )}

            {/* Signatures */}
            <section className="pt-2">
              <h3 className="text-base font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-4">
                חתימות
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <SignatureBox
                  title="מנהל עבודה"
                  name={report.siteManager}
                  signatureUrl={report.siteManagerSignatureUrl}
                  signedAt={formatSignDate(report.siteManagerSignedAt)}
                />
                <SignatureBox
                  title="ממונה בטיחות"
                  name={report.auditor || 'שלומי סולטן'}
                  signatureUrl={report.auditorSignatureUrl}
                  signedAt={formatSignDate(report.auditorSignedAt)}
                  subtitle="סול בטיחות בע״מ · מ.ר 26352"
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
  signedAt,
  subtitle,
}: {
  title: string;
  name?: string;
  signatureUrl?: string;
  signedAt: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50/80 p-4 min-h-[170px] flex flex-col">
      <div className="text-xs text-slate-500 mb-1">{title}</div>
      <div className="font-semibold text-sm mb-2">{name || '____________________'}</div>
      <div className="flex-1 flex items-center justify-center border border-dashed border-slate-300 rounded-lg bg-white min-h-[88px] mb-2">
        {signatureUrl ? (
          <img src={signatureUrl} alt={`חתימת ${title}`} className="max-h-20 max-w-full object-contain" />
        ) : (
          <span className="text-slate-400 text-xs">ממתין לחתימה דיגיטלית</span>
        )}
      </div>
      <div className="text-xs text-slate-500">תאריך: {signedAt}</div>
      {subtitle && <div className="text-[11px] text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );
}

export default SafetyAuditPreview;
