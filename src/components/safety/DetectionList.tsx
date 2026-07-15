import { useState } from 'react';
import { Check, Pencil, ThumbsDown, ThumbsUp, Trash2, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AiDetection, Severity } from '@/types/safety-report';
import { SEVERITY_LABELS } from '@/data/safety-domains';
import { cn } from '@/lib/utils';

interface Props {
  detections: AiDetection[];
  onChange: (detections: AiDetection[]) => void;
}

const severityClass: Record<Severity, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-600 text-white',
  medium: 'bg-warning text-warning-foreground',
  low: 'bg-muted text-muted-foreground',
};

export function DetectionList({ detections, onChange }: Props) {
  const update = (id: string, patch: Partial<AiDetection>) => {
    onChange(detections.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const remove = (id: string) => {
    onChange(detections.filter((d) => d.id !== id));
  };

  if (detections.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        עדיין אין ממצאים. צלמו והריצו AI, בחרו מרשימת ליקויים לפי תחום, או הוסיפו ידנית.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {detections.map((d) => (
        <li
          key={d.id}
          className={cn(
            'rounded-xl border bg-card p-4 shadow-sm transition-opacity',
            d.status === 'rejected' && 'opacity-50',
            d.status === 'fixed' && 'border-success/40 bg-success/5',
          )}
        >
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={severityClass[d.severity]}>{SEVERITY_LABELS[d.severity]}</Badge>
                <Badge variant="outline">{d.category}</Badge>
                {d.source === 'ai' && (
                  <Badge variant="secondary">AI {Math.round(d.confidence * 100)}%</Badge>
                )}
                {d.source === 'catalog' && <Badge variant="secondary">מרשימה</Badge>}
                {d.source === 'manual' && <Badge variant="secondary">ידני</Badge>}
              </div>
              <h3 className="text-base font-semibold leading-snug">{d.title}</h3>
            </div>
          </div>

          {d.description && (
            <p className="mb-2 text-sm text-muted-foreground">{d.description}</p>
          )}
          {d.recommendation && (
            <p className="mb-3 text-sm">
              <span className="font-medium">המלצה: </span>
              {d.recommendation}
            </p>
          )}
          {d.regulationHint && (
            <p className="mb-3 text-xs text-muted-foreground">{d.regulationHint}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={d.status === 'accepted' ? 'default' : 'outline'}
              className="gap-1"
              onClick={() => update(d.id, { status: 'accepted' })}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              אשר
            </Button>
            <Button
              type="button"
              size="sm"
              variant={d.status === 'rejected' ? 'destructive' : 'outline'}
              className="gap-1"
              onClick={() => update(d.id, { status: 'rejected' })}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              דחה
            </Button>
            <Button
              type="button"
              size="sm"
              variant={d.status === 'fixed' ? 'default' : 'outline'}
              className="gap-1"
              onClick={() => update(d.id, { status: 'fixed' })}
            >
              <Wrench className="h-3.5 w-3.5" />
              תוקן
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1 text-destructive"
              onClick={() => remove(d.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {d.status === 'accepted' && (
            <p className="mt-2 flex items-center gap-1 text-xs text-success">
              <Check className="h-3.5 w-3.5" /> נכלל בדוח
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

interface ManualAddProps {
  onAdd: (detection: AiDetection) => void;
}

export function ManualDefectForm({ onAdd }: ManualAddProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [recommendation, setRecommendation] = useState('');

  if (!open) {
    return (
      <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        הוסף ליקוי ידנית
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <input
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        placeholder="כותרת הליקוי"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <select
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={severity}
        onChange={(e) => setSeverity(e.target.value as Severity)}
      >
        {(Object.keys(SEVERITY_LABELS) as Severity[]).map((s) => (
          <option key={s} value={s}>
            {SEVERITY_LABELS[s]}
          </option>
        ))}
      </select>
      <textarea
        className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        placeholder="המלצת תיקון (אופציונלי)"
        value={recommendation}
        onChange={(e) => setRecommendation(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          className="flex-1"
          disabled={!title.trim()}
          onClick={() => {
            onAdd({
              id: crypto.randomUUID(),
              title: title.trim(),
              description: '',
              severity,
              category: 'ידני',
              recommendation: recommendation.trim(),
              confidence: 1,
              source: 'manual',
              status: 'accepted',
            });
            setTitle('');
            setRecommendation('');
            setSeverity('medium');
            setOpen(false);
          }}
        >
          שמור ליקוי
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          ביטול
        </Button>
      </div>
    </div>
  );
}
