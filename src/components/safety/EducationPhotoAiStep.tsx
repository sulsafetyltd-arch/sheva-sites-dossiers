import { useRef, useState } from 'react';
import { Camera, Check, ImagePlus, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { RailwayReportDetails, SafetyAuditDefect } from '@/types/safety-audit';
import { defectSeverityLabel } from '@/types/safety-audit';
import {
  analyzeDefectPhoto,
  getVisionApiKeys,
  hasVisionModelConfigured,
  looksLikeGeminiApiKey,
  saveVisionApiKeys,
  sanitizeVisionApiKey,
  visionSourceLabel,
  type DefectVisionSuggestion,
} from '@/lib/safety-defect-vision';
import { resizeImageToBlob } from '@/lib/storage-utils';
import {
  EDUCATION_KIND_LABELS,
  educationSectionByKey,
  type EducationInstitutionKind,
} from '@/data/education-moe-catalog';

export type EducationPhotoDraft = {
  id: string;
  previewUrl: string;
  file: File;
  analysisBlob: Blob;
  analyzing: boolean;
  error?: string | null;
  suggestion?: DefectVisionSuggestion | null;
  accepting?: boolean;
};

type Props = {
  details: RailwayReportDetails;
  defects: SafetyAuditDefect[];
  onAccept: (draft: EducationPhotoDraft, suggestion: DefectVisionSuggestion) => Promise<void>;
  onSkipToCatalog: () => void;
};

const confidenceLabel: Record<DefectVisionSuggestion['confidence'], string> = {
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
};

export default function EducationPhotoAiStep({
  details,
  defects,
  onAccept,
  onSkipToCatalog,
}: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<EducationPhotoDraft[]>([]);
  const [configured, setConfigured] = useState(() => hasVisionModelConfigured());
  const [showKeySetup, setShowKeySetup] = useState(() => !hasVisionModelConfigured());
  const initialKeys = getVisionApiKeys();
  const [geminiKey, setGeminiKey] = useState(initialKeys.gemini || '');
  const [openaiKey, setOpenaiKey] = useState(initialKeys.openai || '');
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const [keyWarning, setKeyWarning] = useState<string | null>(null);

  const kind = (details.institutionKind || 'other') as EducationInstitutionKind;

  const patchDraft = (id: string, patch: Partial<EducationPhotoDraft>) => {
    setDrafts((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeDraft = (draft: EducationPhotoDraft) => {
    URL.revokeObjectURL(draft.previewUrl);
    setDrafts((current) => current.filter((item) => item.id !== draft.id));
  };

  const analyzeDraft = async (draft: EducationPhotoDraft) => {
    if (!hasVisionModelConfigured()) {
      patchDraft(draft.id, {
        analyzing: false,
        error: 'יש להגדיר מפתח Vision (Gemini/OpenAI) לפני ניתוח אוטומטי',
      });
      setShowKeySetup(true);
      return;
    }
    patchDraft(draft.id, { analyzing: true, error: null, suggestion: null });
    try {
      const preferredTopicKeys = Array.from(new Set([
        ...(details.selectedSectionKeys ?? []),
        ...defects.map((item) => item.checklistTopicKey).filter((key): key is string => Boolean(key)),
      ]));
      const suggestion = await analyzeDefectPhoto({
        image: draft.analysisBlob,
        reportType: 'education_institution',
        mimeType: draft.analysisBlob.type || 'image/jpeg',
        institutionKind: details.institutionKind,
        preferredTopicKeys,
      });
      patchDraft(draft.id, { analyzing: false, suggestion, error: null });
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message === 'VISION_KEY_MISSING'
          ? 'חסר מפתח Vision — הגדירו מפתח ונסו שוב'
          : cause instanceof Error
            ? cause.message
            : 'ניתוח התמונה נכשל';
      patchDraft(draft.id, { analyzing: false, error: message });
      if (/מפתח|הרשאה|Gemini|OpenAI/i.test(message)) setShowKeySetup(true);
    }
  };

  const onPickFiles = async (fileList?: FileList | null) => {
    const files = Array.from(fileList ?? []).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) return;

    for (const file of files) {
      const analysisBlob = await resizeImageToBlob(file, 1280, 0.75);
      const ready = hasVisionModelConfigured();
      const draft: EducationPhotoDraft = {
        id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        previewUrl: URL.createObjectURL(file),
        file,
        analysisBlob,
        analyzing: ready,
        error: ready ? null : 'יש להגדיר מפתח Vision (Gemini/OpenAI) לפני ניתוח אוטומטי',
        suggestion: null,
      };
      setDrafts((current) => [draft, ...current]);
      if (!ready) {
        setShowKeySetup(true);
        continue;
      }
      // Auto-analyze immediately after the draft is queued
      void analyzeDraft(draft);
    }
  };

  const saveKeys = () => {
    const gemini = sanitizeVisionApiKey(geminiKey);
    const openai = sanitizeVisionApiKey(openaiKey);
    if (gemini && !looksLikeGeminiApiKey(gemini)) {
      setKeyWarning('מפתח Gemini נראה לא תקין. מפתח מ-AI Studio מתחיל ב-AQ. או ב-AIza…');
    } else {
      setKeyWarning(null);
    }
    saveVisionApiKeys({ gemini, openai });
    setGeminiKey(gemini);
    setOpenaiKey(openai);
    setConfigured(hasVisionModelConfigured());
    setKeyMessage('המפתח נשמר במכשיר זה בלבד');
    setShowKeySetup(false);
  };

  const acceptDraft = async (draft: EducationPhotoDraft) => {
    if (!draft.suggestion || draft.accepting) return;
    patchDraft(draft.id, { accepting: true, error: null });
    try {
      await onAccept(draft, draft.suggestion);
      removeDraft(draft);
    } catch (cause) {
      patchDraft(draft.id, {
        accepting: false,
        error: cause instanceof Error ? cause.message : 'הוספת הממצא נכשלה',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Camera className="w-5 h-5" />
          צילום וזיהוי ליקויים ב-AI
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          צלמו או העלו תמונות ממצאים — המערכת תזהה אוטומטית את הליקוי ואת הסעיף הרלוונטי ברשימה המנחה
          ({EDUCATION_KIND_LABELS[kind]}).
        </p>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-950">
            <Sparkles className="h-4 w-4" />
            ניתוח אוטומטי מתמונה
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowKeySetup((v) => !v)}>
            {configured ? 'החלף מפתח' : 'הגדר מודל AI'}
          </Button>
        </div>

        {showKeySetup && (
          <div className="space-y-2 rounded-md border bg-slate-50 p-3">
            <p className="text-xs text-slate-600">
              צרו מפתח ב־{' '}
              <a
                className="underline text-blue-700"
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
              >
                Google AI Studio
              </a>
              {' '}והדביקו כאן — נשמר רק במכשיר זה.
            </p>
            <Input
              dir="ltr"
              className="text-left"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="AQ.… או AIza… (Gemini)"
              value={geminiKey}
              onChange={(event) => setGeminiKey(event.target.value)}
            />
            <Input
              dir="ltr"
              className="text-left"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="OpenAI API key (אופציונלי)"
              value={openaiKey}
              onChange={(event) => setOpenaiKey(event.target.value)}
            />
            <Button type="button" size="sm" onClick={saveKeys}>שמור מפתח</Button>
            {keyMessage && <div className="text-xs text-emerald-700">{keyMessage}</div>}
            {keyWarning && <div className="text-xs text-amber-800">{keyWarning}</div>}
          </div>
        )}

        {/* Camera-only input — capture forces the device camera on mobile */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            void onPickFiles(event.target.files);
            event.currentTarget.value = '';
          }}
        />
        {/* Gallery input — no capture attribute so the photo library is available */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            void onPickFiles(event.target.files);
            event.currentTarget.value = '';
          }}
        />

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            className="min-h-14 gap-2 text-base"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="w-5 h-5" />
            צלם
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-14 gap-2 text-base"
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImagePlus className="w-5 h-5" />
            מהגלריה
          </Button>
        </div>
        <p className="text-xs text-slate-500 text-center">
          לאחר בחירת תמונה הניתוח מתחיל אוטומטית. אפשר לאשר כל הצעה כממצא בדוח.
        </p>
      </div>

      {drafts.length === 0 && (
        <div className="rounded-xl border border-dashed bg-white p-6 text-center space-y-3">
          <p className="text-sm text-slate-600">
            עדיין אין תמונות לניתוח. צלמו ממצא מהשטח, או המשיכו לבחירה ידנית מהמאגר.
          </p>
          <Button type="button" variant="outline" onClick={onSkipToCatalog}>
            דילוג לבחירת סעיפים מהמאגר
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {drafts.map((draft) => {
          const section = educationSectionByKey(draft.suggestion?.checklistTopicKey);
          return (
            <div key={draft.id} className="rounded-xl border bg-white p-3 space-y-3 shadow-sm">
              <div className="flex gap-3">
                <img
                  src={draft.previewUrl}
                  alt="תמונת ממצא"
                  className="h-28 w-28 shrink-0 rounded-lg object-cover border"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  {draft.analyzing && (
                    <div className="flex items-center gap-2 text-sm text-amber-900">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      מזהה ליקוי וסעיף מהרשימה המנחה…
                    </div>
                  )}
                  {draft.error && (
                    <div className="text-xs text-red-700 whitespace-pre-wrap">{draft.error}</div>
                  )}
                  {draft.suggestion && !draft.analyzing && (
                    <div className="space-y-1.5">
                      <div className="font-medium text-sm">{draft.suggestion.hazardLabel}</div>
                      <div className="text-sm text-slate-700">{draft.suggestion.description}</div>
                      <div className="text-xs text-slate-600">
                        קדימות:{' '}
                        <span className="font-medium">
                          {defectSeverityLabel(draft.suggestion.severity, 'education_institution')}
                        </span>
                        {' · '}
                        {visionSourceLabel(draft.suggestion.source)}
                        {' · ביטחון: '}
                        {confidenceLabel[draft.suggestion.confidence]}
                      </div>
                      <div className="rounded-lg bg-rose-50 border border-rose-100 px-2.5 py-2 text-xs">
                        {section ? (
                          <>
                            <div className="text-rose-800/80">
                              פרק {section.chapter} — {section.chapterTitle}
                            </div>
                            <div className="font-medium text-rose-950">
                              {section.sectionCode} — {section.title}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-600">
                            לא זוהה סעיף מדויק — אפשר לאשר בכל זאת ולשייך ידנית במאגר/בממצאים
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-700">
                        <span className="font-medium">פעולה מתקנת: </span>
                        {draft.suggestion.correctiveAction}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {draft.suggestion && !draft.analyzing && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={draft.accepting}
                    onClick={() => void acceptDraft(draft)}
                  >
                    {draft.accepting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        מוסיף…
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        אשר והוסף כממצא
                      </>
                    )}
                  </Button>
                )}
                {!draft.analyzing && (
                  <Button type="button" size="sm" variant="outline" onClick={() => void analyzeDraft(draft)}>
                    נתח שוב
                  </Button>
                )}
                <Button type="button" size="sm" variant="ghost" onClick={() => removeDraft(draft)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  הסר
                </Button>
                {draft.suggestion && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => patchDraft(draft.id, { suggestion: null })}
                  >
                    <X className="h-3.5 w-3.5" />
                    דחה הצעה
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {drafts.length > 0 && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={onSkipToCatalog}>
            המשך לבחירת סעיפים נוספים מהמאגר
          </Button>
        </div>
      )}
    </div>
  );
}
