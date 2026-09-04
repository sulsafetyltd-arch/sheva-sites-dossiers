import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Lock,
  Scale,
} from 'lucide-react';
import { TRAINING_MODULES, getModule, getStage } from '@/data/training-curriculum';
import { getInteractiveContent } from '@/data/interactive-content';
import {
  deliverableSatisfied,
  getModuleProgress,
  isContentRead,
  isModuleComplete,
  layerContentReady,
  markContentRead,
  setDeliverableAnswer,
  setExplainerWatched,
  setLayerComplete,
} from '@/lib/training-store';
import { canToggleLayer, modulePercent } from '@/lib/training-utils';
import type { TrainingLayerId } from '@/types/training';
import { LAYER_LABEL } from '@/types/training';
import { ModuleExplainerPlayer } from '@/components/real-estate/ModuleExplainerPlayer';
import { ModuleKnowledgeQuiz } from '@/components/real-estate/ModuleKnowledgeQuiz';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TrainingModulePage = () => {
  const { moduleId = '' } = useParams();
  const navigate = useNavigate();
  const mod = getModule(moduleId);
  const [, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const live = getModuleProgress(moduleId);
  const content = useMemo(() => getInteractiveContent(moduleId), [moduleId]);
  const pct = modulePercent(live);
  const done = isModuleComplete(live);
  const stage = mod ? getStage(mod.stageId) : undefined;

  const idx = TRAINING_MODULES.findIndex((m) => m.id === moduleId);
  const prev = idx > 0 ? TRAINING_MODULES[idx - 1] : null;
  const next = idx >= 0 && idx < TRAINING_MODULES.length - 1 ? TRAINING_MODULES[idx + 1] : null;

  if (!mod) {
    return (
      <div className="re-card p-6 space-y-3">
        <p>מודול לא נמצא.</p>
        <Button variant="outline" onClick={() => navigate('/real-estate/training')}>
          חזרה לתכנית
        </Button>
      </div>
    );
  }

  const markRead = (id: string) => {
    markContentRead(moduleId, id);
    refresh();
  };

  const toggleLayer = (layer: TrainingLayerId, value: boolean) => {
    const check = canToggleLayer(layer, live, value, moduleId);
    if (!check.ok) {
      toast.error(check.reason);
      return;
    }
    setLayerComplete(moduleId, layer, value);
    refresh();
    if (layer === 'deliverable' && value) {
      toast.success('תוצר מעשי סומן — כלל הברזל מולא');
    }
    if (isModuleComplete(getModuleProgress(moduleId))) {
      toast.success(`מודול ${mod.code} הושלם`);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          to="/real-estate/training"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          <GraduationCap className="w-4 h-4" />
          תכנית הכשרה
        </Link>
        <span className="text-muted-foreground">/</span>
        {stage && (
          <span className="text-muted-foreground">
            שלב {stage.code} · {stage.title}
          </span>
        )}
      </div>

      <section className="re-card p-5 space-y-3">
        <div className="flex flex-wrap items-start gap-2 justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">מודול {mod.code}</p>
            <h1 className="text-xl font-bold leading-snug flex flex-wrap items-center gap-2">
              {mod.title}
              {mod.engineeringEdge && (
                <Badge className="gap-1" title="יתרון הנדסי-תכנוני">
                  ⚙️ יתרון ייחודי
                </Badge>
              )}
              {mod.refreshOnly && <Badge variant="outline">רענון בלבד</Badge>}
              {done && (
                <Badge variant="secondary" className="gap-1 text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  הושלם
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{content.learningGoal}</p>
            <p className="text-xs text-primary/90 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              כל החומר נלמד כאן באפליקציה — אין צורך במקור חיצוני להשלמת המודול
            </p>
          </div>
          <div className="text-left min-w-[100px]">
            <p className="text-2xl font-extrabold text-primary">{pct}%</p>
            <p className="text-xs text-muted-foreground">התקדמות</p>
          </div>
        </div>
        <Progress value={pct} className="h-2" />
      </section>

      <ModuleExplainerPlayer
        module={mod}
        watched={Boolean(live.explainerWatchedAt)}
        onWatched={() => {
          setExplainerWatched(moduleId);
          refresh();
          toast.success('שקופיות ההסבר סומנו כנצפו');
        }}
      />

      <LayerCard
        layer="law"
        checked={Boolean(live.layers.law)}
        ready={layerContentReady(moduleId, 'law', live)}
        onToggle={(v) => toggleLayer('law', v)}
      >
        <div className="space-y-4">
          {content.lessons.map((lesson) => {
            const read = isContentRead(live, lesson.id);
            return (
              <article
                key={lesson.id}
                className={cn(
                  'rounded-lg border p-4 space-y-2',
                  read && 'border-primary/40 bg-muted/20',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm">{lesson.title}</h3>
                  <Button
                    size="sm"
                    variant={read ? 'secondary' : 'outline'}
                    onClick={() => markRead(lesson.id)}
                  >
                    {read ? 'נקרא' : 'סמן כנקרא'}
                  </Button>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-line">{lesson.body}</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {lesson.keyPoints.map((k) => (
                    <li key={k} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{k}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
          {content.statutes.map((s) => {
            const read = isContentRead(live, s.id);
            return (
              <article
                key={s.id}
                className={cn(
                  'rounded-lg border p-4 space-y-2',
                  read && 'border-primary/40 bg-muted/20',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.citation}</p>
                    <h3 className="font-semibold text-sm">{s.title}</h3>
                  </div>
                  <Button
                    size="sm"
                    variant={read ? 'secondary' : 'outline'}
                    onClick={() => markRead(s.id)}
                  >
                    {read ? 'נקרא' : 'סמן כנקרא'}
                  </Button>
                </div>
                <p className="text-sm leading-relaxed">{s.summary}</p>
                <p className="text-xs text-primary">טיפ מעשי: {s.practiceTip}</p>
              </article>
            );
          })}
        </div>
      </LayerCard>

      <LayerCard
        layer="literature"
        checked={Boolean(live.layers.literature)}
        ready={layerContentReady(moduleId, 'literature', live)}
        onToggle={(v) => toggleLayer('literature', v)}
      >
        <div className="space-y-3">
          {content.literatureDigests.map((d) => {
            const read = isContentRead(live, d.id);
            return (
              <article
                key={d.id}
                className={cn(
                  'rounded-lg border p-4 space-y-2',
                  read && 'border-primary/40 bg-muted/20',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm">{d.source}</h3>
                  <Button
                    size="sm"
                    variant={read ? 'secondary' : 'outline'}
                    onClick={() => markRead(d.id)}
                  >
                    {read ? 'נקרא' : 'סמן כנקרא'}
                  </Button>
                </div>
                <ul className="text-sm space-y-1">
                  {d.takeaways.map((t) => (
                    <li key={t} className="flex gap-2 leading-relaxed">
                      <span className="text-primary shrink-0">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </LayerCard>

      <LayerCard
        layer="cases"
        checked={Boolean(live.layers.cases)}
        ready={layerContentReady(moduleId, 'cases', live)}
        onToggle={(v) => toggleLayer('cases', v)}
      >
        <div className="space-y-3">
          {content.caseBriefs.map((c) => {
            const read = isContentRead(live, c.id);
            return (
              <article
                key={c.id}
                className={cn(
                  'rounded-lg border p-4 space-y-2',
                  read && 'border-primary/40 bg-muted/20',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-primary" />
                    {c.citation}
                  </h3>
                  <Button
                    size="sm"
                    variant={read ? 'secondary' : 'outline'}
                    onClick={() => markRead(c.id)}
                  >
                    {read ? 'נקרא' : 'סמן כנקרא'}
                  </Button>
                </div>
                <p className="text-sm">
                  <span className="font-medium">עובדות: </span>
                  {c.facts}
                </p>
                <p className="text-sm">
                  <span className="font-medium">הלכה: </span>
                  {c.holding}
                </p>
                <p className="text-xs text-primary">לקח מעשי: {c.takeaway}</p>
              </article>
            );
          })}
        </div>
      </LayerCard>

      <section className="re-card p-5 space-y-3 border-primary/30">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={Boolean(live.layers.deliverable) && deliverableSatisfied(live)}
            onCheckedChange={(v) => toggleLayer('deliverable', Boolean(v))}
            className="mt-1"
          />
          <div className="flex-1 space-y-1">
            <h2 className="font-semibold flex items-center gap-2">
              {LAYER_LABEL.deliverable}
              {!deliverableSatisfied(live) && !live.layers.deliverable && (
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </h2>
            <p className="text-sm leading-relaxed">{mod.deliverable}</p>
            <p className="text-xs text-amber-700 dark:text-amber-500">
              כלל ברזל: מלאו את שדות התוצר באפליקציה (לפחות כמה מילים) לפני הסימון.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {content.deliverablePrompts.map((prompt) => (
            <div key={prompt.id} className="space-y-1">
              <label className="text-sm font-medium">{prompt.label}</label>
              <Textarea
                value={live.deliverableAnswers?.[prompt.id] ?? ''}
                onChange={(e) => {
                  setDeliverableAnswer(moduleId, prompt.id, e.target.value);
                  refresh();
                }}
                placeholder={prompt.placeholder}
                className="min-h-[80px] text-sm"
              />
            </div>
          ))}
        </div>
      </section>

      <LayerCard
        layer="exam"
        checked={Boolean(live.layers.exam)}
        ready={layerContentReady(moduleId, 'exam', live)}
        onToggle={(v) => toggleLayer('exam', v)}
      >
        <ModuleKnowledgeQuiz
          moduleId={moduleId}
          content={content}
          progress={live}
          onComplete={(result) => {
            refresh();
            if (result.passed) {
              toast.success(`עברתם את המבחן (${Math.round(result.score * 100)}%)`);
            } else {
              toast.error(`לא עברתם (${Math.round(result.score * 100)}%). נסו שוב.`);
            }
            if (isModuleComplete(getModuleProgress(moduleId))) {
              toast.success(`מודול ${mod.code} הושלם`);
            }
          }}
        />
      </LayerCard>

      <div className="flex flex-wrap gap-2 justify-between pt-2">
        <Button
          variant="outline"
          disabled={!prev}
          onClick={() => prev && navigate(`/real-estate/training/${prev.id}`)}
          className="gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          {prev ? prev.code : '—'}
        </Button>
        <Button variant="ghost" onClick={() => navigate('/real-estate/training')}>
          כל התכנית
        </Button>
        <Button
          variant="outline"
          disabled={!next}
          onClick={() => next && navigate(`/real-estate/training/${next.id}`)}
          className="gap-2"
        >
          {next ? next.code : '—'}
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

function LayerCard({
  layer,
  checked,
  ready,
  onToggle,
  children,
}: {
  layer: TrainingLayerId;
  checked: boolean;
  ready: boolean;
  onToggle: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <section className={cn('re-card p-5 space-y-3', checked && 'bg-muted/30')}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => onToggle(Boolean(v))}
          className="mt-1"
        />
        <div className="flex-1 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">{LAYER_LABEL[layer]}</h2>
          {!ready && !checked && (
            <Badge variant="outline" className="text-xs gap-1">
              <Lock className="w-3 h-3" />
              השלימו את התוכן
            </Badge>
          )}
          {ready && !checked && (
            <Badge variant="secondary" className="text-xs">
              מוכן לסימון
            </Badge>
          )}
        </div>
      </div>
      <div className="pr-7">{children}</div>
    </section>
  );
}

export default TrainingModulePage;
