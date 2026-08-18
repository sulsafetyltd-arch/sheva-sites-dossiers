import type { DocContext } from '@/lib/legal-doc-context';

export interface LegalDocument {
  id: string;
  title: string;
  group: string;
  html: string;
}

function partyRows(ctx: DocContext, side: 'buyers' | 'sellers'): string {
  const list = ctx[side];
  if (!list.length) {
    return '<tr><td>________</td><td>ת.ז.</td><td>________</td><td>________</td></tr>';
  }
  return list
    .map((p) => `<tr><td>${p.name || '________'}</td><td>ת.ז.</td><td>${p.idNumber || '________'}</td><td>${p.address || '________'}</td></tr>`)
    .join('');
}

function sigBlock(ctx: DocContext): string {
  return `
    <div class="sig-row">
      <div>
        <div class="sig-line"></div>
        <p><strong>המוכר/ים:</strong> ${ctx.sellerNames}</p>
      </div>
      <div>
        <div class="sig-line"></div>
        <p><strong>הקונה/ים:</strong> ${ctx.buyerNames}</p>
      </div>
    </div>`;
}

function header(ctx: DocContext, title: string): string {
  return `
    <div class="legal-head">
      <p class="office">משרד ${ctx.attorney} · רישיון ${ctx.license} · ${ctx.officeAddress}</p>
      <p class="file">תיק ${ctx.fileNumber}</p>
      <h1>${title}</h1>
    </div>`;
}

function saleAgreement(ctx: DocContext): string {
  return `
    ${header(ctx, 'הסכם מכר')}
    <p class="center">שנערך ונחתם ב${ctx.officeCity} ביום ${ctx.contractDate}</p>
    <p><strong>בין:</strong> ${ctx.sellerNames}, ת.ז. ${ctx.sellerIds}, מרחוב ${ctx.sellerAddresses}, טל׳ ${ctx.sellerPhones}<br/>(להלן: "<strong>המוכר</strong>")</p>
    <p><strong>לבין:</strong> ${ctx.buyerNames}, ת.ז. ${ctx.buyerIds}, מרחוב ${ctx.buyerAddresses}, טל׳ ${ctx.buyerPhones}<br/>(להלן: "<strong>הקונה</strong>")</p>
    <h2>הואיל</h2>
    <p>והמוכר מצהיר כי הוא בעל הזכויות ב${ctx.propertyType} הידוע כגוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, ברחוב ${ctx.propertyAddress}, ${ctx.propertyCity}, בשטח של כ-${ctx.area} מ"ר, בקומה ${ctx.floor}, וכי הזכות הרשומה היא ${ctx.rights} בלשכת רישום המקרקעין ${ctx.registryOffice};</p>
    <p>והקונה מעוניין לרכוש את הנכס והמוכר מעוניין למכרו, והצדדים מעוניינים לעגן את התחייבויותיהם בהסכם זה;</p>
    <h2>1. המבוא</h2>
    <p>המבוא להסכם זה מהווה חלק בלתי נפרד ממנו ומחייב את הצדדים.</p>
    <h2>2. הצהרות המוכר</h2>
    <p>2.1. המוכר מצהיר כי הזכויות בנכס רשומות ו/או ניתנות לרישום על שמו בלשכת רישום המקרקעין ${ctx.registryOffice}.</p>
    <p>2.2. המוכר יישא במס שבח ובהיטל השבחה החלים עליו, וימציא לקונה אישורי מסים כנדרש להעברת הזכויות.</p>
    <p>2.3. אין מניעה חוקית או התחייבות קודמת המונעת העברת הזכויות לקונה.</p>
    <p>2.4. הקונה רוכש את הנכס במצבו AS IS, והמוכר ישמור על מצבו עד למסירה.</p>
    <p>2.5. המוכר לא ישעבד ולא יעמיס על הנכס שעבוד נוסף לאחר החתימה, ויפעל להסרת שעבודים קיימים עד למועד התשלום המתאים.</p>
    <p>2.6. המוכר ישתף פעולה עם הליך המשכנתא של הקונה, לרבות חתימה על מסמכי הבנק.</p>
    <p>2.7. המוכר מתיר כניסת שמאי לנכס בתיאום סביר.</p>
    <p>2.8. אין הליכי פשיטת רגל, כינוס או הוצאה לפועל המונעים את ביצוע ההסכם.</p>
    <h2>3. הצהרות הקונה</h2>
    <p>3.1. הקונה בדק את הנכס, את מצבו התכנוני והרישומי, והוא רוכש אותו על סמך בדיקותיו.</p>
    <p>3.2. הקונה יישא במס רכישה ובהוצאות רישום החלות עליו.</p>
    <h2>4. התמורה</h2>
    <p>תמורה כוללת בסך <strong>${ctx.consideration}</strong> תשולם לפי לוח התשלומים:</p>
    ${ctx.paymentsHtml}
    <h2>5. מסירה ורישום</h2>
    <p>הנכס יימסר ביום ${ctx.closingDate}, כשהוא פנוי מכל אדם וחפץ שאינו כלול בעסקה. הצדדים יחתמו על ייפוי כוח בלתי חוזר לצורך רישום הזכויות והערת אזהרה.</p>
    <h2>6. הפרה</h2>
    <p>הפרה יסודית תזכה את הצד המקיים בביטול ו/או בפיצוי מוסכם בשיעור 10% מהתמורה, מבלי לגרוע מסעדים אחרים.</p>
    <h2>7. כללי</h2>
    <p>סמכות השיפוט לבתי המשפט במחוז ${ctx.officeCity}. כתובות הצדדים למסירה הן כמפורט לעיל.</p>
    <p>ולראיה באו הצדדים על החתום במקום ובמועד הנקובים בכותרת.</p>
    ${sigBlock(ctx)}`;
}

function deedOfSale(ctx: DocContext): string {
  return `
    <div class="legal-head official">
      <p>מדינת ישראל · משרד המשפטים</p>
      <p>הרשות לרישום ולהסדר זכויות מקרקעין</p>
      <p>לשכת רישום המקרקעין ב${ctx.registryOffice}</p>
      <h1>שטר מכר</h1>
      <p>שטר זה מעיד: ☒ שבתמורה &nbsp;&nbsp; ☐ שלא בתמורה</p>
    </div>
    <h2>מאת: המוכר/ים</h2>
    <table class="legal-table">
      <thead><tr><th>שם מלא / תאגיד</th><th>סוג זיהוי</th><th>מס׳ זיהוי</th><th>החלק בזכות</th></tr></thead>
      <tbody>${ctx.sellers.map((p) => `<tr><td>${p.name || '________'}</td><td>ת.ז.</td><td>${p.idNumber || '________'}</td><td>1/1</td></tr>`).join('') || '<tr><td>________</td><td>ת.ז.</td><td>________</td><td>1/1</td></tr>'}</tbody>
    </table>
    <h2>ל-: הקונה/ים</h2>
    <table class="legal-table">
      <thead><tr><th>שם מלא / תאגיד</th><th>סוג זיהוי</th><th>מס׳ זיהוי</th><th>החלק בזכות</th></tr></thead>
      <tbody>${ctx.buyers.map((p) => `<tr><td>${p.name || '________'}</td><td>ת.ז.</td><td>${p.idNumber || '________'}</td><td>1/1</td></tr>`).join('') || '<tr><td>________</td><td>ת.ז.</td><td>________</td><td>1/1</td></tr>'}</tbody>
    </table>
    <p>המוכר/ים ${ctx.sellerNames} מעביר/ים בזה לקונה/ים ${ctx.buyerNames} את הזכויות במקרקעין שלהלן, כשהן נקיות מכל שעבוד, עיקול והתחייבות לצד ג׳, זולת כמפורט בפנקסי המקרקעין.</p>
    <h2>הרשימה — תיאור המקרקעין</h2>
    <table class="legal-table">
      <tbody>
        <tr><th>יישוב</th><td>${ctx.propertyCity}</td><th>גוש</th><td>${ctx.block}</td></tr>
        <tr><th>חלקה</th><td>${ctx.parcel}</td><th>תת-חלקה</th><td>${ctx.subParcel}</td></tr>
        <tr><th>שטח במ״ר</th><td>${ctx.area}</td><th>כתובת</th><td>${ctx.propertyAddress}</td></tr>
        <tr><th>חלקים מועברים</th><td>מלוא הזכויות</td><th>עודף למוכר</th><td>0</td></tr>
      </tbody>
    </table>
    <p>ולראיה באו הצדדים על החתום.</p>
    ${sigBlock(ctx)}
    <p class="tiny">* זיהוי: ת.ז. / דרכון / ח.פ. &nbsp; ** לא צוין חלק — תירשם בעלות בחלקים שווים.</p>`;
}

function poaJoint(ctx: DocContext): string {
  return `
    ${header(ctx, 'ייפוי כוח בלתי חוזר')}
    <p class="center">נוטריוני / לפי סעיף 91 לחוק לשכת עורכי הדין, התשכ״א–1961</p>
    <p>אנו הח״מ, הקונה/ים ${ctx.buyerNames} ת.ז. ${ctx.buyerIds} והמוכר/ים ${ctx.sellerNames} ת.ז. ${ctx.sellerIds}, ממנים בזה את ${ctx.attorney}${ctx.secondAttorney !== '________' ? ` ו/או ${ctx.secondAttorney}` : ''} לפעול בשמנו ולמעננו בכל הקשור להסכם מיום ${ctx.contractDateShort} לגבי הנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, ${ctx.propertyAddress}, ${ctx.propertyCity}.</p>
    <p>1. לרשום ו/או לבטל הערות אזהרה, משכנתאות ושעבודים בקשר לנכס.</p>
    <p>2. לייצגנו בפני לשכת רישום המקרקעין, רשות המסים, הרשות המקומית, בתי משפט וכל רשות מוסמכת, ולחתום על כל בקשה, הצהרה, שטר ודיווח.</p>
    <p>3. להעביר סמכויות אלה לאחר.</p>
    <p>4. ייפוי כוח זה בלתי חוזר, הואיל וזכויות צד ג׳ תלויות בו, ויעמוד בתוקף גם לאחר פטירה.</p>
    <p>5. לשון יחיד כוללת רבים ולשון זכר כוללת נקבה.</p>
    <p>ולראיה באנו על החתום ב${ctx.officeCity} ביום ${ctx.contractDate}.</p>
    ${sigBlock(ctx)}
    <div class="cert">
      <p><strong>אימות חתימה ע״י עו״ד</strong></p>
      <p>אני הח״מ, ${ctx.attorney}, מס׳ רישיון ${ctx.license}, מעיד כי היום התייצבו לפניי החותמים הנ״ל, הזדהו בפניי ולאחר שהסברתי להם את מהות הפעולה חתמו מרצונם החופשי.</p>
      <p>תאריך: ${ctx.contractDateShort} &nbsp;&nbsp; חתימת עו״ד: ________</p>
    </div>`;
}

function poaBuyer(ctx: DocContext): string {
  return `
    ${header(ctx, 'ייפוי כוח בלתי חוזר — הקונה')}
    <p class="center">לפי סעיף 91 לחוק לשכת עורכי הדין, התשכ״א–1961</p>
    <p>אני/אנו הח״מ ${ctx.buyerNames}, ת.ז. ${ctx.buyerIds}, ממנה/ממנים בזה את ${ctx.attorney}${ctx.secondAttorney !== '________' ? ` ו/או ${ctx.secondAttorney}` : ''} לפעול בשמי/בשמנו כלפי המוכר/ים ${ctx.sellerNames}, ת.ז. ${ctx.sellerIds}, בקשר לנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, ${ctx.propertyAddress}, ${ctx.propertyCity}.</p>
    <p>1. לייצגני בפני לשכת רישום המקרקעין, רשות המסים, הרשות המקומית וכל רשות מוסמכת.</p>
    <p>2. לשלם מסים, היטלים ואגרות הכרוכים בהעברת הזכויות.</p>
    <p>3. לחתום על כל מסמך הדרוש להשלמת העסקה, לרבות שטר מכר, הערת אזהרה ודיווחי מס.</p>
    <p>4. לפעול בכל דרך סבירה להשלמת העסקה.</p>
    <p>5. להסמיך ממלאי מקום.</p>
    <p>6. פעולות מיופה הכוח יחייבו אותי ואת יורשיי.</p>
    <p>7. לשון יחיד כוללת רבים.</p>
    <p>8. ייפוי כוח זה ניתן לטובת צד ג׳ והוא בלתי חוזר, גם לאחר פטירה.</p>
    <p>9. מיופה הכוח רשאי לחתום בשם הקונה וכן, במידת הצורך, בשם המוכר על מסמכי רישום.</p>
    <p>ולראיה באתי על החתום ב${ctx.officeCity} ביום ${ctx.contractDate}.</p>
    <div class="sig-row">
      <div>
        <div class="sig-line"></div>
        <p><strong>הקונה/ים:</strong> ${ctx.buyerNames}</p>
      </div>
    </div>
    <div class="cert">
      <p><strong>אימות חתימה</strong></p>
      <p>אני ${ctx.attorney}, עו״ד, רישיון ${ctx.license}, מעיד כי החותם/ים הופיע/ו בפניי, זוהו וחתמו מרצונם.</p>
      <p>תאריך: ${ctx.contractDateShort}</p>
    </div>`;
}

function cautionRegister(ctx: DocContext): string {
  return `
    <div class="legal-head official">
      <p>מדינת ישראל · משרד המשפטים · הרשות לרישום ולהסדר זכויות מקרקעין</p>
      <p>לשכת רישום המקרקעין ${ctx.registryOffice}</p>
      <h1>בקשה לרישום הערת אזהרה בהסכמת כל הצדדים</h1>
    </div>
    <h2>1. תיאור המקרקעין</h2>
    <table class="legal-table">
      <tbody>
        <tr><th>יישוב</th><td>${ctx.propertyCity}</td><th>גוש</th><td>${ctx.block}</td></tr>
        <tr><th>חלקה</th><td>${ctx.parcel}</td><th>תת-חלקה</th><td>${ctx.subParcel}</td></tr>
        <tr><th>כתובת</th><td colspan="3">${ctx.propertyAddress}</td></tr>
      </tbody>
    </table>
    <h2>2. הפעולה המבוקשת</h2>
    <p>מתבקש בזה לרשום הערת אזהרה על יסוד התחייבות בהסכם מכר מיום ${ctx.contractDateShort}.</p>
    <h2>3. בעל הזכויות / המוכר</h2>
    <table class="legal-table">
      <thead><tr><th>שם</th><th>סוג זיהוי</th><th>מס׳ זיהוי</th><th>כתובת</th></tr></thead>
      <tbody>${partyRows(ctx, 'sellers')}</tbody>
    </table>
    <h2>4. הזכאי / הקונה</h2>
    <table class="legal-table">
      <thead><tr><th>שם</th><th>סוג זיהוי</th><th>מס׳ זיהוי</th><th>כתובת</th></tr></thead>
      <tbody>${partyRows(ctx, 'buyers')}</tbody>
    </table>
    <h2>5. פרטי המטפל ברישום</h2>
    <p>${ctx.attorney}, עו״ד, רישיון ${ctx.license}, ${ctx.officeAddress}</p>
    ${sigBlock(ctx)}`;
}

function cautionCancel(ctx: DocContext): string {
  return `
    <div class="legal-head official">
      <p>מדינת ישראל · משרד המשפטים · הרשות לרישום ולהסדר זכויות מקרקעין</p>
      <p>לשכת רישום המקרקעין ${ctx.registryOffice}</p>
      <h1>בקשה לביטול הערת אזהרה</h1>
      <p>לפי סעיף 132 לחוק המקרקעין, התשכ״ט–1969</p>
    </div>
    <h2>1. המבקש/ים</h2>
    <table class="legal-table">
      <thead><tr><th>שם</th><th>סוג זיהוי</th><th>מס׳ זיהוי</th></tr></thead>
      <tbody>${ctx.buyers.map((p) => `<tr><td>${p.name || '________'}</td><td>ת.ז.</td><td>${p.idNumber || '________'}</td></tr>`).join('') || '<tr><td>________</td><td>ת.ז.</td><td>________</td></tr>'}</tbody>
    </table>
    <p>גוש ${ctx.block} &nbsp; חלקה ${ctx.parcel} &nbsp; תת-חלקה ${ctx.subParcel}</p>
    <h2>2. נושא הזכות שעליה נרשמה ההערה</h2>
    <table class="legal-table">
      <thead><tr><th>שם</th><th>מס׳ זיהוי</th></tr></thead>
      <tbody>${ctx.sellers.map((p) => `<tr><td>${p.name || '________'}</td><td>${p.idNumber || '________'}</td></tr>`).join('') || '<tr><td>________</td><td>________</td></tr>'}</tbody>
    </table>
    <p>מתבקש בזה לבטל את הערת האזהרה שנרשמה לטובת המבקש/ים על המקרקעין הנ״ל.</p>
    <div class="cert">
      <p>אני מעיד כי היום התייצבו לפניי המבקש/ים, זוהו על ידיי, הוסברה להם מהות הפעולה, והם חתמו מרצונם החופשי.</p>
      <p>${ctx.attorney}, עו״ד, רישיון ${ctx.license} · תאריך ${ctx.contractDateShort}</p>
    </div>
    ${sigBlock(ctx)}`;
}

function form7000(ctx: DocContext): string {
  return `
    <div class="legal-head official">
      <p>רשות המסים בישראל · מיסוי מקרקעין</p>
      <h1>הצהרה על נכונות הפרטים בהצהרה מקוונת</h1>
      <p>נספח לטופס 7000</p>
      <p>לשכת מיסוי מקרקעין באזור ${ctx.registryOffice || ctx.officeCity}</p>
    </div>
    <h2>א. פרטי הנכס והעסקה</h2>
    <table class="legal-table">
      <tbody>
        <tr><th>גוש</th><td>${ctx.block}</td><th>חלקה</th><td>${ctx.parcel}</td></tr>
        <tr><th>תת-חלקה</th><td>${ctx.subParcel}</td><th>כתובת</th><td>${ctx.propertyAddress}, ${ctx.propertyCity}</td></tr>
        <tr><th>יום המכירה</th><td>${ctx.contractDateShort}</td><th>תמורה</th><td>${ctx.consideration}</td></tr>
      </tbody>
    </table>
    <h2>ב. הצהרת המוכר/ת</h2>
    <p>אני ${ctx.sellerNames}, ת.ז. ${ctx.sellerIds}, מצהיר/ה כי הפרטים בהצהרה המקוונת נכונים ומלאים. אני מבקש/ת פטור / שומה בהתאם לדין.</p>
    <p>חתימת מוכר: ________ &nbsp; תאריך: ${ctx.contractDateShort}</p>
    <p class="tiny">אימות: ${ctx.attorney}, עו״ד, רישיון ${ctx.license}, מאשר/ת כי המוכר הופיע בפניי וזוהה.</p>
    <h2>ג. הצהרת הרוכש/ת</h2>
    <p>אני ${ctx.buyerNames}, ת.ז. ${ctx.buyerIds}, מצהיר/ה כי הפרטים נכונים. ☒ מבוקש מס רכישה לפי מדרגות דירה יחידה (אם חל).</p>
    <p>חתימת קונה: ________ &nbsp; תאריך: ${ctx.contractDateShort}</p>
    <p class="tiny">אימות: ${ctx.attorney}, עו״ד, רישיון ${ctx.license}.</p>`;
}

function feeAgreement(ctx: DocContext): string {
  return `
    ${header(ctx, 'הסכם שכר טרחה')}
    <p>שנערך בין ${ctx.attorney} (להלן: "<strong>עורך הדין</strong>") לבין הלקוח/ה ${ctx.buyerNames !== '________' ? ctx.buyerNames : ctx.sellerNames}.</p>
    <p>1. עורך הדין ייצג את הלקוח בעסקת המקרקעין בתיק ${ctx.fileNumber}, נכס ${ctx.propertyAddress}, ${ctx.propertyCity}.</p>
    <p>2. שכר הטרחה ישולם לפי הרשום בתיק, בתוספת מע״מ כדין, ויהיה בלתי מותנה בתוצאה זולת אם הוסכם אחרת בכתב.</p>
    <p>3. הלקוח ישתף פעולה, ימציא מסמכים ויחתום על ייפויי כוח.</p>
    <p>4. הוצאות צד ג׳ (אגרות, נסחים, נוטריון) יחולו על הלקוח.</p>
    <p>נחתם ב${ctx.officeCity} ביום ${ctx.openedAt}.</p>
    <div class="sig-row">
      <div><div class="sig-line"></div><p>הלקוח</p></div>
      <div><div class="sig-line"></div><p>עורך הדין</p></div>
    </div>`;
}

function paymentAppendix(ctx: DocContext): string {
  return `
    ${header(ctx, 'נספח תשלומים להסכם המכר')}
    <p>נספח זה מהווה חלק בלתי נפרד מהסכם המכר מיום ${ctx.contractDate} בין ${ctx.sellerNames} לבין ${ctx.buyerNames}.</p>
    <p>התמורה הכוללת: <strong>${ctx.consideration}</strong></p>
    ${ctx.paymentsHtml}
    <p>כל תשלום יופקד בנאמנות אצל עורך הדין עד להתקיימות התנאי הרלוונטי, אלא אם סוכם אחרת בכתב.</p>
    ${sigBlock(ctx)}`;
}

function deliveryProtocol(ctx: DocContext): string {
  return `
    ${header(ctx, 'פרוטוקול מסירת נכס')}
    <p>ביום ${ctx.closingDate} נמסר הנכס ברחוב ${ctx.propertyAddress}, ${ctx.propertyCity} (גוש ${ctx.block} חלקה ${ctx.parcel} תת ${ctx.subParcel}) מהמוכר ${ctx.sellerNames} לידי הקונה ${ctx.buyerNames}.</p>
    <p>הנכס נמסר ☐ פנוי &nbsp; ☐ עם ליקויים כמפורט: ________</p>
    <p>נמסרו מפתחות: ☐ כן &nbsp; מספר סטים: ____</p>
    <p>מוני מים / חשמל / גז: ________</p>
    <p>הצדדים מאשרים כי המסירה בוצעה בהתאם להסכם המכר.</p>
    ${sigBlock(ctx)}`;
}

function municipalRequest(ctx: DocContext): string {
  return `
    ${header(ctx, 'בקשה לאישור עירייה / העברת זכויות')}
    <p>לכבוד<br/>מחלקת הנכסים / הארנונה, עיריית ${ctx.propertyCity}</p>
    <p>הנדון: בקשה לאישור להעברת זכויות — ${ctx.propertyAddress}</p>
    <p>אבקש לאשר כי אין מניעה להעברת הזכויות בנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel} מאת ${ctx.sellerNames} אל ${ctx.buyerNames}, ולציין יתרות ארנונה, מים והיטל השבחה, אם ישנן.</p>
    <p>בכבוד רב,<br/>${ctx.attorney}, עו״ד<br/>${ctx.officeAddress}</p>`;
}

function opposingLetter(ctx: DocContext): string {
  return `
    ${header(ctx, 'מכתב לצד שכנגד')}
    <p>${ctx.officeCity}, ${ctx.openedAt}</p>
    <p>לכבוד ב״כ הצד שכנגד</p>
    <p>הנדון: תיק ${ctx.fileNumber} — ${ctx.title}</p>
    <p>מרשיי, ${ctx.buyerNames !== '________' && ctx.sellerNames !== '________' ? `${ctx.buyerNames} / ${ctx.sellerNames}` : ctx.buyerNames}, מבקשים לקדם את העסקה בנכס ${ctx.propertyAddress}, ${ctx.propertyCity}.</p>
    <p>נודה לקבלת טיוטת הסכם / נסח עדכני / אישורי מסים, ולתיאום מועד לחתימה.</p>
    <p>בכבוד רב,<br/>${ctx.attorney}, עו״ד</p>`;
}

export const DOCUMENT_PACK_TITLES = [
  'הסכם מכר',
  'שטר מכר',
  'ייפוי כוח בלתי חוזר לפי סעיף 91',
  'ייפוי כוח בלתי חוזר — הקונה',
  'בקשה לרישום הערת אזהרה',
  'בקשה לביטול הערת אזהרה',
  'הצהרה לטופס 7000',
  'הסכם שכר טרחה',
  'נספח תשלומים',
  'פרוטוקול מסירה',
  'בקשה לאישור עירייה',
  'מכתב לצד שכנגד',
] as const;

export function buildDocumentPack(ctx: DocContext): LegalDocument[] {
  return [
    { id: 'sale-agreement', title: 'הסכם מכר', group: 'חוזה', html: saleAgreement(ctx) },
    { id: 'deed', title: 'שטר מכר', group: 'טאבו', html: deedOfSale(ctx) },
    { id: 'poa-joint', title: 'ייפוי כוח בלתי חוזר לפי סעיף 91', group: 'ייפוי כוח', html: poaJoint(ctx) },
    { id: 'poa-buyer', title: 'ייפוי כוח בלתי חוזר — הקונה', group: 'ייפוי כוח', html: poaBuyer(ctx) },
    { id: 'caution-on', title: 'בקשה לרישום הערת אזהרה', group: 'טאבו', html: cautionRegister(ctx) },
    { id: 'caution-off', title: 'בקשה לביטול הערת אזהרה', group: 'טאבו', html: cautionCancel(ctx) },
    { id: 'form-7000', title: 'הצהרה לטופס 7000', group: 'מס', html: form7000(ctx) },
    { id: 'fees', title: 'הסכם שכר טרחה', group: 'משרד', html: feeAgreement(ctx) },
    { id: 'payments', title: 'נספח תשלומים', group: 'חוזה', html: paymentAppendix(ctx) },
    { id: 'delivery', title: 'פרוטוקול מסירה', group: 'סגירה', html: deliveryProtocol(ctx) },
    { id: 'muni', title: 'בקשה לאישור עירייה', group: 'רשויות', html: municipalRequest(ctx) },
    { id: 'letter', title: 'מכתב לצד שכנגד', group: 'התכתבות', html: opposingLetter(ctx) },
  ];
}
