import type { EducationInstitutionKind } from '@/data/education-moe-catalog';
import { EDUCATION_KIND_LABELS, educationSectionsForKind } from '@/data/education-moe-catalog';
import type { ChecklistTopic, DefectSeverity, ReportType } from '@/types/safety-audit';
import { getChecklistTopics, reportTypeLabel } from '@/types/safety-audit';

const OPENAI_KEY_STORAGE = 'safety_defect_vision_openai_key_v1';
const GEMINI_KEY_STORAGE = 'safety_defect_vision_gemini_key_v1';

export type DefectVisionSource = 'openai' | 'gemini' | 'local_assist';

export interface DefectVisionSuggestion {
  hazardLabel: string;
  description: string;
  severity: DefectSeverity;
  correctiveAction: string;
  checklistTopicKey?: string;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
  source: DefectVisionSource;
}

export interface VisionHazardCategory {
  id: string;
  label: string;
  description: string;
  severity: DefectSeverity;
  correctiveAction: string;
  topicHints: string[];
}

/** Common site hazards for offline assistive matching when no vision API key is set. */
export const VISION_HAZARD_CATEGORIES: VisionHazardCategory[] = [
  {
    id: 'work_at_height',
    label: 'עבודה בגובה / מעקות',
    description: 'חסר מעקה בטיחות / משטח עבודה לא מוגן בגובה',
    severity: 'high',
    correctiveAction: 'להפסיק את העבודה בגובה עד התקנת מעקות תקינים, נקודות עיגון ושימוש ברתמות לפי התקנות',
    topicHints: ['גובה', 'מעק', 'פיגום', 'גג', 'במה', 'height', 'guard'],
  },
  {
    id: 'scaffolding',
    label: 'פיגום / במת הרמה',
    description: 'פיגום או במת הרמה לא תקינים / ללא אישור בודק',
    severity: 'high',
    correctiveAction: 'להוציא את הפיגום/הבמה משימוש עד תיקון, הצגת תסקיר בודק מוסמך ואישור תקינות',
    topicHints: ['פיגום', 'במה', 'scaffold', 'lift'],
  },
  {
    id: 'ppe',
    label: 'ציוד מגן אישי',
    description: 'עובדים ללא ציוד מגן אישי מתאים (קסדה / אפוד / נעלי בטיחות / רתמה)',
    severity: 'high',
    correctiveAction: 'לספק ציוד מגן אישי מתאים ולוודא שימוש ואכיפה בפועל לפני המשך העבודה',
    topicHints: ['מגן', 'קסדה', 'אפוד', 'ppe', 'helmet'],
  },
  {
    id: 'electrical',
    label: 'חשמל',
    description: 'ליקוי חשמלי — כבילה חשופה / לוח לא תקין / הארקה חסרה',
    severity: 'high',
    correctiveAction: 'לבצע תיקון ובדיקת חשמל באמצעות חשמלאי מוסמך ולהוציא את הציוד משימוש עד לאישור',
    topicHints: ['חשמל', 'לוח', 'כבל', 'electric', 'cable'],
  },
  {
    id: 'excavation',
    label: 'חפירה / תעלות',
    description: 'חפירה פתוחה ללא דיפון / גידור / שילוט',
    severity: 'high',
    correctiveAction: 'לדפן, לשפע או לכסות את החפירה, לגדר ולמנוע גישה בלתי מורשית',
    topicHints: ['חפיר', 'תעל', 'בור', 'excav'],
  },
  {
    id: 'fencing',
    label: 'גידור / הפרדה',
    description: 'אזור עבודה ללא גידור או הפרדה מספקת',
    severity: 'medium',
    correctiveAction: 'לגדר ולבודד את אזור הסיכון ולהציב שילוט אזהרה מתאים',
    topicHints: ['גדר', 'גידור', 'הפרד', 'fenc'],
  },
  {
    id: 'signage',
    label: 'שילוט',
    description: 'חסר שילוט בטיחות / אזהרה / הכוונה',
    severity: 'medium',
    correctiveAction: 'להציב שילוט בטיחות ואזהרה ברור ונראה באזור העבודה',
    topicHints: ['שילוט', 'שלט', 'sign'],
  },
  {
    id: 'housekeeping',
    label: 'סדר וניקיון',
    description: 'עומס חומרים / פסולת / מכשולים בדרכי מעבר',
    severity: 'medium',
    correctiveAction: 'לשפר את הסדר והניקיון ולפנות מכשולים מדרכי הגישה והמעבר',
    topicHints: ['ניקיון', 'סדר', 'פסולת', 'housekeep', 'clutter'],
  },
  {
    id: 'fire',
    label: 'כיבוי אש',
    description: 'ציוד כיבוי חסר / חסום / לא בתוקף',
    severity: 'high',
    correctiveAction: 'לוודא זמינות מטפים תקינים ובתוקף, גישה חופשית וסימון ברור',
    topicHints: ['אש', 'כיבוי', 'מטף', 'fire', 'extinguish'],
  },
  {
    id: 'machinery',
    label: 'כלים הנדסיים',
    description: 'כלי הנדסי / ציוד הרמה ללא אישורים או תנאי עבודה בטוחים',
    severity: 'high',
    correctiveAction: 'להפסיק שימוש עד הצגת רישיונות, ביטוח ותסקיר בודק מוסמך בתוקף',
    topicHints: ['מנוף', 'עגורן', 'כלי', 'crane', 'machine'],
  },
  {
    id: 'materials',
    label: 'אחסון חומרים',
    description: 'אחסון חומרים לא יציב / חומרים מסוכנים ללא סימון',
    severity: 'medium',
    correctiveAction: 'לייצב ולאחסן חומרים לפי הנחיות היצרן, עם שילוט והפרדה מתאימים',
    topicHints: ['אחסון', 'חומר', 'מסוכן', 'storage', 'chemical'],
  },
  {
    id: 'access',
    label: 'דרכי גישה',
    description: 'דרך גישה / יציאת חירום חסומה או לא בטוחה',
    severity: 'high',
    correctiveAction: 'לפנות את דרך הגישה ולוודא מעבר בטוח וחופשי בכל עת',
    topicHints: ['גישה', 'מעבר', 'יציא', 'access', 'egress'],
  },
];

/** Education-institution hazards for local assist (MoE guiding checklist context). */
export const EDUCATION_VISION_HAZARD_CATEGORIES: VisionHazardCategory[] = [
  {
    id: 'ed_playground',
    label: 'מתקני משחק',
    description: 'מתקן משחק פגום / בסיס רך חסר / ברגים בולטים / סיכון נפילה',
    severity: 'high',
    correctiveAction: 'להוציא את המתקן משימוש עד תיקון ובדיקה ע״י בודק מוסמך לפי ת״י 1498',
    topicHints: ['משחק', 'מתקנ', 'חצר', 'נדנד', 'מגלש'],
  },
  {
    id: 'ed_fence_gate',
    label: 'גדר / שער',
    description: 'גדר או שער פגומים / פתח לא מאובטח / אפשרות יציאה בלתי מבוקרת',
    severity: 'high',
    correctiveAction: 'לתקן/להשלים גידור ושערים ולמנוע גישה ויציאה בלתי מבוקרת של ילדים',
    topicHints: ['גדר', 'שער', 'גידור', 'היקפ'],
  },
  {
    id: 'ed_railings',
    label: 'מעקות / מדרגות',
    description: 'מעקה חסר/רופף במדרגות, מרפסת או מפלס גבוה',
    severity: 'high',
    correctiveAction: 'לתקן או להתקין מעקה תקני ולמנוע שימוש במפלס עד להשלמת התיקון',
    topicHints: ['מעק', 'מדרג', 'גרם', 'מרפס'],
  },
  {
    id: 'ed_glass',
    label: 'זיגוג / חלונות',
    description: 'זכוכית שבורה / חלון לא מאובטח / סכנת פגיעה מתלמידים',
    severity: 'medium',
    correctiveAction: 'לתקן/להחליף זיגוג ולהבטיח אבטחת חלונות לפי הנחיות משרד החינוך',
    topicHints: ['חלון', 'זכוכ', 'זיגוג', 'זכוכית'],
  },
  {
    id: 'ed_electrical',
    label: 'חשמל במוסד',
    description: 'לוח חשמל פתוח / כבלים חשופים / שקעים פגומים בסביבת ילדים',
    severity: 'high',
    correctiveAction: 'להפסיק שימוש, לגדר/לנעול לוחות ולבצע תיקון ע״י חשמלאי מוסמך עם אישור בתוקף',
    topicHints: ['חשמל', 'לוח', 'שקע', 'כבל'],
  },
  {
    id: 'ed_fire',
    label: 'כיבוי אש',
    description: 'מטף חסר/חסום/לא בתוקף או דרך מילוט חסומה',
    severity: 'high',
    correctiveAction: 'לוודא ציוד כיבוי בתוקף, גישה חופשית ודרכי מילוט פנויות בכל עת',
    topicHints: ['אש', 'כיבוי', 'מטף', 'מילוט'],
  },
  {
    id: 'ed_shelter',
    label: 'מקלט / חירום',
    description: 'מקלט לא תקין / ציוד חירום חסר / דרך גישה חסומה',
    severity: 'medium',
    correctiveAction: 'לפנות דרכי גישה למקלט ולהשלים ציוד ומוכנות לפי הנחיות פיקוד העורף/משרד החינוך',
    topicHints: ['מקלט', 'חירום', 'מיגון'],
  },
  {
    id: 'ed_yard',
    label: 'חצר / משטחים',
    description: 'בורות, מפגעי ריצוף, מכשולים או משטח חלק בחצר',
    severity: 'medium',
    correctiveAction: 'לתקן את המשטח/לגדר את המפגע ולמנוע גישת תלמידים עד להשלמת הטיפול',
    topicHints: ['חצר', 'ריצוף', 'בור', 'משטח', 'מדרכה'],
  },
  {
    id: 'ed_trees',
    label: 'עצים / ענפים',
    description: 'ענפים שבורים / עץ לא יציב מעל אזור פעילות תלמידים',
    severity: 'medium',
    correctiveAction: 'לגזום/לייצב ע״י אגרונום או גוזם מוסמך ולמנוע שהייה תחת העץ עד לטיפול',
    topicHints: ['עץ', 'ענף', 'גיזום', 'צמח'],
  },
  {
    id: 'ed_kitchen',
    label: 'מטבח / חדר אוכל',
    description: 'ליקוי בטיחות במטבח/חדר אוכל — גז, ציוד, החלקה או היגיינה מסוכנת',
    severity: 'medium',
    correctiveAction: 'לתקן את המפגע, לוודא אישורי גז/חשמל בתוקף ולמנוע שימוש עד להשלמה',
    topicHints: ['מטבח', 'אוכל', 'גז', 'כיריים'],
  },
  {
    id: 'ed_classroom',
    label: 'כיתה / ריהוט',
    description: 'ריהוט לא יציב / מדפים לא מאובטחים / עומס אחסון מסוכן בכיתה',
    severity: 'medium',
    correctiveAction: 'לייצב/לאבטח ריהוט ומדפים ולהסיר עומסים מסוכנים מעל ראשי תלמידים',
    topicHints: ['כית', 'ריהוט', 'מדף', 'ארון', 'שולחן'],
  },
  {
    id: 'ed_sports',
    label: 'ספורט / אולם',
    description: 'מתקן ספורט פגום / סל לא מאובטח / רצפה חלקה באולם',
    severity: 'medium',
    correctiveAction: 'להוציא מתקן פגום משימוש ולבצע בדיקה/תיקון לפי ת״י 5515',
    topicHints: ['ספורט', 'אולם', 'סל', 'מגרש'],
  },
];

export function getVisionHazardCategories(reportType?: ReportType): VisionHazardCategory[] {
  if (reportType === 'education_institution') return EDUCATION_VISION_HAZARD_CATEGORIES;
  return VISION_HAZARD_CATEGORIES;
}

/** Strip common copy/paste noise from API keys. */
export function sanitizeVisionApiKey(raw: string | undefined | null): string {
  if (!raw) return '';
  return String(raw)
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^(Bearer|API[_-]?KEY)\s*[:=]?\s*/i, '')
    .replace(/\s+/g, '')
    .trim();
}

export function getVisionApiKeys(): { openai?: string; gemini?: string } {
  const envOpenAi = sanitizeVisionApiKey(import.meta.env.VITE_OPENAI_API_KEY);
  const envGemini = sanitizeVisionApiKey(import.meta.env.VITE_GEMINI_API_KEY);
  const storedOpenAi = sanitizeVisionApiKey(localStorage.getItem(OPENAI_KEY_STORAGE));
  const storedGemini = sanitizeVisionApiKey(localStorage.getItem(GEMINI_KEY_STORAGE));
  return {
    openai: storedOpenAi || envOpenAi || undefined,
    gemini: storedGemini || envGemini || undefined,
  };
}

export function saveVisionApiKeys(keys: { openai?: string; gemini?: string }): void {
  if (keys.openai !== undefined) {
    const value = sanitizeVisionApiKey(keys.openai);
    if (value) localStorage.setItem(OPENAI_KEY_STORAGE, value);
    else localStorage.removeItem(OPENAI_KEY_STORAGE);
  }
  if (keys.gemini !== undefined) {
    const value = sanitizeVisionApiKey(keys.gemini);
    if (value) localStorage.setItem(GEMINI_KEY_STORAGE, value);
    else localStorage.removeItem(GEMINI_KEY_STORAGE);
  }
}

export function hasVisionModelConfigured(): boolean {
  const keys = getVisionApiKeys();
  return Boolean(keys.openai || keys.gemini);
}

export function looksLikeGeminiApiKey(key: string): boolean {
  const value = sanitizeVisionApiKey(key);
  // Legacy standard keys (AIza…) and new AI Studio auth keys (AQ.… / AQ.Ab…).
  return (
    /^AIza[0-9A-Za-z_-]{20,}$/.test(value) ||
    /^AQ\.[0-9A-Za-z_-]{20,}$/.test(value)
  );
}

export function formatVisionApiError(provider: 'gemini' | 'openai', status: number, detail: string): string {
  const lower = detail.toLowerCase();
  if (
    status === 400 &&
    (lower.includes('api key not valid') ||
      lower.includes('invalid api key') ||
      lower.includes('api_key_invalid') ||
      lower.includes('invalid_argument'))
  ) {
    if (provider === 'gemini') {
      return 'מפתח Gemini לא תקין. צרו מפתח חדש ב-Google AI Studio (Create API key), הדביקו אותו מחדש ב«החלף מפתח», ושמרו.';
    }
    return 'מפתח OpenAI לא תקין. בדקו את המפתח ב-platform.openai.com והדביקו אותו מחדש.';
  }
  if (status === 401 || status === 403) {
    if (provider === 'gemini') {
      return 'אין הרשאה למפתח Gemini. צרו מפתח חדש ב-AI Studio (לא מפתח Cloud רגיל ללא הגבלה), והפעילו Generative Language API.';
    }
    return 'אין הרשאה למפתח OpenAI (401/403). בדקו חיוב והרשאות במפתח.';
  }
  if (status === 429) {
    if (provider === 'gemini') {
      if (lower.includes('limit: 0') || lower.includes('free_tier')) {
        return 'מכסת Gemini החינמית אזלה או חסומה (429). בדקו Quota ב-AI Studio, המתינו לאיפוס יומי, הפעילו חיוב, או השתמשו בסיוע המקומי.';
      }
      return 'חריגה ממכסת Gemini. נסו שוב בעוד כמה דקות או השתמשו בסיוע המקומי.';
    }
    return 'חריגה ממכסת OpenAI. נסו שוב מאוחר יותר או השתמשו בסיוע המקומי.';
  }
  if (status === 503 || lower.includes('high demand')) {
    return 'שירות Gemini עמוס כרגע. נסו שוב בעוד רגע או השתמשו בסיוע המקומי.';
  }
  if (status === 404 && lower.includes('model')) {
    return 'מודל Gemini שנבחר אינו זמין. רעננו את האפליקציה (עודכן למודלים חדשים) ונסו שוב.';
  }
  return provider === 'gemini'
    ? `Gemini Vision נכשל (${status}). נסו מפתח חדש או סיוע מקומי.`
    : `OpenAI Vision נכשל (${status}). נסו מפתח חדש או סיוע מקומי.`;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function normalizeSeverity(value: unknown): DefectSeverity {
  const text = String(value || '').toLowerCase().trim();
  if (text.includes('קדימות 0') || text === '0') return 'high';
  if (text.includes('קדימות 1') || text.includes('priority 1')) return 'medium';
  if (text.includes('קדימות 2') || text.includes('priority 2')) return 'low';
  if (text.includes('high') || text.includes('גבוה') || text === '3') return 'high';
  if (text.includes('low') || text.includes('נמוכ') || text === '1') return 'low';
  return 'medium';
}

function normalizeConfidence(value: unknown): DefectVisionSuggestion['confidence'] {
  const text = String(value || '').toLowerCase();
  if (text.includes('high') || text.includes('גבוה')) return 'high';
  if (text.includes('low') || text.includes('נמוכ')) return 'low';
  return 'medium';
}

function extractJsonObject(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] || text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('תשובת המודל לא כללה JSON תקין');
  }
  return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
}

function matchTopicKey(
  topics: ChecklistTopic[],
  suggestedKey: unknown,
  hazardLabel: string,
  description: string,
): string | undefined {
  const key = String(suggestedKey || '').trim();
  if (key && topics.some((topic) => topic.key === key)) return key;

  // Education section codes like "3.1" / "5.21" may be returned by the model
  const codeMatch = key.match(/\d+\.\d+/);
  if (codeMatch) {
    const code = codeMatch[0];
    const expectedKey = `ed_s_${code.replace(/\./g, '_')}`;
    const byCode = topics.find((topic) =>
      topic.key === expectedKey
      || topic.title.startsWith(`${code} `)
      || topic.title.startsWith(`${code} —`)
      || topic.title.startsWith(`${code} -`),
    );
    if (byCode) return byCode.key;
  }

  const haystack = `${hazardLabel} ${description} ${key}`.toLowerCase();
  const scored = topics
    .map((topic) => {
      const title = topic.title.toLowerCase();
      const chapter = (topic.chapter || '').toLowerCase();
      const words = `${title} ${chapter}`.split(/[\s,/–—.-]+/).filter((word) => word.length >= 3);
      const hits = words.filter((word) => haystack.includes(word)).length;
      return { key: topic.key, hits };
    })
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  return scored[0]?.key;
}

export type VisionAnalyzeContext = {
  institutionKind?: EducationInstitutionKind | null;
  preferredTopicKeys?: string[];
};

/** Build a compact topic list for the vision model (education has 400+ sections). */
export function topicsForVisionPrompt(
  reportType: ReportType,
  context?: VisionAnalyzeContext,
): ChecklistTopic[] {
  const all = getChecklistTopics(reportType);
  if (reportType !== 'education_institution') return all;

  const preferred = new Set((context?.preferredTopicKeys ?? []).filter(Boolean));
  const kindKeys = new Set(
    educationSectionsForKind(context?.institutionKind).map((section) => section.key),
  );

  const preferredTopics = all.filter((topic) => preferred.has(topic.key));
  const kindTopics = all.filter((topic) => kindKeys.has(topic.key) && !preferred.has(topic.key));
  const rest = all.filter((topic) => !preferred.has(topic.key) && !kindKeys.has(topic.key));

  // Prefer selected + kind-relevant sections; keep prompt under a usable size
  return [...preferredTopics, ...kindTopics, ...rest].slice(0, 90);
}

/** Exported for tests — Hebrew MoE-aware prompt for education, site prompt otherwise. */
export function buildVisionPrompt(
  reportType: ReportType,
  topics: ChecklistTopic[],
  context?: VisionAnalyzeContext,
): string {
  const topicLines = topics
    .slice(0, 90)
    .map((topic) => `- ${topic.key}: ${topic.chapter ? `${topic.chapter} · ` : ''}${topic.title}`)
    .join('\n');

  if (reportType === 'education_institution') {
    const kindLabel = context?.institutionKind
      ? EDUCATION_KIND_LABELS[context.institutionKind]
      : 'לא צוין';
    return [
      'אתה עורך מבדק בטיחות במוסד חינוך בישראל לפי הרשימה המנחה של משרד החינוך (ספטמבר 2025).',
      'נתח את תמונת המוסד וזהה מפגע/ליקוי בטיחות עיקרי אחד בלבד (חצר, כיתה, מבנה, מתקנים, חשמל, כיבוי אש וכו׳).',
      'זו הצעה מסייעת בלבד — לא קביעה סופית. אם התמונה לא ברורה ציין confidence נמוך.',
      `סוג הדוח: ${reportTypeLabel(reportType)}`,
      `סוג המוסד: ${kindLabel}`,
      'דרג לפי סולם קדימויות משרד החינוך באמצעות השדה severity:',
      '- high = קדימות 0 — מפגע חמור המחייב סגירה מיידית של המקום',
      '- medium = קדימות 1 — מפגע המחייב הסרה מיידית',
      '- low = קדימות 2 — ליקוי לטיפול בתכנית עבודה',
      'בתיאור ציין בקצרה את מהות הממצא ומיקומו הנראה בתמונה.',
      'בפעולה המתקנת כתוב המלצה מעשית לרשות/למוסד בעברית.',
      'אם אפשר, קשר ל-checklistTopicKey מסעיפי המאגר המנחה למטה (מפתח מדויק או מספר סעיף).',
      'החזר JSON בלבד במבנה הזה:',
      '{',
      '  "hazardLabel": "שם קצר של הליקוי בעברית",',
      '  "description": "תיאור מקצועי קצר בעברית לטופס המבדק (מהות ומיקום)",',
      '  "severity": "high|medium|low",',
      '  "correctiveAction": "המלצה/פעולה מתקנת בעברית",',
      '  "checklistTopicKey": "מפתח סעיף מהרשימה או ריק",',
      '  "confidence": "high|medium|low",',
      '  "rationale": "משפט קצר למה זו ההצעה"',
      '}',
      'סעיפי מאגר מנחה אפשריים:',
      topicLines,
    ].join('\n');
  }

  return [
    'אתה ממונה בטיחות ישראלי מסייע. נתח את תמונת אתר העבודה וזהה ליקוי בטיחות עיקרי אחד בלבד.',
    'זו הצעה מסייעת בלבד — לא קביעה סופית. אם התמונה לא ברורה ציין confidence נמוך.',
    `סוג הדוח: ${reportTypeLabel(reportType)} (${reportType})`,
    'החזר JSON בלבד במבנה הזה:',
    '{',
    '  "hazardLabel": "שם קצר של הליקוי בעברית",',
    '  "description": "תיאור מקצועי קצר בעברית לטופס הביקורת",',
    '  "severity": "high|medium|low",',
    '  "correctiveAction": "המלצה/פעולה מתקנת בעברית",',
    '  "checklistTopicKey": "מפתח נושא מהרשימה או ריק",',
    '  "confidence": "high|medium|low",',
    '  "rationale": "משפט קצר למה זו ההצעה"',
    '}',
    'נושאי צ׳קליסט אפשריים:',
    topicLines,
  ].join('\n');
}

function suggestionFromModelPayload(
  payload: Record<string, unknown>,
  topics: ChecklistTopic[],
  source: DefectVisionSource,
): DefectVisionSuggestion {
  const hazardLabel = String(payload.hazardLabel || payload.hazard || payload.title || 'ליקוי בטיחות').trim();
  const description = String(payload.description || payload.findings || hazardLabel).trim();
  const correctiveAction = String(
    payload.correctiveAction || payload.recommendation || payload.action || '',
  ).trim();
  const rationale = String(payload.rationale || payload.reason || '').trim();

  return {
    hazardLabel,
    description,
    severity: normalizeSeverity(payload.severity),
    correctiveAction:
      correctiveAction ||
      'לתקן את המפגע בהתאם לתקנות ולתעד את השלמת הטיפול',
    checklistTopicKey: matchTopicKey(topics, payload.checklistTopicKey, hazardLabel, description),
    confidence: normalizeConfidence(payload.confidence),
    rationale: rationale || 'הצעה מסייעת על בסיס ניתוח התמונה — יש לאמת בשטח',
    source,
  };
}

async function analyzeWithOpenAi(
  base64: string,
  mimeType: string,
  apiKey: string,
  reportType: ReportType,
  topics: ChecklistTopic[],
  context?: VisionAnalyzeContext,
): Promise<DefectVisionSuggestion> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildVisionPrompt(reportType, topics, context) },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(formatVisionApiError('openai', response.status, detail));
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI לא החזיר תוכן');
  return suggestionFromModelPayload(extractJsonObject(content), topics, 'openai');
}

/** Prefer current AI Studio models; older flash IDs are unavailable to many new keys. */
const GEMINI_VISION_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
] as const;

function shouldRetryGeminiModel(status: number, detail: string): boolean {
  const lower = detail.toLowerCase();
  if (status === 404 && /model|no longer available|not found/i.test(detail)) return true;
  if (status === 503 || lower.includes('high demand')) return true;
  return false;
}

async function analyzeWithGemini(
  base64: string,
  mimeType: string,
  apiKey: string,
  reportType: ReportType,
  topics: ChecklistTopic[],
  context?: VisionAnalyzeContext,
): Promise<DefectVisionSuggestion> {
  const body = {
    contents: [
      {
        parts: [
          { text: buildVisionPrompt(reportType, topics, context) },
          { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };

  let lastError = 'Gemini Vision נכשל';
  for (const model of GEMINI_VISION_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      lastError = formatVisionApiError('gemini', response.status, detail);
      if (shouldRetryGeminiModel(response.status, detail)) continue;
      throw new Error(lastError);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n');
    if (!content) throw new Error('Gemini לא החזיר תוכן');
    return suggestionFromModelPayload(extractJsonObject(content), topics, 'gemini');
  }

  throw new Error(lastError);
}

export function suggestionFromHazardCategory(
  category: VisionHazardCategory,
  topics: ChecklistTopic[],
): DefectVisionSuggestion {
  return {
    hazardLabel: category.label,
    description: category.description,
    severity: category.severity,
    correctiveAction: category.correctiveAction,
    checklistTopicKey: matchTopicKey(topics, undefined, category.label, category.description),
    confidence: 'medium',
    rationale: 'הצעה מסייעת לפי קטגוריה שנבחרה מהתמונה — יש לאמת בשטח',
    source: 'local_assist',
  };
}

export async function analyzeDefectPhoto(options: {
  image: Blob;
  reportType?: ReportType;
  mimeType?: string;
  institutionKind?: EducationInstitutionKind | null;
  preferredTopicKeys?: string[];
}): Promise<DefectVisionSuggestion> {
  const reportType = options.reportType ?? 'workplace';
  const context: VisionAnalyzeContext = {
    institutionKind: options.institutionKind,
    preferredTopicKeys: options.preferredTopicKeys,
  };
  const topics = topicsForVisionPrompt(reportType, context);
  const mimeType = options.mimeType || options.image.type || 'image/jpeg';
  const base64 = await blobToBase64(options.image);
  const keys = getVisionApiKeys();
  const gemini = sanitizeVisionApiKey(keys.gemini);
  const openai = sanitizeVisionApiKey(keys.openai);

  if (gemini) {
    return analyzeWithGemini(base64, mimeType, gemini, reportType, topics, context);
  }
  if (openai) {
    return analyzeWithOpenAi(base64, mimeType, openai, reportType, topics, context);
  }

  throw new Error('VISION_KEY_MISSING');
}

export function visionSourceLabel(source: DefectVisionSource): string {
  if (source === 'openai') return 'OpenAI Vision';
  if (source === 'gemini') return 'Gemini Vision';
  return 'סיוע מקומי';
}
