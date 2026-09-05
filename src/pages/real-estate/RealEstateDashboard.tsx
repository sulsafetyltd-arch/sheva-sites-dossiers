import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Building2, CircleDollarSign, FolderOpen, GraduationCap, PlayCircle } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAllDeals } from '@/lib/real-estate-store';
import {
  DEAL_STATUS_LABEL,
  DEAL_TYPE_LABEL,
  feeAmount,
  formatMoney,
  isOpenDeal,
  monthlyReceivedFees,
  primaryClientName,
  propertySummary,
  statusBadgeClass,
} from '@/lib/real-estate-utils';
import { getModule } from '@/data/training-curriculum';
import { readTrainingProgress } from '@/lib/training-store';
import { nextRecommendedModule } from '@/lib/training-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const YEARS = [2026, 2025, 2024];

const RealEstateDashboard = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState(() => getAllDeals());
  const [year, setYear] = useState(new Date().getFullYear());
  const [nextTraining, setNextTraining] = useState(() => {
    const id = nextRecommendedModule(readTrainingProgress());
    return id ? getModule(id) : undefined;
  });

  useEffect(() => {
    setDeals(getAllDeals());
    const id = nextRecommendedModule(readTrainingProgress());
    setNextTraining(id ? getModule(id) : undefined);
  }, []);

  const stats = useMemo(() => {
    const open = deals.filter(isOpenDeal);
    return {
      expected: feeAmount(open, { paid: false }),
      received: feeAmount(deals, { paid: true, year }),
      total: deals.length,
      open: open.length,
    };
  }, [deals, year]);

  const recentOpen = useMemo(
    () => deals.filter(isOpenDeal).slice(0, 8),
    [deals],
  );

  const chartData = useMemo(() => monthlyReceivedFees(deals, year), [deals, year]);

  return (
    <div className="space-y-6">
      {nextTraining && (
        <section className="re-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">המודול הבא בהכשרה</p>
              <p className="font-semibold truncate">
                {nextTraining.code} · {nextTraining.title}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                המשיכו מהמקום שעצרתם — שיעורים, תרגול ומבחן בתוך האפליקציה
              </p>
            </div>
          </div>
          <Button
            className="gap-2 shrink-0"
            onClick={() => navigate(`/real-estate/training/${nextTraining.id}`)}
          >
            <PlayCircle className="w-4 h-4" />
            המשך למידה
          </Button>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi
          icon={CircleDollarSign}
          value={formatMoney(stats.expected)}
          title='שכר טרחה צפוי (כולל מע"מ)'
          hint="סכום שכר טרחה שטרם התקבל בתיקים פתוחים"
        />
        <Kpi
          icon={Briefcase}
          value={formatMoney(stats.received)}
          title="שכר טרחה שנתי שהתקבל"
          hint={`סה"כ במערכת כולל מע"מ · ${year}`}
        />
        <Kpi
          icon={Building2}
          value={String(stats.total)}
          title='סה"כ העסקאות'
          hint="כל העסקאות במערכת"
        />
        <Kpi
          icon={FolderOpen}
          value={String(stats.open)}
          title="עסקאות פתוחות"
          hint="עסקאות שטרם נסגרו"
        />
      </div>

      <div className="grid xl:grid-cols-5 gap-4">
        <section className="xl:col-span-3 re-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">עסקאות פתוחות אחרונות</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="re-table text-right">
                  <th className="px-4 py-3">פרטי נכס</th>
                  <th className="px-4 py-3">שם לקוח</th>
                  <th className="px-4 py-3">מהות העסקה</th>
                  <th className="px-4 py-3">בטיפול של</th>
                  <th className="px-4 py-3">שלב העסקה</th>
                </tr>
              </thead>
              <tbody>
                {recentOpen.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                      אין עסקאות פתוחות להצגה
                    </td>
                  </tr>
                )}
                {recentOpen.map((deal) => (
                  <tr
                    key={deal.id}
                    className="border-t hover:bg-muted/40 cursor-pointer"
                    onClick={() => navigate(`/real-estate/deals/${deal.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{propertySummary(deal)}</p>
                      <p className="text-xs text-muted-foreground">{deal.fileNumber}</p>
                    </td>
                    <td className="px-4 py-3">{primaryClientName(deal)}</td>
                    <td className="px-4 py-3">{DEAL_TYPE_LABEL[deal.type]}</td>
                    <td className="px-4 py-3">{deal.responsibleAttorney || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusBadgeClass(deal.status)}>
                        {DEAL_STATUS_LABEL[deal.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="xl:col-span-2 re-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">שכר טרחה שהתקבל</h2>
            <div className="flex items-center gap-3">
              <button
                className="text-sm text-primary font-medium"
                onClick={() => navigate('/real-estate/deals')}
              >
                הכל
              </button>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[96px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e8ec" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7a828c' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#7a828c' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value: number) => [formatMoney(value), 'התקבל']}
                  contentStyle={{ direction: 'rtl', borderRadius: 8 }}
                />
                <Bar dataKey="amount" fill="#00A79D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
};

function Kpi({
  icon: Icon,
  value,
  title,
  hint,
}: {
  icon: typeof CircleDollarSign;
  value: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="re-card p-5 flex items-start gap-4">
      <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
        <p className="font-medium mt-1">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
      </div>
    </div>
  );
}

export default RealEstateDashboard;
