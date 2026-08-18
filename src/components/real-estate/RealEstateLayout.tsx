import { NavLink, Outlet } from 'react-router-dom';
import { Scale, LayoutDashboard, FolderOpen, CalendarDays, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/real-estate', label: 'לוח בקרה', icon: LayoutDashboard, end: true },
  { to: '/real-estate/deals', label: 'עסקאות', icon: FolderOpen, end: false },
  { to: '/real-estate/calendar', label: 'יומן מועדים', icon: CalendarDays, end: false },
];

const RealEstateLayout = () => {
  return (
    <div className="re-app min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="container flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight truncate">משרד עו"ד · מקרקעין</h1>
              <p className="text-xs text-muted-foreground">ניהול עסקאות, מועדים ותיקי לקוח</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
            <NavLink
              to="/"
              className="mr-2 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
              title="תיקי כיבוי אש"
            >
              <Flame className="w-4 h-4" />
              <span className="hidden md:inline">תיקי שטח</span>
            </NavLink>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
};

export default RealEstateLayout;
