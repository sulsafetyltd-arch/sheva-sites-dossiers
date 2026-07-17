import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getReport,
  updateReport,
  listDefects,
  createDefect,
  updateDefect,
  deleteDefect,
  deleteDefectPhoto,
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
import SignaturePad from '@/components/dossier/SignaturePad';
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, FileText, PenLine, Trash2, TriangleAlert } from 'lucide-react';

const STEPS = [
  { label: 'פרטי הדוח', icon: FileText },
  { label: 'בדיקות', icon: ClipboardCheck },
  { label: 'ליקויים', icon: TriangleAlert },
  { label: 'חתימות', icon: PenLine },
] as const;

const SafetyAuditEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<SafetyAuditReport | null>(null);
  const [defects, setDefects] = useState<SafetyAuditDefect[]>([]);
  const [photosByDefect, setPhotosByDefect] = useState<Record<string, SafetyAuditDefectPhoto[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [uploadingDefects, setUploadingDefects] = useState<Set<string>>(new Set());
  const creatingTopics = useRef(new Set<string>());

  const topics = useMemo(
    () => getChecklistTopics(report?.reportType ?? 'workplace'),
    [report?.reportType]
  );
  const isConstruction = report?.reportType === 'construction';
  const chapters = useMemo(
    () => Array.from(new Set(topics.map((topic) => topic.chapter || 'כל הבדיקות'))),
    [topics]
  );
  const currentChapter = activeChapter && chapters.includes(activeChapter) ? activeChapter : chapters[0];
  const visibleTopics = isConstruction
    ? topics.filter((topic) => (topic.chapter || 'כל הבדיקות') === currentChapter)
    : topics;
  const completedChecks = topics.filter((topic) => {
    const status = report?.checklist?.[topic.key]?.status;
    return status === 'ok' || status === 'not_ok' || (!isConstruction && status === 'na');
  }).length;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!id) return;
        const [r, d] = await Promise.all([getReport(id), listDefects(id)]);
        if (cancelled) return;
        setReport(r);
        setDefects(d);
        const photoLists = await Promise.all(d.map((defect) => listDefectPhotos(defect.id)));
        if (cancelled) return;
        const map = Object.fromEntries(d.map((defect, index) => [defect.id, photoLists[index]]));
        setPhotosByDefect(map);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'שגיאה');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const saveBasics = async (): Promise<boolean> => {
    if (!report || !id) return false;
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
        auditorPhone: report.auditorPhone,
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
        siteManagerSignatureUrl: report.siteManagerSignatureUrl,
        auditorSignatureUrl: report.auditorSignatureUrl,
        auditorStampUrl: report.auditorStampUrl,
        siteManagerSignedAt: report.siteManagerSignedAt,
        auditorSignedAt: report.auditorSignedAt,
      });
      setReport(saved);
      setError(null);
      setMessage('נשמר');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'שגיאה בשמירה');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addDefect = async (topicKey?: string, description?: string) => {
    if (!id) return;
    const lockKey = topicKey ?? `manual-${crypto.randomUUID()}`;
    if (creatingTopics.current.has(lockKey)) return;
    creatingTopics.current.add(lockKey);
    try {
      const topic = topics.find((t) => t.key === topicKey);
      const d = await createDefect(id, {
        checklistTopicKey: topicKey,
        description: description || (topic ? `ליקוי ב: ${topic.title}` : 'תיאור ליקוי חדש'),
        severity: 'medium',
        responsible: topic?.defaultResponsible,
        correctiveAction: topic?.defaultFindings,
        sortOrder: defects.length,
      });
      setDefects((prev) => prev.some((existing) => existing.id === d.id) ? prev : [...prev, d]);
      setPhotosByDefect((prev) => ({ ...prev, [d.id]: [] }));
      setError(null);
    } catch (cause) {
      setError(`הוספת הליקוי נכשלה: ${cause instanceof Error ? cause.message : 'שגיאה לא ידועה'}`);
    } finally {
      creatingTopics.current.delete(lockKey);
    }
  };

  const markNotOk = async (topicKey: string) => {
    if (!report || !id) return;
    const topic = topics.find((t) => t.key === topicKey);
    const current = report?.checklist?.[topicKey];
    const nextItem = {
      ...(current ?? { status: 'na' as ChecklistStatus }),
      status: 'not_ok',
      findings: current?.findings || topic?.defaultFindings || '',
      responsible: current?.responsible || topic?.defaultResponsible || 'מנהל העבודה',
      notes: current?.notes,
    } as const;
    const nextChecklist = { ...(report.checklist ?? {}), [topicKey]: nextItem };
    setReport({ ...report, checklist: nextChecklist });
    try {
      await updateReport(id, { checklist: nextChecklist });
      if (!defects.some((d) => d.checklistTopicKey === topicKey)) {
        await addDefect(topicKey, topic?.defaultFindings || topic?.title);
      }
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'שמירת הבדיקה נכשלה');
    }
  };

  const changeDefectLocal = (
    defect: SafetyAuditDefect,
    field: keyof SafetyAuditDefect,
    value: SafetyAuditDefect[keyof SafetyAuditDefect],
  ) => {
    setDefects((current) =>
      current.map((item) => item.id === defect.id ? { ...item, [field]: value } : item),
    );
  };

  const persistDefect = async (
    defect: SafetyAuditDefect,
    field: keyof SafetyAuditDefect,
    value: SafetyAuditDefect[keyof SafetyAuditDefect],
  ) => {
    try {
      const updated = await updateDefect(defect.id, { [field]: value });
      setDefects((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'שגיאה בעדכון ליקוי');
    }
  };

  const onUploadPhoto = async (defectId: string, file?: File | null) => {
    if (!file || uploadingDefects.has(defectId)) return;
    setUploadingDefects((current) => new Set(current).add(defectId));
    try {
      const photo = await addDefectPhoto(defectId, file);
      setPhotosByDefect((prev) => ({
        ...prev,
        [defectId]: [...(prev[defectId] ?? []), photo],
      }));
      setError(null);
    } catch (cause) {
      setError(`העלאת התמונה נכשלה: ${cause instanceof Error ? cause.message : 'שגיאה לא ידועה'}`);
    } finally {
      setUploadingDefects((current) => {
        const next = new Set(current);
        next.delete(defectId);
        return next;
      });
    }
  };

  const removePhoto = async (photo: SafetyAuditDefectPhoto) => {
    try {
      await deleteDefectPhoto(photo);
      setPhotosByDefect((current) => ({
        ...current,
        [photo.defectId]: (current[photo.defectId] ?? []).filter((item) => item.id !== photo.id),
      }));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'מחיקת התמונה נכשלה');
    }
  };

  const removeDefect = async (defect: SafetyAuditDefect) => {
    try {
      await deleteDefect(defect.id);
      setDefects((current) => current.filter((item) => item.id !== defect.id));
      setPhotosByDefect((current) => {
        const next = { ...current };
        delete next[defect.id];
        return next;
      });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'מחיקת הליקוי נכשלה');
    }
  };

  const onSiteManagerSign = async (dataUrl: string | null) => {
    if (!report || !id) return;
    const patch = {
      siteManagerSignatureUrl: dataUrl || undefined,
      siteManagerSignedAt: dataUrl ? new Date().toISOString() : undefined,
      siteManager: report.siteManager,
    };
    const previous = report;
    setReport({ ...report, ...patch });
    try {
      const saved = await updateReport(id, patch);
      setReport(saved);
      setError(null);
      setMessage(dataUrl ? 'חתימת מנהל העבודה נשמרה' : 'החתימה נמחקה');
    } catch (cause) {
      setReport(previous);
      setError(cause instanceof Error ? cause.message : 'שמירת החתימה נכשלה');
    }
  };

  const onAuditorSign = async (dataUrl: string | null) => {
    if (!report || !id) return;
    const patch = {
      auditorSignatureUrl: dataUrl || undefined,
      auditorSignedAt: dataUrl ? new Date().toISOString() : undefined,
    };
    const previous = report;
    setReport({ ...report, ...patch });
    try {
      const saved = await updateReport(id, patch);
      setReport(saved);
      setError(null);
      setMessage(dataUrl ? 'חתימת ממונה הבטיחות נשמרה' : 'החתימה נמחקה');
    } catch (cause) {
      setReport(previous);
      setError(cause instanceof Error ? cause.message : 'שמירת החתימה נכשלה');
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
            <Link to={`/safety/client/${report.clientId}`} className="text-sm text-slate-500 underline">
              ← דוחות הלקוח
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

        <nav className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-slate-50/95 backdrop-blur border-y">
          <div className="grid grid-cols-4 gap-1">
            {STEPS.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setStep(index)}
                  className={`rounded-lg px-1 py-2 text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
                    step === index ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </nav>

        {step === 0 && (
        <>
        {!isConstruction && (
          <section className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
            <h2 className="text-lg font-semibold">1. סיכום מנהלים</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                value={report.riskLevel || ''}
                onValueChange={(value) =>
                  setReport({ ...report, riskLevel: value as SafetyAuditReport['riskLevel'] })
                }
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
            <Input dir="rtl" placeholder="לכבוד" value={report.recipient || ''} onChange={(e) => setReport({ ...report, recipient: e.target.value })} />
            {isConstruction ? (
              <>
                <Input
                  dir="rtl"
                  placeholder="פרויקט / אתר"
                  value={report.projectName || report.siteName || ''}
                  onChange={(e) => setReport({ ...report, projectName: e.target.value, siteName: e.target.value })}
                />
                <Input dir="rtl" placeholder="גוש" value={report.block || ''} onChange={(e) => setReport({ ...report, block: e.target.value })} />
                <Input dir="rtl" placeholder="מגרש" value={report.parcel || ''} onChange={(e) => setReport({ ...report, parcel: e.target.value })} />
              </>
            ) : (
              <Input dir="rtl" placeholder="שם האתר / כתובת" value={report.siteName || ''} onChange={(e) => setReport({ ...report, siteName: e.target.value })} />
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
              <Input dir="rtl" placeholder="תפקיד המבצע" value={report.auditorRole || ''} onChange={(e) => setReport({ ...report, auditorRole: e.target.value })} />
            )}
            <Input dir="rtl" type="date" value={report.auditDate || ''} onChange={(e) => setReport({ ...report, auditDate: e.target.value })} />
            {!isConstruction && (
              <Input dir="rtl" placeholder="עורך הביקורת" value={report.auditor || ''} onChange={(e) => setReport({ ...report, auditor: e.target.value })} />
            )}
            <Input dir="rtl" placeholder="מנהל עבודה באתר" value={report.siteManager || ''} onChange={(e) => setReport({ ...report, siteManager: e.target.value })} />
            <Input
              dir="rtl"
              type="number"
              placeholder={isConstruction ? 'מספר פועלים (כולל קבלני משנה)' : 'מספר עובדים בשטח'}
              value={report.workersCount ?? ''}
              onChange={(e) => setReport({ ...report, workersCount: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
            {!isConstruction && (
              <>
                <Input dir="rtl" placeholder="נוכחים בביקורת" value={report.attendees || ''} onChange={(e) => setReport({ ...report, attendees: e.target.value })} />
                <Input dir="rtl" placeholder="שעות העבודה באתר" value={report.workHours || ''} onChange={(e) => setReport({ ...report, workHours: e.target.value })} />
                <Input dir="rtl" placeholder="שלב עבודה" value={report.workStage || ''} onChange={(e) => setReport({ ...report, workStage: e.target.value })} />
              </>
            )}
          </div>
          {isConstruction && (
            <Textarea dir="rtl" placeholder="שלבי עבודה" value={report.workStagesDetail || ''} onChange={(e) => setReport({ ...report, workStagesDetail: e.target.value })} />
          )}
        </section>
        </>
        )}

        {step === 1 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">{isConstruction ? 'ממצאי הביקורת' : '3. רשימת בדיקה'}</h2>
              <div className="text-xs text-slate-500">{completedChecks} מתוך {topics.length} בדיקות הושלמו</div>
            </div>
            <div className="text-sm font-medium text-emerald-700">{Math.round((completedChecks / topics.length) * 100)}%</div>
          </div>
          {isConstruction && (
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {chapters.map((chapter) => (
                <Button
                  key={chapter}
                  type="button"
                  size="sm"
                  variant={currentChapter === chapter ? 'default' : 'outline'}
                  className="shrink-0"
                  onClick={() => setActiveChapter(chapter)}
                >
                  {chapter}
                </Button>
              ))}
            </div>
          )}
          {visibleTopics.map((t) => {
            const idx = topics.findIndex((topic) => topic.key === t.key);
            const current = report.checklist?.[t.key] ?? { status: 'na' as ChecklistStatus };
            return (
              <div key={t.key} className={`rounded-xl border bg-white p-3 space-y-2 shadow-sm ${current.status === 'not_ok' ? 'border-red-300' : ''}`}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-xs text-slate-400">{idx + 1}.</span>
                  {t.chapter && <span className="text-xs rounded bg-slate-100 px-2 py-0.5 text-slate-600">{t.chapter}</span>}
                  <div className="font-medium">{t.title}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={current.status === 'ok' ? 'default' : 'secondary'} onClick={() => setChecklist(t.key, { status: 'ok' })}>
                    תקין
                  </Button>
                  <Button size="sm" variant={current.status === 'not_ok' ? 'destructive' : 'secondary'} onClick={() => void markNotOk(t.key)}>
                    לא תקין
                  </Button>
                  {!isConstruction && (
                    <Button size="sm" variant={current.status === 'na' ? 'default' : 'secondary'} onClick={() => setChecklist(t.key, { status: 'na' })}>
                      לא רלוונטי
                    </Button>
                  )}
                </div>
                {isConstruction && current.status === 'not_ok' && (
                  <>
                    <Textarea dir="rtl" placeholder="ממצאים והמלצות לביצוע" value={current.findings ?? ''} onChange={(e) => setChecklist(t.key, { findings: e.target.value })} />
                    <Input dir="rtl" placeholder="אחראי ליישום המלצה" value={current.responsible ?? ''} onChange={(e) => setChecklist(t.key, { responsible: e.target.value })} />
                  </>
                )}
                {current.status === 'not_ok' && (
                  <Textarea dir="rtl" placeholder="הערות נוספות (אופציונלי)" value={current.notes ?? ''} onChange={(e) => setChecklist(t.key, { notes: e.target.value })} />
                )}
              </div>
            );
          })}
        </section>
        )}

        {step === 2 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{isConstruction ? 'ליקויים ותיעוד צילומי' : '4. ליקויים ופעולות מתקנות'}</h2>
            <Button size="sm" onClick={() => void addDefect()}>
              הוסף ליקוי
            </Button>
          </div>
          {defects.map((d, idx) => (
            <div key={d.id} className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
              <div className="text-sm text-slate-500">ליקוי #{idx + 1}</div>
              <Textarea
                dir="rtl"
                value={d.description}
                onChange={(e) => changeDefectLocal(d, 'description', e.target.value)}
                onBlur={(e) => void persistDefect(d, 'description', e.target.value)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Select
                  value={d.severity}
                  onValueChange={(value) => {
                    changeDefectLocal(d, 'severity', value as SafetyAuditDefect['severity']);
                    void persistDefect(d, 'severity', value as SafetyAuditDefect['severity']);
                  }}
                >
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
                  onChange={(e) => changeDefectLocal(d, 'dueDate', e.target.value)}
                  onBlur={(e) => void persistDefect(d, 'dueDate', e.target.value)}
                />
                <Input
                  dir="rtl"
                  placeholder="פעולה מתקנת / המלצה"
                  value={d.correctiveAction || ''}
                  onChange={(e) => changeDefectLocal(d, 'correctiveAction', e.target.value)}
                  onBlur={(e) => void persistDefect(d, 'correctiveAction', e.target.value)}
                />
                <Input
                  dir="rtl"
                  placeholder="אחראי לביצוע"
                  value={d.responsible || ''}
                  onChange={(e) => changeDefectLocal(d, 'responsible', e.target.value)}
                  onBlur={(e) => void persistDefect(d, 'responsible', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">צילומי ליקוי</div>
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={uploadingDefects.has(d.id)}
                  onChange={(e) => {
                    void onUploadPhoto(d.id, e.target.files?.[0]);
                    e.currentTarget.value = '';
                  }}
                />
                {uploadingDefects.has(d.id) && <div className="text-xs text-slate-500">מעלה תמונה…</div>}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(photosByDefect[d.id] ?? []).map((p) => (
                    <div key={p.id} className="relative">
                      <img src={getPublicUrl(p.storagePath)} alt={d.description} className="h-28 w-full object-cover rounded-lg border" />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 left-1 h-7 w-7"
                        aria-label="מחק תמונה"
                        onClick={() => void removePhoto(p)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => void removeDefect(d)}>
                מחק ליקוי
              </Button>
            </div>
          ))}
        </section>
        )}

        {step === 3 && (
        <section className="rounded-xl border bg-white p-4 space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <PenLine className="w-5 h-5" />
            חתימות דיגיטליות
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="font-medium">חתימת מנהל עבודה</div>
              <Input dir="rtl" placeholder="שם מנהל העבודה" value={report.siteManager || ''} onChange={(e) => setReport({ ...report, siteManager: e.target.value })} />
              <SignaturePad value={report.siteManagerSignatureUrl} onChange={(url) => void onSiteManagerSign(url)} width={340} height={140} />
              {report.siteManagerSignedAt && (
                <div className="text-xs text-slate-500">נחתם: {new Date(report.siteManagerSignedAt).toLocaleString('he-IL')}</div>
              )}
            </div>
            <div className="space-y-2">
              <div className="font-medium">חתימת ממונה בטיחות</div>
              <Input dir="rtl" placeholder="שם ממונה הבטיחות" value={report.auditor || ''} onChange={(e) => setReport({ ...report, auditor: e.target.value })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input dir="rtl" placeholder="תפקיד" value={report.auditorRole || ''} onChange={(e) => setReport({ ...report, auditorRole: e.target.value })} />
                <Input dir="ltr" className="text-right" placeholder="טלפון" value={report.auditorPhone || ''} onChange={(e) => setReport({ ...report, auditorPhone: e.target.value })} />
              </div>
              <SignaturePad value={report.auditorSignatureUrl} onChange={(url) => void onAuditorSign(url)} width={340} height={140} />
              {report.auditorStampUrl && (
                <div className="rounded-lg border bg-white p-2">
                  <div className="text-xs text-slate-500 mb-1">חותמת מהפרופיל</div>
                  <img src={report.auditorStampUrl} alt="חותמת ממונה הבטיחות" className="h-20 max-w-[180px] object-contain mix-blend-multiply" />
                </div>
              )}
              {report.auditorSignedAt && (
                <div className="text-xs text-slate-500">נחתם: {new Date(report.auditorSignedAt).toLocaleString('he-IL')}</div>
              )}
            </div>
          </div>
        </section>
        )}

        <div className="fixed bottom-0 inset-x-0 border-t bg-white/95 backdrop-blur p-3 flex gap-2 justify-center sm:static sm:border-0 sm:bg-transparent sm:p-0">
          {step > 0 && (
            <Button className="flex-1 sm:flex-none gap-1" variant="outline" onClick={() => setStep((value) => value - 1)}>
              <ChevronRight className="w-4 h-4" /> הקודם
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              className="flex-1 sm:flex-none gap-1"
              onClick={async () => {
                const saved = await saveBasics();
                if (!saved) return;
                setStep((value) => value + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={saving}
            >
              הבא <ChevronLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              className="flex-1 sm:flex-none gap-1"
              disabled={saving}
              onClick={async () => {
                const saved = await saveBasics();
                if (saved) navigate(`/safety/preview/${report.id}`);
              }}
            >
              <Check className="w-4 h-4" /> סיום ותצוגת PDF
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SafetyAuditEditor;
