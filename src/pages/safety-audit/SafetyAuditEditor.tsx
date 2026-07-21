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
import {
  CORRECTIVE_ACTION_SUGGESTIONS,
  getChecklistTopics,
  reportTypeLabel,
  defectSeverityLabel,
} from '@/types/safety-audit';
import {
  analyzeDefectPhoto,
  hasVisionModelConfigured,
  topicsForVisionPrompt,
  type DefectVisionSuggestion,
} from '@/lib/safety-defect-vision';
import { resizeImageToBlob } from '@/lib/storage-utils';
import DefectVisionAssist from '@/components/safety/DefectVisionAssist';
import EducationCatalogPicker from '@/components/safety/EducationCatalogPicker';
import EducationPhotoAiStep, { type EducationPhotoDraft } from '@/components/safety/EducationPhotoAiStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SignaturePad from '@/components/dossier/SignaturePad';
import { Camera, Check, ChevronLeft, ChevronRight, ClipboardCheck, FileText, PenLine, Trash2, TriangleAlert } from 'lucide-react';
import {
  EDUCATION_KIND_DEFAULT_APPROVALS,
  EDUCATION_KIND_LABELS,
  educationSectionByKey,
  type EducationInstitutionKind,
} from '@/data/education-moe-catalog';

type DefectVisionState = {
  suggestion?: DefectVisionSuggestion | null;
  analyzing?: boolean;
  error?: string | null;
  imageBlob?: Blob | null;
};

const STEPS = [
  { id: 'details', label: 'פרטי הדוח', icon: FileText },
  { id: 'checks', label: 'בדיקות', icon: ClipboardCheck },
  { id: 'findings', label: 'ליקויים', icon: TriangleAlert },
  { id: 'signatures', label: 'חתימות', icon: PenLine },
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
  const [visionByDefect, setVisionByDefect] = useState<Record<string, DefectVisionState>>({});
  const creatingTopics = useRef(new Set<string>());

  const topics = useMemo(
    () => getChecklistTopics(report?.reportType ?? 'workplace'),
    [report?.reportType]
  );
  const visionTopics = useMemo(() => {
    if (report?.reportType !== 'education_institution') return topics;
    return topicsForVisionPrompt('education_institution', {
      institutionKind: report.domainDetails?.institutionKind,
      preferredTopicKeys: [
        ...(report.domainDetails?.selectedSectionKeys ?? []),
        ...defects.map((item) => item.checklistTopicKey).filter((key): key is string => Boolean(key)),
      ],
    });
  }, [report?.reportType, report?.domainDetails?.institutionKind, report?.domainDetails?.selectedSectionKeys, defects, topics]);
  const isConstruction = report?.reportType === 'construction';
  const isInfrastructure = report?.reportType === 'infrastructure';
  const isRailway = report?.reportType === 'railway';
  const isBuildingSurvey = report?.reportType === 'building_survey';
  const isEducation = report?.reportType === 'education_institution';
  const isProjectReport = isConstruction || isInfrastructure || isRailway || isBuildingSurvey || isEducation;
  /** Education uses a guiding-catalog picker, not a full checklist walkthrough. */
  const hasChapteredChecklist = isProjectReport && !isEducation;
  const chapters = useMemo(
    () => Array.from(new Set(topics.map((topic) => topic.chapter || 'כל הבדיקות'))),
    [topics]
  );
  const currentChapter = activeChapter && chapters.includes(activeChapter) ? activeChapter : chapters[0];
  const visibleTopics = hasChapteredChecklist
    ? topics.filter((topic) => (topic.chapter || 'כל הבדיקות') === currentChapter)
    : topics;
  const completedChecks = topics.filter((topic) => {
    const status = report?.checklist?.[topic.key]?.status;
    return status === 'ok' || status === 'not_ok' || (!isConstruction && status === 'na');
  }).length;

  const editorSteps = useMemo(
    () => (isEducation
      ? [
          { id: 'details', label: 'פרטי הדוח', icon: FileText },
          { id: 'photo_ai', label: 'צילום AI', icon: Camera },
          { id: 'catalog', label: 'מאגר מנחה', icon: ClipboardCheck },
          { id: 'findings', label: 'ממצאים', icon: TriangleAlert },
          { id: 'signatures', label: 'חתימות', icon: PenLine },
        ]
      : [...STEPS]),
    [isEducation],
  );
  const stepId = editorSteps[step]?.id ?? 'details';
  const goToStepId = (id: string) => {
    const index = editorSteps.findIndex((item) => item.id === id);
    if (index >= 0) setStep(index);
  };

  const applyInstitutionKind = (kind: EducationInstitutionKind) => {
    if (!report) return;
    const defaults = EDUCATION_KIND_DEFAULT_APPROVALS[kind] ?? [];
    const prevStatuses = report.domainDetails?.approvalStatuses ?? {};
    setReport({
      ...report,
      domainDetails: {
        ...(report.domainDetails ?? {}),
        institutionKind: kind,
        selectedApprovalKeys: defaults,
        approvalStatuses: Object.fromEntries(
          defaults.map((key) => [key, prevStatuses[key] ?? { status: 'presented' as const }]),
        ),
      },
    });
  };

  const addEducationFindings = async (sectionKeys: string[]) => {
    if (!id) return;
    const existing = new Set(defects.map((d) => d.checklistTopicKey).filter(Boolean));
    const toAdd = sectionKeys.filter((key) => !existing.has(key));
    if (toAdd.length === 0) {
      setMessage('כל הסעיפים שנבחרו כבר קיימים כממצאים');
      return;
    }
    const created: SafetyAuditDefect[] = [];
    for (let index = 0; index < toAdd.length; index += 1) {
      const key = toAdd[index];
      const topic = topics.find((item) => item.key === key);
      const d = await createDefect(id, {
        checklistTopicKey: key,
        description: '',
        severity: 'medium',
        responsible: topic?.defaultResponsible,
        correctiveAction: topic?.defaultFindings,
        sortOrder: defects.length + index,
      });
      created.push(d);
    }
    setDefects((prev) => {
      const ids = new Set(prev.map((item) => item.id));
      return [...prev, ...created.filter((item) => !ids.has(item.id))];
    });
    setPhotosByDefect((prev) => {
      const next = { ...prev };
      for (const item of created) next[item.id] = next[item.id] ?? [];
      return next;
    });
    setMessage(`נוספו ${created.length} ממצאים מהסעיפים שנבחרו`);
    goToStepId('findings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const acceptEducationPhotoFinding = async (
    draft: EducationPhotoDraft,
    suggestion: DefectVisionSuggestion,
  ) => {
    if (!id) throw new Error('חסר מזהה דוח');
    const topicKey = suggestion.checklistTopicKey;
    const created = await createDefect(id, {
      checklistTopicKey: topicKey,
      description: suggestion.description,
      severity: suggestion.severity,
      correctiveAction: suggestion.correctiveAction,
      sortOrder: defects.length,
    });
    const photo = await addDefectPhoto(created.id, draft.file);
    setDefects((prev) => (prev.some((item) => item.id === created.id) ? prev : [...prev, created]));
    setPhotosByDefect((prev) => ({
      ...prev,
      [created.id]: [...(prev[created.id] ?? []), photo],
    }));
    if (topicKey) {
      setReport((current) => {
        if (!current) return current;
        const selected = new Set(current.domainDetails?.selectedSectionKeys ?? []);
        selected.add(topicKey);
        return {
          ...current,
          domainDetails: {
            ...(current.domainDetails ?? {}),
            selectedSectionKeys: Array.from(selected),
          },
        };
      });
    }
    setMessage('הממצא נוסף מהתמונה — ניתן לערוך בשלב הממצאים');
  };

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
        domainDetails: report.domainDetails,
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
        description: description ?? (topic ? '' : 'תיאור ליקוי חדש'),
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

  const addCorrectiveAction = (defect: SafetyAuditDefect, action: string) => {
    if (!action) return;
    const currentActions = (defect.correctiveAction || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    const nextValue = currentActions.includes(action)
      ? currentActions.join('\n')
      : [...currentActions, action].join('\n');
    changeDefectLocal(defect, 'correctiveAction', nextValue);
    void persistDefect(defect, 'correctiveAction', nextValue);
  };

  const patchVision = (defectId: string, patch: Partial<DefectVisionState>) => {
    setVisionByDefect((current) => ({
      ...current,
      [defectId]: { ...current[defectId], ...patch },
    }));
  };

  const resolveVisionImage = async (defectId: string, imageBlob?: Blob | null): Promise<Blob | null> => {
    if (imageBlob) return imageBlob;
    if (visionByDefect[defectId]?.imageBlob) return visionByDefect[defectId].imageBlob ?? null;
    const photo = (photosByDefect[defectId] ?? [])[0];
    if (!photo) return null;
    const url = getPublicUrl(photo.storagePath);
    if (!url) return null;
    const response = await fetch(url);
    if (!response.ok) throw new Error('לא ניתן לטעון את תמונת הליקוי לניתוח');
    return response.blob();
  };

  const runVisionAnalysis = async (defectId: string, imageBlob?: Blob | null) => {
    if (!hasVisionModelConfigured()) {
      patchVision(defectId, { error: 'יש להגדיר מפתח Vision (Gemini/OpenAI) או לבחור קטגוריה מקומית' });
      return;
    }
    patchVision(defectId, { analyzing: true, error: null });
    try {
      const blob = await resolveVisionImage(defectId, imageBlob);
      if (!blob) {
        patchVision(defectId, { analyzing: false, error: 'נא לצלם או להעלות תמונה לפני הניתוח' });
        return;
      }
      const preferredTopicKeys = Array.from(new Set([
        ...(report?.domainDetails?.selectedSectionKeys ?? []),
        ...defects.map((item) => item.checklistTopicKey).filter((key): key is string => Boolean(key)),
      ]));
      const suggestion = await analyzeDefectPhoto({
        image: blob,
        reportType: report?.reportType,
        mimeType: blob.type || 'image/jpeg',
        institutionKind: report?.domainDetails?.institutionKind,
        preferredTopicKeys,
      });
      patchVision(defectId, { suggestion, analyzing: false, error: null, imageBlob: blob });
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message === 'VISION_KEY_MISSING'
          ? 'חסר מפתח Vision — הגדירו מפתח או השתמשו בסיוע המקומי'
          : cause instanceof Error
            ? cause.message
            : 'ניתוח התמונה נכשל';
      patchVision(defectId, { analyzing: false, error: message });
    }
  };

  const applyVisionSuggestion = async (
    defect: SafetyAuditDefect,
    suggestion: DefectVisionSuggestion,
  ) => {
    const patch = {
      description: suggestion.description,
      severity: suggestion.severity,
      correctiveAction: suggestion.correctiveAction,
      checklistTopicKey: suggestion.checklistTopicKey ?? defect.checklistTopicKey,
    };
    changeDefectLocal(defect, 'description', patch.description);
    changeDefectLocal(defect, 'severity', patch.severity);
    changeDefectLocal(defect, 'correctiveAction', patch.correctiveAction);
    if (patch.checklistTopicKey) {
      changeDefectLocal(defect, 'checklistTopicKey', patch.checklistTopicKey);
    }
    try {
      const updated = await updateDefect(defect.id, patch);
      setDefects((current) => current.map((item) => (item.id === defect.id ? updated : item)));
      if (isEducation && patch.checklistTopicKey) {
        setReport((current) => {
          if (!current) return current;
          const selected = new Set(current.domainDetails?.selectedSectionKeys ?? []);
          selected.add(patch.checklistTopicKey!);
          return {
            ...current,
            domainDetails: {
              ...(current.domainDetails ?? {}),
              selectedSectionKeys: Array.from(selected),
            },
          };
        });
      }
      patchVision(defect.id, { suggestion: null, error: null });
      setMessage('הצעת הזיהוי הוזנה לטופס — ניתן לערוך לפני שמירה סופית');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'עדכון הליקוי מההצעה נכשל');
    }
  };

  const onUploadPhoto = async (defectId: string, file?: File | null) => {
    if (!file || uploadingDefects.has(defectId)) return;
    setUploadingDefects((current) => new Set(current).add(defectId));
    try {
      const analysisBlob = await resizeImageToBlob(file, 1280, 0.75);
      const photo = await addDefectPhoto(defectId, file);
      setPhotosByDefect((prev) => ({
        ...prev,
        [defectId]: [...(prev[defectId] ?? []), photo],
      }));
      patchVision(defectId, {
        imageBlob: analysisBlob,
        suggestion: null,
        error: null,
      });
      setError(null);
      if (hasVisionModelConfigured()) {
        void runVisionAnalysis(defectId, analysisBlob);
      }
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
    const optimistic = { ...report, ...patch };
    setReport(optimistic);
    try {
      const saved = await updateReport(id, optimistic);
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
    const optimistic = { ...report, ...patch };
    setReport(optimistic);
    try {
      const saved = await updateReport(id, optimistic);
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
  const railwayDetails = report.domainDetails ?? {};
  const setRailwayDetails = (patch: Partial<NonNullable<SafetyAuditReport['domainDetails']>>) => {
    setReport((current) => current
      ? { ...current, domainDetails: { ...(current.domainDetails ?? {}), ...patch } }
      : current);
    setError(null);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div
        className="container mx-auto max-w-3xl px-4 pb-24 space-y-6"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/safety/client/${report.clientId}`} className="text-sm text-slate-500 underline">
              ← דוחות הלקוח
            </Link>
            <div className="flex items-center gap-2 mt-1 min-w-0">
              <span
                className={`text-xs rounded-full px-2 py-0.5 ${
                  isConstruction
                    ? 'bg-amber-100 text-amber-900'
                    : isInfrastructure
                      ? 'bg-emerald-100 text-emerald-900'
                      : isRailway
                        ? 'bg-violet-100 text-violet-900'
                        : isBuildingSurvey
                          ? 'bg-teal-100 text-teal-900'
                          : isEducation
                            ? 'bg-rose-100 text-rose-900'
                      : 'bg-sky-100 text-sky-900'
                }`}
              >
                {reportTypeLabel(report.reportType)}
              </span>
              <h1 className="text-2xl font-bold truncate">{report.siteName || report.projectName || 'ללא שם'}</h1>
            </div>
            <div className="text-sm text-slate-500">{report.reportNumber}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              className="min-h-12 w-full touch-manipulation"
              onClick={() => void saveBasics()}
              disabled={saving}
            >
              {saving ? 'שומר…' : 'שמירה'}
            </Button>
            <Button asChild className="min-h-12 w-full touch-manipulation">
              <Link to={`/safety/preview/${report.id}`}>תצוגה / PDF</Link>
            </Button>
          </div>
        </div>

        {message && <div className="rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{message}</div>}
        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

        <nav
          className="sticky z-20 -mx-4 px-4 py-3 bg-slate-50/95 backdrop-blur border-y"
          style={{ top: 'env(safe-area-inset-top)' }}
        >
          <div className={`grid gap-1 ${isEducation ? 'grid-cols-5' : 'grid-cols-4'}`}>
            {editorSteps.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={async () => {
                    if (index === step) return;
                    const saved = await saveBasics();
                    if (saved) setStep(index);
                  }}
                  disabled={saving}
                  className={`rounded-lg px-1 py-2 min-h-16 text-[10px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition touch-manipulation ${
                    step === index ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-center leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${((step + 1) / editorSteps.length) * 100}%` }} />
          </div>
        </nav>

        {stepId === 'details' && (
        <>
        {!isProjectReport && (
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
            {isConstruction
              ? 'פרטי הביקורת באתר הבנייה'
              : isInfrastructure
                ? 'פרטי הביקורת באתר התשתיות'
                : isRailway
                  ? 'פרטי ביקורת באתר רכבת ישראל'
                  : isBuildingSurvey
                    ? 'פרטי סקר בטיחות למבנה'
                    : isEducation
                      ? 'פרטי מבדק בטיחות במוסד חינוך'
                : '2. פרטי הביקורת'}
          </h2>
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${isBuildingSurvey || isEducation ? 'hidden' : ''}`}>
            <Input dir="rtl" placeholder="לכבוד" value={report.recipient || ''} onChange={(e) => setReport({ ...report, recipient: e.target.value })} />
            {isProjectReport ? (
              <>
                <Input
                  dir="rtl"
                  placeholder={isInfrastructure ? 'פרויקט / אתר תשתיות' : isRailway ? 'שם אתר רכבת ישראל' : 'פרויקט / אתר'}
                  value={report.projectName || report.siteName || ''}
                  onChange={(e) => setReport({ ...report, projectName: e.target.value, siteName: e.target.value })}
                />
                {isConstruction && (
                  <>
                    <Input dir="rtl" placeholder="גוש" value={report.block || ''} onChange={(e) => setReport({ ...report, block: e.target.value })} />
                    <Input dir="rtl" placeholder="מגרש" value={report.parcel || ''} onChange={(e) => setReport({ ...report, parcel: e.target.value })} />
                  </>
                )}
              </>
            ) : (
              <Input dir="rtl" placeholder="שם האתר / כתובת" value={report.siteName || ''} onChange={(e) => setReport({ ...report, siteName: e.target.value })} />
            )}
            <Input
              dir="rtl"
              placeholder={isConstruction ? 'שם המבצע (ממונה בטיחות)' : 'שם מבצע הבנייה (הקבלן)'}
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
              placeholder={isProjectReport ? 'מספר פועלים (כולל קבלני משנה)' : 'מספר עובדים בשטח'}
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
          {isProjectReport && !isBuildingSurvey && !isEducation && (
            <Textarea
              dir="rtl"
              placeholder={isInfrastructure ? 'תיאור העבודות המתבצעות בעת הביקורת' : isRailway ? 'תיאור העבודות המתבצעות באתר' : 'שלבי עבודה'}
              value={report.workStagesDetail || ''}
              onChange={(e) => setReport({ ...report, workStagesDetail: e.target.value })}
            />
          )}
          {isBuildingSurvey && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                className="md:col-span-2"
                value={report.projectName || report.siteName || ''}
                onChange={(event) => setReport({ ...report, projectName: event.target.value, siteName: event.target.value })}
                placeholder="שם המבנה / המכינה / המוסד"
              />
              <Input value={railwayDetails.buildingAddress || ''} onChange={(event) => setRailwayDetails({ buildingAddress: event.target.value })} placeholder="כתובת המבנה" />
              <Input value={railwayDetails.buildingContactName || ''} onChange={(event) => setRailwayDetails({ buildingContactName: event.target.value })} placeholder="שם איש קשר" />
              <Input value={railwayDetails.buildingContactPhone || ''} onChange={(event) => setRailwayDetails({ buildingContactPhone: event.target.value })} placeholder="טלפון איש קשר" />
              <Input type="date" value={report.auditDate || ''} onChange={(event) => {
                const signedAt = event.target.value;
                const validDate = new Date(`${signedAt}T12:00:00`);
                validDate.setFullYear(validDate.getFullYear() + 1);
                setReport({
                  ...report,
                  auditDate: signedAt,
                  domainDetails: {
                    ...railwayDetails,
                    approvalValidUntil: signedAt ? validDate.toISOString().slice(0, 10) : undefined,
                  },
                });
              }} aria-label="תאריך ביצוע הסקר" />
              <Input type="date" value={railwayDetails.approvalValidUntil || ''} onChange={(event) => setRailwayDetails({ approvalValidUntil: event.target.value })} aria-label="תוקף האישור" />
              <Input value={report.auditor || ''} onChange={(event) => setReport({ ...report, auditor: event.target.value })} placeholder="שם המאשר" />
              <Input value={report.auditorRole || ''} onChange={(event) => setReport({ ...report, auditorRole: event.target.value })} placeholder="תואר / תפקיד המאשר" />
              <Input value={railwayDetails.approverLicenseNumber || ''} onChange={(event) => setRailwayDetails({ approverLicenseNumber: event.target.value })} placeholder="מספר רישיון / אישור כשירות" />
              <label className="text-sm">תאריך אישור כיבוי אש<Input type="date" value={railwayDetails.fireApprovalDate || ''} onChange={(event) => setRailwayDetails({ fireApprovalDate: event.target.value })} /></label>
              <label className="text-sm">תאריך אישור מהנדס מבנים<Input type="date" value={railwayDetails.structuralApprovalDate || ''} onChange={(event) => setRailwayDetails({ structuralApprovalDate: event.target.value })} /></label>
              <label className="text-sm">תאריך אישור חשמלאי מוסמך<Input type="date" value={railwayDetails.electricalApprovalDate || ''} onChange={(event) => setRailwayDetails({ electricalApprovalDate: event.target.value })} /></label>
              <label className="text-sm md:col-span-2">
                החלטת המאשר — לא ניתן לאשר על תנאי
                <select
                  value={railwayDetails.approvalDecision || ''}
                  onChange={(event) => setRailwayDetails({ approvalDecision: event.target.value as 'approved' | 'not_approved' })}
                  className="flex h-11 w-full rounded-md border border-input bg-white px-3 mt-1"
                >
                  <option value="">בחר החלטה</option>
                  <option value="approved">מאשר את בטיחות המבנה</option>
                  <option value="not_approved">לא מאשר את בטיחות המבנה</option>
                </select>
              </label>
            </div>
          )}
          {isEducation && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="md:col-span-2 text-sm space-y-1">
                <span className="font-medium">סוג המוסד</span>
                <select
                  dir="rtl"
                  value={railwayDetails.institutionKind || ''}
                  onChange={(event) => {
                    const value = event.target.value as EducationInstitutionKind | '';
                    if (!value) {
                      setRailwayDetails({ institutionKind: undefined });
                      return;
                    }
                    applyInstitutionKind(value);
                  }}
                  className="flex h-11 w-full rounded-md border border-input bg-white px-3"
                >
                  <option value="">בחרו סוג מוסד…</option>
                  {(Object.keys(EDUCATION_KIND_LABELS) as EducationInstitutionKind[]).map((kind) => (
                    <option key={kind} value={kind}>{EDUCATION_KIND_LABELS[kind]}</option>
                  ))}
                </select>
                <span className="block text-xs text-slate-500">
                  בחירת הסוג מסננת סעיפים רלוונטיים ומסמנת אישורי פרק 1 מומלצים — ניתן לשנות בהמשך.
                </span>
              </label>
              <Input
                className="md:col-span-2"
                value={report.projectName || report.siteName || ''}
                onChange={(event) => setReport({ ...report, projectName: event.target.value, siteName: event.target.value })}
                placeholder="שם המוסד החינוכי"
              />
              <Input value={railwayDetails.ownership || ''} onChange={(event) => setRailwayDetails({ ownership: event.target.value })} placeholder="הישוב / הבעלות" />
              <Input value={railwayDetails.institutionSymbol || ''} onChange={(event) => setRailwayDetails({ institutionSymbol: event.target.value })} placeholder="סמל המוסד" />
              <Input value={railwayDetails.buildingAddress || ''} onChange={(event) => setRailwayDetails({ buildingAddress: event.target.value })} placeholder="כתובת המוסד" />
              <Input value={railwayDetails.studentsCount || ''} onChange={(event) => setRailwayDetails({ studentsCount: event.target.value })} placeholder="מספר תלמידים" />
              <Input value={railwayDetails.yearBuilt || ''} onChange={(event) => setRailwayDetails({ yearBuilt: event.target.value })} placeholder="שנת הקמה" />
              <Input value={railwayDetails.institutionPhone || ''} onChange={(event) => setRailwayDetails({ institutionPhone: event.target.value })} placeholder="טלפון המוסד" />
              <Input value={railwayDetails.principalName || ''} onChange={(event) => setRailwayDetails({ principalName: event.target.value })} placeholder="פרטי המנהל/ת / הגננת" />
              <Input value={railwayDetails.inspectorName || ''} onChange={(event) => setRailwayDetails({ inspectorName: event.target.value })} placeholder="פרטי המפקח/ת הכללי" />
              <Input
                className="md:col-span-2"
                value={railwayDetails.institutionParticipants || ''}
                onChange={(event) => setRailwayDetails({ institutionParticipants: event.target.value })}
                placeholder="משתתפים מטעם המוסד החינוכי"
              />
              <Input
                className="md:col-span-2"
                value={railwayDetails.authorityParticipants || ''}
                onChange={(event) => setRailwayDetails({ authorityParticipants: event.target.value })}
                placeholder="משתתפים מטעם הרשות / הבעלות"
              />
              <Input type="date" value={report.auditDate || ''} onChange={(event) => setReport({ ...report, auditDate: event.target.value })} aria-label="תאריך המבדק" />
              <Input value={report.auditor || ''} onChange={(event) => setReport({ ...report, auditor: event.target.value })} placeholder="פרטי עורך המבדק" />
              <Input value={report.auditorRole || ''} onChange={(event) => setReport({ ...report, auditorRole: event.target.value })} placeholder="תפקיד עורך המבדק" />
              <Input value={report.auditorPhone || ''} onChange={(event) => setReport({ ...report, auditorPhone: event.target.value })} placeholder="טלפון עורך המבדק" />
              <Input
                className="md:col-span-2"
                dir="rtl"
                placeholder="לכבוד (מנהל המוסד / מנהל בטיחות ברשות)"
                value={report.recipient || ''}
                onChange={(event) => setReport({ ...report, recipient: event.target.value })}
              />
            </div>
          )}
        </section>
        {isRailway && (
          <section className="rounded-xl border bg-white p-4 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold">פרטי טופס רכבת ישראל</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input value={railwayDetails.attention || ''} onChange={(event) => setRailwayDetails({ attention: event.target.value })} placeholder="לידי" />
              <Input value={railwayDetails.copyTo || ''} onChange={(event) => setRailwayDetails({ copyTo: event.target.value })} placeholder="לידיעה — פיקוח ומזמין" />
              <Input value={railwayDetails.railwayKmFrom || ''} onChange={(event) => setRailwayDetails({ railwayKmFrom: event.target.value })} placeholder="ק״מ רכבתי — מ־ק״מ" />
              <Input value={railwayDetails.railwayKmTo || ''} onChange={(event) => setRailwayDetails({ railwayKmTo: event.target.value })} placeholder="ועד ק״מ" />
              <label className="text-sm sm:col-span-2">
                תאריך ביקור קודם
                <Input type="date" value={railwayDetails.previousVisitDate || ''} onChange={(event) => setRailwayDetails({ previousVisitDate: event.target.value })} />
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">משתתפים בסיור</h3>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setRailwayDetails({ participants: [...(railwayDetails.participants ?? []), { name: '' }] })}
                >
                  הוסף משתתף
                </Button>
              </div>
              {(railwayDetails.participants ?? []).map((participant, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2">
                  <Input value={participant.name} onChange={(event) => {
                    const items = [...(railwayDetails.participants ?? [])];
                    items[index] = { ...participant, name: event.target.value };
                    setRailwayDetails({ participants: items });
                  }} placeholder="שם מלא" />
                  <Input value={participant.role || ''} onChange={(event) => {
                    const items = [...(railwayDetails.participants ?? [])];
                    items[index] = { ...participant, role: event.target.value };
                    setRailwayDetails({ participants: items });
                  }} placeholder="תפקיד" />
                  <Input value={participant.notes || ''} onChange={(event) => {
                    const items = [...(railwayDetails.participants ?? [])];
                    items[index] = { ...participant, notes: event.target.value };
                    setRailwayDetails({ participants: items });
                  }} placeholder="הערות / הסמכה" />
                  <Button type="button" size="icon" variant="ghost" onClick={() => setRailwayDetails({ participants: (railwayDetails.participants ?? []).filter((_, itemIndex) => itemIndex !== index) })}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">ליקויים מביקור קודם</h3>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setRailwayDetails({ previousFindings: [...(railwayDetails.previousFindings ?? []), { description: '' }] })}
                >
                  הוסף ליקוי קודם
                </Button>
              </div>
              {(railwayDetails.previousFindings ?? []).map((finding, index) => (
                <div key={index} className="rounded-lg border bg-slate-50 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Textarea className="sm:col-span-2" value={finding.description} onChange={(event) => {
                    const items = [...(railwayDetails.previousFindings ?? [])];
                    items[index] = { ...finding, description: event.target.value };
                    setRailwayDetails({ previousFindings: items });
                  }} placeholder="מהות הליקוי ומיקומו" />
                  {(['instructions', 'status', 'responsible'] as const).map((field) => (
                    <Input key={field} value={finding[field] || ''} onChange={(event) => {
                      const items = [...(railwayDetails.previousFindings ?? [])];
                      items[index] = { ...finding, [field]: event.target.value };
                      setRailwayDetails({ previousFindings: items });
                    }} placeholder={field === 'instructions' ? 'הנחיות לביצוע' : field === 'status' ? 'סטטוס' : 'אחראי לביצוע'} />
                  ))}
                  <Input type="date" value={finding.dueDate || ''} onChange={(event) => {
                    const items = [...(railwayDetails.previousFindings ?? [])];
                    items[index] = { ...finding, dueDate: event.target.value };
                    setRailwayDetails({ previousFindings: items });
                  }} />
                  <Button type="button" size="sm" variant="ghost" className="text-red-600" onClick={() => setRailwayDetails({ previousFindings: (railwayDetails.previousFindings ?? []).filter((_, itemIndex) => itemIndex !== index) })}>הסר ליקוי קודם</Button>
                </div>
              ))}
            </div>
          </section>
        )}
        </>
        )}

        {stepId === 'photo_ai' && isEducation && (
          <section className="space-y-3">
            {!railwayDetails.institutionKind ? (
              <div className="rounded-xl border border-dashed bg-white p-6 text-center space-y-3">
                <p className="text-sm text-slate-600">
                  לפני צילום וזיהוי AI יש לבחור סוג מוסד בפרטי הדוח (גן ילדים / בית ספר / פנימייה / כפר נוער).
                </p>
                <Button type="button" onClick={() => goToStepId('details')}>חזרה לפרטי הדוח</Button>
              </div>
            ) : (
              <EducationPhotoAiStep
                details={railwayDetails}
                defects={defects}
                onAccept={acceptEducationPhotoFinding}
                onSkipToCatalog={() => {
                  goToStepId('catalog');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </section>
        )}

        {stepId === 'catalog' && isEducation && (
          <section className="space-y-3">
            {!railwayDetails.institutionKind ? (
              <div className="rounded-xl border border-dashed bg-white p-6 text-center space-y-3">
                <p className="text-sm text-slate-600">
                  לפני בחירת אישורים וסעיפים יש לבחור סוג מוסד בפרטי הדוח (גן ילדים / בית ספר / פנימייה / כפר נוער).
                </p>
                <Button type="button" onClick={() => goToStepId('details')}>חזרה לפרטי הדוח</Button>
              </div>
            ) : (
              <EducationCatalogPicker
                details={railwayDetails}
                defects={defects}
                onDetailsChange={setRailwayDetails}
                onAddFindings={addEducationFindings}
              />
            )}
          </section>
        )}

        {stepId === 'checks' && !isEducation && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">{isConstruction ? 'ממצאי הביקורת' : isRailway ? 'טבלת בדיקה — רכבת ישראל' : isBuildingSurvey ? 'סעיפי סקר בטיחות המבנה' : '3. רשימת בדיקה'}</h2>
              <div className="text-xs text-slate-500">{completedChecks} מתוך {topics.length} בדיקות הושלמו</div>
            </div>
            <div className="text-sm font-medium text-emerald-700">{topics.length ? Math.round((completedChecks / topics.length) * 100) : 0}%</div>
          </div>
          {hasChapteredChecklist && (
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

        {stepId === 'findings' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{isConstruction ? 'ליקויים ותיעוד צילומי' : isRailway ? 'ריכוז ליקויים מביקור נוכחי' : isBuildingSurvey ? 'ממצאים והערות לסקר המבנה' : isEducation ? 'פירוט הממצאים לפי קדימות טיפול' : '4. ליקויים ופעולות מתקנות'}</h2>
            <div className="flex flex-wrap gap-2">
              {isEducation && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    goToStepId('photo_ai');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  צילום AI
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  if (isEducation) {
                    goToStepId('catalog');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                  }
                  void addDefect();
                }}
              >
                {isEducation ? 'בחירה מהמאגר' : 'הוסף ליקוי'}
              </Button>
            </div>
          </div>
          {isEducation && defects.length === 0 && (
            <div className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-slate-500 space-y-3">
              <p>עדיין אין ממצאים. צלמו תמונה לזיהוי AI, או בחרו סעיפים מהמאגר המנחה.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" size="sm" onClick={() => goToStepId('photo_ai')}>צילום וזיהוי AI</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => goToStepId('catalog')}>מאגר מנחה</Button>
              </div>
            </div>
          )}
          {defects.map((d, idx) => (
            <div key={d.id} className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
              <div className="text-sm text-slate-500">ליקוי #{idx + 1}</div>
              {isEducation && (
                <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-sm">
                  {(() => {
                    const section = educationSectionByKey(d.checklistTopicKey);
                    if (!section) return <span className="text-slate-500">לא מקושר לסעיף מהמאגר</span>;
                    return (
                      <>
                        <div className="text-xs text-rose-800/80">
                          פרק {section.chapter} — {section.chapterTitle}
                        </div>
                        <div className="font-medium text-rose-950">
                          {section.sectionCode} — {section.title}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              <Textarea
                dir="rtl"
                value={d.description}
                placeholder={isEducation ? 'הממצא, מהותו ומיקומו' : undefined}
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
                    <SelectItem value="high">{defectSeverityLabel('high', report.reportType)}</SelectItem>
                    <SelectItem value="medium">{defectSeverityLabel('medium', report.reportType)}</SelectItem>
                    <SelectItem value="low">{defectSeverityLabel('low', report.reportType)}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  dir="rtl"
                  type="date"
                  value={d.dueDate || ''}
                  onChange={(e) => changeDefectLocal(d, 'dueDate', e.target.value)}
                  onBlur={(e) => void persistDefect(d, 'dueDate', e.target.value)}
                />
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">פעולה מתקנת / המלצה</label>
                  <select
                    dir="rtl"
                    value=""
                    onChange={(event) => addCorrectiveAction(d, event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    aria-label="בחירת פעולה מתקנת מוצעת"
                  >
                    <option value="">בחר פעולה מוכנה להוספה…</option>
                    {CORRECTIVE_ACTION_SUGGESTIONS.map((action) => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                  <Textarea
                    dir="rtl"
                    placeholder="ניתן לבחור פעולות מהרשימה ולערוך או להוסיף טקסט חופשי"
                    value={d.correctiveAction || ''}
                    onChange={(event) => changeDefectLocal(d, 'correctiveAction', event.target.value)}
                    onBlur={(event) => void persistDefect(d, 'correctiveAction', event.target.value)}
                  />
                </div>
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
                {((photosByDefect[d.id] ?? []).length > 0 || visionByDefect[d.id]?.imageBlob) ? (
                  <DefectVisionAssist
                    topics={visionTopics}
                    reportType={report.reportType}
                    suggestion={visionByDefect[d.id]?.suggestion}
                    analyzing={visionByDefect[d.id]?.analyzing}
                    error={visionByDefect[d.id]?.error}
                    onAnalyze={() => void runVisionAnalysis(d.id)}
                    onApply={(suggestion) => void applyVisionSuggestion(d, suggestion)}
                    onDismiss={() => patchVision(d.id, { suggestion: null, error: null })}
                    onLocalCategory={(suggestion) => patchVision(d.id, { suggestion, error: null })}
                  />
                ) : isEducation ? (
                  <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-950">
                    צלמו או העלו תמונת ממצא כדי להפעיל זיהוי וניתוח AI לפי הרשימה המנחה של משרד החינוך.
                  </div>
                ) : null}
              </div>
              <Button size="sm" variant="ghost" onClick={() => void removeDefect(d)}>
                מחק ליקוי
              </Button>
            </div>
          ))}
        </section>
        )}

        {stepId === 'signatures' && (
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

        <div
          className="fixed bottom-0 inset-x-0 z-30 border-t bg-white/95 backdrop-blur p-3 flex gap-2 justify-center sm:static sm:border-0 sm:bg-transparent sm:p-0"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          {step > 0 && (
            <Button className="flex-1 sm:flex-none gap-1" variant="outline" onClick={() => setStep((value) => value - 1)}>
              <ChevronRight className="w-4 h-4" /> הקודם
            </Button>
          )}
          {step < editorSteps.length - 1 ? (
            <Button
              className="flex-1 sm:flex-none gap-1"
              onClick={async () => {
                if (isEducation && stepId === 'details' && !railwayDetails.institutionKind) {
                  setError('יש לבחור סוג מוסד (גן ילדים / בית ספר / פנימייה / כפר נוער)');
                  return;
                }
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
                if (isBuildingSurvey && !railwayDetails.approvalDecision) {
                  setError('לסקר מבנה יש לבחור החלטה: מאשר או לא מאשר');
                  return;
                }
                if (isBuildingSurvey
                  && railwayDetails.approvalDecision === 'approved'
                  && (!railwayDetails.fireApprovalDate
                    || !railwayDetails.structuralApprovalDate
                    || !railwayDetails.electricalApprovalDate)) {
                  setError('לא ניתן לאשר מבנה ללא אישורי כיבוי אש, מהנדס מבנים וחשמלאי מוסמך');
                  return;
                }
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
