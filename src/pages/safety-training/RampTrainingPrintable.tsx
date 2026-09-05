import type { ReactNode } from 'react';
import type {
  HeightTrainingFormDetails,
  SafetyTrainingParticipant,
  SafetyTrainingSession,
} from '@/types/safety-training';
import {
  RAMP_FORM_META,
  RAMP_QUIZ_QUESTIONS,
  RAMP_TRAINING_TOPICS,
} from '@/types/safety-training';

const mark = (checked: boolean) => (checked ? '☑' : '☐');

const workLanguageLabel = (participant: SafetyTrainingParticipant) => {
  if (participant.workLanguage === 'en') return 'אנגלית';
  if (participant.workLanguage === 'ar') return 'ערבית';
  if (participant.workLanguage === 'other') return participant.workLanguageOther || 'אחר';
  return 'עברית';
};

const locationLabel = (details: HeightTrainingFormDetails) => {
  if (details.rampLocationType === 'classroom') return 'בכיתת לימוד';
  if (details.rampLocationType === 'other') return details.rampLocationOther || 'אחר';
  return 'באתר (עמדת הרמפה)';
};

const methodLabels: Record<string, string> = {
  lecture: 'הרצאה',
  practical_demo: 'הדגמה מעשית',
  video: 'סרטון הדרכה',
  combined: 'שילוב',
};

const kindLabels: Record<string, string> = {
  initial: 'ראשונית',
  annual: 'תקופתית (שנתית)',
  after_procedure_change: 'ריענון לאחר שינוי בנוהל',
  after_incident: 'אחרי תקלה',
};

function FormMetaRow() {
  return (
    <div className="grid grid-cols-4 gap-2 text-[10px] border rounded p-2 bg-slate-50">
      <div>מס׳ טופס: <strong>{RAMP_FORM_META.formId}</strong></div>
      <div>גרסה: <strong>{RAMP_FORM_META.version}</strong></div>
      <div>קשור לנוהל: <strong>{RAMP_FORM_META.procedureId}</strong></div>
      <div>שמירה: <strong>{RAMP_FORM_META.retentionYears} שנים</strong></div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="font-bold text-[#0f2744] border-r-4 border-[#c4a35a] pr-3 mb-2 text-sm">{children}</h3>;
}

export function RampPersonalFormPrintable({
  session,
  participant,
  clientName,
  signatureUrl,
}: {
  session: SafetyTrainingSession;
  participant: SafetyTrainingParticipant;
  clientName?: string;
  signatureUrl?: string;
}) {
  const details = session.formDetails ?? {};
  const topics = details.rampSelectedTopics ?? [...RAMP_TRAINING_TOPICS];
  const methods = details.rampMethods ?? [];
  const quiz = participant.rampQuiz ?? {};

  return (
    <div className="px-8 py-6 space-y-5 text-[11px] leading-relaxed">
      <div className="text-center space-y-1">
        <div className="text-xs tracking-wide text-slate-500">סול בטיחות בע״מ · שירותי בטיחות מקצועיים | ממונה בטיחות חיצוני</div>
        <h2 className="text-xl font-bold text-[#0f2744]">{RAMP_FORM_META.title}</h2>
        <div className="text-sm font-semibold">{RAMP_FORM_META.subtitle}</div>
        <div className="text-xs text-slate-600">{clientName || details.companyName || '—'}</div>
      </div>
      <FormMetaRow />
      <p className="text-[10px] text-slate-600 border rounded p-2 bg-amber-50/60">
        הטופס מהווה מסמך משפטי. יש למלא את כל השדות, לחתום בנוכחות מבצע ההדרכה,
        ולחזור על ההדרכה אחת לשנה לפחות ובכל שינוי בנוהל.
      </p>

      <section>
        <SectionTitle>חלק א׳ – פרטים אישיים של העובד</SectionTitle>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          <div>שם מלא: <strong>{participant.employeeName || '—'}</strong></div>
          <div>תעודת זהות: <strong>{participant.employeeIdNumber || '—'}</strong></div>
          <div>תפקיד: <strong>{participant.jobTitle || '—'}</strong></div>
          <div>מחלקה/אגף: <strong>{participant.department || '—'}</strong></div>
          <div>תאריך תחילת עבודה: <strong>{participant.startWorkDate || '—'}</strong></div>
          <div>טלפון נייד: <strong>{participant.mobilePhone || '—'}</strong></div>
          <div className="col-span-2">שפת עבודה: <strong>{workLanguageLabel(participant)}</strong></div>
        </div>
      </section>

      <section>
        <SectionTitle>חלק ב׳ – נושאים שנכללו בהדרכה</SectionTitle>
        <ol className="space-y-1 pr-4 list-decimal">
          {RAMP_TRAINING_TOPICS.map((topic) => (
            <li key={topic} className="pr-1">
              <span className="ml-2">{mark(topics.includes(topic))}</span>
              {topic}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <SectionTitle>חלק ג׳ – פרטי ההדרכה</SectionTitle>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          <div>תאריך ההדרכה: <strong>{session.trainingDate}</strong></div>
          <div>שעת התחלה: <strong>{details.startTime || '—'}</strong></div>
          <div>שעת סיום: <strong>{details.endTime || '—'}</strong></div>
          <div>משך כולל: <strong>{details.rampDurationMinutes ?? (session.durationHours ? Math.round(session.durationHours * 60) : '—')} דקות</strong></div>
          <div>מיקום: <strong>{locationLabel(details)}{session.location ? ` · ${session.location}` : ''}</strong></div>
          <div>
            שיטת הדרכה:{' '}
            <strong>
              {(['lecture', 'practical_demo', 'video', 'combined'] as const)
                .map((method) => `${mark(methods.includes(method))} ${methodLabels[method]}`)
                .join('  ')}
            </strong>
          </div>
          <div>
            סוג הדרכה:{' '}
            <strong>
              {(['initial', 'annual', 'after_procedure_change', 'after_incident'] as const)
                .map((kind) => `${mark((details.rampTrainingKind ?? 'initial') === kind)} ${kindLabels[kind]}`)
                .join('  ')}
            </strong>
          </div>
          <div>ההדרכה הבאה עד: <strong>{details.rampNextDueDate || '—'}</strong></div>
        </div>
      </section>

      <section className="pdf-keep-together">
        <SectionTitle>חלק ד׳ – בדיקת הבנה</SectionTitle>
        <div className="space-y-3">
          {RAMP_QUIZ_QUESTIONS.map((question, index) => (
            <div key={question.id}>
              <div className="font-medium">שאלה {index + 1}: {question.prompt}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {question.options.map((option) => (
                  <span key={option.value}>
                    {mark(quiz[question.id] === option.value)} {option.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div>
            <div className="font-medium">שאלה 6: תאר במילים שלך מה תעשה במקרה של נפילת עובד מהרמפה</div>
            <div className="mt-1 min-h-12 border rounded p-2 whitespace-pre-wrap">{quiz.q6 || '—'}</div>
          </div>
          <div className="rounded border p-2 space-y-1 bg-slate-50">
            <div className="font-medium">הערכת מבצע ההדרכה:</div>
            <div>{mark(participant.trainerEvaluation === 'approved')} העובד ענה נכון על כל השאלות וגילה הבנה מלאה – מאושר כעובד מורשה</div>
            <div>
              {mark(participant.trainerEvaluation === 'needs_refresh')} העובד טעה בחלק מהשאלות – נדרש ריענון לפני אישור
              {participant.refreshDate ? ` (תאריך ריענון: ${participant.refreshDate})` : ''}
            </div>
            <div>{mark(participant.trainerEvaluation === 'failed')} העובד לא הצליח לעבור את ההדרכה – לא מאושר לעבודה ברמפה</div>
            {participant.trainerNotes && <div className="mt-1">הערות: {participant.trainerNotes}</div>}
          </div>
        </div>
      </section>

      <section className="pdf-keep-together space-y-3">
        <SectionTitle>חלק ה׳ – הצהרת העובד והתחייבותו</SectionTitle>
        <p>
          אני הח״מ <strong>{participant.employeeName || '____________'}</strong>{' '}
          ת.ז. <strong>{participant.employeeIdNumber || '____________'}</strong> מצהיר/ה ומתחייב/ת בזאת:
        </p>
        <ol className="list-decimal pr-5 space-y-1 text-[10px]">
          <li>קיבלתי הדרכה מקצועית בעבודה בעמדת הרמפה ע״י ממונה בטיחות מוסמך, בשפה השגורה בפי.</li>
          <li>קיבלתי לידי עותק כתוב של נוהל העבודה ({RAMP_FORM_META.procedureId}) וקראתי אותו בעיון מלא.</li>
          <li>הבנתי את הסיכונים הקיימים בעבודה בעמדת הרמפה, ובכלל זה סכנת נפילה לעומק, פגיעה ממטענים והתנגשות עם רכבים.</li>
          <li>הבנתי את כל האיסורים המוחלטים, ובמיוחד את האיסור על הסעת בני אדם על משטח הרמפה ועל טיפוס או הישענות על המעקה.</li>
          <li>אני מתחייב/ת לעבוד אך ורק בהתאם לנוהל העבודה, להשתמש בציוד המגן האישי הנדרש בכל עת, ולא לחרוג מסעיפיו.</li>
          <li>אני מתחייב/ת לדווח מיידית לממונה הבטיחות ולמנהל המחסן על כל תקלה, פגם, אירוע חריג או חשד לסיכון.</li>
          <li>אני מתחייב/ת להישמע להוראות ממונה הבטיחות ומנהל המחסן בכל הקשור לעבודה בעמדה.</li>
          <li>הוסבר לי כי הפרת נוהל זה עלולה לגרור צעדים משמעתיים, ובמקרים חמורים – אחריות פלילית ואזרחית.</li>
          <li>הוסבר לי כי הדרכה זו תקפה למשך שנה אחת בלבד, ועליי לעבור הדרכת רענון אחת לשנה לפחות.</li>
          <li>ידוע לי כי הטופס שלפניי מהווה מסמך משפטי, וכי אני חותם/ת עליו מרצוני החופשי לאחר שהבנתי את כל סעיפיו.</li>
        </ol>
        <div className="grid grid-cols-3 gap-6 pt-4 text-center">
          <div className="border-t pt-2">
            {signatureUrl && <img src={signatureUrl} alt="חתימת העובד" className="h-14 mx-auto object-contain" />}
            <div className="font-medium mt-1">{participant.employeeName || 'שם העובד'}</div>
            <div className="text-[10px] text-slate-500">
              חתימת העובד · {session.trainingDate}{participant.signedTime ? ` · ${participant.signedTime}` : ''}
            </div>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-center gap-2">
              {session.instructorSignatureDataUrl && (
                <img src={session.instructorSignatureDataUrl} alt="חתימת המדריך" className="h-14 object-contain" />
              )}
              {details.instructorStampDataUrl && (
                <img src={details.instructorStampDataUrl} alt="חותמת" className="h-14 object-contain mix-blend-multiply" />
              )}
            </div>
            <div className="font-medium mt-1">{session.instructorName || 'מבצע ההדרכה'}</div>
            <div className="text-[10px] text-slate-500">
              {session.instructorRole || 'ממונה בטיחות'} · רישיון {session.instructorLicenseNumber || '—'}
              {details.instructorIdNumber ? ` · ת.ז. ${details.instructorIdNumber}` : ''}
            </div>
          </div>
          <div className="border-t pt-2">
            {details.warehouseManagerSignatureDataUrl && (
              <img src={details.warehouseManagerSignatureDataUrl} alt="חתימת מנהל המחסן" className="h-14 mx-auto object-contain" />
            )}
            <div className="font-medium mt-1">{details.warehouseManagerName || 'מנהל המחסן'}</div>
            <div className="text-[10px] text-slate-500">אישור הסמכה כעובד מורשה</div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function RampGroupAnnexPrintable({
  session,
  participants,
  clientName,
  signatureUrls,
}: {
  session: SafetyTrainingSession;
  participants: SafetyTrainingParticipant[];
  clientName?: string;
  signatureUrls: Record<string, string>;
}) {
  const details = session.formDetails ?? {};
  return (
    <div className="px-8 py-6 space-y-5 text-[11px] leading-relaxed">
      <div className="text-center space-y-1">
        <div className="text-xs tracking-wide text-slate-500">סול בטיחות בע״מ</div>
        <h2 className="text-xl font-bold text-[#0f2744]">נספח א׳ – יומן הדרכה קבוצתית</h2>
        <div className="text-sm">{RAMP_FORM_META.subtitle}</div>
        <div className="text-xs text-slate-600">{clientName || details.companyName || '—'} · {RAMP_FORM_META.formId}</div>
      </div>
      <FormMetaRow />
      <p className="text-[10px] text-slate-600">
        טופס זה משמש למקרה שבו ההדרכה מועברת לקבוצת עובדים יחד. כל עובד יחתום בנפרד על טופס אישי (חלקים א׳–ה׳),
        ובנוסף יירשם ביומן הקבוצתי שלהלן.
      </p>
      <table className="w-full table-fixed border-collapse text-[10px]">
        <thead>
          <tr className="bg-[#0f2744] text-white">
            <th className="border p-2 w-8">#</th>
            <th className="border p-2">שם מלא</th>
            <th className="border p-2">ת.ז.</th>
            <th className="border p-2">תפקיד</th>
            <th className="border p-2 w-28">חתימה</th>
            <th className="border p-2 w-16">שעה</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.max(participants.length, 10) }, (_, index) => {
            const participant = participants[index];
            return (
              <tr key={participant?.id ?? `empty-${index}`} className="avoid-break">
                <td className="border p-2 text-center h-10">{index + 1}</td>
                <td className="border p-2">{participant?.employeeName || ''}</td>
                <td className="border p-2">{participant?.employeeIdNumber || ''}</td>
                <td className="border p-2">{participant?.jobTitle || ''}</td>
                <td className="border p-1 text-center">
                  {participant?.signatureStoragePath && (
                    <img
                      src={signatureUrls[participant.signatureStoragePath]}
                      alt="חתימה"
                      className="h-9 max-w-24 mx-auto object-contain"
                    />
                  )}
                </td>
                <td className="border p-2 text-center">{participant?.signedTime || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <section className="rounded border p-3 space-y-2 pdf-keep-together">
        <h3 className="font-bold text-[#0f2744]">אישור סיכום ההדרכה הקבוצתית</h3>
        <div>תאריך ההדרכה: <strong>{session.trainingDate}</strong></div>
        <div>נושא ההדרכה: עבודה בעמדת רמפה לטעינה ופריקת מטענים, נוהל {RAMP_FORM_META.procedureId}</div>
        <div>מספר עובדים שהשתתפו: <strong>{participants.length}</strong></div>
        <div className="grid grid-cols-2 gap-6 pt-4 text-center">
          <div className="border-t pt-2">
            <div className="flex justify-center gap-2">
              {session.instructorSignatureDataUrl && (
                <img src={session.instructorSignatureDataUrl} alt="חתימת המדריך" className="h-14 object-contain" />
              )}
              {details.instructorStampDataUrl && (
                <img src={details.instructorStampDataUrl} alt="חותמת" className="h-14 object-contain mix-blend-multiply" />
              )}
            </div>
            <div className="font-medium mt-1">{session.instructorName || 'שם המדריך'}</div>
            <div className="text-[10px] text-slate-500">מס׳ רישיון ממונה בטיחות: {session.instructorLicenseNumber || '—'}</div>
          </div>
          <div className="border-t pt-2">
            {details.warehouseManagerSignatureDataUrl && (
              <img src={details.warehouseManagerSignatureDataUrl} alt="חתימת מנהל המחסן" className="h-14 mx-auto object-contain" />
            )}
            <div className="font-medium mt-1">{details.warehouseManagerName || 'מנהל המחסן'}</div>
            <div className="text-[10px] text-slate-500">אישור מנהל המחסן</div>
          </div>
        </div>
      </section>
      <p className="text-[9px] text-slate-500">
        אסמכתאות: תקנות ארגון הפיקוח על העבודה (מסירת מידע והדרכת עובדים), התשנ״ט–1999;
        פקודת הבטיחות בעבודה [נוסח חדש], התש״ל–1970;
        תקנות הבטיחות בעבודה (עבודה בגובה), התשס״ז–2007;
        תקנות הבטיחות בעבודה (עבודות בנייה), התשמ״ח–1988 – תקנה 22.
        הטופס ייגנז בתיק האישי למשך {RAMP_FORM_META.retentionYears} שנים לפחות.
      </p>
    </div>
  );
}
