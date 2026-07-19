import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Download, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SignaturePad from '@/components/dossier/SignaturePad';
import { exportToPdf } from '@/lib/pdf-export';
import {
  completePublicElearning,
  getPublicElearningAssignment,
  type PublicElearningAssignment,
} from '@/lib/safety-elearning-store';
import { ELEARNING_CHAPTERS, ELEARNING_QUESTIONS } from '@/types/safety-elearning';

export default function SafetyElearningCourse() {
  const { token } = useParams();
  const [assignment, setAssignment] = useState<PublicElearningAssignment | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState<string | undefined>();
  const [score, setScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!token) throw new Error('קישור הלומדה אינו תקין');
        const result = await getPublicElearningAssignment(token);
        if (!cancelled) {
          setAssignment(result);
          setSignature(result.learnerSignatureDataUrl);
          if (result.status === 'completed') setScore(result.score ?? 100);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'טעינת הלומדה נכשלה');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const submit = async () => {
    if (!token || !assignment || !signature) return;
    if (ELEARNING_QUESTIONS.some((question) => !answers[question.id])) {
      setError('יש לענות על כל שאלות הסיכום');
      return;
    }
    setSubmitting(true);
    try {
      const result = await completePublicElearning(token, answers, signature);
      setScore(result.score);
      if (result.passed) {
        setAssignment({
          ...assignment,
          status: 'completed',
          score: result.score,
          completedAt: new Date().toISOString(),
          certificateNumber: result.certificateNumber,
          learnerSignatureDataUrl: signature,
        });
        setError(null);
      } else {
        setError(`הציון הוא ${result.score}. ציון המעבר הוא 80 — יש לתקן את התשובות ולנסות שוב.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'שמירת סיום הלומדה נכשלה');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadCertificate = async () => {
    const element = document.getElementById('elearning-certificate');
    if (!element || !assignment) return;
    await exportToPdf(
      element,
      `אישור-לומדת-בטיחות-${assignment.employeeName}-${assignment.certificateNumber}.pdf`
        .replace(/[\\/:*?"<>|]/g, '-'),
    );
  };

  if (error && !assignment) return <div dir="rtl" className="min-h-screen grid place-items-center p-6 text-red-700">{error}</div>;
  if (!assignment) return <div dir="rtl" className="min-h-screen grid place-items-center">טוען לומדה…</div>;

  if (assignment.status === 'completed') {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-100 p-4 sm:p-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h1 className="text-2xl font-bold mt-2">הלומדה הושלמה בהצלחה</h1>
            <p>ציון: {assignment.score ?? score}% · האישור עודכן במאגר העובדים</p>
          </div>
          <Button className="w-full gap-2" onClick={() => void downloadCertificate()}>
            <Download className="w-4 h-4" /> הורדת אישור סיום PDF
          </Button>
          <div className="overflow-x-auto">
          <article
            id="elearning-certificate"
            className="report-sheet bg-white shadow-lg mx-auto overflow-hidden"
            style={{ width: 794, minWidth: 794, minHeight: 900 }}
          >
            <header className="bg-[#0f2744] text-white p-8 text-center">
              <div className="text-sm tracking-[0.2em]">סול בטיחות בע״מ</div>
              <h2 className="text-3xl font-bold mt-3">אישור סיום לומדת בטיחות כללית</h2>
              <p className="mt-2">בהתאם לתקנות מסירת מידע והדרכת עובדים, התשנ״ט–1999</p>
            </header>
            <div className="p-12 text-center space-y-8">
              <ShieldCheck className="w-20 h-20 text-[#c4a35a] mx-auto" />
              <p className="text-xl">הרינו לאשר כי</p>
              <div className="text-4xl font-bold text-[#0f2744]">{assignment.employeeName}</div>
              <p className="text-lg">ת.ז.: {assignment.employeeIdNumber || '____________'}</p>
              <p className="text-xl leading-loose">
                השלים/ה בהצלחה לומדת בטיחות כללית לעובדים, עבר/ה שאלון מסכם בציון
                {' '}{assignment.score ?? score}% ואישר/ה כי תוכן ההדרכה הובן.
              </p>
              <div className="grid grid-cols-2 gap-12 pt-10">
                <div className="border-t p-3">לקוח / מעסיק: {assignment.clientName}</div>
                <div className="border-t p-3">תאריך: {assignment.completedAt?.slice(0, 10)}</div>
                <div className="border-t p-3 col-span-2">
                  {assignment.learnerSignatureDataUrl && <img src={assignment.learnerSignatureDataUrl} alt="חתימת העובד" className="h-20 object-contain mx-auto" />}
                  חתימת העובד/ת
                </div>
              </div>
              <div className="text-sm text-slate-500">מס׳ אישור: {assignment.certificateNumber}</div>
            </div>
          </article>
          </div>
        </div>
      </div>
    );
  }

  const isQuiz = step === ELEARNING_CHAPTERS.length;
  const chapter = ELEARNING_CHAPTERS[step];
  const progress = Math.round(((step + 1) / (ELEARNING_CHAPTERS.length + 1)) * 100);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <header className="bg-[#0f2744] text-white px-4 pb-5" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3"><BookOpen /><div><h1 className="font-bold text-xl">לומדת בטיחות כללית</h1><p className="text-sm text-slate-300">{assignment.employeeName} · {assignment.clientName}</p></div></div>
          <div className="h-2 bg-white/20 rounded-full mt-4 overflow-hidden"><div className="h-full bg-[#f4c95d] transition-all" style={{ width: `${progress}%` }} /></div>
          <div className="text-xs text-left mt-1">{progress}%</div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-4 pb-24">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 mb-4">
          הלומדה מיועדת להדרכת בטיחות כללית ואינה מחליפה הדרכה מעשית, הסמכה מקצועית או הדרכה ייעודית הנדרשת לפי סוג העבודה והסיכונים.
        </div>
        {!isQuiz ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-5">
            <div className="text-sm text-slate-500">פרק {step + 1} מתוך {ELEARNING_CHAPTERS.length}</div>
            <h2 className="text-2xl font-bold text-[#0f2744]">{chapter.title}</h2>
            <p className="text-lg leading-relaxed">{chapter.summary}</p>
            <div className="space-y-3">
              {chapter.points.map((point) => (
                <div key={point} className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div><h2 className="text-2xl font-bold">שאלון מסכם</h2><p className="text-slate-600">יש לענות על כל השאלות. ציון מעבר: 80.</p></div>
            {ELEARNING_QUESTIONS.map((question, index) => (
              <div key={question.id} className="rounded-xl border bg-white p-4 space-y-3">
                <div className="font-medium">{index + 1}. {question.question}</div>
                {question.options.map((option) => (
                  <label key={option.value} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer">
                    <input type="radio" name={question.id} value={option.value} checked={answers[question.id] === option.value} onChange={() => setAnswers({ ...answers, [question.id]: option.value })} />
                    {option.label}
                  </label>
                ))}
              </div>
            ))}
            <div className="rounded-xl border bg-white p-4 space-y-3">
              <h3 className="font-semibold">הצהרת העובד וחתימה</h3>
              <p className="text-sm">אני מאשר/ת שקראתי והבנתי את תוכן הלומדה, ניתנה לי אפשרות ללמוד את כל הפרקים ואני מתחייב/ת לפעול בהתאם להוראות הבטיחות.</p>
              <SignaturePad value={signature} onChange={(value) => setSignature(value || undefined)} />
            </div>
            {error && <div className="rounded-lg bg-red-50 text-red-700 p-3">{error}</div>}
            {score !== null && <div className="rounded-lg bg-amber-50 p-3">ציון ניסיון אחרון: {score}</div>}
          </section>
        )}
      </main>
      <nav className="fixed bottom-0 inset-x-0 border-t bg-white/95 backdrop-blur p-3 flex gap-2 justify-center" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        {step > 0 && <Button variant="outline" onClick={() => { setStep(step - 1); window.scrollTo(0, 0); }}><ChevronRight className="w-4 h-4" /> הקודם</Button>}
        {!isQuiz ? (
          <Button onClick={() => { setStep(step + 1); window.scrollTo(0, 0); }}>סיימתי את הפרק <ChevronLeft className="w-4 h-4" /></Button>
        ) : (
          <Button disabled={submitting || !signature || ELEARNING_QUESTIONS.some((question) => !answers[question.id])} onClick={() => void submit()}>
            {submitting ? 'בודק תשובות…' : 'שלח שאלון וסיים'}
          </Button>
        )}
      </nav>
    </div>
  );
}
