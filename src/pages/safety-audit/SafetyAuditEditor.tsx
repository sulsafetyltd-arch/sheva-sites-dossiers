import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getReport,
  updateReport,
  listDefects,
  createDefect,
  updateDefect,
} from '@/lib/safety-audit-store';
import type { ChecklistStatus, SafetyAuditDefect, SafetyAuditReport } from '@/types/safety-audit';
import { CHECKLIST_TOPICS } from '@/types/safety-audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SafetyAuditEditor = () => {
  const { id } = useParams();
  const [report, setReport] = useState<SafetyAuditReport | null>(null);
  const [defects, setDefects] = useState<SafetyAuditDefect[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const r = await getReport(id);
        const d = await listDefects(id);
        setReport(r);
        setDefects(d);
      } catch (e: any) {
        setError(e.message ?? 'Error');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const checklist = useMemo(() => report?.checklist ?? {}, [report]);

  const setChecklist = (key: string, status: ChecklistStatus, notes?: string) => {
    if (!report) return;
    const updated = {
      ...(report.checklist ?? {}),
      [key]: { status, notes },
    };
    setReport({ ...report, checklist: updated });
  };

  const saveBasics = async () => {
    if (!report || !id) return;
    setSaving(true);
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
        executiveSummary: report.executiveSummary,
        checklist: report.checklist,
      });
      setReport(saved);
    } catch (e: any) {
      alert(e.message ?? 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const addDefect = async (topicKey?: string) => {
    if (!id) return;
    const description = prompt('תיאור הליקוי?');
    if (!description) return;
    try {
      const d = await createDefect(id, {
        checklistTopicKey: topicKey,
        description,
        severity: 'medium',
        sortOrder: defects.length,
      } as any);
      setDefects((prev) => [...prev, d]);
    } catch (e: any) {
      alert(e.message ?? 'שגיאה בהוספת ליקוי');
    }
  };

  const changeDefect = async (defect: SafetyAuditDefect, field: keyof SafetyAuditDefect, value: any) => {
    try {
      const updated = await updateDefect(defect.id, { [field]: value } as any);
      setDefects((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (e: any) {
      alert(e.message ?? 'שגיאה בעדכון ליקוי');
    }
  };

  if (loading) return <div className="p-4" dir="rtl">טוען…</div>;
  if (error) return <div className="p-4 text-red-600" dir="rtl">{error}</div>;
  if (!report) return <div className="p-4" dir="rtl">לא נמצא דוח</div>;

  return (
    <div dir="rtl" className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">דוח: {report.siteName || 'ללא שם'}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={saveBasics} disabled={saving}>
            שמירה
          </Button>
          <Link to={`/safety/preview/${report.id}`} className="underline">
            תצוגה מקדימה
          </Link>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">2. פרטי הביקורת</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            dir="rtl"
            placeholder="שם האתר / כתובת"
            value={report.siteName || ''}
            onChange={(e) => setReport({ ...report, siteName: e.target.value })}
          />
          <Input
            dir="rtl"
            placeholder="שם המבצע (הקבלן)"
            value={report.contractor || ''}
            onChange={(e) => setReport({ ...report, contractor: e.target.value })}
          />
          <Input
            dir="rtl"
            placeholder="עורך הביקורת"
            value={report.auditor || ''}
            onChange={(e) => setReport({ ...report, auditor: e.target.value })}
          />
          <Input
            dir="rtl"
            placeholder="נוכחים בביקורת"
            value={report.attendees || ''}
            onChange={(e) => setReport({ ...report, attendees: e.target.value })}
          />
          <Input
            dir="rtl"
            placeholder="מנהל עבודה באתר"
            value={report.siteManager || ''}
            onChange={(e) => setReport({ ...report, siteManager: e.target.value })}
          />
          <Input
            dir="rtl"
            placeholder="שעות העבודה באתר"
            value={report.workHours || ''}
            onChange={(e) => setReport({ ...report, workHours: e.target.value })}
          />
          <Input
            dir="rtl"
            placeholder="מספר עובדים בשטח"
            type="number"
            value={report.workersCount ?? 0}
            onChange={(e) => setReport({ ...report, workersCount: Number(e.target.value) })}
          />
          <Input
            dir="rtl"
            placeholder="שלב עבודה"
            value={report.workStage || ''}
            onChange={(e) => setReport({ ...report, workStage: e.target.value })}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. רשימת בדיקה</h2>
        <div className="space-y-2">
          {CHECKLIST_TOPICS.map((t) => {
            const current = (report.checklist ?? {})[t.key] ?? { status: 'na', notes: '' };
            return (
              <div key={t.key} className="border rounded p-3 space-y-2">
                <div className="font-medium">{t.title}</div>
                <div className="flex gap-2">
                  <Button
                    variant={current.status === 'ok' ? 'default' : 'secondary'}
                    onClick={() => setChecklist(t.key, 'ok')}
                  >
                    תקין
                  </Button>
                  <Button
                    variant={current.status === 'not_ok' ? 'default' : 'destructive'}
                    onClick={() => {
                      setChecklist(t.key, 'not_ok');
                      // suggest creating a defect
                      addDefect(t.key);
                    }}
                  >
                    לא תקין
                  </Button>
                  <Button
                    variant={current.status === 'na' ? 'default' : 'secondary'}
                    onClick={() => setChecklist(t.key, 'na')}
                  >
                    לא רלוונטי
                  </Button>
                </div>
                <Textarea
                  dir="rtl"
                  placeholder="הערות"
                  value={current.notes ?? ''}
                  onChange={(e) => setChecklist(t.key, current.status as ChecklistStatus, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. ליקויים ופעולות מתקנות</h2>
        <div className="space-y-2">
          <Button onClick={() => addDefect()}>הוסף ליקוי</Button>
          {defects.map((d) => (
            <div key={d.id} className="border rounded p-3 space-y-2">
              <Input
                dir="rtl"
                value={d.description}
                onChange={(e) => changeDefect(d, 'description', e.target.value)}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Select
                  value={d.severity}
                  onValueChange={(v) => changeDefect(d, 'severity', v)}
                >
                  <SelectTrigger><SelectValue placeholder="דרגת חומרה" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">גבוהה</SelectItem>
                    <SelectItem value="medium">בינונית</SelectItem>
                    <SelectItem value="low">נמוכה</SelectItem>
                  </SelectContent>
                </Select>
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
                <Input
                  dir="rtl"
                  type="date"
                  placeholder="תאריך יעד"
                  value={d.dueDate || ''}
                  onChange={(e) => changeDefect(d, 'dueDate', e.target.value)}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                נושא צ׳קליסט: {d.checklistTopicKey || '—'}
              </div>
              <div>
                <Link className="underline" to={`/safety/preview/${report.id}`}>צפה בתמונות/נספח (בשלב הבא)</Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SafetyAuditEditor;

