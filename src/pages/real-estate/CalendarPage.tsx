import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { getAllDeals } from '@/lib/real-estate-store';
import {
  collectCalendarItems,
  formatMoney,
  formatShortDate,
  isOverdueDate,
} from '@/lib/real-estate-utils';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

const KIND_LABEL = {
  task: 'משימה',
  payment: 'תשלום',
  milestone: 'אבן דרך',
} as const;

const CalendarPage = () => {
  const navigate = useNavigate();
  const [hideDone, setHideDone] = useState(true);
  const [deals, setDeals] = useState(() => getAllDeals());

  useEffect(() => {
    setDeals(getAllDeals());
  }, []);

  const groups = useMemo(() => {
    const items = collectCalendarItems(deals).filter((i) => (hideDone ? !i.done : true));
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const key = item.date.slice(0, 7);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [deals, hideDone]);

  return (
    <main className="container py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">יומן מועדים</h2>
          <p className="text-sm text-muted-foreground">משימות, תשלומים ומועדי חתימה / מסירה / רישום</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
            className="rounded border"
          />
          הסתר פריטים שהושלמו
        </label>
      </div>

      {groups.length === 0 && (
        <p className="text-center text-muted-foreground py-16">אין מועדים להצגה</p>
      )}

      {groups.map(([month, items]) => (
        <section key={month} className="space-y-3">
          <h3 className="font-semibold text-lg">
            {format(parseISO(`${month}-01`), 'MMMM yyyy', { locale: he })}
          </h3>
          <div className="bg-card rounded-lg border divide-y shadow-sm">
            {items.map((item) => {
              const overdue = !item.done && isOverdueDate(item.date);
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/real-estate/deals/${item.dealId}`)}
                  className="w-full text-right p-4 hover:bg-muted/40 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="secondary">{KIND_LABEL[item.kind]}</Badge>
                      {overdue && <Badge variant="destructive">באיחור</Badge>}
                      {item.done && <Badge variant="outline">הושלם</Badge>}
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.fileNumber} · {item.dealTitle}
                      {item.amount != null ? ` · ${formatMoney(item.amount)}` : ''}
                    </p>
                  </div>
                  <span className={`text-sm tabular-nums shrink-0 ${overdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                    {formatShortDate(item.date)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
};

export default CalendarPage;
