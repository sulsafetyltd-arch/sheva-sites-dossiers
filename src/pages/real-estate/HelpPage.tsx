import { Link } from 'react-router-dom';
import { BackupControls } from '@/components/real-estate/BackupControls';

const faqs = [
  {
    q: 'איך פותחים עסקה חדשה?',
    a: 'לחצו על «עסקה חדשה» בראש המסך, מלאו שם תיק, מהות ותמורה, ואז השלימו נכס, צדדים ולוח תשלומים בתיק עצמו.',
  },
  {
    q: 'מה נכלל בשכר טרחה צפוי?',
    a: 'סכום כל תשלומי שכר הטרחה שטרם סומנו כשולמו, בתיקים שטרם נסגרו. הסכום מוצג כולל מע״מ אם כך הוזן.',
  },
  {
    q: 'איפה מופיעות התראות ויומן מועדים?',
    a: 'בהתראות מערכת וביומן המועדים: משימות, תשלומים ומועדי חתימה / מסירה / רישום שעברו או מתקרבים.',
  },
  {
    q: 'האם הנתונים נשמרים בענן?',
    a: 'בגרסה זו התיקים וההתקדמות בהכשרה נשמרים בדפדפן המקומי בלבד. השתמשו בייצוא/ייבוא גיבוי למטה. אין חבילות בתשלום שחוסמות יכולות.',
  },
  {
    q: 'איך מורידים תעודת סיום או סיכום התקדמות?',
    a: 'בעמוד ההכשרה לחצו על «הורדת סיכום PDF» (או «הורדת תעודת סיום» כשכל המודולים הושלמו). הקובץ נוצר מההתקדמות השמורה אצלכם.',
  },
  {
    q: 'אפשר להתקין את האפליקציה לטלפון או למחשב?',
    a: 'כן. בדפדפן תומך בחרו «הוסף למסך הבית» / Install. האפליקציה רצה כ־PWA עם מעטפת אופליין בסיסית לעבודה בשטח.',
  },
  {
    q: 'מה זה «צוות מתיקים» ו«יכולות»?',
    a: 'צוות מתיקים מציג עורכי דין שמופיעים בתיקים (לא ניהול משתמשים מדומה). יכולות מסבירות מה באמת זמין בגרסה המקומית — במקום מחירונים שלא היו מחוברים לתשלום.',
  },
];

const HelpPage = () => {
  return (
    <div className="space-y-4 max-w-3xl">
      {faqs.map((item) => (
        <section key={item.q} className="re-card p-5">
          <h2 className="font-semibold mb-2">{item.q}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
        </section>
      ))}

      <section className="re-card p-5 border-primary/30 space-y-3">
        <BackupControls />
        <p className="text-xs text-muted-foreground">
          לפירוט יכולות המערכת ראו גם את עמוד{' '}
          <Link to="/real-estate/packages" className="text-primary underline-offset-2 hover:underline">
            יכולות
          </Link>
          .
        </p>
      </section>
    </div>
  );
};

export default HelpPage;
