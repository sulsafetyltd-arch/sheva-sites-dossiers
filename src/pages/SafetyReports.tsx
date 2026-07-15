import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Cable,
  Factory,
  FileText,
  Flame,
  HardHat,
  Landmark,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  Warehouse,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { SAFETY_DOMAINS } from '@/data/safety-domains';
import {
  createSafetyReport,
  deleteSafetyReport,
  getAllSafetyReports,
} from '@/lib/safety-report-store';
import { SafetyDomain, SafetyReportMeta } from '@/types/safety-report';
import { cn } from '@/lib/utils';

const domainIcons: Record<SafetyDomain, typeof HardHat> = {
  construction: HardHat,
  factory: Factory,
  office: Building2,
  warehouse: Warehouse,
  public: Landmark,
  infrastructure: Cable,
  general: ShieldAlert,
};

const statusLabel: Record<string, string> = {
  draft: 'טיוטה',
  analyzing: 'בניתוח',
  ready: 'מוכן',
  exported: 'יוצא',
};

export default function SafetyReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<SafetyReportMeta[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [domain, setDomain] = useState<SafetyDomain>('construction');

  const load = useCallback(async () => {
    setReports(await getAllSafetyReports());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: reports.length,
      critical: reports.reduce((n, r) => n + r.criticalCount, 0),
      openDefects: reports.reduce((n, r) => n + r.defectCount, 0),
    }),
    [reports],
  );

  const handleCreate = async () => {
    if (!siteName.trim()) return;
    const report = await createSafetyReport({
      siteName: siteName.trim(),
      domain,
    });
    setSiteName('');
    setDialogOpen(false);
    navigate(`/safety/${report.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="container flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight sm:text-xl">
                דוחות ליקויי בטיחות
              </h1>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                צילום בשטח · זיהוי AI · דוח מוכן
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="shrink-0 gap-1">
            <Link to="/">
              <Flame className="h-4 w-4" />
              <span className="hidden sm:inline">תיקי שטח</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="container space-y-6 py-6 pb-24">
        <section className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard label="דוחות" value={stats.total} />
          <StatCard label="ליקויים" value={stats.openDefects} />
          <StatCard label="קריטיים" value={stats.critical} highlight />
        </section>

        <section className="rounded-2xl border bg-gradient-to-b from-primary/8 to-transparent p-5">
          <h2 className="mb-1 text-lg font-bold">בדיקה חדשה בשטח</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            בחרו תחום, צלמו ליקויים והמערכת תזהה ותפיק דוח בעברית.
          </p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="w-full gap-2 sm:w-auto">
                <Plus className="h-5 w-5" />
                התחל בדיקה
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>בדיקת בטיחות חדשה</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                <Input
                  placeholder="שם האתר / המבנה / המפעל"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
                />
                <div>
                  <p className="mb-2 text-sm font-medium">תחום הבדיקה</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SAFETY_DOMAINS.map((d) => {
                      const Icon = domainIcons[d.id];
                      const selected = domain === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setDomain(d.id)}
                          className={cn(
                            'rounded-xl border p-3 text-right transition-colors',
                            selected
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted/60',
                          )}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold">{d.shortLabel}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {d.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Button className="w-full" disabled={!siteName.trim()} onClick={() => void handleCreate()}>
                  המשך לצילום
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">דוחות אחרונים</h2>
          {reports.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              עדיין אין דוחות. התחילו בדיקה ראשונה מהשטח.
            </div>
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => {
                const Icon = domainIcons[r.domain];
                return (
                  <li key={r.id}>
                    <div className="flex items-stretch gap-2 rounded-xl border bg-card p-3 shadow-sm">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-start gap-3 text-right"
                        onClick={() => navigate(`/safety/${r.id}`)}
                      >
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-semibold">{r.siteName}</span>
                            <Badge variant="outline">{statusLabel[r.status] ?? r.status}</Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {r.defectCount} ליקויים
                            {r.criticalCount > 0 ? ` · ${r.criticalCount} קריטיים` : ''}
                            {' · '}
                            {new Date(r.updatedAt).toLocaleDateString('he-IL')}
                          </p>
                        </div>
                        <FileText className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>למחוק את הדוח?</AlertDialogTitle>
                            <AlertDialogDescription>
                              הדוח עבור ״{r.siteName}״ יימחק לצמיתות.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ביטול</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                await deleteSafetyReport(r.id);
                                void load();
                              }}
                            >
                              מחק
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-3 text-center',
        highlight && value > 0 && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <div
        className={cn(
          'text-2xl font-bold tabular-nums',
          highlight && value > 0 && 'text-destructive',
        )}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
