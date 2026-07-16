import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getReport, listDefects } from '@/lib/safety-audit-store';
import type { SafetyAuditDefect, SafetyAuditReport } from '@/types/safety-audit';
import { Button } from '@/components/ui/button';
import { exportNodeToPdf } from '@/lib/pdf-export';

const SafetyAuditPreview = () => {
  const { id } = useParams();
  const [report, setReport] = useState<SafetyAuditReport | null>(null);
  const [defects, setDefects] = useState<SafetyAuditDefect[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const r = await getReport(id);
      const d = await listDefects(id);
      setReport(r);
      setDefects(d);
    })();
  }, [id]);

  const onExport = async () => {
    const el = document.getElementById('printable');
    if (el) {
      await exportNodeToPdf(el, `דוח-ביקורת-בטיחות-${report?.reportNumber || 'ללא-מספר'}.pdf`);
    }
  };

  if (!report) return <div className="p-4" dir="rtl">טוען…</div>;
  return (
    <div dir="rtl" className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">תצוגת דוח</h1>
        <Button onClick={onExport}>ייצוא PDF</Button>
      </div>
      <div id="printable" className="bg-white text-black p-6 border shadow print:p-0">
        <h2 className="text-xl font-semibold mb-2">הנדון: דו״ח ביקורת בטיחות באתר העבודה</h2>
        <h3 className="font-semibold mt-4">1. סיכום מנהלים</h3>
        <div className="text-sm">
          דירוג סיכון: {report.riskLevel || '—'} · פעולה מיידית: {report.immediateAction ? 'כן' : 'לא'}
        </div>
        <div className="mt-2 whitespace-pre-wrap">{report.executiveSummary || ''}</div>
        <h3 className="font-semibold mt-4">2. פרטי הביקורת</h3>
        <div className="grid grid-cols-2 gap-1 text-sm">
          <div>שם האתר / כתובת: {report.siteName || '—'}</div>
          <div>שם המבצע (הקבלן): {report.contractor || '—'}</div>
          <div>עורך הביקורת: {report.auditor || '—'}</div>
          <div>נוכחים בביקורת: {report.attendees || '—'}</div>
          <div>מנהל עבודה באתר: {report.siteManager || '—'}</div>
          <div>שעות העבודה באתר: {report.workHours || '—'}</div>
          <div>מספר עובדים בשטח: {report.workersCount ?? '—'}</div>
          <div>שלב עבודה: {report.workStage || '—'}</div>
        </div>
        <h3 className="font-semibold mt-4">4. ליקויים, מפגעים ופעולות מתקנות</h3>
        <table className="w-full text-sm border mt-2">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-1">#</th>
              <th className="border p-1">תיאור הליקוי / המפגע</th>
              <th className="border p-1">דרגת חומרה</th>
              <th className="border p-1">פעולה מתקנת</th>
              <th className="border p-1">אחראי</th>
              <th className="border p-1">תאריך יעד</th>
            </tr>
          </thead>
          <tbody>
            {defects.map((d, idx) => (
              <tr key={d.id}>
                <td className="border p-1">{idx + 1}</td>
                <td className="border p-1">{d.description}</td>
                <td className="border p-1">{d.severity}</td>
                <td className="border p-1">{d.correctiveAction || '—'}</td>
                <td className="border p-1">{d.responsible || '—'}</td>
                <td className="border p-1">{d.dueDate || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 text-xs text-gray-700">
          5. אסמכתאות חוקיות עיקריות — לפי הרשימה הקבועה בדוח.
        </div>
        <div className="mt-4 text-xs text-gray-700">
          6. הערות כלליות, הצהרה והגבלת אחריות — לפי הנוסח הקבוע.
        </div>
        <div className="mt-6">
          חתימת מנהל עבודה: ____________________ · תאריך: ____________
        </div>
      </div>
    </div>
  );
};

export default SafetyAuditPreview;

