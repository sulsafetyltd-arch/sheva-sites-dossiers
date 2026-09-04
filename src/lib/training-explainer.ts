import type { TrainingModule } from '@/types/training';

export interface ExplainerSlide {
  id: string;
  title: string;
  bullets: string[];
  /** טקסט לקריינות (Speech Synthesis) */
  narration: string;
  /** משך מומלץ בשניות אם אין קריינות */
  seconds: number;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** בונה «סרטון הסבר» מובנה מתוכן המודול — לכל מודול בתכנית */
export function buildExplainerSlides(mod: TrainingModule): ExplainerSlide[] {
  const slides: ExplainerSlide[] = [];

  slides.push({
    id: 'intro',
    title: `מודול ${mod.code}: ${mod.title}`,
    bullets: [
      mod.intro ?? 'בסרטון זה נעבור על החוק, הספרות, הפסיקה, התוצר המעשי והמבחן העצמי.',
      mod.engineeringEdge
        ? 'במודול זה יש יתרון הנדסי-תכנוני — שלבו אותו בבדיקת הנאותות.'
        : 'עבדו לפי 5 השכבות; לא עוברים בלי התוצר המעשי.',
      mod.refreshOnly ? 'זהו מודול רענון — מיפוי ממשקים לידע קיים.' : 'הקדישו זמן לקריאה מלאה לפני הסימון.',
    ],
    narration: [
      `שלום. זהו סרטון ההסבר למודול ${mod.code}, ${mod.title}.`,
      mod.intro ?? 'נעבור יחד על עיקרי החומר, ונסכם מה עליכם להפיק כתוצר מעשי.',
      'זכרו את כלל הברזל: לא עוברים מודול בלי תוצר מתועד.',
    ].join(' '),
    seconds: 18,
  });

  const studyChunks = chunk(mod.studyItems, 3);
  studyChunks.forEach((items, i) => {
    slides.push({
      id: `law-${i}`,
      title: studyChunks.length === 1 ? 'החוק והתקנות' : `החוק והתקנות · חלק ${i + 1}`,
      bullets: items,
      narration: [
        i === 0 ? 'נתחיל בחוק ובתקנות.' : 'נמשיך בחוק ובתקנות.',
        ...items.map((t) => t.replace(/\s+/g, ' ').trim()),
        'קראו את המקורות במלואם — הסרטון הוא מפת דרכים, לא תחליף לקריאה.',
      ].join(' '),
      seconds: Math.max(16, items.length * 7),
    });
  });

  if (mod.literature.length > 0) {
    slides.push({
      id: 'literature',
      title: 'ספרות מקצועית',
      bullets: mod.literature,
      narration: [
        'לספרות המקצועית:',
        ...mod.literature,
        'השתמשו בספרים כדי להעמיק אחרי קריאת החוק.',
      ].join(' '),
      seconds: Math.max(14, mod.literature.length * 5),
    });
  } else {
    slides.push({
      id: 'literature',
      title: 'ספרות מקצועית',
      bullets: ['אין רשימה ייעודית במודול זה — עיינו בספרייה המינימלית לפי הנושא.'],
      narration:
        'במודול זה אין רשימת ספרות ייעודית. פנו לספרייה המינימלית שבתכנית, ובחרו את הפרקים הרלוונטיים לנושא.',
      seconds: 12,
    });
  }

  if (mod.cases.length > 0) {
    const caseChunks = chunk(mod.cases, 4);
    caseChunks.forEach((items, i) => {
      slides.push({
        id: `cases-${i}`,
        title: caseChunks.length === 1 ? 'פסיקה מכוננת' : `פסיקה מכוננת · חלק ${i + 1}`,
        bullets: items,
        narration: [
          i === 0
            ? 'לפסיקה: אלה נקודות פתיחה — אמתו והרחיבו מהמאגרים לפני ציטוט.'
            : 'המשך רשימת הפסיקה.',
          ...items,
        ].join(' '),
        seconds: Math.max(14, items.length * 5),
      });
    });
  } else {
    slides.push({
      id: 'cases',
      title: 'פסיקה מכוננת',
      bullets: ['אספו 5 עד 10 פסקי דין עדכניים מהמאגרים בנושא המודול.'],
      narration:
        'במודול זה אין רשימת פתיחה לפסיקה. אספו בעצמכם חמישה עד עשרה פסקי דין רלוונטיים מנבו, תקדין או דינים, ותעדו אותם בתיק הלמידה.',
      seconds: 14,
    });
  }

  slides.push({
    id: 'deliverable',
    title: 'התוצר המעשי',
    bullets: [
      mod.deliverable,
      'תעדו היכן נשמר הקובץ או הקישור — בלי תיעוד אי אפשר לסמן השלמה.',
      'ארגז הכלים שאתם בונים הוא הנכס האמיתי של התכנית.',
    ],
    narration: [
      'עכשיו לתוצר המעשי — זה לב המודול.',
      mod.deliverable,
      'לאחר שתסיימו, תעדו במערכת היכן נשמר התוצר. בלי תיעוד — כלל הברזל חוסם את הסימון.',
    ].join(' '),
    seconds: 18,
  });

  slides.push({
    id: 'exam',
    title: 'מבחן עצמי וסיכום',
    bullets: [
      mod.exam,
      'הסבירו בעל-פה ללקוח דמיוני בלי הערות.',
      'אחרי הסרטון: סמנו שכבות רק אחרי עבודה אמיתית על החומר.',
    ],
    narration: [
      'לסיום — המבחן העצמי.',
      mod.exam,
      'עצרו את הסרטון, הסבירו את הנושא בקול רם כאילו מול לקוח, ורק אחר כך סמנו את השכבות במערכת. בהצלחה.',
    ].join(' '),
    seconds: 16,
  });

  return slides;
}

export function explainerDurationLabel(slides: ExplainerSlide[]): string {
  const total = slides.reduce((sum, s) => sum + s.seconds, 0);
  const mins = Math.max(1, Math.round(total / 60));
  return `כ־${mins} דק׳`;
}
