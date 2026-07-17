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
import { TRAINING_CATEGORY_DETAILS, trainingCategoryLabel } from '@/types/safety-training';

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
          nextParticipants.flatMap((participant) =>
            participant.signatureStoragePath ? [participant.signatureStoragePath] : [],
          ),
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
                  {isCertificate ? 'אישור השתתפות בהדרכת עבודה בגובה' : trainingCategoryLabel(session.category)}
                </h2>
                <div className="text-sm text-slate-200 mt-2">{client?.name} · {session.location || 'ללא מיקום'}</div>
              </div>
              <div className="text-left text-sm bg-white/10 rounded-lg px-4 py-3">
                <div>{session.sessionNumber}</div>
                <div>{session.trainingDate}</div>
              </div>
            </header>

            {isCertificate && selectedParticipant ? (
              <div className="px-12 py-12 space-y-8 text-center">
                <div className="text-lg">הרינו לאשר כי</div>
                <div>
                  <div className="text-3xl font-bold text-[#0f2744]">{selectedParticipant.employeeName}</div>
                  <div className="mt-2 text-slate-600">ת.ז. / דרכון: {selectedParticipant.employeeIdNumber || '____________'}</div>
                </div>
                <p className="text-lg leading-loose">
                  השתתף/ה בהדרכת בטיחות בנושא עבודה בגובה בתאריך {session.trainingDate},
                  בהיקף של {session.durationHours || '___'} שעות ובשפה {session.language || 'עברית'}.
                </p>
                <div className="rounded-xl bg-slate-50 border p-5 text-right">
                  <h3 className="font-bold mb-2">נושאי ההדרכה</h3>
                  <ul className="list-disc pr-5 space-y-1">{details.content.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div className="grid grid-cols-2 gap-12 pt-8 text-sm">
                  <div className="border-t pt-2">
                    {selectedParticipant.signatureStoragePath && (
                      <img src={signatureUrls[selectedParticipant.signatureStoragePath]} alt="חתימת העובד" className="h-16 mx-auto object-contain" />
                    )}
                    חתימת המשתתף/ת
                  </div>
                  <div className="border-t pt-2">
                    {session.instructorSignatureDataUrl && <img src={session.instructorSignatureDataUrl} alt="חתימת המדריך" className="h-16 mx-auto object-contain" />}
                    {session.instructorName || 'שם המדריך'} · {session.instructorLicenseNumber || 'מס׳ הסמכה'}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 pt-8">
                  אישור זה מתעד השתתפות בהדרכה. תוקפו המקצועי כפוף להסמכת המדריך, לתחומי ההדרכה ולדרישות הדין.
                </p>
              </div>
            ) : (
              <div className="px-8 py-6 space-y-6">
                <section className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div><span className="text-slate-500">נושא:</span> {session.topic}</div>
                  <div><span className="text-slate-500">מדריך:</span> {session.instructorName || '—'}</div>
                  <div><span className="text-slate-500">משך:</span> {session.durationHours || '—'} שעות</div>
                  <div><span className="text-slate-500">שפה:</span> {session.language || '—'}</div>
                </section>
                <section>
                  <h3 className="font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">תוכן ההדרכה</h3>
                  <ul className="list-disc pr-5 text-sm space-y-1">{details.content.map((item) => <li key={item}>{item}</li>)}</ul>
                  {session.notes && <div className="mt-2 whitespace-pre-wrap text-sm">{session.notes}</div>}
                </section>
                <section>
                  <h3 className="font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-3">רשימת המשתתפים וחתימות</h3>
                  <table className="w-full table-fixed border-collapse text-[11px]">
                    <thead><tr className="bg-[#0f2744] text-white">
                      <th className="border p-2 w-8">#</th><th className="border p-2">שם העובד</th>
                      <th className="border p-2">ת.ז.</th><th className="border p-2">מעסיק / תפקיד</th>
                      <th className="border p-2 w-32">חתימה</th>
                    </tr></thead>
                    <tbody>{participants.map((participant, index) => (
                      <tr key={participant.id} className="avoid-break">
                        <td className="border p-2 text-center">{index + 1}</td>
                        <td className="border p-2">{participant.employeeName}</td>
                        <td className="border p-2">{participant.employeeIdNumber || ''}</td>
                        <td className="border p-2">{[participant.employer, participant.jobTitle].filter(Boolean).join(' / ')}</td>
                        <td className="border p-1 text-center">
                          {participant.signatureStoragePath && <img src={signatureUrls[participant.signatureStoragePath]} alt="חתימה" className="h-10 max-w-28 mx-auto object-contain" />}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </section>
                <section className="pt-6 flex justify-end">
                  <div className="w-64 text-center border-t pt-2 text-sm">
                    {session.instructorSignatureDataUrl && <img src={session.instructorSignatureDataUrl} alt="חתימת המדריך" className="h-16 mx-auto object-contain" />}
                    {session.instructorName || 'שם המדריך'} · {session.instructorLicenseNumber || 'מס׳ הסמכה'}
                  </div>
                </section>
              </div>
            )}
          </article>
        </div>
      </main>
    </div>
  );
}
