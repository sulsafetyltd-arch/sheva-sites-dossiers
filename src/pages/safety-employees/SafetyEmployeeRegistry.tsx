import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Mail,
  Plus,
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

const trainingTypes = Object.keys(EMPLOYEE_TRAINING_DETAILS) as EmployeeTrainingType[];
const today = () => new Date().toISOString().slice(0, 10);

export default function SafetyEmployeeRegistry() {
  const { clientId } = useParams();
  const { isAdmin } = useSafetyAuth();
  const [client, setClient] = useState<SafetyAuditClient | null>(null);
  const [employees, setEmployees] = useState<SafetyClientEmployee[]>([]);
  const [records, setRecords] = useState<SafetyEmployeeTrainingRecord[]>([]);
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
      const [nextClient, nextEmployees] = await Promise.all([
        getClient(clientId),
        listClientEmployees(clientId),
      ]);
      const nextRecords = await listEmployeeTrainingRecords(nextEmployees.map((employee) => employee.id));
      setClient(nextClient);
      setEmployees(nextEmployees);
      setRecords(nextRecords);
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
                      <Button size="sm" variant="outline" onClick={async () => { await updateClientEmployee(employee.id, { active: !employee.active }); await refresh(); }}>{employee.active ? 'הפוך ללא פעיל' : 'החזר לפעיל'}</Button>
                      {isAdmin && <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => { if (confirm(`למחוק את ${employee.fullName}?`)) { await deleteClientEmployee(employee.id); await refresh(); } }}><Trash2 className="w-4 h-4" /></Button>}
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
