import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Camera, CreditCard, Eye, FolderOpen, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SignaturePad from '@/components/dossier/SignaturePad';
import {
  createTrainingParticipant,
  deleteParticipantIdDocument,
  deleteTrainingParticipant,
  getTrainingSession,
  getTrainingSignatureUrls,
  listTrainingParticipants,
  saveParticipantSignature,
  saveParticipantIdDocument,
  updateTrainingParticipant,
  updateTrainingSession,
} from '@/lib/safety-training-store';
import { syncTrainingSessionToEmployeeRegistry } from '@/lib/safety-employee-store';
import type { SafetyTrainingParticipant, SafetyTrainingSession } from '@/types/safety-training';
import {
  CONSTRUCTION_INDUCTION_DOCUMENTS,
  GENERAL_TRAINING_TOPICS,
  HEIGHT_TRAINING_TOPICS,
  TRAINING_CATEGORY_DETAILS,
  trainingCategoryLabel,
} from '@/types/safety-training';

export default function SafetyTrainingEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SafetyTrainingSession | null>(null);
  const [participants, setParticipants] = useState<SafetyTrainingParticipant[]>([]);
  const [signatureUrls, setSignatureUrls] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');
  const [signingId, setSigningId] = useState<string | null>(null);
  const [uploadingDocuments, setUploadingDocuments] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!id) throw new Error('מזהה ההדרכה חסר');
        const [nextSession, nextParticipants] = await Promise.all([
          getTrainingSession(id),
          listTrainingParticipants(id),
        ]);
        if (!nextSession) throw new Error('ההדרכה לא נמצאה');
        const urls = await getTrainingSignatureUrls(
          nextParticipants.flatMap((participant) => [
            ...(participant.signatureStoragePath ? [participant.signatureStoragePath] : []),
            ...(participant.idDocumentStoragePath ? [participant.idDocumentStoragePath] : []),
          ]),
        );
        if (!cancelled) {
          setSession(nextSession);
          setParticipants(nextParticipants);
          setSignatureUrls(urls);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'טעינת ההדרכה נכשלה');
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const saveSession = async (status?: 'draft' | 'final') => {
    if (!session) return false;
    if (status === 'final') {
      if (participants.length === 0) {
        setError('יש להוסיף לפחות עובד אחד לפני סיום ההדרכה');
        return false;
      }
      if (participants.some((participant) => !participant.signatureStoragePath)) {
        setError('יש להשלים חתימה של כל העובדים לפני סיום ההדרכה');
        return false;
      }
      if (!session.instructorSignatureDataUrl) {
        setError('יש להשלים את חתימת המדריך לפני סיום ההדרכה');
        return false;
      }
      if (session.category === 'work_at_height') {
        const details = session.formDetails;
        if (!details?.validFrom || !details.validUntil) {
          setError('יש להזין את תאריכי תוקף האישורים');
          return false;
        }
        if (!session.instructorLicenseNumber || !details.instructorIdNumber) {
          setError('יש להשלים את פרטי ההסמכה ותעודת הזהות של מדריך העבודה בגובה');
          return false;
        }
        if (participants.some((participant) =>
          !participant.firstName || !participant.lastName || !participant.employeeIdNumber
        )) {
          setError('באישור עבודה בגובה חובה להשלים שם פרטי, שם משפחה ותעודת זהות לכל עובד');
          return false;
        }
        if (participants.some((participant) => !participant.idDocumentStoragePath)) {
          setError('יש לצרף צילום תעודת זהות או רישיון נהיגה לכל עובד לפני סיום ההדרכה');
          return false;
        }
      }
    }
    setSaving(true);
    try {
      const saved = await updateTrainingSession(session.id, { ...session, status: status ?? session.status });
      if (status === 'final') {
        await syncTrainingSessionToEmployeeRegistry(saved, participants);
      }
      setSession(saved);
      setError(null);
      setMessage(status === 'final' ? 'ההדרכה הושלמה' : 'פרטי ההדרכה נשמרו');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'שמירת ההדרכה נכשלה');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addParticipant = async () => {
    if (!session || !newName.trim()) return;
    try {
      const created = await createTrainingParticipant(session.id, newName.trim(), participants.length);
      setParticipants((current) => [...current, created]);
      setNewName('');
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'הוספת העובד נכשלה');
    }
  };

  const changeParticipant = (id: string, patch: Partial<SafetyTrainingParticipant>) => {
    setParticipants((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const persistParticipant = async (participant: SafetyTrainingParticipant) => {
    try {
      const saved = await updateTrainingParticipant(participant.id, participant);
      changeParticipant(participant.id, saved);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'שמירת פרטי העובד נכשלה');
    }
  };

  const signParticipant = async (participant: SafetyTrainingParticipant, dataUrl: string | null) => {
    if (!session) return;
    try {
      const saved = await saveParticipantSignature(session, participant, dataUrl);
      changeParticipant(participant.id, saved);
      if (saved.signatureStoragePath && dataUrl) {
        setSignatureUrls((current) => ({ ...current, [saved.signatureStoragePath!]: dataUrl }));
      }
      setSigningId(null);
      setError(null);
      setMessage(dataUrl ? `החתימה של ${participant.employeeName} נשמרה` : 'החתימה נמחקה');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'שמירת החתימה נכשלה');
    }
  };

  const uploadIdDocument = async (participant: SafetyTrainingParticipant, file?: File) => {
    if (!session || !file || uploadingDocuments.has(participant.id)) return;
    setUploadingDocuments((current) => new Set(current).add(participant.id));
    try {
      const saved = await saveParticipantIdDocument(session, participant, file);
      changeParticipant(participant.id, saved);
      if (saved.idDocumentStoragePath) {
        const urls = await getTrainingSignatureUrls([saved.idDocumentStoragePath]);
        setSignatureUrls((current) => ({ ...current, ...urls }));
      }
      setError(null);
      setMessage(`צילום ${saved.idDocumentType === 'drivers_license' ? 'רישיון הנהיגה' : 'תעודת הזהות'} של ${participant.employeeName} נשמר`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'שמירת צילום המסמך נכשלה');
    } finally {
      setUploadingDocuments((current) => {
        const next = new Set(current);
        next.delete(participant.id);
        return next;
      });
    }
  };

  const removeIdDocument = async (participant: SafetyTrainingParticipant) => {
    try {
      const saved = await deleteParticipantIdDocument(participant);
      changeParticipant(participant.id, saved);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'מחיקת צילום המסמך נכשלה');
    }
  };

  const removeParticipant = async (participant: SafetyTrainingParticipant) => {
    if (!confirm(`להסיר את ${participant.employeeName} מרשימת המשתתפים?`)) return;
    try {
      await deleteTrainingParticipant(participant);
      setParticipants((current) => current.filter((item) => item.id !== participant.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'הסרת העובד נכשלה');
    }
  };

  if (!session) return <div dir="rtl" className="p-6">{error || 'טוען…'}</div>;
  const details = TRAINING_CATEGORY_DETAILS[session.category];
  const heightDetails = session.formDetails ?? {};
  const setHeightDetails = (patch: Partial<NonNullable<SafetyTrainingSession['formDetails']>>) =>
    setSession({ ...session, formDetails: { ...heightDetails, ...patch } });
  const inductionDocument = CONSTRUCTION_INDUCTION_DOCUMENTS.find(
    (item) => item.code === (heightDetails.constructionInductionLanguage ?? 'he'),
  ) ?? CONSTRUCTION_INDUCTION_DOCUMENTS[0];
  const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  const inductionDocumentHref = `${basePath}training-documents/new-worker-construction/${inductionDocument.file}`;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <main className="container mx-auto max-w-3xl px-4 pb-24 space-y-5" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link to={`/safety/training/client/${session.clientId}`} className="inline-flex items-center gap-1 text-sm text-slate-500">
              <ArrowRight className="w-4 h-4" /> כל ההדרכות
            </Link>
            <h1 className="text-2xl font-bold mt-1">{trainingCategoryLabel(session.category)}</h1>
            <div className="text-sm text-slate-500">{session.sessionNumber}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => void saveSession()} disabled={saving} className="gap-1 min-h-11">
              <Save className="w-4 h-4" /> שמירה
            </Button>
            <Button asChild className="gap-1 min-h-11">
              <Link to={`/safety/training/preview/${session.id}`}><Eye className="w-4 h-4" /> תצוגה / PDF</Link>
            </Button>
          </div>
        </div>

        {message && <div className="rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{message}</div>}
        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

        <section className="rounded-xl border bg-white p-4 space-y-3">
          <h2 className="font-semibold">פרטי ההדרכה</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input type="date" value={session.trainingDate} onChange={(event) => setSession({ ...session, trainingDate: event.target.value })} />
            <Input value={session.location || ''} onChange={(event) => setSession({ ...session, location: event.target.value })} placeholder="מיקום / אתר" />
            <Input className="sm:col-span-2" value={session.topic} onChange={(event) => setSession({ ...session, topic: event.target.value })} placeholder="נושא ההדרכה" />
            <Input type="number" step="0.5" value={session.durationHours ?? ''} onChange={(event) => setSession({ ...session, durationHours: event.target.value ? Number(event.target.value) : undefined })} placeholder="משך בשעות" />
            <Input value={session.language || ''} onChange={(event) => setSession({ ...session, language: event.target.value })} placeholder="שפת ההדרכה" />
            <Input value={session.instructorName || ''} onChange={(event) => setSession({ ...session, instructorName: event.target.value })} placeholder="שם המדריך" />
            <Input value={session.instructorLicenseNumber || ''} onChange={(event) => setSession({ ...session, instructorLicenseNumber: event.target.value })} placeholder="מספר הסמכה / רישיון מדריך" />
          </div>
          <Textarea value={session.notes || ''} onChange={(event) => setSession({ ...session, notes: event.target.value })} placeholder="הערות ותוכן נוסף" />
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="font-medium mb-1">נושאים מרכזיים</div>
            <ul className="list-disc pr-5">{details.content.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </section>

        {session.category === 'general' && (
          <section className="rounded-xl border bg-white p-4 space-y-4">
            <h2 className="font-semibold">פרטי טופס הדרכת בטיחות כללית</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input value={heightDetails.companyName || ''} onChange={(event) => setHeightDetails({ companyName: event.target.value })} placeholder="שם החברה / המעסיק" />
              <Input value={heightDetails.companyRegistrationNumber || ''} onChange={(event) => setHeightDetails({ companyRegistrationNumber: event.target.value })} placeholder="ח.פ. / ע.מ." />
              <Input value={heightDetails.siteAddress || ''} onChange={(event) => setHeightDetails({ siteAddress: event.target.value })} placeholder="כתובת האתר" />
              <Input value={heightDetails.instructorOrganization || ''} onChange={(event) => setHeightDetails({ instructorOrganization: event.target.value })} placeholder="המדריך מטעם" />
              <label className="text-sm">שעת התחלה<Input type="time" value={heightDetails.startTime || ''} onChange={(event) => setHeightDetails({ startTime: event.target.value })} /></label>
              <label className="text-sm">שעת סיום<Input type="time" value={heightDetails.endTime || ''} onChange={(event) => setHeightDetails({ endTime: event.target.value })} /></label>
              <label className="text-sm sm:col-span-2">
                סוג התיעוד במאגר העובדים
                <select
                  value={heightDetails.generalTrainingRecordType ?? 'annual_safety'}
                  onChange={(event) => setHeightDetails({ generalTrainingRecordType: event.target.value as 'annual_safety' | 'new_employee' })}
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                >
                  <option value="annual_safety">הדרכת בטיחות שנתית</option>
                  <option value="new_employee">הדרכת עובד חדש / לפני תחילת עבודה</option>
                </select>
              </label>
              {(heightDetails.generalTrainingRecordType ?? 'annual_safety') === 'new_employee' && (
                <div className="sm:col-span-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3 space-y-2">
                  <label className="text-sm font-medium">
                    שפת מסמך הוראות הבטיחות לעובד חדש
                    <select
                      value={heightDetails.constructionInductionLanguage ?? 'he'}
                      onChange={(event) => setHeightDetails({ constructionInductionLanguage: event.target.value as NonNullable<SafetyTrainingSession['formDetails']>['constructionInductionLanguage'] })}
                      className="flex h-10 w-full rounded-md border bg-white px-3 text-sm mt-1"
                    >
                      {CONSTRUCTION_INDUCTION_DOCUMENTS.map((document) => (
                        <option key={document.code} value={document.code}>{document.label} — {document.nativeLabel}</option>
                      ))}
                    </select>
                  </label>
                  <Button asChild type="button" size="sm" variant="outline">
                    <a href={inductionDocumentHref} target="_blank" rel="noreferrer">פתח את מסמך ההדרכה בשפה שנבחרה</a>
                  </Button>
                </div>
              )}
            </div>
            <div>
              <h3 className="font-medium mb-2">נושאי ההדרכה שהועברו</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GENERAL_TRAINING_TOPICS.map((topic) => {
                  const selected = (heightDetails.generalSelectedTopics ?? GENERAL_TRAINING_TOPICS).includes(topic);
                  return (
                    <label key={topic} className="flex items-start gap-2 rounded-lg border p-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => setHeightDetails({
                          generalSelectedTopics: selected
                            ? (heightDetails.generalSelectedTopics ?? [...GENERAL_TRAINING_TOPICS]).filter((item) => item !== topic)
                            : [...(heightDetails.generalSelectedTopics ?? []), topic],
                        })}
                      />
                      {topic}
                    </label>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <Input value={heightDetails.generalOtherTopic1 || ''} onChange={(event) => setHeightDetails({ generalOtherTopic1: event.target.value })} placeholder="נושא נוסף" />
                <Input value={heightDetails.generalOtherTopic2 || ''} onChange={(event) => setHeightDetails({ generalOtherTopic2: event.target.value })} placeholder="נושא נוסף" />
              </div>
            </div>
          </section>
        )}

        {session.category === 'work_at_height' && (
          <section className="rounded-xl border bg-white p-4 space-y-4">
            <h2 className="font-semibold">פרטי טופס ואישור עבודה בגובה</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input value={heightDetails.companyName || ''} onChange={(event) => setHeightDetails({ companyName: event.target.value })} placeholder="שם החברה / מבצע הבנייה" />
              <Input value={heightDetails.companyRegistrationNumber || ''} onChange={(event) => setHeightDetails({ companyRegistrationNumber: event.target.value })} placeholder="ח.פ." />
              <Input value={heightDetails.companyAddress || ''} onChange={(event) => setHeightDetails({ companyAddress: event.target.value })} placeholder="כתובת החברה" />
              <Input value={heightDetails.companyPostalCode || ''} onChange={(event) => setHeightDetails({ companyPostalCode: event.target.value })} placeholder="מיקוד" />
              <Input value={heightDetails.companyPhone || ''} onChange={(event) => setHeightDetails({ companyPhone: event.target.value })} placeholder="טלפון החברה" />
              <Input value={heightDetails.managerName || ''} onChange={(event) => setHeightDetails({ managerName: event.target.value })} placeholder="מנהל המפעל / העבודה / הפרויקט" />
            </div>

            <h3 className="font-medium">פרטי מדריך העבודה בגובה</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input value={heightDetails.instructorIdNumber || ''} onChange={(event) => setHeightDetails({ instructorIdNumber: event.target.value })} placeholder="תעודת זהות המדריך" />
              <Input type="number" value={heightDetails.instructorExperienceYears ?? ''} onChange={(event) => setHeightDetails({ instructorExperienceYears: event.target.value ? Number(event.target.value) : undefined })} placeholder="ותק וניסיון בשנים" />
              <Input type="date" value={heightDetails.instructorAuthorizationExpiry || ''} onChange={(event) => setHeightDetails({ instructorAuthorizationExpiry: event.target.value })} aria-label="תוקף הסמכת המדריך" />
              <Input value={heightDetails.instructorAddress || ''} onChange={(event) => setHeightDetails({ instructorAddress: event.target.value })} placeholder="כתובת המדריך" />
              <Input type="email" value={heightDetails.instructorEmail || ''} onChange={(event) => setHeightDetails({ instructorEmail: event.target.value })} placeholder="דוא״ל המדריך" />
            </div>

            <h3 className="font-medium">תוקף ותחומי ההדרכה</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm">בתוקף מיום<Input type="date" value={heightDetails.validFrom || ''} onChange={(event) => setHeightDetails({ validFrom: event.target.value })} /></label>
              <label className="text-sm">בתוקף עד יום<Input type="date" value={heightDetails.validUntil || ''} onChange={(event) => setHeightDetails({ validUntil: event.target.value })} /></label>
              <Input className="sm:col-span-2" value={heightDetails.certificateScope || ''} onChange={(event) => setHeightDetails({ certificateScope: event.target.value })} placeholder="האישור תקף לעבודה במסגרת..." />
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={heightDetails.includeIdDocumentsInGroupPdf ?? false}
                onChange={(event) => setHeightDetails({ includeIdDocumentsInGroupPdf: event.target.checked })}
              />
              <span>
                <strong>כלול צילומי תעודות זהות / רישיונות נהיגה ב־PDF המרוכז</strong>
                <span className="block text-xs text-amber-900 mt-1">
                  המסמכים מכילים מידע אישי רגיש. אם האפשרות אינה מסומנת, ה־PDF יציין רק שהצילום צורף.
                </span>
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HEIGHT_TRAINING_TOPICS.map((topic) => {
                const selected = (heightDetails.selectedTopics ?? HEIGHT_TRAINING_TOPICS).includes(topic);
                return (
                  <label key={topic} className="flex items-start gap-2 rounded-lg border p-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => setHeightDetails({
                        selectedTopics: selected
                          ? (heightDetails.selectedTopics ?? [...HEIGHT_TRAINING_TOPICS]).filter((item) => item !== topic)
                          : [...(heightDetails.selectedTopics ?? []), topic],
                      })}
                    />
                    {topic}
                  </label>
                );
              })}
            </div>

            <h3 className="font-medium">תרגום ההדרכה (אם נדרש)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input value={heightDetails.translatorLanguage || ''} onChange={(event) => setHeightDetails({ translatorLanguage: event.target.value })} placeholder="שפת התרגום" />
              <Input value={heightDetails.translatorName || ''} onChange={(event) => setHeightDetails({ translatorName: event.target.value })} placeholder="שם המתרגם" />
            </div>
            {heightDetails.translatorName && (
              <SignaturePad
                value={heightDetails.translatorSignatureDataUrl}
                onChange={(dataUrl) => setHeightDetails({ translatorSignatureDataUrl: dataUrl || undefined })}
              />
            )}

            <h3 className="font-medium">חתימת מנהל העבודה / הפרויקט</h3>
            <SignaturePad
              value={heightDetails.managerSignatureDataUrl}
              onChange={(dataUrl) => setHeightDetails({ managerSignatureDataUrl: dataUrl || undefined })}
            />
          </section>
        )}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-lg">רשימת עובדים וחתימות</h2>
              <div className="text-xs text-slate-500">{participants.filter((item) => item.signatureStoragePath).length} מתוך {participants.length} חתמו</div>
            </div>
            <div className="flex gap-2">
              <Input value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void addParticipant(); }} placeholder="שם עובד חדש" />
              <Button onClick={() => void addParticipant()} disabled={!newName.trim()}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>

          {participants.map((participant, index) => (
            <div key={participant.id} className="rounded-xl border bg-white p-4 space-y-3">
              <div className="flex justify-between gap-2">
                <span className="text-sm text-slate-500">עובד #{index + 1}</span>
                <Button size="icon" variant="ghost" onClick={() => void removeParticipant(participant)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {session.category === 'work_at_height' ? (
                  <>
                    <Input value={participant.firstName || ''} onChange={(event) => changeParticipant(participant.id, { firstName: event.target.value, employeeName: `${event.target.value} ${participant.lastName || ''}`.trim() })} onBlur={() => void persistParticipant(participant)} placeholder="שם פרטי" />
                    <Input value={participant.lastName || ''} onChange={(event) => changeParticipant(participant.id, { lastName: event.target.value, employeeName: `${participant.firstName || ''} ${event.target.value}`.trim() })} onBlur={() => void persistParticipant(participant)} placeholder="שם משפחה" />
                  </>
                ) : (
                  <Input value={participant.employeeName} onChange={(event) => changeParticipant(participant.id, { employeeName: event.target.value })} onBlur={() => void persistParticipant(participant)} placeholder="שם מלא" />
                )}
                <Input value={participant.employeeIdNumber || ''} onChange={(event) => changeParticipant(participant.id, { employeeIdNumber: event.target.value })} onBlur={() => void persistParticipant(participant)} placeholder="תעודת זהות / דרכון" />
                <Input value={participant.employer || ''} onChange={(event) => changeParticipant(participant.id, { employer: event.target.value })} onBlur={() => void persistParticipant(participant)} placeholder="מעסיק / קבלן" />
                <Input value={participant.jobTitle || ''} onChange={(event) => changeParticipant(participant.id, { jobTitle: event.target.value })} onBlur={() => void persistParticipant(participant)} placeholder="תפקיד" />
                {session.category === 'work_at_height' && (
                  <>
                    <Input value={participant.fatherName || ''} onChange={(event) => changeParticipant(participant.id, { fatherName: event.target.value })} onBlur={() => void persistParticipant(participant)} placeholder="שם האב" />
                    <Input type="number" value={participant.birthYear ?? ''} onChange={(event) => changeParticipant(participant.id, { birthYear: event.target.value ? Number(event.target.value) : undefined })} onBlur={() => void persistParticipant(participant)} placeholder="שנת לידה" />
                    <Input className="sm:col-span-2" value={participant.address || ''} onChange={(event) => changeParticipant(participant.id, { address: event.target.value })} onBlur={() => void persistParticipant(participant)} placeholder="כתובת העובד" />
                  </>
                )}
              </div>
              {session.category === 'work_at_height' && (
                <div className="rounded-lg border bg-slate-50 p-3 space-y-3">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <CreditCard className="w-4 h-4" />
                    צילום מסמך מזהה — נשמר באחסון פרטי
                  </div>
                  <select
                    value={participant.idDocumentType ?? 'id_card'}
                    onChange={(event) => {
                      const updated = {
                        ...participant,
                        idDocumentType: event.target.value as SafetyTrainingParticipant['idDocumentType'],
                      };
                      changeParticipant(participant.id, updated);
                      void persistParticipant(updated);
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                    aria-label={`סוג מסמך של ${participant.employeeName}`}
                  >
                    <option value="id_card">תעודת זהות</option>
                    <option value="drivers_license">רישיון נהיגה</option>
                  </select>
                  {participant.idDocumentStoragePath && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-white p-2">
                      <img
                        src={signatureUrls[participant.idDocumentStoragePath]}
                        alt={`צילום מסמך של ${participant.employeeName}`}
                        className="h-24 max-w-[220px] rounded object-contain"
                      />
                      <Button type="button" size="icon" variant="ghost" onClick={() => void removeIdDocument(participant)} aria-label="מחיקת צילום המסמך">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className={`rounded-lg border-2 border-dashed p-3 flex items-center justify-center gap-2 ${uploadingDocuments.has(participant.id) ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}>
                      <FolderOpen className="w-4 h-4" />
                      {participant.idDocumentStoragePath ? 'החלף מהגלריה' : 'בחר מהגלריה'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingDocuments.has(participant.id)}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          void uploadIdDocument(participant, file);
                        }}
                      />
                    </label>
                    <label className={`rounded-lg border-2 border-dashed p-3 flex items-center justify-center gap-2 ${uploadingDocuments.has(participant.id) ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}>
                      <Camera className="w-4 h-4" />
                      צלם במצלמה
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        disabled={uploadingDocuments.has(participant.id)}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          void uploadIdDocument(participant, file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}
              {participant.signatureStoragePath && signingId !== participant.id ? (
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3">
                  <img src={signatureUrls[participant.signatureStoragePath]} alt={`חתימת ${participant.employeeName}`} className="h-12 max-w-40 object-contain bg-white border rounded" />
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setSigningId(participant.id)}>חתום מחדש</Button>
                    <Button size="sm" variant="ghost" onClick={() => void signParticipant(participant, null)}>מחק חתימה</Button>
                  </div>
                </div>
              ) : signingId === participant.id ? (
                <SignaturePad onChange={(dataUrl) => void signParticipant(participant, dataUrl)} />
              ) : (
                <Button type="button" variant="outline" onClick={() => setSigningId(participant.id)}>חתימת העובד</Button>
              )}
            </div>
          ))}
        </section>

        <section className="rounded-xl border bg-white p-4 space-y-3">
          <h2 className="font-semibold">חתימת המדריך</h2>
          <SignaturePad
            value={session.instructorSignatureDataUrl}
            onChange={(dataUrl) => setSession({
              ...session,
              instructorSignatureDataUrl: dataUrl || undefined,
              instructorSignedAt: dataUrl ? new Date().toISOString() : undefined,
            })}
          />
        </section>

        <Button
          className="w-full min-h-12"
          disabled={saving}
          onClick={async () => { if (await saveSession('final')) navigate(`/safety/training/preview/${session.id}`); }}
        >
          סיים הדרכה והצג מסמכים
        </Button>
      </main>
    </div>
  );
}
