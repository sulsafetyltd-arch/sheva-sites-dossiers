const packages = [
  {
    name: 'בסיס',
    price: 'ללא עלות',
    items: ['עד 10 עסקאות', 'לוח בקרה', 'יומן מועדים', 'משתמש אחד'],
  },
  {
    name: 'משרד',
    price: '249 ₪ / חודש',
    highlight: true,
    items: ['עסקאות ללא הגבלה', 'לקוחות ומשתמשים', 'גרף שכר טרחה', 'התראות מערכת', 'עד 8 משתמשים'],
  },
  {
    name: 'פרימיום',
    price: '490 ₪ / חודש',
    items: ['הכול מחבילת משרד', 'ייצוא דוחות', 'גיבוי ענן', 'תמיכה בעדיפות', 'משתמשים ללא הגבלה'],
  },
];

const PackagesPage = () => {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {packages.map((pkg) => (
        <section
          key={pkg.name}
          className={`re-card p-6 space-y-4 ${pkg.highlight ? 'ring-2 ring-primary' : ''}`}
        >
          <div>
            <p className="text-sm text-muted-foreground">חבילה</p>
            <h2 className="text-xl font-bold">{pkg.name}</h2>
            <p className="text-2xl font-extrabold text-primary mt-2">{pkg.price}</p>
          </div>
          <ul className="space-y-2 text-sm">
            {pkg.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">•</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

export default PackagesPage;
