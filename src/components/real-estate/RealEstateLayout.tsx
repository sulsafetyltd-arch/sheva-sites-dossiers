import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Calculator,
  CalendarDays,
  CircleHelp,
  ExternalLink,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  ShieldCheck,
  Users,
  UserCog,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NewDealDialog } from '@/components/real-estate/NewDealDialog';
import { GlobalSearch } from '@/components/real-estate/GlobalSearch';
import soloLogoUrl from '@/assets/solo-logo.svg';
import { getAllDeals } from '@/lib/real-estate-store';
import { alertCount } from '@/lib/real-estate-utils';
import { getCloudSettings, isCloudConfigured, syncNow } from '@/lib/cloud-sync';

const nav = [
  { to: '/', label: 'לוח בקרה', icon: LayoutDashboard, end: true },
  { to: '/deals', label: 'עסקאות', icon: FolderKanban, end: false },
  { to: '/calendar', label: 'יומן מועדים', icon: CalendarDays, end: false },
  { to: '/clients', label: 'לקוחות', icon: Users, end: false },
  { to: '/alerts', label: 'התראות', icon: Bell, end: false },
  { to: '/templates', label: 'תבניות מסמכים', icon: FileText, end: false },
  { to: '/remote-sign', label: 'אימות חתימה מרחוק', icon: ShieldCheck, end: false },
  { to: '/reports', label: 'דוחות שכ"ט', icon: BarChart3, end: false },
  { to: '/calculators', label: 'מחשבונים', icon: Calculator, end: false },
  { to: '/shortcuts', label: 'קיצורי דרך', icon: ExternalLink, end: false },
  { to: '/users', label: 'משתמשים', icon: UserCog, end: false },
  { to: '/packages', label: 'חבילות', icon: Package, end: false },
  { to: '/help', label: 'עזרה', icon: CircleHelp, end: false },
];

const TITLES: Array<{ test: (path: string) => boolean; title: string }> = [
  { test: (p) => p === '/', title: 'לוח בקרה' },
  { test: (p) => /\/documents$/.test(p), title: 'הפקת מסמכים' },
  { test: (p) => /^\/deals\/[^/]+$/.test(p), title: 'פרטי עסקה' },
  { test: (p) => p.startsWith('/deals'), title: 'עסקאות' },
  { test: (p) => p.startsWith('/clients'), title: 'לקוחות' },
  { test: (p) => p.startsWith('/alerts'), title: 'התראות' },
  { test: (p) => p.startsWith('/users'), title: 'משתמשים' },
  { test: (p) => p.startsWith('/packages'), title: 'חבילות' },
  { test: (p) => p.startsWith('/templates'), title: 'תבניות מסמכים' },
  { test: (p) => p.startsWith('/remote-sign'), title: 'אימות חתימה מרחוק' },
  { test: (p) => p.startsWith('/reports'), title: 'דוחות שכ"ט' },
  { test: (p) => p.startsWith('/calculators'), title: 'מחשבונים' },
  { test: (p) => p.startsWith('/shortcuts'), title: 'קיצורי דרך' },
  { test: (p) => p.startsWith('/help'), title: 'עזרה' },
  { test: (p) => p.startsWith('/calendar'), title: 'יומן מועדים' },
];

function SoloLogo() {
  return (
    <div className="flex flex-col items-center text-white select-none gap-2">
      <div className="bg-white rounded-2xl p-2 shadow-md ring-2 ring-[hsl(var(--gold))]">
        <img src={soloLogoUrl} alt="לוגו המשרד" className="w-24 h-24 object-contain" />
      </div>
      <span className="text-[20px] font-extrabold tracking-tight leading-none">
        סולו <span className="text-[hsl(var(--gold))]">נדלן</span>
      </span>
    </div>
  );
}

const RealEstateLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [alerts, setAlerts] = useState(0);

  useEffect(() => {
    setAlerts(alertCount(getAllDeals()));
  }, [location.pathname]);

  useEffect(() => {
    if (isCloudConfigured() && getCloudSettings().autoSync) {
      syncNow().catch(() => undefined);
    }
  }, []);

  const title = TITLES.find((t) => t.test(location.pathname))?.title ?? 'סולו נדלן';
  const hideNewDeal = /^\/deals\/[^/]+$/.test(location.pathname);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-7 pb-6">
        <SoloLogo />
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors',
                isActive
                  ? 'bg-[hsl(var(--gold))] text-[hsl(var(--sidebar-teal))] font-semibold shadow-sm'
                  : 'text-white/85 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            <span>{item.label}</span>
            {item.to === '/alerts' && alerts > 0 && (
              <span className="mr-auto rounded-full bg-white text-[hsl(var(--sidebar-teal))] text-[11px] font-bold min-w-5 h-5 px-1.5 inline-flex items-center justify-center shadow-sm">
                {alerts}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 pb-5 pt-2">
        <button
          onClick={() => navigate('/dossiers')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium text-white/85 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="w-[18px] h-[18px]" />
          יציאה
        </button>
      </div>
    </div>
  );

  return (
    <div className="re-app min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden md:block w-[232px] shrink-0 bg-[hsl(var(--sidebar-teal))] text-white">
          {sidebar}
        </aside>

        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40">
            <button className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute top-0 right-0 h-full w-[232px] bg-[hsl(var(--sidebar-teal))] text-white shadow-xl">
              <button
                className="absolute top-3 left-3 text-white/80"
                onClick={() => setMobileOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-transparent">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-8 py-5">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <GlobalSearch />
                <button
                  onClick={() => navigate('/alerts')}
                  className="hidden sm:inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Bell className="w-4 h-4" />
                  התראות מערכת
                  <span className="tabular-nums font-semibold text-foreground">{alerts}</span>
                </button>
                {!hideNewDeal && (
                  <Button className="gap-1.5 rounded-lg shadow-sm" onClick={() => setNewDealOpen(true)}>
                    <Plus className="w-4 h-4" />
                    עסקה חדשה
                  </Button>
                )}
              </div>
            </div>
          </header>
          <div className="flex-1 px-4 sm:px-8 pb-8">
            <Outlet />
          </div>
        </div>
      </div>
      <NewDealDialog open={newDealOpen} onOpenChange={setNewDealOpen} />
    </div>
  );
};

export default RealEstateLayout;
