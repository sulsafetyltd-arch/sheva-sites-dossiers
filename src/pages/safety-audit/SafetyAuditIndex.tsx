import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listReports, createReport } from '@/lib/safety-audit-store';
import type { SafetyAuditReport } from '@/types/safety-audit';
import { Button } from '@/components/ui/button';

const SafetyAuditIndex = () => {
  const [reports, setReports] = useState<SafetyAuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const items = await listReports();
        setReports(items);
      } catch (e: any) {
        setError(e.message ?? 'Error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onCreate = async () => {
    const siteName = prompt('שם האתר / כתובת?') || 'אתר ללא שם';
    try {
      const report = await createReport({ siteName, status: 'draft' });
      window.location.assign(`/safety/editor/${report.id}`);
    } catch (e: any) {
      alert(e.message ?? 'שגיאה ביצירת דוח');
    }
  };

  return (
    <div dir="rtl" className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">דוחות ביקורת בטיחות</h1>
        <Button onClick={onCreate}>דוח חדש</Button>
      </div>
      {loading && <div>טוען…</div>}
      {error && <div className="text-red-600">{error}</div>}
      <ul className="space-y-2">
        {reports.map((r) => (
          <li key={r.id} className="border rounded p-3 flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">{r.siteName || 'ללא שם'}</div>
              <div className="text-sm text-muted-foreground">
                מספר דוח: {r.reportNumber || '—'} · סטטוס: {r.status} · תאריך: {r.date}
              </div>
            </div>
            <div className="flex gap-2">
              <Link className="underline" to={`/safety/editor/${r.id}`}>עריכה</Link>
              <Link className="underline" to={`/safety/preview/${r.id}`}>תצוגה</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SafetyAuditIndex;

