import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAllDeals } from '@/lib/real-estate-store';
import {
  collectCalendarItems,
  formatMoney,
  formatShortDate,
  isOverdueDate,
} from '@/lib/real-estate-utils';
import { downloadIcs, whatsappReminderLink } from '@/lib/ics';
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

  const phoneByDeal = useMemo(() => {
    const map = new Map<string, string>();
    for (const deal of deals) {
      const phone = deal.parties.find((p) => p.phone.trim())?.phone.trim();
      if (phone) map.set(deal.id, phone);
    }
    return map;
  }, [deals]);

  const allItems = useMemo(
    () => collectCalendarItems(deals).filter((i) => (hideDone ? !i.done : true)),
    [deals, hideDone],
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const key = item.date.slice(0, 7);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [allItems]);

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">משימות, תשלומים ומועדי חתימה / מסירה / רישום</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hideDone}
              onChange={(e) => setHideDone(e.target.checked)}
              className="rounded border"
            />
            הסתר פריטים שהושלמו
          </label>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={allItems.length === 0}
            onClick={() => downloadIcs(allItems)}
          >
            <CalendarPlus className="w-4 h-4" />
            הורדה ליומן (Google / Outlook)
          </Button>
        </div>
      </div>

      {groups.length === 0 && (
        <p className="text-center text-muted-foreground py-16">אין מועדים להצגה</p>
      )}

      {groups.map(([month, items]) => (
        <section key={month} className="space-y-3">
          <h3 className="font-semibold text-lg">
            {format(parseISO(`${month}-01`), 'MMMM yyyy', { locale: he })}
          </h3>
          <div className="re-card divide-y">
            {items.map((item) => {
              const overdue = !item.done && isOverdueDate(item.date);
              const phone = phoneByDeal.get(item.dealId);
              return (
                <div
                  key={item.id}
                  className="w-full p-4 hover:bg-muted/40 transition-colors flex items-start justify-between gap-3"
                >
                  <button onClick={() => navigate(`/deals/${item.dealId}`)} className="min-w-0 text-right flex-1">
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
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    {phone && !item.done && (
                      <a
                        href={whatsappReminderLink(
                          phone,
                          `שלום, תזכורת ממשרד עו״ד: ${item.title} בתיק ${item.fileNumber} (${item.dealTitle}) — עד ${formatShortDate(item.date)}${item.amount != null ? `, סכום ${formatMoney(item.amount)}` : ''}.`,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        title="שליחת תזכורת בוואטסאפ"
                        className="text-emerald-600 hover:text-emerald-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                    <span className={`text-sm tabular-nums ${overdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                      {formatShortDate(item.date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
};

export default CalendarPage;
