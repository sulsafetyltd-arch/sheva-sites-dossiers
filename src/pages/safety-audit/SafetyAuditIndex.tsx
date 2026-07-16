import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listReports, createReport, deleteReport } from '@/lib/safety-audit-store';
import type { SafetyAuditReport } from '@/types/safety-audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SafetyAuditIndex = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<SafetyAuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteName, setSiteName] = useState('');
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
        siteName: siteName.trim() || 'אתר ללא שם',
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
          <p className="text-sm text-slate-600">מילוי דוח בשטח, צילום ליקויים וייצוא PDF</p>
        </header>

        <section className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
          <h2 className="font-semibold">דוח חדש</h2>
          <Input
            dir="rtl"
            placeholder="שם האתר / כתובת"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
          />
          <Button className="w-full sm:w-auto" onClick={onCreate} disabled={creating}>
            {creating ? 'יוצר…' : 'צור דוח והתחל מילוי'}
          </Button>
        </section>

        {loading && <div className="text-slate-600">טוען…</div>}
        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

        <section className="space-y-2">
          <h2 className="font-semibold text-slate-800">דוחות שמורים במכשיר</h2>
          {reports.length === 0 && !loading && (
            <div className="text-sm text-slate-500">אין דוחות עדיין. צור דוח חדש למעלה.</div>
          )}
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
                <div className="font-medium text-slate-900">{r.siteName || 'ללא שם'}</div>
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
