import { useEffect, useMemo, useState } from 'react';
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
import { getChecklistTopics, reportTypeLabel } from '@/types/safety-audit';
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

  const topics = useMemo(
    () => getChecklistTopics(report?.reportType ?? 'workplace'),
    [report?.reportType]
  );
  const isConstruction = report?.reportType === 'construction';

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

  const setChecklist = (
    key: string,
    patch: Partial<{ status: ChecklistStatus; notes?: string; findings?: string; responsible?: string }>
  ) => {
    if (!report) return;
    const prev = report.checklist?.[key] ?? { status: 'na' as ChecklistStatus };
    setReport({
      ...report,
      checklist: {
        ...(report.checklist ?? {}),
        [key]: { ...prev, ...patch },
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
        projectName: report.projectName,
        block: report.block,
        parcel: report.parcel,
        contractor: report.contractor,
        auditor: report.auditor,
        auditorRole: report.auditorRole,
        attendees: report.attendees,
        siteManager: report.siteManager,
        workHours: report.workHours,
        workersCount: report.workersCount,
        workStage: report.workStage,
        workStagesDetail: report.workStagesDetail,
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

  const addDefect = async (topicKey?: string, description?: string) => {
    if (!id) return;
    try {
      const topic = topics.find((t) => t.key === topicKey);
      const d = await createDefect(id, {
        checklistTopicKey: topicKey,
        description:
          description ||
          (topic ? `ליקוי ב: ${topic.title}` : 'תיאור ליקוי חדש'),
        severity: 'medium',
        responsible: topic?.defaultResponsible,
        correctiveAction: topic?.defaultFindings,
        sortOrder: defects.length,
      });
      setDefects((prev) => [...prev, d]);
      setPhotosByDefect((prev) => ({ ...prev, [d.id]: [] }));
    } catch (e: any) {
      setError(e?.message ?? 'שגיאה בהוספת ליקוי');
    }
  };

  const markNotOk = async (topicKey: string) => {
    const topic = topics.find((t) => t.key === topicKey);
    const current = report?.checklist?.[topicKey];
    setChecklist(topicKey, {
      status: 'not_ok',
      findings: current?.findings || topic?.defaultFindings || '',
      responsible: current?.responsible || topic?.defaultResponsible || 'מנהל העבודה',
      notes: current?.notes,
    });
    if (!defects.some((d) => d.checklistTopicKey === topicKey)) {
      await addDefect(topicKey, topic?.defaultFindings || topic?.title);
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
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs rounded-full px-2 py-0.5 ${
                  isConstruction ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-900'
                }`}
              >
                {reportTypeLabel(report.reportType)}
              </span>
              <h1 className="text-2xl font-bold">{report.siteName || report.projectName || 'ללא שם'}</h1>
            </div>
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

        {!isConstruction && (
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
        )}

        <section className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
          <h2 className="text-lg font-semibold">
            {isConstruction ? 'פרטי הביקורת באתר הבנייה' : '2. פרטי הביקורת'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              dir="rtl"
              placeholder="לכבוד"
              value={report.recipient || ''}
              onChange={(e) => setReport({ ...report, recipient: e.target.value })}
            />
            {isConstruction ? (
              <>
                <Input
                  dir="rtl"
                  placeholder="פרויקט / אתר"
                  value={report.projectName || report.siteName || ''}
                  onChange={(e) =>
                    setReport({ ...report, projectName: e.target.value, siteName: e.target.value })
                  }
                />
                <Input
                  dir="rtl"
                  placeholder="גוש"
                  value={report.block || ''}
                  onChange={(e) => setReport({ ...report, block: e.target.value })}
                />
                <Input
                  dir="rtl"
                  placeholder="מגרש"
                  value={report.parcel || ''}
                  onChange={(e) => setReport({ ...report, parcel: e.target.value })}
                />
              </>
            ) : (
              <Input
                dir="rtl"
                placeholder="שם האתר / כתובת"
                value={report.siteName || ''}
                onChange={(e) => setReport({ ...report, siteName: e.target.value })}
              />
            )}
            <Input
              dir="rtl"
              placeholder={isConstruction ? 'שם המבצע (ממונה בטיחות)' : 'שם המבצע (הקבלן)'}
              value={isConstruction ? report.auditor || '' : report.contractor || ''}
              onChange={(e) =>
                isConstruction
                  ? setReport({ ...report, auditor: e.target.value })
                  : setReport({ ...report, contractor: e.target.value })
              }
            />
            {isConstruction && (
              <Input
                dir="rtl"
                placeholder="תפקיד המבצע"
                value={report.auditorRole || ''}
                onChange={(e) => setReport({ ...report, auditorRole: e.target.value })}
              />
            )}
            <Input
              dir="rtl"
              type="date"
              value={report.auditDate || ''}
              onChange={(e) => setReport({ ...report, auditDate: e.target.value })}
            />
            {!isConstruction && (
              <Input
                dir="rtl"
                placeholder="עורך הביקורת"
                value={report.auditor || ''}
                onChange={(e) => setReport({ ...report, auditor: e.target.value })}
              />
            )}
            <Input
              dir="rtl"
              placeholder="מנהל עבודה באתר"
              value={report.siteManager || ''}
              onChange={(e) => setReport({ ...report, siteManager: e.target.value })}
            />
            <Input
              dir="rtl"
              type="number"
              placeholder={isConstruction ? 'מספר פועלים (כולל קבלני משנה)' : 'מספר עובדים בשטח'}
              value={report.workersCount ?? ''}
              onChange={(e) =>
                setReport({
                  ...report,
                  workersCount: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
            {!isConstruction && (
              <>
                <Input
                  dir="rtl"
                  placeholder="נוכחים בביקורת"
                  value={report.attendees || ''}
                  onChange={(e) => setReport({ ...report, attendees: e.target.value })}
                />
                <Input
                  dir="rtl"
                  placeholder="שעות העבודה באתר"
                  value={report.workHours || ''}
                  onChange={(e) => setReport({ ...report, workHours: e.target.value })}
                />
                <Input
                  dir="rtl"
                  placeholder="שלב עבודה"
                  value={report.workStage || ''}
                  onChange={(e) => setReport({ ...report, workStage: e.target.value })}
                />
              </>
            )}
          </div>
          {isConstruction && (
            <Textarea
              dir="rtl"
              placeholder="שלבי עבודה"
              value={report.workStagesDetail || ''}
              onChange={(e) => setReport({ ...report, workStagesDetail: e.target.value })}
            />
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            {isConstruction ? 'ממצאי הביקורת' : '3. רשימת בדיקה'}
          </h2>
          {topics.map((t, idx) => {
            const current = report.checklist?.[t.key] ?? { status: 'na' as ChecklistStatus };
            return (
              <div key={t.key} className="rounded-xl border bg-white p-4 space-y-2 shadow-sm">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-xs text-slate-400">{idx + 1}.</span>
                  {t.chapter && (
                    <span className="text-xs rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                      {t.chapter}
                    </span>
                  )}
                  <div className="font-medium">{t.title}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={current.status === 'ok' ? 'default' : 'secondary'}
                    onClick={() => setChecklist(t.key, { status: 'ok' })}
                  >
                    תקין
                  </Button>
                  <Button
                    size="sm"
                    variant={current.status === 'not_ok' ? 'destructive' : 'secondary'}
                    onClick={() => void markNotOk(t.key)}
                  >
                    לא תקין
                  </Button>
                  {!isConstruction && (
                    <Button
                      size="sm"
                      variant={current.status === 'na' ? 'default' : 'secondary'}
                      onClick={() => setChecklist(t.key, { status: 'na' })}
                    >
                      לא רלוונטי
                    </Button>
                  )}
                </div>
                {isConstruction && (
                  <>
                    <Textarea
                      dir="rtl"
                      placeholder="ממצאים והמלצות לביצוע"
                      value={current.findings ?? ''}
                      onChange={(e) => setChecklist(t.key, { findings: e.target.value })}
                    />
                    <Input
                      dir="rtl"
                      placeholder="אחראי ליישום המלצה"
                      value={current.responsible ?? ''}
                      onChange={(e) => setChecklist(t.key, { responsible: e.target.value })}
                    />
                  </>
                )}
                <Textarea
                  dir="rtl"
                  placeholder="הערות"
                  value={current.notes ?? ''}
                  onChange={(e) => setChecklist(t.key, { notes: e.target.value })}
                />
              </div>
            );
          })}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">
              {isConstruction ? 'ליקויים ותיעוד צילומי' : '4. ליקויים ופעולות מתקנות'}
            </h2>
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
                  placeholder="פעולה מתקנת / המלצה"
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
                    </figure>
                  ))}
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  deleteDefect(d.id).then(() => setDefects((prev) => prev.filter((x) => x.id !== d.id)))
                }
              >
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
