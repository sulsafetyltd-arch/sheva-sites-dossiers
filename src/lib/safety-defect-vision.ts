import type { ChecklistTopic, DefectSeverity, ReportType } from '@/types/safety-audit';
import { getChecklistTopics } from '@/types/safety-audit';

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

export function getVisionApiKeys(): { openai?: string; gemini?: string } {
  const envOpenAi = String(import.meta.env.VITE_OPENAI_API_KEY || '').trim();
  const envGemini = String(import.meta.env.VITE_GEMINI_API_KEY || '').trim();
  const storedOpenAi = localStorage.getItem(OPENAI_KEY_STORAGE)?.trim() || '';
  const storedGemini = localStorage.getItem(GEMINI_KEY_STORAGE)?.trim() || '';
  return {
    openai: storedOpenAi || envOpenAi || undefined,
    gemini: storedGemini || envGemini || undefined,
  };
}

export function saveVisionApiKeys(keys: { openai?: string; gemini?: string }): void {
  if (keys.openai !== undefined) {
    const value = keys.openai.trim();
    if (value) localStorage.setItem(OPENAI_KEY_STORAGE, value);
    else localStorage.removeItem(OPENAI_KEY_STORAGE);
  }
  if (keys.gemini !== undefined) {
    const value = keys.gemini.trim();
    if (value) localStorage.setItem(GEMINI_KEY_STORAGE, value);
    else localStorage.removeItem(GEMINI_KEY_STORAGE);
  }
}

export function hasVisionModelConfigured(): boolean {
  const keys = getVisionApiKeys();
  return Boolean(keys.openai || keys.gemini);
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
  const text = String(value || '').toLowerCase();
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

  const haystack = `${hazardLabel} ${description}`.toLowerCase();
  const scored = topics
    .map((topic) => {
      const title = topic.title.toLowerCase();
      const words = title.split(/[\s,/–—-]+/).filter((word) => word.length >= 3);
      const hits = words.filter((word) => haystack.includes(word)).length;
      return { key: topic.key, hits };
    })
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  return scored[0]?.key;
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

function buildVisionPrompt(reportType: ReportType, topics: ChecklistTopic[]): string {
  const topicLines = topics
    .slice(0, 60)
    .map((topic) => `- ${topic.key}: ${topic.title}`)
    .join('\n');

  return [
    'אתה ממונה בטיחות ישראלי מסייע. נתח את תמונת אתר העבודה וזהה ליקוי בטיחות עיקרי אחד בלבד.',
    'זו הצעה מסייעת בלבד — לא קביעה סופית. אם התמונה לא ברורה ציין confidence נמוך.',
    `סוג הדוח: ${reportType}`,
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

async function analyzeWithOpenAi(
  base64: string,
  mimeType: string,
  apiKey: string,
  reportType: ReportType,
  topics: ChecklistTopic[],
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
            { type: 'text', text: buildVisionPrompt(reportType, topics) },
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
    throw new Error(`OpenAI Vision נכשל (${response.status}): ${detail.slice(0, 180)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI לא החזיר תוכן');
  return suggestionFromModelPayload(extractJsonObject(content), topics, 'openai');
}

async function analyzeWithGemini(
  base64: string,
  mimeType: string,
  apiKey: string,
  reportType: ReportType,
  topics: ChecklistTopic[],
): Promise<DefectVisionSuggestion> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: buildVisionPrompt(reportType, topics) },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini Vision נכשל (${response.status}): ${detail.slice(0, 180)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n');
  if (!content) throw new Error('Gemini לא החזיר תוכן');
  return suggestionFromModelPayload(extractJsonObject(content), topics, 'gemini');
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
}): Promise<DefectVisionSuggestion> {
  const reportType = options.reportType ?? 'workplace';
  const topics = getChecklistTopics(reportType);
  const mimeType = options.mimeType || options.image.type || 'image/jpeg';
  const base64 = await blobToBase64(options.image);
  const keys = getVisionApiKeys();

  if (keys.gemini) {
    return analyzeWithGemini(base64, mimeType, keys.gemini, reportType, topics);
  }
  if (keys.openai) {
    return analyzeWithOpenAi(base64, mimeType, keys.openai, reportType, topics);
  }

  throw new Error('VISION_KEY_MISSING');
}

export function visionSourceLabel(source: DefectVisionSource): string {
  if (source === 'openai') return 'OpenAI Vision';
  if (source === 'gemini') return 'Gemini Vision';
  return 'סיוע מקומי';
}
