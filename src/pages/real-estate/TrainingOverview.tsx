import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Library,
  Milestone,
  PlayCircle,
  Wrench,
} from 'lucide-react';
import {
  TRAINING_LIBRARY,
  TRAINING_META,
  TRAINING_MILESTONES,
  TRAINING_MODULES,
  TRAINING_STAGES,
  TRAINING_TOOLS,
  getModule,
  modulesForStage,
} from '@/data/training-curriculum';
import {
  isModuleComplete,
  readTrainingProgress,
  setMilestoneDone,
} from '@/lib/training-store';
import {
  milestoneAutoReady,
  modulePercent,
  nextRecommendedModule,
  overallStats,
  stageStats,
  weeksSinceStart,
} from '@/lib/training-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const TrainingOverview = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(() => readTrainingProgress());

  const overall = useMemo(() => overallStats(progress), [progress]);
  const nextId = useMemo(() => nextRecommendedModule(progress), [progress]);
  const nextMod = nextId ? getModule(nextId) : undefined;
  const weeks = weeksSinceStart(progress);

  return (
    <div className="space-y-6">
      <section className="re-card p-5 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 text-primary">
              <GraduationCap className="w-5 h-5" />
              <span className="text-sm font-semibold">הכשרה מקצועית</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold leading-snug">{TRAINING_META.title}</h1>
            <p className="text-sm text-muted-foreground">{TRAINING_META.subtitle}</p>
            <p className="text-sm text-primary font-medium">
              כל ההכשרה מתבצעת בתוך האפליקציה — שיעורים, תקצירים, תרגול ומבחנים. אין צורך במקור לימוד חיצוני.
            </p>
          </div>
          <div className="shrink-0 re-card bg-muted/40 p-4 min-w-[180px] space-y-2">
            <p className="text-xs text-muted-foreground">התקדמות כוללת</p>
            <p className="text-3xl font-extrabold text-primary">{overall.percent}%</p>
            <p className="text-sm">
              {overall.completed} / {overall.total} מודולים
            </p>
            <p className="text-xs text-muted-foreground">שבוע {weeks + 1} מאז ההתחלה</p>
          </div>
        </div>
        <Progress value={overall.percent} className="h-2" />
        <ul className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
          {TRAINING_META.rules.map((rule) => (
            <li key={rule} className="flex gap-2 leading-relaxed">
              <span className="text-primary shrink-0">•</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
        {nextMod && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-0.5">המודול הבא בתור</p>
              <p className="font-semibold">
                {nextMod.code} · {nextMod.title}
              </p>
            </div>
            <Button
              onClick={() => navigate(`/real-estate/training/${nextMod.id}`)}
              className="gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              המשך למידה
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          שלבי התכנית
        </h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {TRAINING_STAGES.map((stage) => {
            const stats = stageStats(stage.id, progress);
            const mods = modulesForStage(stage.id);
            return (
              <section key={stage.id} className="re-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">שלב {stage.code}</p>
                    <h3 className="font-bold">{stage.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{stage.months}</p>
                  </div>
                  <Badge variant="secondary">{stats.percent}%</Badge>
                </div>
                {stage.intro && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{stage.intro}</p>
                )}
                <Progress value={stats.percent} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {stats.completed}/{stats.total} מודולים הושלמו
                </p>
                <ul className="space-y-1.5">
                  {mods.map((m) => {
                    const mp = progress.modules[m.id] ?? {
                      layers: {},
                      deliverableNotes: '',
                    };
                    const done = isModuleComplete(mp);
                    const pct = modulePercent(mp);
                    return (
                      <li key={m.id}>
                        <Link
                          to={`/real-estate/training/${m.id}`}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60 transition-colors',
                            done && 'text-primary',
                          )}
                        >
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
                          ) : (
                            <span className="w-4 h-4 shrink-0 rounded-full border border-muted-foreground/40 text-[10px] flex items-center justify-center text-muted-foreground">
                              {pct > 0 ? Math.round(pct / 20) : ''}
                            </span>
                          )}
                          <span className="flex-1 min-w-0 truncate">
                            <span className="font-medium">{m.code}</span> {m.title}
                          </span>
                          {mp.explainerWatchedAt && (
                            <span title="סרטון הסבר נצפה" className="text-primary">
                              <PlayCircle className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {m.engineeringEdge && <span title="יתרון הנדסי">⚙️</span>}
                          {m.refreshOnly && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              רענון
                            </Badge>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </section>

      <section className="re-card p-5 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Milestone className="w-5 h-5 text-primary" />
          אבני דרך
        </h2>
        <ul className="space-y-3">
          {TRAINING_MILESTONES.map((m) => {
            const auto = milestoneAutoReady(m.id, progress);
            const checked = Boolean(progress.milestones[m.id]) || auto;
            return (
              <li key={m.id} className="flex items-start gap-3">
                <Checkbox
                  checked={checked}
                  disabled={auto}
                  onCheckedChange={(v) => {
                    setProgress(setMilestoneDone(m.id, Boolean(v)));
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    חודש {m.month}: {m.title}
                  </p>
                  {auto && (
                    <p className="text-xs text-primary mt-0.5">
                      סומן אוטומטית — המודולים הקשורים הושלמו
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="re-card p-5 space-y-3">
          <h2 className="font-bold flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            כלים
          </h2>
          <ul className="space-y-1.5 text-sm">
            {TRAINING_TOOLS.map((t) => (
              <li key={t.name} className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  {t.name}
                  {t.note ? <span className="text-muted-foreground"> — {t.note}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="re-card p-5 space-y-3">
          <h2 className="font-bold flex items-center gap-2">
            <Library className="w-4 h-4 text-primary" />
            ספרייה מינימלית
          </h2>
          <ul className="space-y-1.5 text-sm">
            {TRAINING_LIBRARY.map((b) => (
              <li key={b.author} className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <span className="font-medium">{b.author}</span> — {b.titles.join('; ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {TRAINING_MODULES.length} מודולים · ההתקדמות נשמרת בדפדפן המקומי
      </p>
    </div>
  );
};

export default TrainingOverview;
