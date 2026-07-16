import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listReports, createReport, deleteReport } from '@/lib/safety-audit-store';
import type { ReportType, SafetyAuditReport } from '@/types/safety-audit';
import { reportTypeLabel } from '@/types/safety-audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SafetyAuditIndex = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<SafetyAuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteName, setSiteName] = useState('');
  const [reportType, setReportType] = useState<ReportType>('workplace');
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    try {
      const items = await listReports();
      setReports(items);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'שגיאה בטעינת דוחות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onCreate = async () => {
    setCreating(true);
    try {
      const report = await createReport({
        reportType,
        siteName: siteName.trim() || 'אתר ללא שם',
        projectName: reportType === 'construction' ? siteName.trim() || undefined : undefined,
        status: 'draft',
      });
      setSiteName('');
      navigate(`/safety/editor/${report.id}`);
    } catch (e: any) {
      setError(e?.message ?? 'שגיאה ביצירת דוח');
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('למחוק את הדוח?')) return;
    await deleteReport(id);
    await refresh();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-3xl p-4 space-y-6">
        <header className="space-y-1 pt-2">
          <p className="text-sm text-slate-500">סול בטיחות בע״מ</p>
          <h1 className="text-2xl font-bold text-slate-900">דוחות ביקורת בטיחות</h1>
          <p className="text-sm text-slate-600">אתרי עבודה ואתרי בנייה · צילום ליקויים · ייצוא PDF</p>
        </header>

        <section className="rounded-xl border bg-white p-4 space-y-4 shadow-sm">
          <h2 className="font-semibold">דוח חדש</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setReportType('workplace')}
              className={`rounded-xl border p-4 text-right transition ${
                reportType === 'workplace'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-400'
              }`}
            >
              <div className="font-semibold">אתר עבודה</div>
              <div className={`text-sm mt-1 ${reportType === 'workplace' ? 'text-slate-200' : 'text-slate-500'}`}>
                צ׳קליסט 10 נושאים · סיכום מנהלים · ליקויים
              </div>
            </button>
            <button
              type="button"
              onClick={() => setReportType('construction')}
              className={`rounded-xl border p-4 text-right transition ${
                reportType === 'construction'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-400'
              }`}
            >
              <div className="font-semibold">אתר בנייה</div>
              <div className={`text-sm mt-1 ${reportType === 'construction' ? 'text-slate-200' : 'text-slate-500'}`}>
                צ׳קליסט 26 סעיפים · פיגומים · עגורן · פירים
              </div>
            </button>
          </div>

          <Input
            dir="rtl"
            placeholder={reportType === 'construction' ? 'שם הפרויקט / האתר' : 'שם האתר / כתובת'}
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
          />
          <Button className="w-full sm:w-auto" onClick={onCreate} disabled={creating}>
            {creating ? 'יוצר…' : `צור דוח ${reportTypeLabel(reportType)}`}
          </Button>
        </section>

        {loading && <div className="text-slate-600">טוען…</div>}
        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

        <section className="space-y-2">
          <h2 className="font-semibold text-slate-800">דוחות שמורים במכשיר</h2>
          {reports.length === 0 && !loading && (
            <div className="text-sm text-slate-500">אין דוחות עדיין. בחר סוג דוח וצור חדש למעלה.</div>
          )}
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 ${
                      r.reportType === 'construction'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-sky-100 text-sky-900'
                    }`}
                  >
                    {reportTypeLabel(r.reportType)}
                  </span>
                  <div className="font-medium text-slate-900">{r.siteName || r.projectName || 'ללא שם'}</div>
                </div>
                <div className="text-sm text-slate-500">
                  {r.reportNumber || '—'} · {r.status === 'final' ? 'סופי' : 'טיוטה'} · {r.date}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button asChild size="sm">
                    <Link to={`/safety/editor/${r.id}`}>עריכה</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link to={`/safety/preview/${r.id}`}>תצוגה / PDF</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(r.id)}>
                    מחק
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default SafetyAuditIndex;
