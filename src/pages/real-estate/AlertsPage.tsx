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

const KIND_LABEL = {
  task: 'משימה',
  payment: 'תשלום',
  milestone: 'אבן דרך',
} as const;

const AlertsPage = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState(() => getAllDeals());

  useEffect(() => {
    setDeals(getAllDeals());
  }, []);

  const items = useMemo(
    () => collectCalendarItems(deals).filter((i) => !i.done).slice(0, 40),
    [deals],
  );

  return (
    <section className="re-card overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold">התראות מערכת</h2>
          <p className="text-sm text-muted-foreground">מועדים באיחור ומשימות פתוחות</p>
        </div>
        <button className="text-sm text-primary font-medium" onClick={() => navigate('/real-estate/calendar')}>
          יומן מלא
        </button>
      </div>
      <div className="divide-y">
        {items.length === 0 && (
          <p className="text-center text-muted-foreground py-16">אין התראות פתוחות</p>
        )}
        {items.map((item) => {
          const overdue = isOverdueDate(item.date);
          return (
            <button
              key={item.id}
              onClick={() => navigate(`/real-estate/deals/${item.dealId}`)}
              className="w-full text-right px-5 py-4 hover:bg-muted/40 flex items-start justify-between gap-3"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="secondary">{KIND_LABEL[item.kind]}</Badge>
                  {overdue && <Badge variant="destructive">באיחור</Badge>}
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
  );
};

export default AlertsPage;
