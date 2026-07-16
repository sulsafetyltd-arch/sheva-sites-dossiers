import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createReport,
  deleteReport,
  getClient,
  listReportsByClient,
  updateClient,
} from '@/lib/safety-audit-store';
import type { ReportType, SafetyAuditClient, SafetyAuditReport } from '@/types/safety-audit';
import { reportTypeLabel } from '@/types/safety-audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Building2, Mail, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react';

export default function SafetyClientReports() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<SafetyAuditClient | null>(null);
  const [reports, setReports] = useState<SafetyAuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewReport, setShowNewReport] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('workplace');
  const [siteName, setSiteName] = useState('');

  const refresh = async () => {
    if (!clientId) return;
    try {
      const [clientItem, reportItems] = await Promise.all([
        getClient(clientId),
        listReportsByClient(clientId),
      ]);
      setClient(clientItem);
      setReports(reportItems);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'טעינת הלקוח נכשלה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [clientId]);

  const create = async () => {
    if (!client || !clientId) return;
    try {
      const report = await createReport({
        clientId,
        reportType,
        recipient: client.name,
        siteName: siteName.trim() || client.address || 'אתר ללא שם',
        projectName: reportType === 'construction' ? siteName.trim() || undefined : undefined,
        contractor: reportType === 'workplace' ? client.name : undefined,
        status: 'draft',
      });
      navigate(`/safety/editor/${report.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'יצירת הדוח נכשלה');
    }
  };

  const removeReport = async (report: SafetyAuditReport) => {
    if (!confirm(`למחוק את הדוח ${report.reportNumber}?`)) return;
    await deleteReport(report.id);
    await refresh();
  };

  const saveClient = async () => {
    if (!client) return;
    try {
      const updated = await updateClient(client.id, client);
      setClient(updated);
      setShowEdit(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'שמירת הלקוח נכשלה');
    }
  };

  if (loading) return <div dir="rtl" className="p-6">טוען…</div>;
  if (!client) {
    return (
      <div dir="rtl" className="p-6">
        <div>הלקוח לא נמצא.</div>
        <Link to="/safety" className="underline">חזרה ללקוחות</Link>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-3xl p-4 space-y-5">
        <Link to="/safety" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowRight className="w-4 h-4" /> כל הלקוחות
        </Link>

        <header className="rounded-2xl bg-[#0f2744] text-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-[#f4c95d] text-[#0f2744] flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold truncate">{client.name}</h1>
                <div className="text-sm text-slate-300 mt-1">{reports.length} דוחות משויכים</div>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setShowEdit((value) => !value)}>
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300 mt-4">
            {client.contactName && <span>{client.contactName}</span>}
            {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
            {client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>}
            {client.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{client.address}</span>}
          </div>
        </header>

        {showEdit && (
          <section className="rounded-xl border bg-white p-4 space-y-3">
            <h2 className="font-semibold">עריכת פרטי לקוח</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} placeholder="שם הלקוח" />
              <Input value={client.contactName || ''} onChange={(e) => setClient({ ...client, contactName: e.target.value })} placeholder="איש קשר" />
              <Input value={client.phone || ''} onChange={(e) => setClient({ ...client, phone: e.target.value })} placeholder="טלפון" />
              <Input value={client.email || ''} onChange={(e) => setClient({ ...client, email: e.target.value })} placeholder="דוא״ל" />
              <Input className="sm:col-span-2" value={client.address || ''} onChange={(e) => setClient({ ...client, address: e.target.value })} placeholder="כתובת" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void saveClient()}>שמור</Button>
              <Button variant="ghost" onClick={() => setShowEdit(false)}>ביטול</Button>
            </div>
          </section>
        )}

        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">דוחות הלקוח</h2>
          <Button onClick={() => setShowNewReport((value) => !value)} className="gap-1">
            <Plus className="w-4 h-4" /> דוח חדש
          </Button>
        </div>

        {showNewReport && (
          <section className="rounded-xl border-2 border-slate-900 bg-white p-4 space-y-4">
            <h3 className="font-semibold">יצירת דוח עבור {client.name}</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['workplace', 'construction'] as ReportType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setReportType(type)}
                  className={`rounded-xl border p-3 text-right ${
                    reportType === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50'
                  }`}
                >
                  <div className="font-semibold">{reportTypeLabel(type)}</div>
                  <div className={`text-xs mt-1 ${reportType === type ? 'text-slate-300' : 'text-slate-500'}`}>
                    {type === 'construction' ? '26 בדיקות בנייה' : '10 בדיקות עבודה'}
                  </div>
                </button>
              ))}
            </div>
            <Input
              placeholder={reportType === 'construction' ? 'שם הפרויקט / אתר הבנייה' : 'שם האתר / כתובת'}
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={() => void create()} disabled={!siteName.trim()}>צור דוח והתחל</Button>
              <Button variant="ghost" onClick={() => setShowNewReport(false)}>ביטול</Button>
            </div>
          </section>
        )}

        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

        {reports.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-white p-8 text-center">
            <div className="font-medium">אין עדיין דוחות ללקוח זה</div>
            <div className="text-sm text-slate-500 mt-1">לחץ „דוח חדש” כדי להתחיל.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div key={report.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs rounded-full px-2 py-0.5 ${report.reportType === 'construction' ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-900'}`}>
                        {reportTypeLabel(report.reportType)}
                      </span>
                      <span className="font-medium">{report.siteName || report.projectName}</span>
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {report.reportNumber} · {report.auditDate || report.date}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="text-slate-400 hover:text-red-600" onClick={() => void removeReport(report)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button asChild size="sm"><Link to={`/safety/editor/${report.id}`}>עריכה</Link></Button>
                  <Button asChild size="sm" variant="secondary"><Link to={`/safety/preview/${report.id}`}>תצוגה / PDF</Link></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
