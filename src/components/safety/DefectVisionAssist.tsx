import { useState } from 'react';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChecklistTopic, DefectSeverity } from '@/types/safety-audit';
import {
  VISION_HAZARD_CATEGORIES,
  getVisionApiKeys,
  hasVisionModelConfigured,
  saveVisionApiKeys,
  suggestionFromHazardCategory,
  visionSourceLabel,
  type DefectVisionSuggestion,
} from '@/lib/safety-defect-vision';

const severityLabel: Record<DefectSeverity, string> = {
  high: 'גבוהה',
  medium: 'בינונית',
  low: 'נמוכה',
};

const confidenceLabel: Record<DefectVisionSuggestion['confidence'], string> = {
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
};

type Props = {
  topics: ChecklistTopic[];
  suggestion?: DefectVisionSuggestion | null;
  analyzing?: boolean;
  error?: string | null;
  onAnalyze: () => void;
  onApply: (suggestion: DefectVisionSuggestion) => void;
  onDismiss: () => void;
  onLocalCategory: (suggestion: DefectVisionSuggestion) => void;
};

export default function DefectVisionAssist({
  topics,
  suggestion,
  analyzing = false,
  error = null,
  onAnalyze,
  onApply,
  onDismiss,
  onLocalCategory,
}: Props) {
  const initialKeys = getVisionApiKeys();
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [configured, setConfigured] = useState(() => hasVisionModelConfigured());
  const [geminiKey, setGeminiKey] = useState(initialKeys.gemini || '');
  const [openaiKey, setOpenaiKey] = useState(initialKeys.openai || '');
  const [keyMessage, setKeyMessage] = useState<string | null>(null);

  const refreshConfigured = () => setConfigured(hasVisionModelConfigured());

  const saveKeys = () => {
    saveVisionApiKeys({ gemini: geminiKey, openai: openaiKey });
    refreshConfigured();
    setKeyMessage('המפתח נשמר במכשיר זה בלבד (אבטיפוס)');
    setShowKeySetup(false);
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-950">
          <Sparkles className="h-4 w-4" />
          זיהוי ליקוי מסייע מתמונה
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={analyzing || !configured}
            onClick={onAnalyze}
          >
            {analyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                מנתח…
              </>
            ) : (
              'נתח תמונה'
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowKeySetup((value) => !value);
              setKeyMessage(null);
            }}
          >
            {configured ? 'החלף מפתח' : 'הגדר מודל'}
          </Button>
        </div>
      </div>

      <p className="text-xs text-amber-900/80">
        הצעה מסייעת בלבד — הממונה מאשר/עורך לפני שמירה. לא מחליף שיקול דעת מקצועי בשטח.
      </p>

      {showKeySetup && (
        <div className="space-y-2 rounded-md border bg-white p-3">
          <div className="text-sm font-medium">מפתח Vision לאבטיפוס</div>
          <p className="text-xs text-slate-600">
            מומלץ Gemini (חינמי יחסית). המפתח נשמר רק ב־localStorage במכשיר זה.
          </p>
          <Input
            dir="ltr"
            className="text-left"
            type="password"
            placeholder="Gemini API key"
            value={geminiKey}
            onChange={(event) => setGeminiKey(event.target.value)}
          />
          <Input
            dir="ltr"
            className="text-left"
            type="password"
            placeholder="OpenAI API key (אופציונלי)"
            value={openaiKey}
            onChange={(event) => setOpenaiKey(event.target.value)}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={saveKeys}>
              שמור מפתח
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                saveVisionApiKeys({ gemini: '', openai: '' });
                setGeminiKey('');
                setOpenaiKey('');
                refreshConfigured();
                setKeyMessage('המפתחות הוסרו מהמכשיר');
              }}
            >
              נקה
            </Button>
          </div>
        </div>
      )}

      {keyMessage && <div className="text-xs text-emerald-700">{keyMessage}</div>}
      {error && <div className="text-xs text-red-700">{error}</div>}

      {!configured && !suggestion && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-700">או בחרו מה נראה בתמונה (סיוע מקומי):</div>
          <div className="flex flex-wrap gap-1.5">
            {VISION_HAZARD_CATEGORIES.map((category) => (
              <Button
                key={category.id}
                type="button"
                size="sm"
                variant="secondary"
                className="h-auto py-1.5 text-xs"
                onClick={() => onLocalCategory(suggestionFromHazardCategory(category, topics))}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {configured && !suggestion && !analyzing && !error && (
        <div className="text-xs text-slate-600">
          לאחר צילום/העלאה לחצו «נתח תמונה» לקבלת הצעת תיאור, חומרה ופעולה מתקנת.
        </div>
      )}

      {suggestion && (
        <div className="space-y-2 rounded-md border border-amber-300 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium text-sm">{suggestion.hazardLabel}</div>
            <div className="text-[11px] text-slate-500">
              {visionSourceLabel(suggestion.source)} · ביטחון: {confidenceLabel[suggestion.confidence]}
            </div>
          </div>
          <div className="text-sm">{suggestion.description}</div>
          <div className="text-xs text-slate-600">
            חומרה מוצעת: <span className="font-medium">{severityLabel[suggestion.severity]}</span>
          </div>
          <div className="text-xs text-slate-700">
            <span className="font-medium">פעולה מתקנת: </span>
            {suggestion.correctiveAction}
          </div>
          {suggestion.checklistTopicKey && (
            <div className="text-xs text-slate-600">
              נושא צ׳קליסט:{' '}
              {topics.find((topic) => topic.key === suggestion.checklistTopicKey)?.title ||
                suggestion.checklistTopicKey}
            </div>
          )}
          <div className="text-[11px] text-slate-500">{suggestion.rationale}</div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" size="sm" onClick={() => onApply(suggestion)}>
              <Check className="h-3.5 w-3.5" />
              אשר והזן לטופס
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
              <X className="h-3.5 w-3.5" />
              דחה
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
