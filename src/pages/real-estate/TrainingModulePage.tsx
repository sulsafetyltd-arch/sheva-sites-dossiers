import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, Lock } from 'lucide-react';
import { TRAINING_MODULES, getModule, getStage } from '@/data/training-curriculum';
import {
  deliverableSatisfied,
  getModuleProgress,
  isModuleComplete,
  setDeliverableNotes,
  setExplainerWatched,
  setLayerComplete,
} from '@/lib/training-store';
import { canToggleLayer, modulePercent } from '@/lib/training-utils';
import type { TrainingLayerId } from '@/types/training';
import { LAYER_LABEL } from '@/types/training';
import { ModuleExplainerPlayer } from '@/components/real-estate/ModuleExplainerPlayer';
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

  const toggleLayer = (layer: TrainingLayerId, value: boolean) => {
    const check = canToggleLayer(layer, live, value);
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
            {mod.intro && <p className="text-sm text-muted-foreground">{mod.intro}</p>}
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
          toast.success('סרטון ההסבר סומן כנצפה');
        }}
      />

      <LayerCard
        layer="law"
        checked={Boolean(live.layers.law)}
        onToggle={(v) => toggleLayer('law', v)}
      >
        <ul className="space-y-2 text-sm">
          {mod.studyItems.map((item) => (
            <li key={item} className="flex gap-2 leading-relaxed">
              <span className="text-primary shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </LayerCard>

      <LayerCard
        layer="literature"
        checked={Boolean(live.layers.literature)}
        onToggle={(v) => toggleLayer('literature', v)}
      >
        {mod.literature.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            אין ספרות ייעודית מעבר לספרייה הכללית — סמן לאחר עיון בחומר הרלוונטי.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {mod.literature.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </LayerCard>

      <LayerCard
        layer="cases"
        checked={Boolean(live.layers.cases)}
        onToggle={(v) => toggleLayer('cases', v)}
      >
        {mod.cases.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            אין רשימת פתיחה ייעודית — אסוף 5–10 פסקי דין מהמאגרים וסמן לאחר הקריאה.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {mod.cases.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground mt-3">לאמת ולהרחיב מהמאגרים לפני ציטוט.</p>
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
              כלל ברזל: לא עוברים בלי תיעוד התוצר (הערות / קישור / מיקום קובץ).
            </p>
          </div>
        </div>
        <Textarea
          value={live.deliverableNotes}
          onChange={(e) => {
            setDeliverableNotes(moduleId, e.target.value);
            refresh();
          }}
          placeholder="תעד כאן: היכן נשמר התוצר, קישור, או תקציר קצר של מה שנבנה…"
          className="min-h-[100px] text-sm"
        />
        {live.deliverableNotes.trim().length > 0 &&
          live.deliverableNotes.trim().length < 8 && (
            <p className="text-xs text-destructive">
              יש להרחיב את התיעוד (לפחות כמה מילים) לפני הסימון.
            </p>
          )}
      </section>

      <LayerCard
        layer="exam"
        checked={Boolean(live.layers.exam)}
        onToggle={(v) => toggleLayer('exam', v)}
      >
        <p className="text-sm leading-relaxed">{mod.exam}</p>
        <p className="text-xs text-muted-foreground mt-2">
          בלי הערות — הסבר בעל-פה ללקוח דמיוני, ואז סמן.
        </p>
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
  onToggle,
  children,
}: {
  layer: TrainingLayerId;
  checked: boolean;
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
        <h2 className="font-semibold flex-1">{LAYER_LABEL[layer]}</h2>
      </div>
      <div className="pr-7">{children}</div>
    </section>
  );
}

export default TrainingModulePage;
