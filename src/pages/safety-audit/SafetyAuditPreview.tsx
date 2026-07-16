import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getReport, listDefects, listReportPhotos } from '@/lib/safety-audit-store';
import type { SafetyAuditDefect, SafetyAuditReport } from '@/types/safety-audit';
import { CHECKLIST_TOPICS } from '@/types/safety-audit';
import { Button } from '@/components/ui/button';
import { exportToPdf } from '@/lib/pdf-export';
import { getPublicUrl } from '@/lib/safety-audit-store';

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

const SafetyAuditPreview = () => {
  const { id } = useParams();
  const [report, setReport] = useState<SafetyAuditReport | null>(null);
  const [defects, setDefects] = useState<SafetyAuditDefect[]>([]);
  const [photos, setPhotos] = useState<
    Array<{ id: string; storagePath: string; caption?: string; defectDescription: string; severity: string }>
  >([]);
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

  const statusMark = (key: string, want: 'ok' | 'not_ok' | 'na') => {
    const s = report.checklist?.[key]?.status;
    return s === want ? '☑' : '☐';
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100">
      <div className="container mx-auto max-w-4xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <Link to={`/safety/editor/${report.id}`} className="text-sm underline text-slate-600">
              ← חזרה לעריכה
            </Link>
            <h1 className="text-2xl font-bold">תצוגת דוח</h1>
          </div>
          <Button onClick={onExport} disabled={exporting}>
            {exporting ? 'מייצא…' : 'ייצוא PDF'}
          </Button>
        </div>

        <div id="printable" className="bg-white text-black p-6 shadow print:shadow-none space-y-5 text-sm leading-relaxed">
          <div className="flex justify-between gap-4 border-b pb-3">
            <div>
              <div className="font-bold text-base">סול בטיחות בע״מ</div>
              <div>שלומי סולטן · ממונה בטיחות מ.ר 26352</div>
            </div>
            <div className="text-left">
              <div>מס׳ דו״ח: {report.reportNumber || '________'}</div>
              <div>תאריך: {report.date || '________'}</div>
            </div>
          </div>

          <div>
            <div>לכבוד: {report.recipient || '______________________________'}</div>
            <h2 className="text-lg font-bold mt-3">הנדון: דו״ח ביקורת בטיחות באתר העבודה</h2>
          </div>

          <section>
            <h3 className="font-bold text-base mb-2">1. סיכום מנהלים</h3>
            <div>
              דירוג סיכון כולל:{' '}
              {(['low', 'medium', 'high'] as const).map((k) => (
                <span key={k} className="ml-3">
                  {report.riskLevel === k ? '☑' : '☐'} {riskLabel[k]}
                </span>
              ))}
            </div>
            <div className="mt-1">
              נדרשת פעולה מיידית: {report.immediateAction ? '☑ כן ☐ לא' : '☐ כן ☑ לא'}
            </div>
            <div className="mt-2 whitespace-pre-wrap border p-2 min-h-[60px]">
              {report.executiveSummary || ''}
            </div>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">2. פרטי הביקורת</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              <div>שם האתר / כתובת: {report.siteName || '—'}</div>
              <div>שם המבצע (הקבלן): {report.contractor || '—'}</div>
              <div>תאריך הביקורת: {report.auditDate || '—'}</div>
              <div>עורך הביקורת: {report.auditor || '—'}</div>
              <div>נוכחים בביקורת: {report.attendees || '—'}</div>
              <div>מנהל עבודה באתר: {report.siteManager || '—'}</div>
              <div>שעות העבודה באתר: {report.workHours || '—'}</div>
              <div>מספר עובדים בשטח: {report.workersCount ?? '—'}</div>
              <div>שלב עבודה: {report.workStage || '—'}</div>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">3. ממצאי הביקורת — רשימת בדיקה</h3>
            <table className="w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border p-1 text-right">נושא הבדיקה</th>
                  <th className="border p-1">תקין</th>
                  <th className="border p-1">לא תקין</th>
                  <th className="border p-1">לא רלוונטי</th>
                  <th className="border p-1 text-right">הערות</th>
                </tr>
              </thead>
              <tbody>
                {CHECKLIST_TOPICS.map((t) => (
                  <tr key={t.key}>
                    <td className="border p-1">{t.title}</td>
                    <td className="border p-1 text-center">{statusMark(t.key, 'ok')}</td>
                    <td className="border p-1 text-center">{statusMark(t.key, 'not_ok')}</td>
                    <td className="border p-1 text-center">{statusMark(t.key, 'na')}</td>
                    <td className="border p-1">{report.checklist?.[t.key]?.notes || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">4. ליקויים, מפגעים ופעולות מתקנות</h3>
            <table className="w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border p-1">#</th>
                  <th className="border p-1 text-right">תיאור הליקוי / המפגע</th>
                  <th className="border p-1">דרגת חומרה</th>
                  <th className="border p-1 text-right">פעולה מתקנת</th>
                  <th className="border p-1">אחראי</th>
                  <th className="border p-1">תאריך יעד</th>
                </tr>
              </thead>
              <tbody>
                {defects.length === 0 && (
                  <tr>
                    <td className="border p-2 text-center" colSpan={6}>
                      לא תועדו ליקויים
                    </td>
                  </tr>
                )}
                {defects.map((d, idx) => (
                  <tr key={d.id}>
                    <td className="border p-1 text-center">{idx + 1}</td>
                    <td className="border p-1">{d.description}</td>
                    <td className="border p-1 text-center">{severityLabel[d.severity] || d.severity}</td>
                    <td className="border p-1">{d.correctiveAction || '—'}</td>
                    <td className="border p-1">{d.responsible || '—'}</td>
                    <td className="border p-1">{d.dueDate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="text-xs space-y-1">
            <h3 className="font-bold text-sm">5. אסמכתאות חוקיות עיקריות</h3>
            <ol className="list-decimal pr-5 space-y-0.5">
              <li>פקודת הבטיחות בעבודה [נוסח חדש], התש״ל-1970.</li>
              <li>תקנות הבטיחות בעבודה (עבודות בנייה), התשמ״ח-1988.</li>
              <li>תקנות הבטיחות בעבודה (ציוד מגן אישי), התשנ״ז-1997.</li>
              <li>תקנות ארגון הפיקוח על העבודה (מסירת מידע והדרכת עובדים), התשנ״ט-1999.</li>
              <li>תקנות הבטיחות בעבודה (עבודה בגובה), התשס״ז-2007.</li>
              <li>תקנות הבטיחות בעבודה (חשמל), התש״ן-1990.</li>
            </ol>
          </section>

          <section className="text-xs space-y-1">
            <h3 className="font-bold text-sm">6. הערות כלליות, הצהרה והגבלת אחריות</h3>
            <p>1. על הקבלן לוודא כי כלל העובדים חותמים על תמצית סיכונים ועל קבלת הדרכת בטיחות ספציפית לסוג העבודה, בשפה המובנת להם.</p>
            <p>2. על הקבלן לוודא כי כלל העבודות בפרויקט מתבצעות בהתאם לחוקים, לתקנות, לתקנים ולנהלי הבטיחות.</p>
            <p>3. ליקויים בדרגת חומרה ״גבוהה״ מחייבים טיפול מיידי והפסקת העבודה באזור הרלוונטי עד להסרת הסיכון.</p>
            <p>4. דו״ח זה משקף את מצב האתר במועד הביקורת בלבד, על סמך הנראה לעין ולפי המידע שנמסר לעורך.</p>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">7. נספח א׳ — תיעוד צילומי מהאתר</h3>
            {photos.length === 0 ? (
              <div className="text-slate-500">לא צורפו תמונות.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {photos.map((p, i) => (
                  <figure key={p.id} className="border p-2 space-y-1 break-inside-avoid">
                    <img src={getPublicUrl(p.storagePath)} alt={p.caption || p.defectDescription} className="w-full max-h-56 object-contain bg-slate-50" />
                    <figcaption className="text-xs">
                      תמונה {i + 1}: {p.defectDescription}
                      {p.caption ? ` — ${p.caption}` : ''} ({severityLabel[p.severity] || p.severity})
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>

          <div className="pt-6 space-y-3 text-sm">
            <div>חתימת מנהל עבודה: ____________________ תאריך: ____________</div>
            <div className="pt-2">
              בברכה,
              <br />
              שלומי סולטן
              <br />
              ממונה בטיחות, מ.ר 26352
              <br />
              סול בטיחות בע״מ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyAuditPreview;
