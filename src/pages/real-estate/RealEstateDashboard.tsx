import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, FolderOpen, Plus, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAllDeals } from '@/lib/real-estate-store';
import {
  ACTIVE_STATUSES,
  collectCalendarItems,
  DEAL_STATUS_LABEL,
  DEAL_TYPE_LABEL,
  dealProgress,
  formatMoney,
  formatShortDate,
  isOverdueDate,
  statusBadgeClass,
} from '@/lib/real-estate-utils';
import { ProgressBar } from '@/components/real-estate/Field';

const RealEstateDashboard = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState(() => getAllDeals());

  useEffect(() => {
    setDeals(getAllDeals());
  }, []);

  const stats = useMemo(() => {
    const active = deals.filter((d) => ACTIVE_STATUSES.includes(d.status));
    const overdueTasks = deals.flatMap((d) =>
      d.tasks.filter((t) => !t.done && isOverdueDate(t.dueDate)),
    );
    const overduePayments = deals.flatMap((d) =>
      d.payments.filter((p) => p.status !== 'paid' && p.status !== 'waived' && isOverdueDate(p.dueDate)),
    );
    const volume = active.reduce((sum, d) => sum + (d.consideration || 0), 0);
    return {
      total: deals.length,
      active: active.length,
      overdue: overdueTasks.length + overduePayments.length,
      volume,
    };
  }, [deals]);

  const upcoming = useMemo(() => {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 21);
    const until = horizon.toISOString().slice(0, 10);
    return collectCalendarItems(deals)
      .filter((i) => !i.done && i.date <= until)
      .slice(0, 8);
  }, [deals]);

  return (
    <main className="container py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">שלום למשרד</p>
          <h2 className="text-2xl font-bold">לוח בקרה</h2>
        </div>
        <Button className="gap-2" onClick={() => navigate('/real-estate/deals?new=1')}>
          <Plus className="w-4 h-4" />
          עסקה חדשה
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'סה"כ תיקים', value: stats.total, icon: FolderOpen },
          { label: 'תיקים פעילים', value: stats.active, icon: Scale },
          { label: 'מועדים באיחור', value: stats.overdue, icon: AlertTriangle, warn: stats.overdue > 0 },
          { label: 'היקף פעיל', value: formatMoney(stats.volume), icon: CalendarClock, text: true },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.warn ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            <p className={`text-2xl font-bold tabular-nums ${s.warn ? 'text-destructive' : ''}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 space-y-3">
          <h3 className="font-semibold">תיקים פעילים</h3>
          <div className="space-y-3">
            {deals.filter((d) => ACTIVE_STATUSES.includes(d.status)).map((deal) => (
              <button
                key={deal.id}
                onClick={() => navigate(`/real-estate/deals/${deal.id}`)}
                className="w-full text-right bg-card rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{deal.fileNumber}</p>
                    <h4 className="font-semibold truncate">{deal.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {DEAL_TYPE_LABEL[deal.type]} · {deal.property.city || 'ללא עיר'} · {formatMoney(deal.consideration)}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusBadgeClass(deal.status)}>
                    {DEAL_STATUS_LABEL[deal.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar value={dealProgress(deal)} />
                  <span className="text-xs tabular-nums text-muted-foreground w-10">{dealProgress(deal)}%</span>
                </div>
              </button>
            ))}
            {deals.filter((d) => ACTIVE_STATUSES.includes(d.status)).length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">אין תיקים פעילים</p>
            )}
          </div>
        </section>

        <section className="lg:col-span-2 space-y-3">
          <h3 className="font-semibold">מועדים קרובים (21 יום)</h3>
          <div className="bg-card rounded-lg border divide-y shadow-sm">
            {upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground p-6 text-center">אין מועדים בטווח זה</p>
            )}
            {upcoming.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/real-estate/deals/${item.dealId}`)}
                className="w-full text-right p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <span className={`text-xs tabular-nums ${isOverdueDate(item.date) ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                    {formatShortDate(item.date)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.fileNumber} · {item.dealTitle}
                  {item.amount != null ? ` · ${formatMoney(item.amount)}` : ''}
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default RealEstateDashboard;
