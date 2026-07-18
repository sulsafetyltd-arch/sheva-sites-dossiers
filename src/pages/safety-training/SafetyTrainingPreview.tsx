import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getClient } from '@/lib/safety-audit-store';
import {
  getTrainingSession,
  getTrainingSignatureUrls,
  listTrainingParticipants,
} from '@/lib/safety-training-store';
import { createPdfBlob, downloadPdfBlob, exportToPdf } from '@/lib/pdf-export';
import type { SafetyAuditClient } from '@/types/safety-audit';
import type { SafetyTrainingParticipant, SafetyTrainingSession } from '@/types/safety-training';
import {
  GENERAL_TRAINING_TOPICS,
  HEIGHT_TRAINING_PROGRAM,
  HEIGHT_TRAINING_TOPICS,
  TRAINING_CATEGORY_DETAILS,
  trainingCategoryLabel,
} from '@/types/safety-training';

export default function SafetyTrainingPreview() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [session, setSession] = useState<SafetyTrainingSession | null>(null);
  const [client, setClient] = useState<SafetyAuditClient | null>(null);
  const [participants, setParticipants] = useState<SafetyTrainingParticipant[]>([]);
  const [signatureUrls, setSignatureUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!id) throw new Error('מזהה ההדרכה חסר');
        const nextSession = await getTrainingSession(id);
        if (!nextSession) throw new Error('ההדרכה לא נמצאה');
        const [nextClient, nextParticipants] = await Promise.all([
          getClient(nextSession.clientId),
          listTrainingParticipants(id),
        ]);
        const urls = await getTrainingSignatureUrls(
          nextParticipants.flatMap((participant) => [
            ...(participant.signatureStoragePath ? [participant.signatureStoragePath] : []),
            ...(participant.idDocumentStoragePath ? [participant.idDocumentStoragePath] : []),
          ]),
        );
        if (!cancelled) {
          setSession(nextSession);
          setClient(nextClient);
          setParticipants(nextParticipants);
          setSignatureUrls(urls);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'טעינת ההדרכה נכשלה');
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const selectedParticipant = useMemo(
    () => participants.find((participant) => participant.id === searchParams.get('participant')),
    [participants, searchParams],
  );
  const isCertificate = session?.category === 'work_at_height' && Boolean(selectedParticipant);
  const fileName = () => {
    const base = isCertificate
      ? `אישור-הדרכת-עבודה-בגובה-${selectedParticipant?.employeeName}`
      : `טופס-${session ? trainingCategoryLabel(session.category) : 'הדרכה'}-${session?.sessionNumber}`;
    return `${base}.pdf`.replace(/[\\/:*?"<>|]/g, '-');
  };

  const exportPdf = async () => {
    const element = document.getElementById('training-printable');
    if (!element) return;
    setExporting(true);
    try {
      await exportToPdf(element, fileName());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'יצירת ה־PDF נכשלה');
    } finally {
      setExporting(false);
    }
  };

  const share = async () => {
    const element = document.getElementById('training-printable');
    if (!element) return;
    setExporting(true);
    try {
      const blob = await createPdfBlob(element);
      const file = new File([blob], fileName(), { type: 'application/pdf' });
      const data: ShareData = { title: fileName().replace('.pdf', ''), files: [file] };
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        await navigator.share(data);
      } else {
        downloadPdfBlob(blob, fileName());
      }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(cause instanceof Error ? cause.message : 'שיתוף המסמך נכשל');
      }
    } finally {
      setExporting(false);
    }
  };

  if (!session) return <div dir="rtl" className="p-6">{error || 'טוען…'}</div>;
  const details = TRAINING_CATEGORY_DETAILS[session.category];
  const heightDetails = session.formDetails ?? {};
  const selectedHeightTopics = heightDetails.selectedTopics ?? [...HEIGHT_TRAINING_TOPICS];
  const selectedGeneralTopics = heightDetails.generalSelectedTopics ?? [...GENERAL_TRAINING_TOPICS];

  return (
    <div dir="rtl" className="min-h-screen bg-[#e8edf2]">
      <main className="mx-auto max-w-[920px] p-3 sm:p-6 space-y-4">
        <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link to={`/safety/training/editor/${session.id}`} className="inline-flex items-center gap-1 text-sm text-slate-600">
              <ArrowRight className="w-4 h-4" /> חזרה לעריכה
            </Link>
            <h1 className="text-xl font-bold">{isCertificate ? 'אישור אישי לעובד' : 'טופס הדרכה קבוצתי'}</h1>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => void exportPdf()} disabled={exporting} className="gap-1"><Download className="w-4 h-4" /> PDF</Button>
            <Button onClick={() => void share()} disabled={exporting} className="gap-1"><Share2 className="w-4 h-4" /> שיתוף</Button>
          </div>
        </div>

        {session.category === 'work_at_height' && (
          <div className="print:hidden rounded-xl border bg-white p-3">
            <div className="text-sm font-medium mb-2">מסמכי ההדרכה</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={!selectedParticipant ? 'default' : 'outline'} onClick={() => setSearchParams({})}>טופס קבוצתי</Button>
              {participants.map((participant) => (
                <Button
                  key={participant.id}
                  size="sm"
                  variant={selectedParticipant?.id === participant.id ? 'default' : 'outline'}
                  onClick={() => setSearchParams({ participant: participant.id })}
                >
                  אישור: {participant.employeeName}
                </Button>
              ))}
            </div>
          </div>
        )}
        {error && <div className="print:hidden rounded-lg bg-red-50 text-red-700 p-3">{error}</div>}

        <div className="overflow-x-auto rounded-sm">
          <article
            id="training-printable"
            className="report-sheet bg-white text-slate-900 shadow-lg print:shadow-none overflow-hidden mx-auto"
            style={{ fontFamily: 'Heebo, Arial, sans-serif', width: 794, minWidth: 794, minHeight: 1123 }}
          >
            <header className="bg-[#0f2744] text-white px-8 py-6 flex justify-between gap-4">
              <div>
                <div className="text-xs tracking-[0.2em] text-slate-300">סול בטיחות בע״מ</div>
                <h2 className="text-2xl font-bold mt-1">
                  {isCertificate
                    ? 'אישור על הדרכת עובד לביצוע עבודה בגובה'
                    : session.category === 'work_at_height'
                      ? 'רשימת עובדים שהודרכו בקורס עבודה בגובה כללי'
                      : trainingCategoryLabel(session.category)}
                </h2>
                <div className="text-sm text-slate-200 mt-2">
                  {isCertificate
                    ? 'לפי תקנה 5(2)'
                    : session.category === 'work_at_height'
                      ? 'עיוני + מעשי · בהתאם לתקנות הבטיחות בעבודה (עבודה בגובה), התשס״ז–2007'
                      : session.category === 'general'
                        ? 'בהתאם לתקנות ארגון הפיקוח על העבודה (מסירת מידע והדרכת עובדים), התשנ״ט–1999'
                        : ''}
                </div>
                <div className="text-sm text-slate-200 mt-1">{client?.name} · {session.location || 'ללא מיקום'}</div>
              </div>
              <div className="text-left text-sm bg-white/10 rounded-lg px-4 py-3">
                <div>{session.sessionNumber}</div>
                <div>{session.trainingDate}</div>
              </div>
            </header>

            {isCertificate && selectedParticipant ? (
              <div className="px-10 py-7 space-y-4 text-[12px] leading-relaxed">
                <div className="text-left font-semibold">מס׳ אישור: {session.sessionNumber}-{participants.indexOf(selectedParticipant) + 1}</div>
                <section className="rounded-lg border p-3">
                  <h3 className="font-bold text-[#0f2744]">(א) המבצע</h3>
                  <div>תופש המפעל / מבצע הבנייה / בעל מכונת הרמה / אחר</div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>שם החברה: {heightDetails.companyName || client?.name || '____________'}</div>
                    <div>ח.פ.: {heightDetails.companyRegistrationNumber || '____________'}</div>
                    <div>כתובת: {heightDetails.companyAddress || '____________'}</div>
                    <div>מיקוד: {heightDetails.companyPostalCode || '____________'} · טלפון: {heightDetails.companyPhone || '____________'}</div>
                  </div>
                </section>
                <section className="rounded-lg border p-3">
                  <h3 className="font-bold text-[#0f2744]">(ב) פרטי מדריך העבודה בגובה</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>שם ומשפחה: {session.instructorName || '____________'}</div>
                    <div>ת.ז.: {heightDetails.instructorIdNumber || '____________'}</div>
                    <div>ותק וניסיון: {heightDetails.instructorExperienceYears ?? '___'} שנים</div>
                    <div>הסמכה בתוקף עד: {heightDetails.instructorAuthorizationExpiry || '____________'}</div>
                    <div>כתובת: {heightDetails.instructorAddress || '____________'}</div>
                    <div>טלפון: {session.instructorPhone || '____________'} · דוא״ל: {heightDetails.instructorEmail || '____________'}</div>
                  </div>
                </section>
                <section className="rounded-lg border p-3">
                  <h3 className="font-bold text-[#0f2744]">(ג) פרטי העובד שהודרך לביצוע עבודה בגובה</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>שם משפחה: {selectedParticipant.lastName || '____________'}</div>
                    <div>שם פרטי: {selectedParticipant.firstName || '____________'}</div>
                    <div>שם האב: {selectedParticipant.fatherName || '____________'}</div>
                    <div>ת.ז.: {selectedParticipant.employeeIdNumber || '____________'}</div>
                    <div>שנת לידה: {selectedParticipant.birthYear || '____________'}</div>
                    <div>מקצוע: {selectedParticipant.jobTitle || '____________'}</div>
                    <div className="col-span-2">כתובת: {selectedParticipant.address || '____________'}</div>
                  </div>
                </section>
                <section className="rounded-lg border p-3">
                  <h3 className="font-bold text-[#0f2744]">(ד) תוקף האישור</h3>
                  <div>האישור בתוקף מיום {heightDetails.validFrom || '____________'} עד יום {heightDetails.validUntil || '____________'}</div>
                  <div className="text-[10px]">ההכשרה היא על הנושאים המסומנים בלבד.</div>
                </section>
                <section className="rounded-lg border p-3">
                  <h3 className="font-bold text-[#0f2744]">(ה) הצהרת המדריך</h3>
                  <p>
                    אני החתום מטה מצהיר כי העובד שפרטיו מפורטים לעיל הודרך על ידי לשמש כאדם העובד בגובה
                    בתחומים המסומנים, וכי הוא עומד בדרישות הפרקים ב׳ ו־ג׳ לתקנות הבטיחות בעבודה
                    (עבודה בגובה), התשס״ז–2007.
                  </p>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {HEIGHT_TRAINING_TOPICS.map((topic) => <div key={topic}>{selectedHeightTopics.includes(topic) ? '☑' : '☐'} {topic}</div>)}
                  </div>
                  {heightDetails.translatorLanguage && <div className="mt-1">ההדרכה תורגמה לשפה {heightDetails.translatorLanguage} על ידי {heightDetails.translatorName || '____________'}.</div>}
                  <div className="mt-1">האישור תקף רק לעבודה במסגרת {heightDetails.certificateScope || '____________'} בלבד.</div>
                </section>
                <section className="rounded-lg border p-3">
                  <h3 className="font-bold text-[#0f2744]">(ו) הצהרת העובד בגובה</h3>
                  <p>
                    אני מצהיר כי הנתונים האישיים לעיל נכונים, כי הודרכתי לבצע עבודה בגובה כנדרש בתקנה 5(2),
                    ההסבר ניתן בשפה מתאימה וברורה והובן על ידי, וכי אצטייד בציוד מגן אישי לפני תחילת העבודה בגובה.
                  </p>
                  <div className="grid grid-cols-2 gap-12 pt-3 text-center">
                    <div className="border-t pt-1">
                      {selectedParticipant.signatureStoragePath && <img src={signatureUrls[selectedParticipant.signatureStoragePath]} alt="חתימת העובד" className="h-12 mx-auto object-contain" />}
                      {selectedParticipant.employeeName} · חתימת העובד
                    </div>
                    <div className="border-t pt-1">
                      {session.instructorSignatureDataUrl && <img src={session.instructorSignatureDataUrl} alt="חתימת המדריך" className="h-12 mx-auto object-contain" />}
                      {session.instructorName || 'שם המדריך'} · מדריך מוסמך לעבודה בגובה
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="px-8 py-6 space-y-6">
                <section>
                  {session.category === 'general' && <h3 className="font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">1. פרטי המעסיק ומקום העבודה</h3>}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    {session.category === 'general' && <>
                      <div><span className="text-slate-500">שם החברה / המעסיק:</span> {heightDetails.companyName || client?.name || '—'}</div>
                      <div><span className="text-slate-500">ח.פ. / ע.מ.:</span> {heightDetails.companyRegistrationNumber || '—'}</div>
                      <div><span className="text-slate-500">אתר / מקום העבודה:</span> {session.location || '—'}</div>
                      <div><span className="text-slate-500">כתובת האתר:</span> {heightDetails.siteAddress || '—'}</div>
                      <div><span className="text-slate-500">תאריך:</span> {session.trainingDate}</div>
                      <div><span className="text-slate-500">שעות:</span> {heightDetails.startTime || '—'}–{heightDetails.endTime || '—'}</div>
                    </>}
                    <div><span className="text-slate-500">נושא:</span> {session.topic}</div>
                    <div><span className="text-slate-500">מדריך:</span> {session.instructorName || '—'}</div>
                    <div><span className="text-slate-500">משך:</span> {session.durationHours || '—'} שעות</div>
                    <div><span className="text-slate-500">שפה:</span> {session.language || '—'}</div>
                    {session.category === 'work_at_height' && <div><span className="text-slate-500">מנהל המפעל / הפרויקט:</span> {heightDetails.managerName || '—'}</div>}
                  </div>
                  {session.category === 'general' && (
                    <>
                      <h3 className="font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mt-4 mb-2">2. פרטי המדריך</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>שם המדריך: {session.instructorName || '—'}</div>
                        <div>תפקיד: {session.instructorRole || '—'}</div>
                        <div>מס׳ רישיון ממונה: {session.instructorLicenseNumber || '—'}</div>
                        <div>מטעם: {heightDetails.instructorOrganization || 'סול בטיחות בע״מ'}</div>
                      </div>
                    </>
                  )}
                </section>
                <section>
                  <h3 className="font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">{session.category === 'general' ? '3. נושאי ההדרכה' : 'תוכן ההדרכה'}</h3>
                  <ul className="list-disc pr-5 text-sm space-y-1">
                    {(session.category === 'work_at_height' ? selectedHeightTopics : session.category === 'general' ? selectedGeneralTopics : details.content).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  {session.category === 'general' && [heightDetails.generalOtherTopic1, heightDetails.generalOtherTopic2].filter(Boolean).map((item) => <div key={item} className="text-sm">☑ אחר: {item}</div>)}
                  {session.category === 'work_at_height' && (
                    <>
                      <h4 className="font-semibold mt-3">תוכנית ומטרות ההדרכה</h4>
                      <ul className="list-disc pr-5 text-sm space-y-1">
                        {HEIGHT_TRAINING_PROGRAM.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                      <p className="text-[10px] text-slate-500 mt-2">
                        ההדרכה מיועדת לעובד בגיר מעל גיל 18 המבצע עבודה בגובה. יש למסור תעודת זהות או רישיון נהיגה בתוקף לפני תחילת ההדרכה.
                      </p>
                    </>
                  )}
                  {session.notes && <div className="mt-2 whitespace-pre-wrap text-sm">{session.notes}</div>}
                </section>
                {session.category === 'general' && (
                  <section className="rounded-lg bg-slate-50 border p-3 text-[11px]">
                    <h3 className="font-bold text-[#0f2744] mb-1">4. הצהרת העובד</h3>
                    אני מאשר/ת כי השתתפתי בהדרכה, תוכנה הועבר בשפה ברורה ומובנת, ניתנה לי אפשרות לשאול שאלות,
                    הובהרו לי הסיכונים והאמצעים למניעתם, ואני מתחייב/ת לפעול לפי הוראות הבטיחות, להשתמש בציוד
                    המגן האישי ולדווח על כל מפגע, תקלה או אירוע. חתימתי בטבלה מהווה אישור להצהרה זו.
                  </section>
                )}
                <section>
                  <h3 className="font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">{session.category === 'general' ? '5. רשימת המשתתפים בהדרכה' : 'רשימת המשתתפים וחתימות'}</h3>
                  <table className="w-full table-fixed border-collapse text-[11px]">
                    <thead><tr className="bg-[#0f2744] text-white">
                      <th className="border p-2 w-8">#</th>
                      {session.category === 'work_at_height' ? <><th className="border p-2">שם פרטי</th><th className="border p-2">שם משפחה</th></> : <th className="border p-2">שם העובד</th>}
                      <th className="border p-2">ת.ז.</th><th className="border p-2">{session.category === 'general' ? 'תפקיד' : 'שם הקבלן'}</th>
                      <th className="border p-2 w-32">חתימה</th>
                    </tr></thead>
                    <tbody>{participants.map((participant, index) => (
                      <tr key={participant.id} className="avoid-break">
                        <td className="border p-2 text-center">{index + 1}</td>
                        {session.category === 'work_at_height'
                          ? <><td className="border p-2">{participant.firstName}</td><td className="border p-2">{participant.lastName}</td></>
                          : <td className="border p-2">{participant.employeeName}</td>}
                        <td className="border p-2">
                          {participant.employeeIdNumber || ''}
                          {session.category === 'work_at_height' && participant.idDocumentStoragePath && (
                            <div className="text-[9px] text-emerald-700 mt-1">
                              ✓ צילום {participant.idDocumentType === 'drivers_license' ? 'רישיון נהיגה' : 'ת.ז.'} צורף
                            </div>
                          )}
                        </td>
                        <td className="border p-2">{session.category === 'general' ? participant.jobTitle || '' : participant.employer || ''}</td>
                        <td className="border p-1 text-center">
                          {participant.signatureStoragePath && <img src={signatureUrls[participant.signatureStoragePath]} alt="חתימה" className="h-10 max-w-28 mx-auto object-contain" />}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </section>
                {session.category === 'work_at_height'
                  && heightDetails.includeIdDocumentsInGroupPdf
                  && participants.some((participant) => participant.idDocumentStoragePath) && (
                  <section>
                    <h3 className="font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">
                      נספח — צילומי מסמכים מזהים
                    </h3>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-[10px] text-red-900 mb-3">
                      מידע אישי רגיש — המסמכים נכללו ב־PDF לפי בחירה מפורשת של עורך ההדרכה.
                    </div>
                    <div className="space-y-3">
                      {participants
                        .filter((participant) => participant.idDocumentStoragePath)
                        .map((participant, index) => (
                          <div key={participant.id} className="pdf-keep-together rounded-lg border p-3">
                            <div className="font-medium text-sm mb-2">
                              {index + 1}. {participant.employeeName} · {participant.employeeIdNumber || 'ללא מספר'}
                              {' '}· {participant.idDocumentType === 'drivers_license' ? 'רישיון נהיגה' : 'תעודת זהות'}
                            </div>
                            <img
                              src={signatureUrls[participant.idDocumentStoragePath!]}
                              alt={`מסמך מזהה של ${participant.employeeName}`}
                              className="max-h-56 max-w-full mx-auto rounded border object-contain"
                            />
                          </div>
                        ))}
                    </div>
                  </section>
                )}
                <section className={`pt-6 space-y-4 ${session.category === 'general' ? 'pdf-keep-together' : ''}`}>
                  {session.category === 'general' && (
                    <div className="text-[11px]">
                      <h3 className="font-bold text-[#0f2744] mb-1">6. אישור ממונה הבטיחות</h3>
                      הריני מאשר כי ההדרכה בוצעה כמפורט, הותאמה לאופי מקום העבודה ולסיכונים הקיימים בו,
                      וניתנה לעובדים בשפה המובנת להם בהתאם לתקנות מסירת מידע והדרכת עובדים, התשנ״ט–1999.
                    </div>
                  )}
                  <div className={`grid gap-8 w-full text-center text-sm ${session.category === 'work_at_height' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                  <div className="border-t pt-2">
                    <div className="flex justify-center gap-2">
                      {session.instructorSignatureDataUrl && <img src={session.instructorSignatureDataUrl} alt="חתימת המדריך" className="h-16 object-contain" />}
                      {session.category === 'general' && heightDetails.instructorStampDataUrl && <img src={heightDetails.instructorStampDataUrl} alt="חותמת המדריך" className="h-16 object-contain mix-blend-multiply" />}
                    </div>
                    {session.instructorName || 'שם המדריך'} · {session.instructorLicenseNumber || 'מס׳ הסמכה'}
                  </div>
                  {session.category === 'work_at_height' && <>
                    <div className="border-t pt-2">
                      {heightDetails.managerSignatureDataUrl && <img src={heightDetails.managerSignatureDataUrl} alt="חתימת מנהל העבודה" className="h-16 mx-auto object-contain" />}
                      {heightDetails.managerName || 'מנהל העבודה / הפרויקט'}
                    </div>
                    <div className="border-t pt-2">
                      {heightDetails.translatorSignatureDataUrl && <img src={heightDetails.translatorSignatureDataUrl} alt="חתימת המתרגם" className="h-16 mx-auto object-contain" />}
                      {heightDetails.translatorName || 'תרגום (אם נדרש)'} {heightDetails.translatorLanguage || ''}
                    </div>
                  </>}
                  </div>
                  {session.category === 'general' && <p className="text-[10px] text-slate-500">יש לחזור על ההדרכה בהתאם לצורך ולפחות אחת לשנה, ולתעד את קיומה בפנקס ההדרכה.</p>}
                </section>
              </div>
            )}
          </article>
        </div>
      </main>
    </div>
  );
}
