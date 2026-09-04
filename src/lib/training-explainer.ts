import type { TrainingModule } from '@/types/training';

export type SlideVisual =
  | 'intro'
  | 'law'
  | 'literature'
  | 'cases'
  | 'deliverable'
  | 'exam'
  | 'summary';

export interface ExplainerSlide {
  id: string;
  title: string;
  bullets: string[];
  /** טקסט לקריינות — משפטים קצרים וטבעיים */
  narration: string;
  /** משך גיבוי בשניות אם אין דיבור */
  seconds: number;
  visual: SlideVisual;
  /** כיתוב קצר על האיור */
  visualCaption: string;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** מנקה ניסוח יבש לקריינות חיה יותר */
function soften(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/·/g, ',')
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s*→\s*/g, ', ואז ')
    .trim();
}

function narrateList(leadIn: string, items: string[], closing?: string): string {
  const parts = [soften(leadIn)];
  items.forEach((item, i) => {
    const clean = soften(item);
    if (i === 0) parts.push(clean);
    else if (i === items.length - 1) parts.push(`ועוד נקודה חשובה: ${clean}`);
    else parts.push(`נקודה נוספת: ${clean}`);
  });
  if (closing) parts.push(soften(closing));
  return parts.join(' ');
}

/** בונה שקופיות הסבר ויזואליות עם קריינות מקצועית לכל מודול */
export function buildExplainerSlides(mod: TrainingModule): ExplainerSlide[] {
  const slides: ExplainerSlide[] = [];

  slides.push({
    id: 'intro',
    title: `מודול ${mod.code}: ${mod.title}`,
    bullets: [
      mod.intro ?? 'בשקופיות האלה נעבור יחד על החוק, הספרות, הפסיקה, התוצר והמבחן.',
      mod.engineeringEdge
        ? 'כאן נכנס היתרון ההנדסי-תכנוני — זה מה שמבדיל את השירות שלכם.'
        : 'עובדים לפי חמש שכבות. לא סוגרים מודול בלי תוצר מתועד.',
      mod.refreshOnly
        ? 'זה רענון ממוקד — מחברים ידע קיים לממשקי העסקה.'
        : 'קחו את הזמן. ההבנה כאן חוסכת טעויות יקרות מול לקוח.',
    ],
    narration: narrateList(
      `שלום רב. ברוכים הבאים למודול ${mod.code}, בנושא ${mod.title}.`,
      [
        mod.intro ??
          'בעוד כמה דקות תצאו מכאן עם מפת דרכים ברורה: מה ללמוד, מה לבנות, ואיך לבדוק את עצמכם.',
        mod.engineeringEdge
          ? 'שימו לב: במודול הזה משולב יתרון הנדסי ותכנוני. זה לא קישוט — זה כלי עבודה.'
          : 'נעבוד לפי חמש שכבות מסודרות, בלי לקפוץ קדימה.',
      ],
      'וזכרו כלל אחד פשוט: בלי תוצר מתועד — לא עוברים הלאה. בואו נתחיל.',
    ),
    seconds: 22,
    visual: 'intro',
    visualCaption: 'מפת הדרך של המודול',
  });

  const studyChunks = chunk(mod.studyItems, 3);
  studyChunks.forEach((items, i) => {
    slides.push({
      id: `law-${i}`,
      title: studyChunks.length === 1 ? 'החוק והתקנות' : `החוק והתקנות · חלק ${i + 1}`,
      bullets: items,
      narration: narrateList(
        i === 0
          ? 'נתחיל מהבסיס — החוק והתקנות. אל תמהרו. כל סעיף כאן חוזר בעסקה האמיתית.'
          : 'נמשיך בחוק ובתקנות. שימו לב לקשר בין הסעיפים.',
        items,
        i === studyChunks.length - 1
          ? 'אחרי השקף הזה, עברו לשיעורים באפליקציה וסמנו מה שנקרא.'
          : 'ניקח רגע, ואז נמשיך לחלק הבא.',
      ),
      seconds: Math.max(18, items.length * 8),
      visual: 'law',
      visualCaption: 'מסגרת נורמטיבית',
    });
  });

  if (mod.literature.length > 0) {
    slides.push({
      id: 'literature',
      title: 'ספרות מקצועית',
      bullets: mod.literature,
      narration: narrateList(
        'עכשיו לספרות המקצועית. הספרים האלה לא תחליף לחוק — הם העמקה אחריו.',
        mod.literature,
        'באפליקציה מחכות לכם תמציות מוכנות. קראו אותן, ואז סמנו.',
      ),
      seconds: Math.max(16, mod.literature.length * 6),
      visual: 'literature',
      visualCaption: 'העמקה מקצועית',
    });
  } else {
    slides.push({
      id: 'literature',
      title: 'ספרות מקצועית',
      bullets: ['אין רשימה ייעודית — בחרו פרקים רלוונטיים מהספרייה המינימלית שבתכנית.'],
      narration:
        'במודול הזה אין רשימת ספרות ייעודית. זה בסדר. פנו לספרייה המינימלית שבתכנית, בחרו פרק אחד או שניים שנוגעים לנושא, וחזרו לשיעורים באפליקציה.',
      seconds: 14,
      visual: 'literature',
      visualCaption: 'בחירת מקורות',
    });
  }

  if (mod.cases.length > 0) {
    const caseChunks = chunk(mod.cases, 4);
    caseChunks.forEach((items, i) => {
      slides.push({
        id: `cases-${i}`,
        title: caseChunks.length === 1 ? 'פסיקה מכוננת' : `פסיקה מכוננת · חלק ${i + 1}`,
        bullets: items,
        narration: narrateList(
          i === 0
            ? 'לפסיקה. אלה נקודות פתיחה — לא רשימה לסגירה. לפני ציטוט ללקוח, אמתו במאגר.'
            : 'עוד פסקי דין שכדאי להכיר במודול הזה.',
          items,
          'באפליקציה תמצאו תקציר: עובדות, הלכה ולקח מעשי.',
        ),
        seconds: Math.max(16, items.length * 6),
        visual: 'cases',
        visualCaption: 'הלכה למעשה',
      });
    });
  } else {
    slides.push({
      id: 'cases',
      title: 'פסיקה מכוננת',
      bullets: ['אספו 5–10 פסקי דין עדכניים מהמאגרים בנושא המודול.'],
      narration:
        'במודול הזה אין רשימת פתיחה לפסיקה. המשימה שלכם: לאסוף חמישה עד עשרה פסקי דין רלוונטיים, לקרוא תקציר של כל אחד, ולתעד למה הוא חשוב לתיק.',
      seconds: 15,
      visual: 'cases',
      visualCaption: 'איסוף תקדימים',
    });
  }

  slides.push({
    id: 'deliverable',
    title: 'התוצר המעשי',
    bullets: [
      mod.deliverable,
      'תעדו באפליקציה איפה נשמר הקובץ או מה בניתם — בלי תיעוד אי אפשר לסמן.',
      'ארגז הכלים שאתם בונים הוא הנכס האמיתי של התכנית.',
    ],
    narration: narrateList(
      'עכשיו ללב המודול — התוצר המעשי.',
      [
        mod.deliverable,
        'אל תסתפקו ברעיון בראש. כתבו, שמרו, ותעדו באפליקציה.',
        'בלי תיעוד, כלל הברזל חוסם את הסימון. וזה במכוון.',
      ],
      'כשתסיימו את התוצר — אתם מוכנים למבחן הידע.',
    ),
    seconds: 20,
    visual: 'deliverable',
    visualCaption: 'בניית ארגז הכלים',
  });

  slides.push({
    id: 'exam',
    title: 'מבחן ידע עם ציון',
    bullets: [
      mod.exam,
      'בסיום המודול — מבחן אמריקאי בתוך האפליקציה, עם ציון מיידי.',
      'רק אחרי ציון עובר אפשר לסמן את שכבת המבחן ולסגור את המודול.',
    ],
    narration: narrateList(
      'לסיום — איך סוגרים את המודול עם מבחן ידע.',
      [
        mod.exam,
        'תענו על כל השאלות, תקבלו ציון באחוזים מיד, ותראו מה נכון ומה צריך לחזור עליו.',
        'רק אחרי ציון עובר אפשר לסמן את שכבת המבחן. בהצלחה.',
      ],
    ),
    seconds: 18,
    visual: 'exam',
    visualCaption: 'ציון בסוף כל מודול',
  });

  slides.push({
    id: 'summary',
    title: 'מוכנים להתחיל',
    bullets: [
      'צפו בשקופיות, למדו את השיעורים, מלאו תוצר, ועברו את המבחן.',
      'כל החומר נמצא כאן באפליקציה — אין צורך במקור חיצוני.',
      'כשתסיימו את הצפייה, המודול יסומן כנצפה ותוכלו להמשיך הלאה.',
    ],
    narration: narrateList(
      'זהו סיכום קצר לפני שאתם צוללים פנימה.',
      [
        'הסדר פשוט: שקופיות, שיעורים, תוצר מעשי, ומבחן ידע עם ציון.',
        'הכל כאן באפליקציה. קחו אוויר — ומתחילים.',
      ],
    ),
    seconds: 14,
    visual: 'summary',
    visualCaption: 'מסלול סגירת המודול',
  });

  return slides;
}

export function explainerDurationLabel(slides: ExplainerSlide[]): string {
  const total = slides.reduce((sum, s) => sum + s.seconds, 0);
  const mins = Math.max(1, Math.round(total / 60));
  return `כ־${mins} דק׳`;
}
