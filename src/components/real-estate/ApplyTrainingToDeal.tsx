import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, FolderPlus } from 'lucide-react';
import { getAllDeals } from '@/lib/real-estate-store';
import {
  applyModuleDeliverableToDeal,
  applyModuleDeliverableToNewDeal,
} from '@/lib/apply-training-to-deal';
import { deliverableSatisfied, getModuleProgress } from '@/lib/training-store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  moduleId: string;
  /** bump to re-read progress after edits */
  refreshKey?: number;
}

export function ApplyTrainingToDeal({ moduleId, refreshKey = 0 }: Props) {
  const navigate = useNavigate();
  const progress = useMemo(() => getModuleProgress(moduleId), [moduleId, refreshKey]);
  const ready = deliverableSatisfied(progress);
  const deals = useMemo(() => getAllDeals(), [refreshKey]);
  const [dealId, setDealId] = useState(deals[0]?.id ?? '');
  const [busy, setBusy] = useState(false);

  if (!ready) {
    return (
      <p className="text-xs text-muted-foreground">
        לאחר מילוי וסימון התוצר המעשי תוכלו להחיל אותו על תיק עסקה.
      </p>
    );
  }

  const applyExisting = () => {
    if (!dealId) {
      toast.error('בחרו תיק');
      return;
    }
    setBusy(true);
    try {
      const deal = applyModuleDeliverableToDeal(moduleId, dealId);
      toast.success(`התוצר הוחל על תיק ${deal.fileNumber}`);
      navigate(`/real-estate/deals/${deal.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'החלה נכשלה');
    } finally {
      setBusy(false);
    }
  };

  const applyNew = () => {
    setBusy(true);
    try {
      const deal = applyModuleDeliverableToNewDeal(moduleId);
      toast.success(`נפתח תיק ${deal.fileNumber} עם התוצר`);
      navigate(`/real-estate/deals/${deal.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'פתיחת תיק נכשלה');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Briefcase className="w-4 h-4 text-primary" />
        החל תוצר על תיק עסקה
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        מעתיק את תשובות התוצר להערות התיק, מוסיף רשומה בציר הזמן ויוצר משימת יישום.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <select
          className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
        >
          {deals.length === 0 && <option value="">אין תיקים עדיין</option>}
          {deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fileNumber} · {d.title}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={busy || !dealId}
          onClick={applyExisting}
        >
          <Briefcase className="w-3.5 h-3.5" />
          החל על תיק נבחר
        </Button>
        <Button type="button" size="sm" className="gap-1.5" disabled={busy} onClick={applyNew}>
          <FolderPlus className="w-3.5 h-3.5" />
          תיק חדש מהתוצר
        </Button>
      </div>
    </div>
  );
}

export default ApplyTrainingToDeal;
