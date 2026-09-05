import { Link } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  Download,
  HardDrive,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BackupControls } from '@/components/real-estate/BackupControls';

const capabilities = [
  {
    icon: HardDrive,
    title: 'עבודה מקומית מלאה',
    body: 'תיקים, הכשרה ויומן נשמרים בדפדפן. אין מגבלת «חבילה» — כל היכולות זמינות בגרסה המקומית.',
  },
  {
    icon: Download,
    title: 'גיבוי ייצוא/ייבוא',
    body: 'הורידו קובץ JSON לגיבוי ההתקדמות והעסקאות, וייבאו במחשב אחר או אחרי ניקוי דפדפן.',
  },
  {
    icon: BookOpen,
    title: 'הכשרה בתוך האפליקציה',
    body: 'מודולים, הסברים מקריינים, מבחנים ותעודת/סיכום PDF — בלי תלות במנוי חיצוני.',
  },
  {
    icon: CalendarDays,
    title: 'יומן מועדים והתראות',
    body: 'משימות, תשלומים ומועדי חתימה/מסירה/רישום מרוכזים במקום אחד.',
  },
  {
    icon: Smartphone,
    title: 'התקנה למסך הבית (PWA)',
    body: 'אפשר להוסיף את האפליקציה למסך הבית לשימוש בשטח. לאחר ההתקנה נטענת מעטפת אופליין בסיסית.',
  },
  {
    icon: ShieldCheck,
    title: 'מה לא נכלל כרגע',
    body: 'אין חיוב חודשי, אין משתמשים בענן ואין סנכרון שרת. גיבוי ענן יוצע בעתיד כשירות נפרד — לא כחסימת יכולות.',
  },
];

/** Replaces the fake pricing tiers with an honest local-capabilities page. */
const PackagesPage = () => {
  return (
    <div className="space-y-4 max-w-4xl">
      <section className="re-card p-5 md:p-6 space-y-3">
        <p className="text-sm text-primary font-semibold">יכולות המערכת</p>
        <h2 className="text-xl font-bold">גרסה מקומית — בלי חבילות מדומות</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          בעבר הוצגו כאן מחירי «בסיס / משרד / פרימיום» שלא היו מחוברים לשום מערכת תשלום.
          במקום זאת מוצג מה באמת זמין היום באפליקציה.
        </p>
        <div className="pt-1">
          <BackupControls compact />
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        {capabilities.map((item) => (
          <section key={item.title} className="re-card p-5 space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <item.icon className="w-4 h-4" />
              <h3 className="font-semibold">{item.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
          </section>
        ))}
      </div>

      <section className="re-card p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <p className="text-sm text-muted-foreground">
          להמשך עבודה: לוח בקרה, הכשרה או עזרה עם שאלות נפוצות.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/real-estate">לוח בקרה</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/real-estate/training">להכשרה</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default PackagesPage;
