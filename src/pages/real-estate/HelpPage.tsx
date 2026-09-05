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
    q: 'איפה מופיעות התראות?',
    a: 'בהתראות מערכת וביומן המועדים: משימות, תשלומים ומועדי חתימה / מסירה / רישום שעברו או מתקרבים.',
  },
  {
    q: 'האם הנתונים נשמרים בענן?',
    a: 'בגרסה זו התיקים וההתקדמות בהכשרה נשמרים בדפדפן המקומי בלבד. השתמשו בייצוא/ייבוא גיבוי למטה, או בחבילת פרימיום לגיבוי ענן בהמשך.',
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

      <section className="re-card p-5 border-primary/30">
        <BackupControls />
      </section>
    </div>
  );
};

export default HelpPage;
