import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getReport,
  updateReport,
  listDefects,
  createDefect,
  updateDefect,
  deleteDefect,
  addDefectPhoto,
  listDefectPhotos,
  getPublicUrl,
} from '@/lib/safety-audit-store';
import type {
  ChecklistStatus,
  SafetyAuditDefect,
  SafetyAuditDefectPhoto,
  SafetyAuditReport,
} from '@/types/safety-audit';
import { CHECKLIST_TOPICS } from '@/types/safety-audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SafetyAuditEditor = () => {
  const { id } = useParams();
  const [report, setReport] = useState<SafetyAuditReport | null>(null);
  const [defects, setDefects] = useState<SafetyAuditDefect[]>([]);
  const [photosByDefect, setPhotosByDefect] = useState<Record<string, SafetyAuditDefectPhoto[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const r = await getReport(id);
        const d = await listDefects(id);
        setReport(r);
        setDefects(d);
        const map: Record<string, SafetyAuditDefectPhoto[]> = {};
        for (const defect of d) {
          map[defect.id] = await listDefectPhotos(defect.id);
        }
        setPhotosByDefect(map);
      } catch (e: any) {
        setError(e?.message ?? 'שגיאה');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const setChecklist = (key: string, status: ChecklistStatus, notes?: string) => {
    if (!report) return;
    setReport({
      ...report,
      checklist: {
        ...(report.checklist ?? {}),
        [key]: { status, notes },
      },
    });
  };

  const saveBasics = async () => {
    if (!report || !id) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await updateReport(id, {
        siteName: report.siteName,
        contractor: report.contractor,
        auditor: report.auditor,
        attendees: report.attendees,
        siteManager: report.siteManager,
        workHours: report.workHours,
        workersCount: report.workersCount,
        workStage: report.workStage,
        recipient: report.recipient,
        riskLevel: report.riskLevel,
        immediateAction: report.immediateAction,
        executiveSummary: report.executiveSummary,
        checklist: report.checklist,
        auditDate: report.auditDate,
      });
      setReport(saved);
      setMessage('נשמר');
    } catch (e: any) {
      setError(e?.message ?? 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const addDefect = async (topicKey?: string) => {
    if (!id) return;
    try {
      const d = await createDefect(id, {
        checklistTopicKey: topicKey,
        description: topicKey
          ? `ליקוי ב: ${CHECKLIST_TOPICS.find((t) => t.key === topicKey)?.title ?? topicKey}`
          : 'תיאור ליקוי חדש',
        severity: 'medium',
        sortOrder: defects.length,
      });
      setDefects((prev) => [...prev, d]);
      setPhotosByDefect((prev) => ({ ...prev, [d.id]: [] }));
    } catch (e: any) {
      setError(e?.message ?? 'שגיאה בהוספת ליקוי');
    }
  };

  const changeDefect = async (defect: SafetyAuditDefect, field: keyof SafetyAuditDefect, value: any) => {
    try {
      const updated = await updateDefect(defect.id, { [field]: value });
      setDefects((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (e: any) {
      setError(e?.message ?? 'שגיאה בעדכון ליקוי');
    }
  };

  const onUploadPhoto = async (defectId: string, file?: File | null) => {
    if (!file) return;
    try {
      const photo = await addDefectPhoto(defectId, file);
      setPhotosByDefect((prev) => ({
        ...prev,
        [defectId]: [...(prev[defectId] ?? []), photo],
      }));
    } catch (e: any) {
      setError(e?.message ?? 'שגיאה בהעלאת תמונה');
    }
  };

  if (loading) return <div className="p-4" dir="rtl">טוען…</div>;
  if (error && !report) return <div className="p-4 text-red-600" dir="rtl">{error}</div>;
  if (!report) return <div className="p-4" dir="rtl">לא נמצא דוח</div>;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-3xl p-4 space-y-6 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Link to="/safety" className="text-sm text-slate-500 underline">
              ← כל הדוחות
            </Link>
            <h1 className="text-2xl font-bold">{report.siteName || 'ללא שם'}</h1>
            <div className="text-sm text-slate-500">{report.reportNumber}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={saveBasics} disabled={saving}>
              {saving ? 'שומר…' : 'שמירה'}
            </Button>
            <Button asChild>
              <Link to={`/safety/preview/${report.id}`}>תצוגה / PDF</Link>
            </Button>
          </div>
        </div>

        {message && <div className="rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{message}</div>}
        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

        <section className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
          <h2 className="text-lg font-semibold">1. סיכום מנהלים</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              value={report.riskLevel || ''}
              onValueChange={(v) => setReport({ ...report, riskLevel: v as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="דירוג סיכון כולל" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">נמוך</SelectItem>
                <SelectItem value="medium">בינוני</SelectItem>
                <SelectItem value="high">גבוה</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={report.immediateAction ? 'yes' : 'no'}
              onValueChange={(v) => setReport({ ...report, immediateAction: v === 'yes' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="נדרשת פעולה מיידית" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">כן</SelectItem>
                <SelectItem value="no">לא</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            dir="rtl"
            placeholder="מסקנה כללית / תמצית הביקורת"
            value={report.executiveSummary || ''}
            onChange={(e) => setReport({ ...report, executiveSummary: e.target.value })}
          />
        </section>

        <section className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
          <h2 className="text-lg font-semibold">2. פרטי הביקורת</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input dir="rtl" placeholder="לכבוד" value={report.recipient || ''} onChange={(e) => setReport({ ...report, recipient: e.target.value })} />
            <Input dir="rtl" placeholder="שם האתר / כתובת" value={report.siteName || ''} onChange={(e) => setReport({ ...report, siteName: e.target.value })} />
            <Input dir="rtl" placeholder="שם המבצע (הקבלן)" value={report.contractor || ''} onChange={(e) => setReport({ ...report, contractor: e.target.value })} />
            <Input dir="rtl" type="date" value={report.auditDate || ''} onChange={(e) => setReport({ ...report, auditDate: e.target.value })} />
            <Input dir="rtl" placeholder="עורך הביקורת" value={report.auditor || ''} onChange={(e) => setReport({ ...report, auditor: e.target.value })} />
            <Input dir="rtl" placeholder="נוכחים בביקורת" value={report.attendees || ''} onChange={(e) => setReport({ ...report, attendees: e.target.value })} />
            <Input dir="rtl" placeholder="מנהל עבודה באתר" value={report.siteManager || ''} onChange={(e) => setReport({ ...report, siteManager: e.target.value })} />
            <Input dir="rtl" placeholder="שעות העבודה באתר" value={report.workHours || ''} onChange={(e) => setReport({ ...report, workHours: e.target.value })} />
            <Input dir="rtl" type="number" placeholder="מספר עובדים בשטח" value={report.workersCount ?? ''} onChange={(e) => setReport({ ...report, workersCount: e.target.value === '' ? undefined : Number(e.target.value) })} />
            <Input dir="rtl" placeholder="שלב עבודה" value={report.workStage || ''} onChange={(e) => setReport({ ...report, workStage: e.target.value })} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">3. רשימת בדיקה</h2>
          {CHECKLIST_TOPICS.map((t) => {
            const current = (report.checklist ?? {})[t.key] ?? { status: 'na' as ChecklistStatus, notes: '' };
            return (
              <div key={t.key} className="rounded-xl border bg-white p-4 space-y-2 shadow-sm">
                <div className="font-medium">{t.title}</div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={current.status === 'ok' ? 'default' : 'secondary'} onClick={() => setChecklist(t.key, 'ok', current.notes)}>
                    תקין
                  </Button>
                  <Button
                    size="sm"
                    variant={current.status === 'not_ok' ? 'destructive' : 'secondary'}
                    onClick={() => {
                      setChecklist(t.key, 'not_ok', current.notes);
                      if (!defects.some((d) => d.checklistTopicKey === t.key)) {
                        void addDefect(t.key);
                      }
                    }}
                  >
                    לא תקין
                  </Button>
                  <Button size="sm" variant={current.status === 'na' ? 'default' : 'secondary'} onClick={() => setChecklist(t.key, 'na', current.notes)}>
                    לא רלוונטי
                  </Button>
                </div>
                <Textarea
                  dir="rtl"
                  placeholder="הערות"
                  value={current.notes ?? ''}
                  onChange={(e) => setChecklist(t.key, current.status, e.target.value)}
                />
              </div>
            );
          })}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">4. ליקויים ופעולות מתקנות</h2>
            <Button size="sm" onClick={() => addDefect()}>
              הוסף ליקוי
            </Button>
          </div>
          {defects.map((d, idx) => (
            <div key={d.id} className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
              <div className="text-sm text-slate-500">ליקוי #{idx + 1}</div>
              <Textarea
                dir="rtl"
                value={d.description}
                onChange={(e) => changeDefect(d, 'description', e.target.value)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Select value={d.severity} onValueChange={(v) => changeDefect(d, 'severity', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="דרגת חומרה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">גבוהה</SelectItem>
                    <SelectItem value="medium">בינונית</SelectItem>
                    <SelectItem value="low">נמוכה</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  dir="rtl"
                  type="date"
                  value={d.dueDate || ''}
                  onChange={(e) => changeDefect(d, 'dueDate', e.target.value)}
                />
                <Input
                  dir="rtl"
                  placeholder="פעולה מתקנת נדרשת"
                  value={d.correctiveAction || ''}
                  onChange={(e) => changeDefect(d, 'correctiveAction', e.target.value)}
                />
                <Input
                  dir="rtl"
                  placeholder="אחראי לביצוע"
                  value={d.responsible || ''}
                  onChange={(e) => changeDefect(d, 'responsible', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">צילומי ליקוי</div>
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    void onUploadPhoto(d.id, e.target.files?.[0]);
                    e.currentTarget.value = '';
                  }}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(photosByDefect[d.id] ?? []).map((p) => (
                    <figure key={p.id} className="space-y-1">
                      <img
                        src={getPublicUrl(p.storagePath)}
                        alt={p.caption || d.description}
                        className="h-28 w-full object-cover rounded-lg border"
                      />
                      <figcaption className="text-xs text-slate-500 truncate">{p.caption || 'תמונה'}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>

              <Button size="sm" variant="ghost" onClick={() => deleteDefect(d.id).then(() => setDefects((prev) => prev.filter((x) => x.id !== d.id)))}>
                מחק ליקוי
              </Button>
            </div>
          ))}
        </section>

        <div className="fixed bottom-0 inset-x-0 border-t bg-white/95 backdrop-blur p-3 flex gap-2 justify-center sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <Button className="flex-1 sm:flex-none" variant="secondary" onClick={saveBasics} disabled={saving}>
            שמירה
          </Button>
          <Button className="flex-1 sm:flex-none" asChild>
            <Link to={`/safety/preview/${report.id}`}>תצוגה / PDF</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SafetyAuditEditor;
