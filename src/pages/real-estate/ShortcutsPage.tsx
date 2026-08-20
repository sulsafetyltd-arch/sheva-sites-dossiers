import { ExternalLink } from 'lucide-react';

interface Shortcut {
  title: string;
  desc: string;
  url: string;
}

const SECTIONS: Array<{ title: string; items: Shortcut[] }> = [
  {
    title: 'לשכת רישום מקרקעין (טאבו)',
    items: [
      {
        title: 'הפקת נסח טאבו',
        desc: 'הפקת נסחי רישום מקוונים מפנקסי המקרקעין',
        url: 'https://www.gov.il/he/service/land_registration_extract',
      },
      {
        title: 'הזמנת מסמכי בית משותף',
        desc: 'הזמנת צו, תקנון ותשריטים מתיקי בתים משותפים',
        url: 'https://fileextractor.justice.gov.il/',
      },
      {
        title: 'רישום או ביטול הערת אזהרה',
        desc: 'הגשת בקשה מקוונת לרישום הערת אזהרה על נכס',
        url: 'https://www.gov.il/he/service/caveat_filling',
      },
    ],
  },
  {
    title: 'רשות מקרקעי ישראל',
    items: [
      {
        title: 'רשות מקרקעי ישראל (רמ״י)',
        desc: 'מידע ונהלים בנוגע לקרקעות המדינה',
        url: 'https://land.gov.il/',
      },
    ],
  },
  {
    title: 'רשם המשכונות',
    items: [
      {
        title: 'עיון בפנקס המשכונות',
        desc: 'בדיקת משכונות ושעבודים לפי ת.ז., רכב או תאגיד',
        url: 'https://ica.justice.gov.il/SearchPledge/PledgeBrowse',
      },
      {
        title: 'תאגידים ברשת (תאגידים ONLINE)',
        desc: 'שירותי רשות התאגידים ורשם המשכונות',
        url: 'https://ica.justice.gov.il/',
      },
    ],
  },
  {
    title: 'מיסוי מקרקעין',
    items: [
      {
        title: 'רשות המסים בישראל',
        desc: 'פורטל שירותי רשות המסים ומיסוי מקרקעין',
        url: 'https://www.gov.il/he/departments/israel_tax_authority/govil-landing-page',
      },
      {
        title: 'סימולטור מס רכישה',
        desc: 'מחשבון רשמי לחישוב מס ברכישת מקרקעין',
        url: 'https://www.gov.il/he/service/real_eatate_taxsimulator',
      },
      {
        title: 'מיסוי מקרקעין — שירות עצמי',
        desc: 'דיווח ושידור הצהרות מיסוי מקרקעין',
        url: 'https://secapp.taxes.gov.il/srsherutatzmi/',
      },
    ],
  },
  {
    title: 'רשויות המדינה',
    items: [
      {
        title: 'Govmap — איתור גוש וחלקה',
        desc: 'מפות ישראל: איתור גוש, חלקה וכתובת (שכבות ← גושים וחלקות)',
        url: 'https://www.govmap.gov.il/',
      },
      {
        title: 'אתר בתי המשפט',
        desc: 'חיפוש תיקים, החלטות ופסקי דין',
        url: 'https://www.gov.il/he/departments/the_judicial_authority/govil-landing-page',
      },
      {
        title: 'המאגר הלאומי לחקיקה',
        desc: 'מאגר חוקים ותקנות של מדינת ישראל',
        url: 'https://main.knesset.gov.il/Activity/Legislation/Laws/Pages/lawlaws.aspx',
      },
    ],
  },
  {
    title: 'גופים מקצועיים',
    items: [
      {
        title: 'לשכת עורכי הדין',
        desc: 'האתר הרשמי של לשכת עורכי הדין בישראל',
        url: 'https://www.israelbar.org.il/',
      },
    ],
  },
];

const ShortcutsPage = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <p className="text-sm text-muted-foreground">גישה מהירה לאתרים ושירותים רלוונטיים לעסקאות מקרקעין</p>
      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="font-semibold text-lg border-r-4 border-[hsl(var(--gold))] pr-3">{section.title}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {section.items.map((item) => (
              <a
                key={item.title}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="re-card p-4 flex flex-col gap-1 hover:shadow-md transition-shadow group"
              >
                <span className="font-medium">{item.title}</span>
                <span className="text-sm text-muted-foreground">{item.desc}</span>
                <span className="text-sm text-primary inline-flex items-center gap-1 mt-1 group-hover:underline">
                  פתח אתר
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default ShortcutsPage;
