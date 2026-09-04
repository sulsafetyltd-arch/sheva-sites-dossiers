import { useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, Trophy, XCircle } from 'lucide-react';
import type { ModuleInteractiveContent, ModuleProgress } from '@/types/training';
import { submitQuiz } from '@/lib/training-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  moduleId: string;
  content: ModuleInteractiveContent;
  progress: ModuleProgress;
  onComplete: (result: { score: number; passed: boolean }) => void;
}

export function ModuleKnowledgeQuiz({ moduleId, content, progress, onComplete }: Props) {
  const [draft, setDraft] = useState<Record<string, number>>(() => progress.quizAnswers ?? {});
  const [submitted, setSubmitted] = useState(Boolean(progress.quizPassedAt));
  const [score, setScore] = useState<number | null>(progress.quizScore ?? null);
  const [passed, setPassed] = useState(Boolean(progress.quizPassedAt));
  const [error, setError] = useState<string | null>(null);

  const passPct = Math.round(content.passScore * 100);
  const answeredCount = content.quiz.filter((q) => draft[q.id] !== undefined).length;
  const allAnswered = answeredCount === content.quiz.length;

  const breakdown = useMemo(() => {
    if (!submitted || score == null) return null;
    let correct = 0;
    const rows = content.quiz.map((q) => {
      const chosen = draft[q.id];
      const ok = chosen === q.correctIndex;
      if (ok) correct += 1;
      return { q, chosen, ok };
    });
    return { correct, total: content.quiz.length, rows };
  }, [content.quiz, draft, score, submitted]);

  const onSubmit = () => {
    if (!allAnswered) {
      setError('יש לענות על כל השאלות לפני בדיקת הציון');
      return;
    }
    setError(null);
    const result = submitQuiz(moduleId, draft);
    setScore(result.score);
    setPassed(result.passed);
    setSubmitted(true);
    onComplete({ score: result.score, passed: result.passed });
  };

  const onRetake = () => {
    setDraft({});
    setSubmitted(false);
    setScore(null);
    setPassed(false);
    setError(null);
  };

  const scorePct = score == null ? null : Math.round(score * 100);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">מבחן ידע לסיום המודול</p>
          <p className="text-xs text-muted-foreground">
            {content.quiz.length} שאלות · ציון עובר {passPct}% · הציון מופיע מיד בסוף
          </p>
        </div>
        {progress.quizScore != null && !submitted && (
          <Badge
            variant={progress.quizPassedAt ? 'secondary' : 'outline'}
            className={cn('gap-1', progress.quizPassedAt && 'text-primary')}
          >
            {progress.quizPassedAt ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
            ציון אחרון: {Math.round(progress.quizScore * 100)}%
          </Badge>
        )}
      </div>

      {submitted && scorePct != null && breakdown && (
        <div
          className={cn(
            'rounded-xl border p-5 text-center space-y-3 animate-in fade-in zoom-in-95 duration-500',
            passed
              ? 'border-emerald-500/40 bg-emerald-500/10'
              : 'border-destructive/40 bg-destructive/10',
          )}
        >
          <div className="mx-auto relative h-28 w-28">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-muted/40"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - scorePct / 100)}`}
                className={cn(
                  'transition-all duration-700',
                  passed ? 'text-emerald-500' : 'text-destructive',
                )}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold tabular-nums">{scorePct}%</span>
              <span className="text-[10px] text-muted-foreground">ציון</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-bold text-lg flex items-center justify-center gap-2">
              {passed ? (
                <>
                  <Trophy className="w-5 h-5 text-emerald-600" />
                  עברתם את המבחן
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-destructive" />
                  לא עברתם עדיין
                </>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {breakdown.correct} מתוך {breakdown.total} תשובות נכונות
              {!passed && ` · נדרשים לפחות ${passPct}%`}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {passed ? (
              <Badge variant="secondary" className="gap-1 text-primary">
                <CheckCircle2 className="w-3.5 h-3.5" />
                שכבת המבחן מסומנת אוטומטית
              </Badge>
            ) : (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={onRetake}>
                <RotateCcw className="w-3.5 h-3.5" />
                נסו שוב
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {content.quiz.map((q, qi) => {
          const chosen = draft[q.id];
          const showReview = submitted && chosen !== undefined;
          const ok = showReview && chosen === q.correctIndex;
          return (
            <div
              key={q.id}
              className={cn(
                'rounded-lg border p-3 space-y-2 transition-colors',
                showReview && ok && 'border-emerald-500/40 bg-emerald-500/5',
                showReview && !ok && 'border-destructive/40 bg-destructive/5',
              )}
            >
              <p className="text-sm font-medium">
                <span className="text-muted-foreground ml-1">{qi + 1}.</span>
                {q.prompt}
              </p>
              <div className="space-y-1">
                {q.options.map((opt, i) => {
                  const selected = chosen === i;
                  const isCorrect = i === q.correctIndex;
                  return (
                    <label
                      key={opt}
                      className={cn(
                        'flex items-center gap-2 text-sm rounded-md px-2 py-1.5 cursor-pointer hover:bg-muted/50',
                        selected && !submitted && 'bg-muted',
                        showReview && isCorrect && 'bg-emerald-500/15 font-medium',
                        showReview && selected && !isCorrect && 'bg-destructive/15',
                        submitted && passed && 'cursor-default',
                      )}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        disabled={submitted && passed}
                        checked={selected}
                        onChange={() => {
                          if (submitted && passed) return;
                          if (submitted) setSubmitted(false);
                          setDraft((d) => ({ ...d, [q.id]: i }));
                        }}
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
              {showReview && (
                <p
                  className={cn(
                    'text-xs',
                    ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive',
                  )}
                >
                  {ok ? 'נכון. ' : 'לא מדויק. '}
                  {q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {!(submitted && passed) && (
          <Button onClick={onSubmit}>
            {submitted ? 'בדוק ציון מחדש' : 'סיים מבחן וקבל ציון'}
          </Button>
        )}
        {submitted && passed && (
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={onRetake}>
            <RotateCcw className="w-3.5 h-3.5" />
            בחינה חוזרת לתרגול
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          נענו {answeredCount}/{content.quiz.length}
        </span>
      </div>
    </div>
  );
}

export default ModuleKnowledgeQuiz;
