import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Mail,
  Plus,
  Share2,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getClient } from '@/lib/safety-audit-store';
import {
  createClientEmployee,
  createEmployeeTrainingRecord,
  deleteClientEmployee,
  deleteEmployeeTrainingRecord,
  importClientEmployees,
  listClientEmployees,
  listEmployeeTrainingRecords,
  updateClientEmployee,
} from '@/lib/safety-employee-store';
import { parseEmployeeCsv } from '@/lib/safety-employee-csv';
import type { SafetyAuditClient } from '@/types/safety-audit';
import type {
  EmployeeTrainingType,
  SafetyClientEmployee,
  SafetyEmployeeTrainingRecord,
} from '@/types/safety-employee';
import {
  defaultTrainingExpiry,
  EMPLOYEE_TRAINING_DETAILS,
  employeeTrainingLabel,
  trainingComplianceState,
} from '@/types/safety-employee';
import { useSafetyAuth } from '@/contexts/SafetyAuthContext';
import {
  createElearningAssignment,
  listElearningAssignments,
} from '@/lib/safety-elearning-store';
import type { SafetyElearningAssignment } from '@/types/safety-elearning';
import {
  type ConstructionInductionLanguage,
} from '@/types/safety-training';
import {
  CONSTRUCTION_INDUCTION_DOCUMENTS,
  downloadConstructionInductionPdf,
  loadConstructionInductionPdf,
  openConstructionInductionPdf,
} from '@/lib/construction-induction-documents';
import {
  TRADE_RISK_TRADES,
  getTradeRiskDocument,
  languagesForTrade,
  openTradeRiskPdf,
  tradeRiskLabel,
  type TradeRiskCode,
  type TradeRiskLanguage,
} from '@/lib/trade-risk-documents';
import {
  createClientSite,
  createTradeRiskAssignment,
  listClientSites,
  listTradeRiskAssignments,
  tradeRiskShareMessage,
  tradeRiskShareUrl,
  updateClientSite,
} from '@/lib/safety-trade-risk-store';
import type { SafetyClientSite, SafetyTradeRiskAssignment } from '@/types/safety-trade-risk';

const trainingTypes = Object.keys(EMPLOYEE_TRAINING_DETAILS) as EmployeeTrainingType[];
const today = () => new Date().toISOString().slice(0, 10);

export default function SafetyEmployeeRegistry() {
  const { clientId } = useParams();
  const { isAdmin } = useSafetyAuth();
  const [client, setClient] = useState<SafetyAuditClient | null>(null);
  const [employees, setEmployees] = useState<SafetyClientEmployee[]>([]);
  const [records, setRecords] = useState<SafetyEmployeeTrainingRecord[]>([]);
  const [elearningAssignments, setElearningAssignments] = useState<SafetyElearningAssignment[]>([]);
  const [sites, setSites] = useState<SafetyClientSite[]>([]);
  const [tradeRiskAssignments, setTradeRiskAssignments] = useState<SafetyTradeRiskAssignment[]>([]);
  const [inductionLanguages, setInductionLanguages] = useState<Record<string, ConstructionInductionLanguage>>({});
  const [tradeDrafts, setTradeDrafts] = useState<Record<string, {
    tradeCode: TradeRiskCode;
    language: TradeRiskLanguage;
    siteId: string;
  }>>({});
  const [newSite, setNewSite] = useState({ name: '', address: '' });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingRecordFor, setAddingRecordFor] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState({ fullName: '', idNumber: '', jobTitle: '', phone: '', email: '' });
  const [recordDraft, setRecordDraft] = useState({
    trainingType: 'annual_safety' as EmployeeTrainingType,
    completedAt: today(),
    expiresAt: defaultTrainingExpiry('annual_safety', today()) || '',
    certificateNumber: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!clientId) return;
    try {
      const [nextClient, nextEmployees, nextAssignments, nextSites, nextTradeRisk] = await Promise.all([
        getClient(clientId),
        listClientEmployees(clientId),
        listElearningAssignments(clientId),
        listClientSites(clientId),
        listTradeRiskAssignments(clientId),
      ]);
      const nextRecords = await listEmployeeTrainingRecords(nextEmployees.map((employee) => employee.id));
      setClient(nextClient);
      setEmployees(nextEmployees);
      setRecords(nextRecords);
      setElearningAssignments(nextAssignments);
      setSites(nextSites);
      setTradeRiskAssignments(nextTradeRisk);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'טעינת מאגר העובדים נכשלה');
    }
  }, [clientId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const recordsByEmployee = useMemo(() => {
    const map: Record<string, SafetyEmployeeTrainingRecord[]> = {};
    for (const record of records) (map[record.employeeId] ??= []).push(record);
    return map;
  }, [records]);

  const latestRecord = (employeeId: string, type: EmployeeTrainingType) =>
    (recordsByEmployee[employeeId] ?? [])
      .filter((record) => record.trainingType === type)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];

  const reminders = useMemo(() => employees.flatMap((employee) =>
    trainingTypes.flatMap((type) => {
      const latest = (recordsByEmployee[employee.id] ?? [])
        .filter((record) => record.trainingType === type)
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
      const state = trainingComplianceState(type, Boolean(latest), latest?.expiresAt);
      return state !== 'valid'
        ? [{ employee, type, record: latest, state }]
        : [];
    }),
  ), [employees, recordsByEmployee]);

  const addEmployee = async () => {
    if (!clientId || !newEmployee.fullName.trim()) return;
    try {
      await createClientEmployee(clientId, newEmployee);
      setNewEmployee({ fullName: '', idNumber: '', jobTitle: '', phone: '', email: '' });
      setMessage('העובד נוסף למאגר');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'הוספת העובד נכשלה');
    }
  };

  const importCsv = async (file?: File) => {
    if (!clientId || !file) return;
    try {
      const parsed = parseEmployeeCsv(await file.text());
      if (parsed.length === 0) throw new Error('לא נמצאו עובדים בקובץ');
      const result = await importClientEmployees(clientId, parsed);
      setMessage(`${result.created.length} עובדים נוספו${result.failed ? `, ${result.failed} שורות דולגו` : ''}`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ייבוא העובדים נכשל');
    }
  };

  const openRecordForm = (employeeId: string) => {
    const completedAt = today();
    setAddingRecordFor(employeeId);
    setRecordDraft({
      trainingType: 'annual_safety',
      completedAt,
      expiresAt: defaultTrainingExpiry('annual_safety', completedAt) || '',
      certificateNumber: '',
      notes: '',
    });
  };

  const addRecord = async () => {
    if (!addingRecordFor) return;
    try {
      await createEmployeeTrainingRecord(addingRecordFor, {
        ...recordDraft,
        expiresAt: recordDraft.expiresAt || undefined,
      });
      setAddingRecordFor(null);
      setMessage('תיעוד ההדרכה נשמר');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'שמירת ההדרכה נכשלה');
    }
  };

  const sendReminder = () => {
    if (!client?.email) {
      setError('לא הוגדרה כתובת דוא״ל בפרטי הלקוח');
      return;
    }
    if (reminders.length === 0) {
      setMessage('אין הדרכות שפגו או עומדות לפוג ב־30 הימים הקרובים');
      return;
    }
    const lines = reminders.map(({ employee, type, record, state }) => {
      const status =
        state === 'expired' ? `פג תוקף בתאריך ${record?.expiresAt}`
          : state === 'soon' ? `עומד לפוג בתאריך ${record?.expiresAt}`
            : state === 'missing_expiry' ? 'חסר תאריך תוקף'
              : 'אין תיעוד הדרכה';
      return `• ${employee.fullName} — ${employeeTrainingLabel(type)} — ${status}`;
    });
    const subject = `תזכורת תוקף הדרכות עובדים — ${client.name}`;
    const body = `שלום,\n\nלהלן הדרכות עובדים שפגו או עומדות לפוג:\n\n${lines.join('\n')}\n\nנבקש לתאם חידוש הדרכות בהקדם.\n\nבברכה,\nסול בטיחות בע״מ`;
    window.location.href = `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const shareElearning = async (employee: SafetyClientEmployee) => {
    try {
      const existing = elearningAssignments.find(
        (assignment) => assignment.employeeId === employee.id && assignment.status !== 'completed',
      );
      const assignment = existing ?? await createElearningAssignment(employee);
      const basePath = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`;
      const url = new URL(`${basePath}safety/learn/${assignment.accessToken}`, window.location.origin).toString();
      const shareData: ShareData = {
        title: 'לומדת בטיחות כללית',
        text: `שלום ${employee.fullName}, זהו הקישור האישי שלך להשלמת לומדת הבטיחות הכללית:`,
        url,
      };
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${url}`);
        setMessage('קישור הלומדה הועתק וניתן לשלוח אותו לעובד');
      }
      await refresh();
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(cause instanceof Error ? cause.message : 'יצירת קישור הלומדה נכשלה');
      }
    }
  };

  const activeSites = useMemo(() => sites.filter((site) => site.active), [sites]);

  const tradeDraftFor = (employeeId: string) => {
    const existing = tradeDrafts[employeeId];
    if (existing) return existing;
    const tradeCode = TRADE_RISK_TRADES[0].code;
    const langs = languagesForTrade(tradeCode);
    return {
      tradeCode,
      language: langs[0] ?? 'he',
      siteId: activeSites[0]?.id ?? '',
    };
  };

  const addSite = async () => {
    if (!clientId || !newSite.name.trim()) return;
    try {
      await createClientSite({
        clientId,
        name: newSite.name,
        address: newSite.address,
      });
      setNewSite({ name: '', address: '' });
      setMessage('אתר הבנייה נוסף');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'הוספת אתר נכשלה');
    }
  };

  const copyTradeRiskLink = async (accessToken: string, label?: string) => {
    const url = tradeRiskShareUrl(accessToken);
    await navigator.clipboard.writeText(url);
    setMessage(label ? `הקישור הועתק (${label})` : 'הקישור הועתק — שלחו אותו לעובד בוואטסאפ');
  };

  const shareTradeRisk = async (employee: SafetyClientEmployee) => {
    const draft = tradeDraftFor(employee.id);
    if (!draft.siteId) {
      setError('יש להוסיף ולבחור אתר בנייה לפני שליחת טופס החתימה');
      return;
    }
    try {
      const existing = tradeRiskAssignments.find(
        (assignment) =>
          assignment.employeeId === employee.id
          && assignment.siteId === draft.siteId
          && assignment.tradeCode === draft.tradeCode
          && assignment.languageCode === draft.language
          && assignment.status !== 'completed',
      );
      const assignment = existing ?? await createTradeRiskAssignment({
        employee,
        siteId: draft.siteId,
        tradeCode: draft.tradeCode,
        languageCode: draft.language,
      });
      const url = tradeRiskShareUrl(assignment.accessToken);
      const siteName = sites.find((site) => site.id === draft.siteId)?.name || 'אתר הבנייה';
      const text = tradeRiskShareMessage({
        employeeName: employee.fullName,
        tradeLabel: tradeRiskLabel(draft.tradeCode),
        siteName,
        url,
      });
      // Prefer sharing a single text blob that already contains the URL.
      // On some iOS/WhatsApp flows the separate `url` field is dropped in RTL.
      const shareData: ShareData = {
        title: `תמצית סיכונים — ${tradeRiskLabel(draft.tradeCode)}`,
        text,
      };
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        setMessage(`קישור נשלח. אפשר גם להעתיק ידנית: ${url}`);
      } else {
        await navigator.clipboard.writeText(text);
        setMessage(`קישור החתימה הועתק:\n${url}`);
      }
      await refresh();
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(cause instanceof Error ? cause.message : 'יצירת קישור החתימה נכשלה');
      }
    }
  };

  const shareInductionDocument = async (
    employee: SafetyClientEmployee,
    language: ConstructionInductionLanguage,
  ) => {
    const document = CONSTRUCTION_INDUCTION_DOCUMENTS.find((item) => item.code === language)
      ?? CONSTRUCTION_INDUCTION_DOCUMENTS[0];
    try {
      const file = await loadConstructionInductionPdf(document);
      const data: ShareData = {
        title: `הדרכת עובד חדש באתר בנייה — ${document.label}`,
        text: `שלום ${employee.fullName}, מצורף מסמך הוראות הבטיחות לעובד חדש באתר בנייה בשפה ${document.label}. יש לקרוא את המסמך במלואו לפני תחילת העבודה.`,
        files: [file],
      };
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        await navigator.share(data);
      } else {
        downloadConstructionInductionPdf(file);
        setMessage('קובץ ה־PDF הורד וניתן לצרף אותו למייל או לוואטסאפ');
      }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(cause instanceof Error ? cause.message : 'שיתוף מסמך ההדרכה נכשל');
      }
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <main className="container mx-auto max-w-4xl p-4 space-y-5">
        <Link to={`/safety/client/${clientId}`} className="inline-flex items-center gap-1 text-sm text-slate-500">
          <ArrowRight className="w-4 h-4" /> חזרה ללקוח
        </Link>
        <header className="rounded-2xl bg-[#0f2744] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#f4c95d] text-[#0f2744] p-3"><Users /></div>
            <div><h1 className="text-2xl font-bold">עובדים ותוקף הדרכות</h1><p className="text-slate-300 text-sm">{client?.name}</p></div>
          </div>
          <Button onClick={sendReminder} className="gap-2 bg-white text-[#0f2744] hover:bg-slate-100">
            <Mail className="w-4 h-4" /> תזכורת במייל ({reminders.length})
          </Button>
        </header>

        {reminders.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
              <div><div className="font-semibold">{reminders.length} הדרכות דורשות טיפול</div><div className="text-sm text-amber-900">תוקף שפג או עומד לפוג, תוקף חסר או הדרכה ללא תיעוד.</div></div>
          </div>
        )}
        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
        {message && <div className="rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{message}</div>}

        <section className="rounded-xl border bg-white p-4 space-y-3">
          <h2 className="font-semibold">אתרי בנייה של הלקוח</h2>
          <p className="text-xs text-slate-500">
            תמציות הסיכונים החתומות נשמרות תחת אתר בנייה ספציפי של הלקוח.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <Input
              value={newSite.name}
              onChange={(event) => setNewSite({ ...newSite, name: event.target.value })}
              placeholder="שם אתר בנייה *"
            />
            <Input
              value={newSite.address}
              onChange={(event) => setNewSite({ ...newSite, address: event.target.value })}
              placeholder="כתובת אתר (אופציונלי)"
            />
            <Button onClick={() => void addSite()} disabled={!newSite.name.trim()} className="gap-1">
              <Plus className="w-4 h-4" /> הוסף אתר
            </Button>
          </div>
          {sites.length === 0 ? (
            <div className="text-sm text-slate-500">עדיין אין אתרים — הוסיפו אתר לפני שליחת טופס חתימה</div>
          ) : (
            <div className="space-y-2">
              {sites.map((site) => (
                <div key={site.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <div>
                    <div className="font-medium">{site.name}{!site.active ? ' (לא פעיל)' : ''}</div>
                    {site.address && <div className="text-slate-500">{site.address}</div>}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await updateClientSite(site.id, { active: !site.active });
                      await refresh();
                    }}
                  >
                    {site.active ? 'השבת' : 'הפעל'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-white p-4 space-y-3">
          <h2 className="font-semibold">הוספת עובד</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input value={newEmployee.fullName} onChange={(event) => setNewEmployee({ ...newEmployee, fullName: event.target.value })} placeholder="שם מלא *" />
            <Input value={newEmployee.idNumber} onChange={(event) => setNewEmployee({ ...newEmployee, idNumber: event.target.value })} placeholder="תעודת זהות" />
            <Input value={newEmployee.jobTitle} onChange={(event) => setNewEmployee({ ...newEmployee, jobTitle: event.target.value })} placeholder="תפקיד" />
            <Input value={newEmployee.phone} onChange={(event) => setNewEmployee({ ...newEmployee, phone: event.target.value })} placeholder="טלפון" />
            <Input className="sm:col-span-2" type="email" value={newEmployee.email} onChange={(event) => setNewEmployee({ ...newEmployee, email: event.target.value })} placeholder="דוא״ל עובד" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void addEmployee()} disabled={!newEmployee.fullName.trim()} className="gap-1"><Plus className="w-4 h-4" /> הוסף עובד</Button>
            <label className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm cursor-pointer hover:bg-slate-50">
              <Upload className="w-4 h-4" /> ייבוא CSV
              <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void importCsv(file); }} />
            </label>
          </div>
          <p className="text-xs text-slate-500">עמודות נתמכות: שם מלא, תעודת זהות, תפקיד, טלפון, דוא״ל. ניתן גם להעלות קובץ עם שם אחד בכל שורה.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">מאגר עובדים ({employees.length})</h2>
          {employees.map((employee) => {
            const employeeRecords = recordsByEmployee[employee.id] ?? [];
            return (
              <div key={employee.id} className={`rounded-xl border bg-white ${employee.active ? '' : 'opacity-60'}`}>
                <button type="button" onClick={() => setExpanded(expanded === employee.id ? null : employee.id)} className="w-full p-4 flex items-center justify-between gap-3 text-right">
                  <div>
                    <div className="font-semibold">{employee.fullName}</div>
                    <div className="text-sm text-slate-500">{[employee.idNumber, employee.jobTitle].filter(Boolean).join(' · ')}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {trainingTypes.map((type) => {
                        const latest = latestRecord(employee.id, type);
                        const state = trainingComplianceState(type, Boolean(latest), latest?.expiresAt);
                        return (
                          <span key={type} className={`text-[10px] rounded-full px-2 py-0.5 ${
                            state === 'expired' ? 'bg-red-100 text-red-800'
                              : state === 'soon' ? 'bg-amber-100 text-amber-900'
                                : state === 'missing' || state === 'missing_expiry' ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {EMPLOYEE_TRAINING_DETAILS[type].label}:{' '}
                            {state === 'missing' ? 'אין תיעוד'
                              : state === 'missing_expiry' ? 'חסר תאריך תוקף'
                                : state === 'expired' ? `פג תוקף ${latest?.expiresAt}`
                                  : state === 'soon' ? `עומד לפוג ${latest?.expiresAt}`
                                    : latest?.expiresAt ? `בתוקף עד ${latest.expiresAt}` : `בוצע ${latest?.completedAt}`}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {expanded === employee.id ? <ChevronUp /> : <ChevronDown />}
                </button>
                {expanded === employee.id && (
                  <div className="border-t p-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => openRecordForm(employee.id)}><Plus className="w-4 h-4 ml-1" /> תיעוד הדרכה</Button>
                      <Button size="sm" variant="secondary" onClick={() => void shareElearning(employee)}>
                        <Share2 className="w-4 h-4 ml-1" /> שלח לומדה
                      </Button>
                      <Button size="sm" variant="outline" onClick={async () => { await updateClientEmployee(employee.id, { active: !employee.active }); await refresh(); }}>{employee.active ? 'הפוך ללא פעיל' : 'החזר לפעיל'}</Button>
                      {isAdmin && <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => { if (confirm(`למחוק את ${employee.fullName}?`)) { await deleteClientEmployee(employee.id); await refresh(); } }}><Trash2 className="w-4 h-4" /></Button>}
                    </div>
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 space-y-2">
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <FileText className="w-4 h-4" /> הוראות בטיחות לעובד חדש באתר בנייה
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                        <select
                          value={inductionLanguages[employee.id] ?? 'he'}
                          onChange={(event) => setInductionLanguages({
                            ...inductionLanguages,
                            [employee.id]: event.target.value as ConstructionInductionLanguage,
                          })}
                          className="h-10 rounded-md border bg-white px-3 text-sm"
                          aria-label={`שפת מסמך הדרכת עובד חדש עבור ${employee.fullName}`}
                        >
                          {CONSTRUCTION_INDUCTION_DOCUMENTS.map((document) => (
                            <option key={document.code} value={document.code}>
                              {document.label} — {document.nativeLabel}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const document = CONSTRUCTION_INDUCTION_DOCUMENTS.find(
                              (item) => item.code === (inductionLanguages[employee.id] ?? 'he'),
                            ) ?? CONSTRUCTION_INDUCTION_DOCUMENTS[0];
                            void openConstructionInductionPdf(document).catch((cause) => {
                              setError(cause instanceof Error ? cause.message : 'פתיחת מסמך ההדרכה נכשלה');
                            });
                          }}
                        >
                          פתח PDF
                        </Button>
                        <Button size="sm" onClick={() => void shareInductionDocument(employee, inductionLanguages[employee.id] ?? 'he')}>
                          <Share2 className="w-4 h-4 ml-1" /> שתף לעובד
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <FileText className="w-4 h-4" /> תמצית סיכונים לפי מקצוע — לחתימת העובד
                      </div>
                      {(() => {
                        const draft = tradeDraftFor(employee.id);
                        const langs = languagesForTrade(draft.tradeCode);
                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select
                              value={draft.tradeCode}
                              onChange={(event) => {
                                const tradeCode = event.target.value as TradeRiskCode;
                                const nextLangs = languagesForTrade(tradeCode);
                                setTradeDrafts({
                                  ...tradeDrafts,
                                  [employee.id]: {
                                    tradeCode,
                                    language: nextLangs.includes(draft.language) ? draft.language : (nextLangs[0] ?? 'he'),
                                    siteId: draft.siteId || activeSites[0]?.id || '',
                                  },
                                });
                              }}
                              className="h-10 rounded-md border bg-white px-3 text-sm"
                              aria-label={`מקצוע לתמצית סיכונים עבור ${employee.fullName}`}
                            >
                              {TRADE_RISK_TRADES.map((trade) => (
                                <option key={trade.code} value={trade.code}>{trade.label}</option>
                              ))}
                            </select>
                            <select
                              value={draft.language}
                              onChange={(event) => setTradeDrafts({
                                ...tradeDrafts,
                                [employee.id]: { ...draft, language: event.target.value as TradeRiskLanguage },
                              })}
                              className="h-10 rounded-md border bg-white px-3 text-sm"
                              aria-label={`שפת תמצית סיכונים עבור ${employee.fullName}`}
                            >
                              {langs.map((language) => {
                                const document = getTradeRiskDocument(draft.tradeCode, language);
                                return (
                                  <option key={language} value={language}>
                                    {document?.languageLabel || language}
                                  </option>
                                );
                              })}
                            </select>
                            <select
                              value={draft.siteId}
                              onChange={(event) => setTradeDrafts({
                                ...tradeDrafts,
                                [employee.id]: { ...draft, siteId: event.target.value },
                              })}
                              className="h-10 rounded-md border bg-white px-3 text-sm"
                              aria-label={`אתר בנייה לתמצית סיכונים עבור ${employee.fullName}`}
                            >
                              <option value="">בחרו אתר בנייה…</option>
                              {activeSites.map((site) => (
                                <option key={site.id} value={site.id}>{site.name}</option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const document = getTradeRiskDocument(draft.tradeCode, draft.language);
                                if (!document) {
                                  setError('מסמך תמצית הסיכונים לא נמצא');
                                  return;
                                }
                                void openTradeRiskPdf(document).catch((cause) => {
                                  setError(cause instanceof Error ? cause.message : 'פתיחת המסמך נכשלה');
                                });
                              }}
                            >
                              פתח PDF
                            </Button>
                            <Button size="sm" className="sm:col-span-2" onClick={() => void shareTradeRisk(employee)}>
                              <Share2 className="w-4 h-4 ml-1" /> שלח טופס חתימה לעובד
                            </Button>
                          </div>
                        );
                      })()}
                      {tradeRiskAssignments
                        .filter((assignment) => assignment.employeeId === employee.id)
                        .slice(0, 5)
                        .map((assignment) => (
                          <div key={assignment.id} className="rounded-md border bg-white p-2 text-xs text-slate-700 space-y-1">
                            <div>
                              {tradeRiskLabel(assignment.tradeCode)} · {assignment.siteName || 'אתר'} ·{' '}
                              {assignment.status === 'completed'
                                ? `נחתם${assignment.acknowledgedAt ? ` ב־${new Date(assignment.acknowledgedAt).toLocaleString('he-IL')}` : ''}${assignment.signerName ? ` ע״י ${assignment.signerName}` : ''}`
                                : assignment.status === 'in_progress' ? 'נפתח — ממתין לחתימה' : 'נשלח — ממתין לפתיחה'}
                            </div>
                            {assignment.status !== 'completed' && (
                              <div className="flex flex-wrap items-center gap-2">
                                <span dir="ltr" className="break-all text-[11px] text-slate-500">
                                  {tradeRiskShareUrl(assignment.accessToken)}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => void copyTradeRiskLink(
                                    assignment.accessToken,
                                    tradeRiskLabel(assignment.tradeCode),
                                  )}
                                >
                                  העתק קישור
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                    {addingRecordFor === employee.id && (
                      <div className="rounded-lg border bg-slate-50 p-3 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select value={recordDraft.trainingType} onChange={(event) => { const type = event.target.value as EmployeeTrainingType; setRecordDraft({ ...recordDraft, trainingType: type, expiresAt: defaultTrainingExpiry(type, recordDraft.completedAt) || '' }); }} className="h-10 rounded-md border bg-white px-3">
                            {trainingTypes.map((type) => <option key={type} value={type}>{employeeTrainingLabel(type)}</option>)}
                          </select>
                          <label className="text-xs">תאריך ביצוע<Input type="date" value={recordDraft.completedAt} onChange={(event) => setRecordDraft({ ...recordDraft, completedAt: event.target.value, expiresAt: defaultTrainingExpiry(recordDraft.trainingType, event.target.value) || '' })} /></label>
                          <label className="text-xs">תוקף עד<Input type="date" value={recordDraft.expiresAt} onChange={(event) => setRecordDraft({ ...recordDraft, expiresAt: event.target.value })} /></label>
                          <Input value={recordDraft.certificateNumber} onChange={(event) => setRecordDraft({ ...recordDraft, certificateNumber: event.target.value })} placeholder="מספר אישור" />
                        </div>
                        <Textarea value={recordDraft.notes} onChange={(event) => setRecordDraft({ ...recordDraft, notes: event.target.value })} placeholder="הערות" />
                        <div className="flex gap-2"><Button size="sm" onClick={() => void addRecord()}>שמור</Button><Button size="sm" variant="ghost" onClick={() => setAddingRecordFor(null)}>ביטול</Button></div>
                      </div>
                    )}
                    {elearningAssignments
                      .filter((assignment) => assignment.employeeId === employee.id)
                      .slice(0, 2)
                      .map((assignment) => (
                        <div key={assignment.id} className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">
                          לומדה דיגיטלית: {assignment.status === 'completed'
                            ? `הושלמה בציון ${assignment.score} · אישור ${assignment.certificateNumber}`
                            : assignment.status === 'in_progress' ? 'בתהליך' : 'טרם נפתחה'}
                        </div>
                      ))}
                    {employeeRecords.length === 0 ? <div className="text-sm text-slate-500">אין תיעוד הדרכות</div> : employeeRecords.map((record) => (
                      <div key={record.id} className="rounded-lg border p-3 flex justify-between gap-2 text-sm">
                        <div><div className="font-medium">{employeeTrainingLabel(record.trainingType)}</div><div className="text-slate-500">בוצע: {record.completedAt}{record.expiresAt ? ` · תוקף: ${record.expiresAt}` : ''}{record.certificateNumber ? ` · אישור: ${record.certificateNumber}` : ''}</div>{record.notes && <div>{record.notes}</div>}</div>
                        <Button size="icon" variant="ghost" onClick={async () => { await deleteEmployeeTrainingRecord(record.id); await refresh(); }}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
