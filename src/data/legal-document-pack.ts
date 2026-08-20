import type { DocAudience, RepresentedSide } from '@/lib/document-audience';
import { documentVisibleForSide } from '@/lib/document-audience';
import type { DocContext } from '@/lib/legal-doc-context';
import type { CustomTemplate } from '@/lib/custom-templates';
import { renderTemplateText } from '@/lib/template-variables';

export interface LegalDocument {
  id: string;
  title: string;
  group: string;
  audience: DocAudience;
  /** True for documents that belong only to rental deals. */
  rentalOnly?: boolean;
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
      ${ctx.logo ? `<img class="office-logo" src="${ctx.logo}" alt="לוגו המשרד" />` : ''}
      <p class="office">משרד ${ctx.attorney} · רישיון ${ctx.license} · ${ctx.officeAddress}</p>
      <p class="file">תיק ${ctx.fileNumber}</p>
      <h1>${title}</h1>
    </div>`;
}

function saleAgreement(ctx: DocContext): string {
  return `
    ${header(ctx, 'הסכם מכר')}
    <p class="center">שנערך ונחתם ב${ctx.officeCity} ביום ${ctx.contractDate}</p>
    <p><strong>בין:</strong><br/>
    ${ctx.sellerNames}<br/>
    ת.ז. ${ctx.sellerIds}<br/>
    מרחוב ${ctx.sellerAddresses}<br/>
    טל׳ ${ctx.sellerPhones}<br/>
    (להלן: "<strong>המוכר</strong>")</p>
    <p class="center"><strong>לבין:</strong></p>
    <p>${ctx.buyerNames}<br/>
    ת.ז. ${ctx.buyerIds}<br/>
    מרחוב ${ctx.buyerAddresses}<br/>
    טל׳ ${ctx.buyerPhones}<br/>
    (להלן: "<strong>הקונה</strong>")</p>
    <h2>הואיל</h2>
    <p><strong>הואיל</strong> והמוכר מצהיר כי הוא הבעלים ו/או בעל הזכויות ב${ctx.propertyType} הידוע כגוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, ברחוב ${ctx.propertyAddress}, ${ctx.propertyCity}, בשטח של כ-${ctx.area} מ״ר, בקומה ${ctx.floor}, ${ctx.rooms} חדרים, וכי הזכות הרשומה היא ${ctx.rights} בלשכת רישום המקרקעין ${ctx.registryOffice} (להלן: "<strong>הנכס</strong>" או "<strong>הממכר</strong>");</p>
    <p><strong>והואיל</strong> והמוכר מעוניין למכור את הנכס והקונה מעוניין לרכשו, והצדדים מעוניינים לעגן את התקשרותם בהסכם זה;</p>
    <p><strong>לפיכך הוצהר, הותנה והוסכם בין הצדדים כדלקמן:</strong></p>
    <h2>1. המבוא, הכותרת והנספחים</h2>
    <p>1.1. המבוא להסכם זה, כותרות הסעיפים והנספחים המצורפים לו מהווים חלק בלתי נפרד הימנו ומחייבים את הצדדים.</p>
    <p>1.2. כותרות הסעיפים הן לנוחות בלבד ולא ישמשו לפרשנות.</p>
    <h2>2. הממכר</h2>
    <p>2.1. המוכר מוכר בזה לקונה, והקונה רוכש בזה מהמוכר, את מלוא זכויות המוכר בנכס, לרבות כל הבנוי והמחובר חיבור של קבע, וכל הזכויות הנלוות על פי דין ועל פי התקנון / הסכם השיתוף, אם ישנם.</p>
    <p>2.2. הממכר יימסר כשהוא פנוי מכל אדם וחפץ שאינו כלול בעסקה, חופשי מכל זכות צד ג׳, שוכר, בר-רשות או דייר מוגן, זולת כמפורט במפורש בהסכם זה.</p>
    <h2>3. הצהרות והתחייבויות המוכר</h2>
    <p>3.1. המוכר מצהיר כי הזכויות בנכס רשומות ו/או ניתנות לרישום על שמו בלשכת רישום המקרקעין ${ctx.registryOffice}, וכי הוא רשאי למכור את הנכס ולהעביר את הזכויות בו.</p>
    <p>3.2. המוכר מצהיר כי אין מניעה חוקית, שיעבוד, עיקול, הערת אזהרה, התחייבות לצד ג׳ או הליך משפטי המונעים את העברת הזכויות, זולת כמפורט בנסח הרישום / באישור הזכויות שיצורף.</p>
    <p>3.3. המוכר יישא במס שבח, בהיטל השבחה ובכל תשלום החל עליו על פי דין בקשר למכירה, וימציא לקונה ו/או לבא-כוחו אישורי מסים כנדרש להעברת הזכויות, לרבות אישור לפי סעיף 16 לחוק מיסוי מקרקעין (טופס 50) ככל שיידרש.</p>
    <p>3.4. המוכר לא ישעבד, לא ימכור ולא יעמיס על הנכס שעבוד או זכות נוספת לאחר החתימה, ויפעל להסרת שעבודים קיימים עד למועד התשלום שייקבע לשם כך.</p>
    <p>3.5. המוכר ישמור על מצב הנכס עד למסירה, יאפשר כניסת שמאי ו/או מהנדס בתיאום סביר, וישתף פעולה עם הליך המשכנתא של הקונה, לרבות חתימה על מסמכי הבנק כמקובל.</p>
    <p>3.6. המוכר מצהיר כי אינו מצוי בהליך חדלות פירעון, כינוס נכסים או הוצאה לפועל המונע את ביצוע ההסכם.</p>
    <p>3.7. המוכר מתחייב לחתום על ייפוי כוח בלתי חוזר לפי סעיף 91 לחוק לשכת עורכי הדין, התשכ״א–1961, על שטר מכר ועל כל מסמך הדרוש להשלמת העסקה ולרישום הזכויות.</p>
    <h2>4. הצהרות והתחייבויות הקונה</h2>
    <p>4.1. הקונה מצהיר כי ניתנה לו ההזדמנות לבדוק את הנכס, את מצבו התכנוני, הפיזי והרישומי, והוא רוכש אותו על סמך בדיקותיו, בכפוף להצהרות המוכר בהסכם זה.</p>
    <p>4.2. הקונה יישא במס רכישה, באגרות הרישום ובהוצאות החלות עליו על פי דין ועל פי הסכם זה.</p>
    <p>4.3. הקונה מתחייב לחתום על ייפוי כוח בלתי חוזר, על שטר מכר ועל מסמכי הרישום והמיסוי הדרושים.</p>
    <h2>5. התמורה</h2>
    <p>5.1. תמורת הממכר ישלם הקונה למוכר סך כולל של <strong>${ctx.consideration}</strong> (להלן: "<strong>התמורה</strong>"), והתמורה היא סופית ומוחלטת.</p>
    <p>5.2. התמורה תשולם בהתאם ללוח התשלומים שלהלן ו/או לנספח התשלומים:</p>
    ${ctx.paymentsHtml}
    <p>5.3. כל תשלום יופקד, ככל שסוכם, בחשבון נאמנות אצל בא-כוח הצדדים, וישוחרר רק בהתקיים התנאי הרלוונטי.</p>
    <h2>6. מסירת החזקה</h2>
    <p>6.1. החזקה בנכס תימסר לקונה ביום ${ctx.closingDate}, או במועד אחר שיסוכם בכתב, כנגד תשלום יתרת התמורה שנועד למסירה וכנגד מסירת מפתחות.</p>
    <p>6.2. במעמד המסירה ייחתם פרוטוקול מסירה. המוכר יישא בהוצאות ארנונה, מים, חשמל, גז וועד בית עד למועד המסירה; הקונה — החל ממועד המסירה.</p>
    <h2>7. רישום הזכויות והערת אזהרה</h2>
    <p>7.1. בסמוך לאחר החתימה תרשם הערת אזהרה לטובת הקונה בלשכת רישום המקרקעין ${ctx.registryOffice}, על יסוד הסכם זה.</p>
    <p>7.2. הצדדים יחתמו על שטר מכר ועל כל מסמך הדרוש לרישום מלוא הזכויות על שם הקונה. הרישום יבוצע לאחר קבלת אישורי המסים ואישור הרשות המקומית.</p>
    <h2>8. מיסים והוצאות</h2>
    <p>8.1. מס שבח והיטל השבחה — על המוכר, זולת אם הוסכם אחרת בכתב.</p>
    <p>8.2. מס רכישה ואגרות רישום — על הקונה.</p>
    <p>8.3. שכר טרחת כל צד — על אותו צד, כלפי בא-כוחו.</p>
    <h2>9. הפרה ותרופות</h2>
    <p>9.1. הפרה יסודית של הסכם זה תזכה את הצד המקיים בביטול ההסכם ו/או בפיצוי מוסכם בסך 10% מהתמורה, וזאת מבלי לגרוע מכל סעד אחר על פי דין או הסכם.</p>
    <p>9.2. אי-תשלום במועד, אי-מסירת חזקה פנויה, ואי-המצאת אישורי מסים במועדם ייחשבו, בין היתר, כהפרה יסודית.</p>
    <h2>10. ייפויי כוח</h2>
    <p>הצדדים יחתמו במעמד החתימה על ייפויי כוח בלתי חוזרים לפי סעיף 91 לחוק לשכת עורכי הדין, לטובת באי-כוחם, לצורך ביצוע הוראות הסכם זה, רישום הערת אזהרה, דיווח לרשויות המס ורישום הזכויות.</p>
    <h2>11. הוראות כלליות</h2>
    <p>11.1. הסכם זה ממצה את כל המוסכם בין הצדדים. כל שינוי טעון מסמך בכתב בחתימת הצדדים.</p>
    <p>11.2. כתובות הצדדים למסירת הודעות הן כמפורט בכותרת. הודעה שנמסרה במסירה אישית או בדואר רשום תיחשב כאילו הגיעה במועדה על פי דין.</p>
    <p>11.3. סמכות השיפוט הייחודית נתונה לבתי המשפט המוסמכים במחוז ${ctx.officeCity}.</p>
    <p>11.4. לשון יחיד כוללת רבים, לשון זכר כוללת נקבה, ולהפך.</p>
    <p>ולראיה באו הצדדים על החתום במקום ובמועד הנקובים בכותרת.</p>
    ${sigBlock(ctx)}`;
}

function deedOfSale(ctx: DocContext): string {
  return `
    <div class="legal-head official-form">
      <p class="emblem">מדינת ישראל</p>
      <p>משרד המשפטים · הרשות לרישום ולהסדר זכויות מקרקעין</p>
      <div class="form-meta">
        <span>מס׳ השטר ______________</span>
        <span>לשכת רישום ב-${ctx.registryOffice}</span>
      </div>
      <h1>שטר מכר</h1>
    </div>
    <p>השטר הזה מעיד שבתמורה שקיבל/ו ה״ה ${ctx.sellerNames}, מס׳ ת.ז. ${ctx.sellerIds}, מעביר/ים בזה ל-${ctx.buyerNames}, מס׳ ת.ז. ${ctx.buyerIds}, את זכות הקניין במקרקעין המפורטים ברשימה דלהלן, ומצהיר/ים בזה שהוא/שהם בעל/י המקרקעין הנזכרים ברשימה והם נקיים מכל ערעור זכות צד שלישי, פרט למפורטים להלן. כן מצהיר/ים הצד/דים שהתמורה המלאה והנכונה שולמה.</p>
    <h2>המעביר/ים — המוכר/ים</h2>
    <table class="legal-table">
      <thead><tr><th>שם מלא / תאגיד</th><th>סוג זיהוי</th><th>מס׳ זיהוי</th><th>החלק בזכות</th></tr></thead>
      <tbody>${ctx.sellers.map((p) => `<tr><td>${p.name || '________'}</td><td>ת.ז.</td><td>${p.idNumber || '________'}</td><td>1/1</td></tr>`).join('') || '<tr><td>________</td><td>ת.ז.</td><td>________</td><td>1/1</td></tr>'}</tbody>
    </table>
    <h2>הנעבר/ים — הקונה/ים</h2>
    <table class="legal-table">
      <thead><tr><th>שם מלא / תאגיד</th><th>סוג זיהוי</th><th>מס׳ זיהוי</th><th>החלק בזכות</th></tr></thead>
      <tbody>${ctx.buyers.map((p) => `<tr><td>${p.name || '________'}</td><td>ת.ז.</td><td>${p.idNumber || '________'}</td><td>1/1</td></tr>`).join('') || '<tr><td>________</td><td>ת.ז.</td><td>________</td><td>1/1</td></tr>'}</tbody>
    </table>
    <h2>הרשימה — תיאור המקרקעין</h2>
    <table class="legal-table">
      <thead><tr><th>הישוב</th><th>גוש</th><th>חלקה</th><th>תת-חלקה</th><th>השטח</th><th>החלקים המועברים</th><th>עודף לאחר המכר</th></tr></thead>
      <tbody>
        <tr>
          <td>${ctx.propertyCity}</td>
          <td>${ctx.block}</td>
          <td>${ctx.parcel}</td>
          <td>${ctx.subParcel}</td>
          <td>${ctx.area} מ״ר</td>
          <td>מלוא הזכויות</td>
          <td>אין</td>
        </tr>
      </tbody>
    </table>
    <p>תיאור המקרקעין או גבולותיהם והשעבודים: ${ctx.propertyAddress}, ${ctx.propertyCity}. זכות: ${ctx.rights}. ${ctx.propertyDescription !== '________' ? ctx.propertyDescription : 'אין שעבודים נוספים על המפורט בנסח.'}</p>
    <p>התמורה: ${ctx.consideration}.</p>
    <div class="sig-row">
      <div><div class="sig-line"></div><p>חתימת המוכר/ים<br/>${ctx.sellerNames}</p></div>
      <div><div class="sig-line"></div><p>חתימת הקונה/ים<br/>${ctx.buyerNames}</p></div>
    </div>
    <div class="cert">
      <p><strong>אימות חתימת השטר — ימולא בפני עו״ד או רשם</strong></p>
      <p>אני מעיד כי היום התייצב/ו לפני המוכר/ים והקונה/ים הנ״ל, ולאחר שזיהיתי אותם והסברתי להם את מהות העסקה שהם עומדים לבצע ואת התוצאות המשפטיות הנובעות ממנה, ולאחר ששוכנעתי שהדבר הובן להם כראוי, חתמו לפני מרצונם.</p>
      <p>אני מאמת את החתימות על שטר זה לפי הוראות תקנות 16–17 לתקנות המקרקעין (ניהול ורישום), התש״ל–1969.</p>
      <p>תאריך: ${ctx.contractDateShort} &nbsp; שם עורך הדין: ${ctx.attorney} &nbsp; רישיון: ${ctx.license} &nbsp; כתובת: ${ctx.officeAddress} &nbsp; חתימה: ________</p>
    </div>
    <div class="cert">
      <p><strong>אישור עורך-דין לפי תקנה 17 לתקנות המקרקעין (ניהול ורישום), התש״ל–1969</strong></p>
      <p>אני מאשר כי בדקתי את הפרטים המופיעים בשטר זה והמסמכים שצורפו לו, כאמור בתקנות המקרקעין (ניהול ורישום), התש״ל–1969, ומצאתים מתאימים וראויים לעסקה המבוקשת.</p>
      <p>תאריך: ${ctx.contractDateShort} &nbsp; ${ctx.attorney}, עו״ד &nbsp; ${ctx.officeAddress} &nbsp; חתימה: ________</p>
    </div>
    <div class="cert muted">
      <p><strong>לשימוש רשם המקרקעין</strong></p>
      <p>אישור: העסקה אושרה לרישום בהתאם לסעיף 7 לחוק המקרקעין, התשכ״ט–1969.</p>
      <p>תאריך: ________ &nbsp; רשם המקרקעין: ________</p>
    </div>`;
}

function poaJoint(ctx: DocContext): string {
  return `
    <div class="legal-head official-form">
      <h1>ייפוי כוח בלתי חוזר</h1>
      <p class="center">לפי סעיף 91 לחוק לשכת עורכי הדין, התשכ״א–1961</p>
    </div>
    <p>אנו הח״מ:</p>
    <table class="legal-table">
      <thead><tr><th>צד</th><th>שם</th><th>מס׳ זהות</th><th>כתובת</th></tr></thead>
      <tbody>
        <tr><td>מוכר/ים</td><td>${ctx.sellerNames}</td><td>${ctx.sellerIds}</td><td>${ctx.sellerAddresses}</td></tr>
        <tr><td>קונה/ים</td><td>${ctx.buyerNames}</td><td>${ctx.buyerIds}</td><td>${ctx.buyerAddresses}</td></tr>
      </tbody>
    </table>
    <p>ממנים בזה את ${ctx.attorney}, עו״ד, רישיון ${ctx.license}${ctx.secondAttorney !== '________' ? `, ו/או את ${ctx.secondAttorney}` : ''}, לפעול בשמנו ולמעננו בכל הקשור להסכם המכר מיום ${ctx.contractDateShort} לגבי הנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, ${ctx.propertyAddress}, ${ctx.propertyCity}.</p>
    <p>מיופה הכוח יהיה רשאי, בשמנו ובמקומנו:</p>
    <p>1. לחתום על שטר מכר, בקשות רישום, הצהרות ותצהירים מכל סוג.</p>
    <p>2. לרשום ו/או לבטל הערות אזהרה, משכנתאות, שעבודים והתחייבויות בקשר לנכס.</p>
    <p>3. לייצגנו בפני לשכת רישום המקרקעין, רשות המסים, הרשות המקומית, בתי משפט, בנקים וכל רשות מוסמכת.</p>
    <p>4. לשלם ולקבל כספים, אגרות, מסים והיטלים הכרוכים בעסקה, ולתת קבלות.</p>
    <p>5. להסמיך ממלאי מקום ולהעביר סמכויות אלה, כולן או מקצתן, לאחר.</p>
    <p>6. לעשות כל פעולה אחרת הדרושה או המועילה להשלמת העסקה ולרישום הזכויות.</p>
    <p>ייפוי כוח זה ניתן לטובת צד ג׳ והוא <strong>בלתי חוזר</strong>, הואיל וזכויות צד ג׳ תלויות בו, והוא יעמוד בתוקף גם לאחר פטירה, פסלות דין או פשיטת רגל של מי מהחותמים, לפי סעיף 91 לחוק לשכת עורכי הדין, התשכ״א–1961.</p>
    <p>לשון יחיד כוללת רבים ולשון זכר כוללת נקבה.</p>
    <p>ולראיה באנו על החתום ב${ctx.officeCity} ביום ${ctx.contractDate}.</p>
    ${sigBlock(ctx)}
    <div class="cert">
      <p><strong>אימות חתימה ע״י עו״ד</strong></p>
      <p>אני הח״מ, ${ctx.attorney}, מס׳ רישיון ${ctx.license}, מעיד כי היום התייצבו לפניי החותמים הנ״ל, הזדהו בפניי על פי תעודת זהות, ולאחר שהסברתי להם את מהות הפעולה ואת היות ייפוי הכוח בלתי חוזר — חתמו מרצונם החופשי.</p>
      <p>תאריך: ${ctx.contractDateShort} &nbsp;&nbsp; כתובת: ${ctx.officeAddress} &nbsp;&nbsp; חתימת עו״ד: ________</p>
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
    <div class="legal-head official-form">
      <p class="emblem">מדינת ישראל</p>
      <p>משרד המשפטים · הרשות לרישום ולהסדר זכויות מקרקעין</p>
      <p>לשכת רישום המקרקעין ${ctx.registryOffice}</p>
      <h1>בקשה לרישום הערת אזהרה בהסכמת כל הצדדים</h1>
      <p class="tiny">לפי סעיף 126 לחוק המקרקעין, התשכ״ט–1969</p>
    </div>
    <h2>1. תיאור המקרקעין</h2>
    <table class="legal-table">
      <tbody>
        <tr><th>יישוב</th><td>${ctx.propertyCity}</td><th>גוש</th><td>${ctx.block}</td></tr>
        <tr><th>חלקה</th><td>${ctx.parcel}</td><th>תת-חלקה</th><td>${ctx.subParcel}</td></tr>
        <tr><th>כתובת</th><td colspan="3">${ctx.propertyAddress}</td></tr>
        <tr><th>הזכות</th><td>${ctx.rights}</td><th>שטח</th><td>${ctx.area} מ״ר</td></tr>
      </tbody>
    </table>
    <h2>2. הפעולה המבוקשת</h2>
    <p>מתבקש בזה לרשום הערת אזהרה על יסוד התחייבות בעל הזכות בהסכם מכר מיום ${ctx.contractDateShort} למכור / להעביר את הזכות במקרקעין הנ״ל.</p>
    <h2>3. בעל הזכויות שעליהן תירשם ההערה — המוכר</h2>
    <table class="legal-table">
      <thead><tr><th>שם</th><th>סוג זיהוי</th><th>מס׳ זיהוי</th><th>כתובת</th></tr></thead>
      <tbody>${partyRows(ctx, 'sellers')}</tbody>
    </table>
    <h2>4. הזכאי שההערה תירשם לטובתו — הקונה</h2>
    <table class="legal-table">
      <thead><tr><th>שם</th><th>סוג זיהוי</th><th>מס׳ זיהוי</th><th>כתובת</th></tr></thead>
      <tbody>${partyRows(ctx, 'buyers')}</tbody>
    </table>
    <h2>5. מהות ההתחייבות</h2>
    <p>התחייבות למכור ולהעביר את הזכויות בנכס לפי הסכם המכר שבין הצדדים, בתמורה ${ctx.consideration}.</p>
    <h2>6. הסכמת בעל הזכות</h2>
    <p>אני/אנו ${ctx.sellerNames} מסכים/ים לרישום הערת האזהרה לטובת ${ctx.buyerNames} על המקרקעין המפורטים לעיל.</p>
    <h2>7. פרטי המטפל ברישום</h2>
    <p>${ctx.attorney}, עו״ד, רישיון ${ctx.license}, ${ctx.officeAddress}</p>
    ${sigBlock(ctx)}
    <div class="cert">
      <p>אני מעיד כי היום התייצבו לפניי הצדדים, זוהו על ידיי, הוסברה להם מהות הפעולה, והם חתמו מרצונם החופשי.</p>
      <p>${ctx.attorney}, עו״ד, רישיון ${ctx.license} · תאריך ${ctx.contractDateShort}</p>
    </div>`;
}

function cautionCancel(ctx: DocContext): string {
  return `
    <div class="legal-head official-form">
      <p class="emblem">מדינת ישראל</p>
      <p>משרד המשפטים · הרשות לרישום ולהסדר זכויות מקרקעין</p>
      <p>לשכת רישום המקרקעין ${ctx.registryOffice}</p>
      <h1>בקשה לביטול הערת אזהרה</h1>
      <p class="tiny">לפי סעיף 132 לחוק המקרקעין, התשכ״ט–1969</p>
    </div>
    <h2>1. המבקש/ים — הזכאי שההערה נרשמה לטובתו</h2>
    <table class="legal-table">
      <thead><tr><th>שם</th><th>סוג זיהוי</th><th>מס׳ זיהוי</th></tr></thead>
      <tbody>${ctx.buyers.map((p) => `<tr><td>${p.name || '________'}</td><td>ת.ז.</td><td>${p.idNumber || '________'}</td></tr>`).join('') || '<tr><td>________</td><td>ת.ז.</td><td>________</td></tr>'}</tbody>
    </table>
    <h2>2. תיאור המקרקעין</h2>
    <p>גוש ${ctx.block} &nbsp; חלקה ${ctx.parcel} &nbsp; תת-חלקה ${ctx.subParcel} &nbsp; יישוב ${ctx.propertyCity} &nbsp; כתובת ${ctx.propertyAddress}</p>
    <h2>3. נושא הזכות שעליה נרשמה ההערה</h2>
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
    <div class="legal-head official-form">
      <p class="emblem">רשות המסים בישראל</p>
      <p>מיסוי מקרקעין</p>
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
    <p>שנערך בין ${ctx.attorney} (להלן: "<strong>עורך הדין</strong>") לבין הלקוח/ה ${ctx.clientNames}.</p>
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
    <p>לכבוד ${ctx.opposingCounsel !== '________' ? ctx.opposingCounsel : 'ב״כ הצד שכנגד'}</p>
    <p>הנדון: תיק ${ctx.fileNumber} — ${ctx.title}</p>
    <p>מרשיי, ${ctx.buyerNames !== '________' && ctx.sellerNames !== '________' ? `${ctx.buyerNames} / ${ctx.sellerNames}` : ctx.buyerNames}, מבקשים לקדם את העסקה בנכס ${ctx.propertyAddress}, ${ctx.propertyCity}.</p>
    <p>נודה לקבלת טיוטת הסכם / נסח עדכני / אישורי מסים, ולתיאום מועד לחתימה.</p>
    <p>בכבוד רב,<br/>${ctx.attorney}, עו״ד</p>`;
}

function notarialPoa(ctx: DocContext): string {
  return `
    ${header(ctx, 'ייפוי כוח נוטריוני')}
    <p class="center">לפי חוק הנוטריונים, התשל״ו–1976</p>
    <p>הופיע/ו בפניי ${ctx.buyerNames} ת.ז. ${ctx.buyerIds} ו/או ${ctx.sellerNames} ת.ז. ${ctx.sellerIds}, וביקש/ו כי אאשר ייפוי כוח זה.</p>
    <p>החותמים ממנים את ${ctx.attorney}, עו״ד, רישיון ${ctx.license}, לפעול בשמם בכל הקשור ל${ctx.dealType} בנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, ${ctx.propertyAddress}, ${ctx.propertyCity}, לרבות חתימה על שטרות, הצהרות מס, בקשות ללשכת רישום המקרקעין והופעה בפני רשויות.</p>
    <p>ייפוי כוח זה ניתן גם לצורך שימוש מחוץ לישראל / בפני גופים הדורשים אישור נוטריוני.</p>
    <p>נחתם ב${ctx.officeCity} ביום ${ctx.contractDate}.</p>
    ${sigBlock(ctx)}
    <div class="cert">
      <p><strong>אישור נוטריון</strong></p>
      <p>אני הח״מ, נוטריון, מאשר כי החותמים הופיעו בפניי, זוהו על פי תעודת זהות, הבינו את משמעות המסמך וחתמו מרצונם החופשי.</p>
      <p>חותמת נוטריון · מספר אישור: ________ · תאריך: ${ctx.contractDateShort}</p>
    </div>`;
}

function poaSeller(ctx: DocContext): string {
  return `
    ${header(ctx, 'ייפוי כוח בלתי חוזר — המוכר')}
    <p class="center">לפי סעיף 91 לחוק לשכת עורכי הדין, התשכ״א–1961</p>
    <p>אני/אנו הח״מ ${ctx.sellerNames}, ת.ז. ${ctx.sellerIds}, ממנה/ממנים את ${ctx.attorney}${ctx.secondAttorney !== '________' ? ` ו/או ${ctx.secondAttorney}` : ''} לפעול בשמי כלפי הקונה/ים ${ctx.buyerNames} בקשר לנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, ${ctx.propertyAddress}, ${ctx.propertyCity}.</p>
    <p>1. לחתום על שטר מכר, בקשות רישום, ביטול הערות אזהרה ודיווחי מס שבח.</p>
    <p>2. לקבל כספים בנאמנות, לתאם סילוק משכנתא ולמסור מפתחות במועד המסירה.</p>
    <p>3. לייצגני בפני לשכת רישום המקרקעין, רשות המסים, הרשות המקומית והבנק.</p>
    <p>4. ייפוי כוח זה בלתי חוזר לטובת הקונה וצדדים שלישיים, ויעמוד בתוקף גם לאחר פטירה.</p>
    <p>ולראיה באתי על החתום ב${ctx.officeCity} ביום ${ctx.contractDate}.</p>
    <div class="sig-row"><div><div class="sig-line"></div><p><strong>המוכר/ים:</strong> ${ctx.sellerNames}</p></div></div>
    <div class="cert"><p>אימות: ${ctx.attorney}, עו״ד, רישיון ${ctx.license}. תאריך ${ctx.contractDateShort}.</p></div>`;
}

function poaBank(ctx: DocContext): string {
  return `
    ${header(ctx, 'ייפוי כוח בלתי חוזר לבנק למשכנתא')}
    <p>אני/אנו ${ctx.buyerNames}, ת.ז. ${ctx.buyerIds}, ממנים את ${ctx.bankName !== '________' ? ctx.bankName : 'הבנק למשכנתאות'} ו/או את ${ctx.attorney} לפעול בשמנו לצורך קבלת הלוואת משכנתא לרכישת הנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, ${ctx.propertyAddress}, ${ctx.propertyCity}.</p>
    <p>1. לחתום על כתבי התחייבות לרישום משכנתא ראשונה.</p>
    <p>2. לרשום משכנתא / הערת אזהרה לטובת הבנק לאחר רישום הזכויות על שם הקונה.</p>
    <p>3. לקבל מהמוכר ומהבנק הקיים מסמכי סילוק ולשלם יתרות מתוך כספי ההלוואה.</p>
    <p>4. ייפוי כוח זה בלתי חוזר לטובת הבנק.</p>
    <p>נחתם ב${ctx.officeCity} ביום ${ctx.contractDate}.</p>
    <div class="sig-row"><div><div class="sig-line"></div><p>הקונה/ים: ${ctx.buyerNames}</p></div></div>`;
}

function poaSellerBank(ctx: DocContext): string {
  return `
    ${header(ctx, 'ייפוי כוח למוכר כלפי הבנק — סילוק משכנתא')}
    <p>אני/אנו ${ctx.sellerNames}, ת.ז. ${ctx.sellerIds}, ממנים את ${ctx.attorney} ו/או את ${ctx.bankName !== '________' ? ctx.bankName : 'הבנק בעל המשכנתא'} לפעול לסילוק המשכנתא הרשומה על הנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}.</p>
    <p>1. לבקש ולקבל מכתב יתרה לסילוק.</p>
    <p>2. לקבל כספי סילוק מתוך תמורת המכר המופקדת בנאמנות.</p>
    <p>3. לחתום על כתב ביטול משכנתא / שטר שחרור ולמסור אותו לב״כ הקונה.</p>
    <p>נחתם ב${ctx.officeCity} ביום ${ctx.contractDate}.</p>
    <div class="sig-row"><div><div class="sig-line"></div><p>המוכר/ים: ${ctx.sellerNames}</p></div></div>`;
}

function purchaseTaxDeclaration(ctx: DocContext): string {
  return `
    ${header(ctx, 'הצהרת רוכש — בקשה לשומת מס רכישה')}
    <p>לכבוד מנהל מיסוי מקרקעין, אזור ${ctx.registryOffice || ctx.officeCity}</p>
    <p>אני/אנו ${ctx.buyerNames}, ת.ז. ${ctx.buyerIds}, מצהיר/ים כי רכשתי את הנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, ${ctx.propertyAddress}, ${ctx.propertyCity}, בתמורה ${ctx.consideration}, ביום ${ctx.contractDateShort}.</p>
    <p>☐ זו דירתי היחידה ואני מבקש חישוב לפי מדרגות דירה יחידה.</p>
    <p>☐ זו אינה דירה יחידה.</p>
    <p>הפרטים בהצהרה זו נכונים, ואני מתחייב לעדכן על כל שינוי מהותי.</p>
    <p>חתימה: ________ &nbsp; תאריך: ${ctx.contractDateShort}</p>
    <div class="cert"><p>אימות חתימה: ${ctx.attorney}, עו״ד, רישיון ${ctx.license}.</p></div>`;
}

function capitalGainsReport(ctx: DocContext): string {
  return `
    ${header(ctx, 'דיווח מס שבח + בקשת פטור דירת מגורים מזכה')}
    <p>לכבוד מנהל מיסוי מקרקעין, אזור ${ctx.registryOffice || ctx.officeCity}</p>
    <p>אני/אנו ${ctx.sellerNames}, ת.ז. ${ctx.sellerIds}, מדווח/ים על מכירת זכות במקרקעין:</p>
    <table class="legal-table">
      <tbody>
        <tr><th>נכס</th><td>${ctx.propertyAddress}, ${ctx.propertyCity}</td></tr>
        <tr><th>גוש / חלקה / תת</th><td>${ctx.block} / ${ctx.parcel} / ${ctx.subParcel}</td></tr>
        <tr><th>יום המכירה</th><td>${ctx.contractDateShort}</td></tr>
        <tr><th>תמורה</th><td>${ctx.consideration}</td></tr>
        <tr><th>קונה</th><td>${ctx.buyerNames}, ת.ז. ${ctx.buyerIds}</td></tr>
      </tbody>
    </table>
    <p>☒ מבוקש פטור לפי פרק חמישי 1 לחוק מיסוי מקרקעין (שבח ורכישה) — דירת מגורים מזכה, בכפוף לעמידה בתנאים.</p>
    <p>☐ לחלופין מבוקש חישוב ליניארי / שומה רגילה.</p>
    <p>אני מצהיר כי הדירה שימשה למגורים וכי מתקיימים תנאי הפטור, או שאמסור השלמות כנדרש.</p>
    <div class="sig-row"><div><div class="sig-line"></div><p>המוכר/ים: ${ctx.sellerNames}</p></div></div>
    <div class="cert"><p>אימות: ${ctx.attorney}, עו״ד, רישיון ${ctx.license}.</p></div>`;
}

function form50Request(ctx: DocContext): string {
  return `
    ${header(ctx, 'בקשה לטופס 50 / אישור מס שבח לרישום')}
    <p>לכבוד מנהל מיסוי מקרקעין, אזור ${ctx.registryOffice || ctx.officeCity}</p>
    <p>הנדון: בקשה לאישור לרישום (טופס 50) — תיק ${ctx.fileNumber}</p>
    <p>אבקש להנפיק אישור לרישום הזכויות על שם ${ctx.buyerNames} בנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, לאחר דיווח המכירה מאת ${ctx.sellerNames} מיום ${ctx.contractDateShort}.</p>
    <p>מצורפים: העתק הסכם, דיווח מקוון, אסמכתאות תשלום / פטור.</p>
    <p>בכבוד רב,<br/>${ctx.attorney}, עו״ד, רישיון ${ctx.license}<br/>${ctx.officeAddress}</p>`;
}

function trustAppendix(ctx: DocContext): string {
  return `
    ${header(ctx, 'נספח נאמנות')}
    <p>נספח זה מהווה חלק בלתי נפרד מהסכם המכר מיום ${ctx.contractDate} בין ${ctx.sellerNames} לבין ${ctx.buyerNames}.</p>
    <p>1. כספי התמורה, כולם או חלקם, יופקדו בנאמנות אצל ${ctx.attorney}, עו״ד, בחשבון נאמנות ייעודי.</p>
    <p>2. הנאמן ישחרר כספים רק בהתקיים התנאי הרלוונטי: חתימה, הסרת שעבוד, מסירה או רישום — לפי לוח התשלומים.</p>
    <p>3. הנאמן אינו ערב לתוצאה המשפטית מעבר לחובת זהירות סבירה בניהול הכספים.</p>
    <p>4. ריבית שתצטבר, אם תהיה, תיוחס לפי המוסכם בכתב; בהיעדר הסכמה — לקונה עד מועד השחרור החוזי.</p>
    ${ctx.paymentsHtml}
    ${sigBlock(ctx)}`;
}

function dualCounselTrust(ctx: DocContext): string {
  return `
    ${header(ctx, 'הסכם נאמנות בין באי כוח')}
    <p>בין ${ctx.attorney} (ב״כ צד א׳) לבין ${ctx.opposingCounsel !== '________' ? ctx.opposingCounsel : 'ב״כ הצד שכנגד'} (ב״כ צד ב׳).</p>
    <p>הוסכם כי כספי העסקה בתיק ${ctx.fileNumber} יופקדו בנאמנות משותפת / אצל אחד מבאי הכוח כפי שיצוין, וישוחררו רק בחתימת שני באי הכוח או לפי הוראה בכתב בהתאם להסכם המכר מיום ${ctx.contractDateShort}.</p>
    <p>הנכס: ${ctx.propertyAddress}, ${ctx.propertyCity}, גוש ${ctx.block} חלקה ${ctx.parcel}.</p>
    <p>כל מחלוקת על שחרור תועבר להכרעת הצדדים או לבית המשפט המוסמך, והנאמן יחזיק בכספים עד אז.</p>
    <div class="sig-row">
      <div><div class="sig-line"></div><p>ב״כ הקונה</p></div>
      <div><div class="sig-line"></div><p>ב״כ המוכר</p></div>
    </div>`;
}

function conditionsAppendix(ctx: DocContext): string {
  return `
    ${header(ctx, 'נספח תנאים מתלים')}
    <p>להסכם המכר מיום ${ctx.contractDate} בין ${ctx.sellerNames} לבין ${ctx.buyerNames}.</p>
    <p>ההסכם מותלה בהתקיימות אלה, עד המועדים שיצוינו:</p>
    <p>1. קבלת נסח טאבו / אישור זכויות עדכני התואם את הצהרות המוכר.</p>
    <p>2. אישור עקרוני למשכנתא לקונה בסכום לא פחות מ־________ ₪, תוך ____ ימים.</p>
    <p>3. אישור עירייה להעברת זכויות וציון היטל השבחה / היעדרו.</p>
    <p>4. הסרת / התחייבות לסילוק משכנתא קיימת בבנק ${ctx.bankName}.</p>
    <p>5. אחר: ${ctx.propertyDescription}</p>
    <p>לא התקיים תנאי במועדו — רשאי הצד הנפגע לבטל בהודעה בכתב ולהשיב כספים שהופקדו, בניכוי הוצאות מוסכמות בלבד.</p>
    ${sigBlock(ctx)}`;
}

function firstMortgageUndertaking(ctx: DocContext): string {
  return `
    ${header(ctx, 'כתב התחייבות לרישום משכנתא ראשונה')}
    <p>אני/אנו ${ctx.buyerNames}, ת.ז. ${ctx.buyerIds}, מתחייבים כלפי ${ctx.bankName !== '________' ? ctx.bankName : 'הבנק המלווה'} לרשום לטובתו משכנתא ראשונה בדרגה על הנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, מיד עם רישום הזכויות על שמי/שמנו.</p>
    <p>התחייבות זו בלתי חוזרת ותעמוד בתוקף עד לרישום המשכנתא או עד לשחרור בכתב מהבנק.</p>
    <p>נחתם ב${ctx.officeCity} ביום ${ctx.contractDate}.</p>
    <div class="sig-row"><div><div class="sig-line"></div><p>הקונה/ים: ${ctx.buyerNames}</p></div></div>`;
}

function mortgageBalanceLetter(ctx: DocContext): string {
  return `
    ${header(ctx, 'מכתב לבנק המוכר — בקשת יתרה לסילוק')}
    <p>${ctx.officeCity}, ${ctx.openedAt}</p>
    <p>לכבוד ${ctx.bankName !== '________' ? ctx.bankName : 'הבנק בעל המשכנתא'}<br/>${ctx.bankAddress}</p>
    <p>הנדון: בקשת מכתב יתרה לסילוק — ${ctx.sellerNames}, ת.ז. ${ctx.sellerIds}</p>
    <p>מרשיי מוכרים את הנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, ${ctx.propertyAddress}, ${ctx.propertyCity}.</p>
    <p>אבקש מכתב יתרה לסילוק סופי, כולל הפרשי הצמדה, עמלה ומועד תוקף, וכן הנחיות להעברה לצורך קבלת שטר שחרור / ביטול משכנתא.</p>
    <p>בכבוד רב,<br/>${ctx.attorney}, עו״ד<br/>רישיון ${ctx.license}</p>`;
}

function dischargeUndertaking(ctx: DocContext): string {
  return `
    ${header(ctx, 'התחייבות המוכר לסילוק משכנתא קיימת')}
    <p>אני/אנו ${ctx.sellerNames}, ת.ז. ${ctx.sellerIds}, מתחייבים לסלק את מלוא יתרת המשכנתא הרשומה לטובת ${ctx.bankName !== '________' ? ctx.bankName : 'הבנק'} על הנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, מתוך כספי התמורה שיופקדו בנאמנות, ולהמציא לב״כ הקונה שטר שחרור / אישור ביטול תוך ____ ימים ממועד הסילוק.</p>
    <p>עד לקבלת הביטול לא תשוחרר יתרת התמורה, אלא אם הוסכם אחרת בכתב.</p>
    ${sigBlock(ctx)}`;
}

function registryInstructions(ctx: DocContext): string {
  return `
    ${header(ctx, 'הוראות לרישום בלשכת המקרקעין')}
    <p>לכבוד לשכת רישום המקרקעין ${ctx.registryOffice}</p>
    <p>הנדון: תיק ${ctx.fileNumber} — רישום העברת זכויות</p>
    <p>מתבקש לרשום את מלוא הזכויות בנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel} על שם ${ctx.buyerNames}, ת.ז. ${ctx.buyerIds}, מאת ${ctx.sellerNames}, ת.ז. ${ctx.sellerIds}.</p>
    <p>מצורפים: שטר מכר, ייפויי כוח, אישורי מסים, אישור עירייה, אסמכתת תשלום אגרות.</p>
    <p>אגרות ישולמו על ידי הקונה / כפי שסוכם בהסכם.</p>
    <p>${ctx.attorney}, עו״ד, רישיון ${ctx.license}, ${ctx.officeAddress}</p>`;
}

function noDebtAffidavit(ctx: DocContext): string {
  return `
    ${header(ctx, 'תצהיר היעדר חובות והיעדר הליכים')}
    <p>אני הח״מ ${ctx.sellerNames}, ת.ז. ${ctx.sellerIds}, לאחר שהוזהרתי כי עליי לומר את האמת וכי אם לא אעשה כן אהיה צפוי לעונשים הקבועים בחוק, מצהיר כדלקמן:</p>
    <p>1. אני בעל הזכויות בנכס ${ctx.propertyAddress}, ${ctx.propertyCity}, גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}.</p>
    <p>2. אין על הנכס עיקול, צו הריסה, התחייבות לצד ג׳ או הליך משפטי מונע, זולת כמפורט: ________</p>
    <p>3. אינני מצוי בהליך חדלות פירעון / כינוס נכסים המונע את המכר.</p>
    <p>4. כל החובות בגין ארנונה, מים, ועד בית ומשכנתא ישולמו על ידי עד למועד המסירה, או יוסדרו מתוך הנאמנות.</p>
    <p>5. זה שמי, זו חתימתי ותוכן תצהירי אמת.</p>
    <div class="sig-row"><div><div class="sig-line"></div><p>המוכר/ים</p></div></div>
    <div class="cert"><p>אימות: ${ctx.attorney}, עו״ד, רישיון ${ctx.license}, מאשר כי המצהיר הוזהר וחתם בפניי ביום ${ctx.contractDateShort}.</p></div>`;
}

function contentsAppendix(ctx: DocContext): string {
  return `
    ${header(ctx, 'נספח תכולה — מה נשאר בנכס')}
    <p>להסכם המכר מיום ${ctx.contractDate} בין ${ctx.sellerNames} לבין ${ctx.buyerNames}, לגבי ${ctx.propertyAddress}, ${ctx.propertyCity}.</p>
    <p>הפריטים שלהלן נכללים בממכר ויושארו בנכס במועד המסירה:</p>
    <p>1. ________</p>
    <p>2. ________</p>
    <p>3. ________</p>
    <p>כל פריט שאינו מפורט יוצא על ידי המוכר לפני המסירה, אלא אם סוכם אחרת בכתב.</p>
    <p>תיאור נוסף: ${ctx.propertyDescription}</p>
    ${sigBlock(ctx)}`;
}

function houseCommitteeRequest(ctx: DocContext): string {
  return `
    ${header(ctx, 'בקשה לאישור ועד בית / דמי ניהול')}
    <p>לכבוד ועד הבית / חברת הניהול, ${ctx.propertyAddress}, ${ctx.propertyCity}</p>
    <p>הנדון: אישור יתרות והעברת זכויות — ${ctx.sellerNames} אל ${ctx.buyerNames}</p>
    <p>אבקש לאשר כי אין חובות דמי ועד / ניהול על הדירה בגוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, קומה ${ctx.floor}, ולציין את גובה התשלום החודשי ומועד המעבר על שם הקונה.</p>
    <p>בכבוד רב,<br/>${ctx.attorney}, עו״ד</p>`;
}

function heirsConsent(ctx: DocContext): string {
  return `
    ${header(ctx, 'הסכמת יורשים / תצהיר יורש')}
    <p>אנו הח״מ, יורשי ${ctx.sellerNames}, מסכימים למכירת הנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, ${ctx.propertyAddress}, ${ctx.propertyCity}, ל${ctx.buyerNames} בתמורה ${ctx.consideration}, ומסמיכים את ${ctx.attorney} לחתום על הסכם המכר, ייפויי הכוח ומסמכי הרישום.</p>
    <p>מצורף / יצורף צו ירושה או צו קיום צוואה.</p>
    <p>שם יורש: ________ &nbsp; ת.ז.: ________ &nbsp; חתימה: ________</p>
    <p>שם יורש: ________ &nbsp; ת.ז.: ________ &nbsp; חתימה: ________</p>
    <div class="cert"><p>אימות: ${ctx.attorney}, עו״ד, רישיון ${ctx.license}.</p></div>`;
}

function corporateResolution(ctx: DocContext): string {
  return `
    ${header(ctx, 'פרוטוקול מורשי חתימה')}
    <p>שם התאגיד: ${ctx.buyerNames !== '________' ? ctx.buyerNames : ctx.sellerNames}</p>
    <p>בתאריך ${ctx.contractDateShort} הוחלט לאשר ${ctx.dealType} בנכס ${ctx.propertyAddress}, ${ctx.propertyCity}, גוש ${ctx.block} חלקה ${ctx.parcel}, בתמורה ${ctx.consideration}.</p>
    <p>מורשי החתימה לחתום על ההסכם, ייפויי הכוח והמסמכים הנלווים:</p>
    <p>1. ________ &nbsp; ת.ז. ________</p>
    <p>2. ________ &nbsp; ת.ז. ________</p>
    <p>ההחלטה התקבלה כדין ואינה סותרת את מסמכי ההתאגדות.</p>
    <div class="sig-row"><div><div class="sig-line"></div><p>יו״ר / מנהל</p></div><div><div class="sig-line"></div><p>חותמת התאגיד</p></div></div>`;
}

function sharingAgreement(ctx: DocContext): string {
  return `
    ${header(ctx, 'הסכם שיתוף במקרקעין')}
    <p>בין הצדדים הרשומים כבעלים במשותף בנכס גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}, ${ctx.propertyAddress}, ${ctx.propertyCity}.</p>
    <p>1. חלקי הצדדים בזכות: ________</p>
    <p>2. אופן השימוש, נשיאה בהוצאות והעברת חלק טעונים הסכמה בכתב, אלא אם נקבע אחרת.</p>
    <p>3. הסכם זה יירשם בפנקסי המקרקעין כהסכם שיתוף, ככל שהצדדים יבקשו זאת.</p>
    <p>נחתם ב${ctx.officeCity} ביום ${ctx.contractDate}.</p>
    ${sigBlock(ctx)}`;
}

function buildingDeviationAppendix(ctx: DocContext): string {
  return `
    ${header(ctx, 'נספח חריגות בנייה / התחייבות להכשרה')}
    <p>המוכר ${ctx.sellerNames} מצהיר בפני הקונה ${ctx.buyerNames} כי ביחס לנכס ${ctx.propertyAddress}, ${ctx.propertyCity} (גוש ${ctx.block} חלקה ${ctx.parcel}):</p>
    <p>☐ אין חריגות בנייה ידועות.</p>
    <p>☐ קיימות חריגות / שימוש חורג כמפורט: ${ctx.propertyDescription}</p>
    <p>המוכר מתחייב לשתף פעולה בהכשרה / בהסדרה מול הוועדה המקומית, והוצאות יחולו על ________.</p>
    <p>הקונה מאשר כי הובא לידיעתו האמור והוא רוכש את הנכס בכפוף לכך.</p>
    ${sigBlock(ctx)}`;
}

function guaranteeDeed(ctx: DocContext): string {
  return `
    ${header(ctx, 'כתב ערבות')}
    <p>אני הח״מ ________, ת.ז. ________, ערב כלפי ${ctx.sellerNames} לקיום התחייבויות ${ctx.buyerNames} לפי הסכם המכר מיום ${ctx.contractDate} בנכס ${ctx.propertyAddress}, ${ctx.propertyCity}, עד לסך ${ctx.consideration} או עד לסכום: ________.</p>
    <p>הערבות היא ערבות ביצוע / תשלום, וניתנת לחילוט לאחר הודעה בכתב על הפרה יסודית שלא תוקנה תוך 7 ימים.</p>
    <p>נחתם ב${ctx.officeCity} ביום ${ctx.contractDate}.</p>
    <div class="sig-row"><div><div class="sig-line"></div><p>הערב</p></div><div><div class="sig-line"></div><p>המוטב</p></div></div>`;
}

function interimLease(ctx: DocContext): string {
  return `
    ${header(ctx, 'הסכם שכירות ביניים עד למסירה')}
    <p>בין ${ctx.sellerNames} (משכיר) לבין ${ctx.buyerNames} (שוכר), לגבי הנכס ${ctx.propertyAddress}, ${ctx.propertyCity}, ממועד ${ctx.contractDateShort} ועד מועד המסירה ${ctx.closingDate}.</p>
    <p>דמי שכירות: ________ ₪ לחודש. הנכס יימסר במצב הקיים, ללא יצירת זכות דיירות מוגנת.</p>
    <p>הסכם זה אינו פוגע בהסכם המכר ואינו דוחה את מועד המסירה החוזי אלא אם נכתב במפורש.</p>
    ${sigBlock(ctx)}`;
}

function combinationAgreement(ctx: DocContext): string {
  return `
    ${header(ctx, 'הסכם קומבינציה')}
    <p>בין בעל הקרקע ${ctx.sellerNames} לבין היזם ${ctx.buyerNames}, לגבי המגרש גוש ${ctx.block} חלקה ${ctx.parcel}, ${ctx.propertyAddress}, ${ctx.propertyCity}, שטח כ-${ctx.area} מ״ר.</p>
    <p>1. היזם יבנה על המגרש פרויקט לפי היתר שיושג, ובעל הקרקע יקבל תמורה בעין בשיעור ________% ו/או יחידות כמפורט בנספח התמורות.</p>
    <p>2. היזם יישא בעלויות הבנייה, ההיטלים והמסים החלים עליו; מס שבח / היטל השבחה — כפי שייקבע בנספח.</p>
    <p>3. בעל הקרקע יחתום על ייפוי כוח בלתי חוזר לצורך תכנון, היתר ורישום.</p>
    <p>4. מועדי מסירה, ערבויות חוק מכר ורישום בית משותף יפורטו בנספחים.</p>
    <p>נחתם ב${ctx.officeCity} ביום ${ctx.contractDate}.</p>
    ${sigBlock(ctx)}`;
}

function combinationConsideration(ctx: DocContext): string {
  return `
    ${header(ctx, 'נספח תמורות — עסקת קומבינציה')}
    <p>לחוזה הקומבינציה בין ${ctx.sellerNames} לבין ${ctx.buyerNames} לגבי גוש ${ctx.block} חלקה ${ctx.parcel}.</p>
    <table class="legal-table">
      <thead><tr><th>יחידה / תיאור</th><th>קומה</th><th>שטח</th><th>חלק</th></tr></thead>
      <tbody>
        <tr><td>________</td><td>________</td><td>________</td><td>________</td></tr>
        <tr><td>________</td><td>________</td><td>________</td><td>________</td></tr>
      </tbody>
    </table>
    <p>שיעור הקומבינציה: ________%. מקדמות / כספים נוספים: ${ctx.consideration}.</p>
    ${sigBlock(ctx)}`;
}

function rentalAgreement(ctx: DocContext): string {
  return `
    ${header(ctx, 'הסכם שכירות בלתי מוגנת')}
    <p class="center">שנערך ונחתם ב${ctx.officeCity} ביום ${ctx.contractDate}</p>
    <p><strong>בין:</strong> ${ctx.sellerNames}, ת.ז. ${ctx.sellerIds}, מרחוב ${ctx.sellerAddresses} (להלן: "<strong>המשכיר</strong>")</p>
    <p><strong>לבין:</strong> ${ctx.buyerNames}, ת.ז. ${ctx.buyerIds}, מרחוב ${ctx.buyerAddresses} (להלן: "<strong>השוכר</strong>")</p>
    <p><strong>הואיל</strong> והמשכיר הוא בעל הזכויות ב${ctx.propertyType} ברחוב ${ctx.propertyAddress}, ${ctx.propertyCity} (גוש ${ctx.block} חלקה ${ctx.parcel} תת-חלקה ${ctx.subParcel}), ${ctx.rooms} חדרים בקומה ${ctx.floor} (להלן: "<strong>המושכר</strong>");</p>
    <p><strong>והואיל</strong> והשוכר מעוניין לשכור את המושכר למטרת מגורים בלבד, והצדדים מצהירים כי חוק הגנת הדייר [נוסח משולב], התשל״ב–1972, לא יחול על שכירות זו;</p>
    <h2>1. תקופת השכירות</h2>
    <p>מיום ${ctx.contractDateShort} ועד יום ${ctx.closingDate}. אופציה להארכה: ________ חודשים, בהודעה מראש של ____ ימים.</p>
    <h2>2. דמי השכירות</h2>
    <p>דמי שכירות חודשיים בסך ${ctx.consideration}, שישולמו מראש בכל 1 לחודש, באמצעות ________.</p>
    ${ctx.paymentsHtml}
    <h2>3. התחייבויות השוכר</h2>
    <p>3.1. להשתמש במושכר למגורים בלבד ולא להעבירו או להשכירו בשכירות משנה ללא הסכמה בכתב.</p>
    <p>3.2. לשלם חשבונות חשמל, מים, גז, ארנונה וועד בית בתקופת השכירות.</p>
    <p>3.3. לשמור על המושכר, ולהחזירו בתום התקופה במצב כפי שקיבלו, למעט בלאי סביר.</p>
    <h2>4. התחייבויות המשכיר</h2>
    <p>4.1. למסור את המושכר פנוי וראוי למגורים במועד תחילת השכירות.</p>
    <p>4.2. לתקן על חשבונו ליקויים מבניים שאינם נובעים משימוש השוכר, תוך זמן סביר.</p>
    <h2>5. בטחונות</h2>
    <p>שטר חוב / ערבות בנקאית בסך ________ ₪, וערב/ים כמפורט בכתב הערבות המצורף.</p>
    <h2>6. הפרות</h2>
    <p>איחור העולה על 7 ימים בתשלום דמי השכירות ייחשב הפרה יסודית. פינוי באיחור יחייב את השוכר בדמי שימוש מוסכמים של פי 2 מדמי השכירות היומיים לכל יום איחור.</p>
    <p>ולראיה באו הצדדים על החתום:</p>
    <div class="sig-row">
      <div><div class="sig-line"></div><p><strong>המשכיר:</strong> ${ctx.sellerNames}</p></div>
      <div><div class="sig-line"></div><p><strong>השוכר:</strong> ${ctx.buyerNames}</p></div>
    </div>`;
}

function rentalPromissoryNote(ctx: DocContext): string {
  return `
    ${header(ctx, 'שטר חוב — בטוחה לשכירות')}
    <p class="center">שטר חוב מס׳ ________</p>
    <p>אני הח״מ ${ctx.buyerNames}, ת.ז. ${ctx.buyerIds}, מתחייב/ת לשלם לפקודת ${ctx.sellerNames}, ת.ז. ${ctx.sellerIds}, סך של ________ ₪ (במילים: ________), בתוספת הפרשי הצמדה למדד המחירים לצרכן.</p>
    <p>שטר זה נמסר כבטוחה לקיום התחייבויות עושה השטר לפי הסכם השכירות מיום ${ctx.contractDateShort} לגבי הנכס ${ctx.propertyAddress}, ${ctx.propertyCity}, ואין למלאו או לסחרו אלא בהתקיים הפרה שלא תוקנה לאחר התראה בכתב של 7 ימים.</p>
    <p>מקום השיפוט: ${ctx.officeCity}. עושה השטר פטור מהצגה לפירעון ומהודעת אי-כיבוד.</p>
    <div class="sig-row">
      <div><div class="sig-line"></div><p>עושה השטר: ${ctx.buyerNames}</p></div>
    </div>
    <h2>ערבות אוואל</h2>
    <p>אנו הח״מ ערבים בערבות אוואל לפירעון שטר זה:</p>
    <p>שם: ________ &nbsp; ת.ז.: ________ &nbsp; כתובת: ________ &nbsp; חתימה: ________</p>
    <p>שם: ________ &nbsp; ת.ז.: ________ &nbsp; כתובת: ________ &nbsp; חתימה: ________</p>`;
}

function rentalGuarantee(ctx: DocContext): string {
  return `
    ${header(ctx, 'כתב ערבות אישית — שכירות')}
    <p>אני/אנו הח״מ ________, ת.ז. ________, מרחוב ________, ערב/ים בזה כלפי ${ctx.sellerNames} (המשכיר) לקיום מלוא התחייבויות ${ctx.buyerNames} (השוכר) לפי הסכם השכירות מיום ${ctx.contractDateShort} לגבי ${ctx.propertyAddress}, ${ctx.propertyCity}.</p>
    <p>1. הערבות כוללת דמי שכירות, חשבונות, נזקים ודמי שימוש בפינוי באיחור, עד לסך ________ ₪.</p>
    <p>2. הערבות תעמוד בתוקף עד להחזרת המושכר והסדרת כל החובות, כולל תקופת אופציה אם מומשה.</p>
    <p>3. המשכיר רשאי לפנות לערב לאחר דרישה בכתב מהשוכר שלא נענתה תוך 7 ימים.</p>
    <p>נחתם ב${ctx.officeCity} ביום ${ctx.contractDate}.</p>
    <div class="sig-row">
      <div><div class="sig-line"></div><p>הערב/ים</p></div>
      <div><div class="sig-line"></div><p>המשכיר: ${ctx.sellerNames}</p></div>
    </div>`;
}

function rentalDelivery(ctx: DocContext): string {
  return `
    ${header(ctx, 'פרוטוקול מסירת מושכר')}
    <p>ביום ${ctx.contractDateShort} נמסר המושכר ${ctx.propertyAddress}, ${ctx.propertyCity} מהמשכיר ${ctx.sellerNames} לידי השוכר ${ctx.buyerNames}.</p>
    <p>מצב המושכר: ☐ תקין &nbsp; ☐ ליקויים: ________</p>
    <p>מוני חשמל: ________ &nbsp; מים: ________ &nbsp; גז: ________</p>
    <p>מפתחות שנמסרו: ____ סטים. שלט חניה / מחסן: ________</p>
    <p>תכולה שנשארת במושכר: ${ctx.propertyDescription}</p>
    <div class="sig-row">
      <div><div class="sig-line"></div><p>המשכיר</p></div>
      <div><div class="sig-line"></div><p>השוכר</p></div>
    </div>`;
}

function saleLawGuarantee(ctx: DocContext): string {
  return `
    ${header(ctx, 'נספח ערבות חוק מכר')}
    <p>היזם ${ctx.buyerNames} מתחייב להמציא לבעל הקרקע / לרוכשים ערבות בנקאית לפי חוק המכר (דירות) (הבטחת השקעות של רוכשי דירות), התשל״ה–1974, בגין כל תשלום שישולם על חשבון התמורה בפרויקט בגוש ${ctx.block} חלקה ${ctx.parcel}, ${ctx.propertyCity}.</p>
    <p>הערבות תומצא במועד קבלת כל תשלום, ותעמוד בתוקף עד רישום הזכויות או מסירת החזקה לפי הדין.</p>
    ${sigBlock(ctx)}`;
}

export const DOCUMENT_PACK_TITLES = [
  'הסכם מכר',
  'שטר מכר',
  'ייפוי כוח בלתי חוזר לפי סעיף 91',
  'ייפוי כוח בלתי חוזר — הקונה',
  'ייפוי כוח בלתי חוזר — המוכר',
  'ייפוי כוח נוטריוני',
  'ייפוי כוח בלתי חוזר לבנק למשכנתא',
  'ייפוי כוח למוכר כלפי הבנק — סילוק משכנתא',
  'בקשה לרישום הערת אזהרה',
  'בקשה לביטול הערת אזהרה',
  'הצהרה לטופס 7000',
  'הצהרת רוכש — בקשה לשומת מס רכישה',
  'דיווח מס שבח + בקשת פטור דירת מגורים מזכה',
  'בקשה לטופס 50 / אישור מס שבח לרישום',
  'הסכם שכר טרחה',
  'נספח תשלומים',
  'נספח נאמנות',
  'הסכם נאמנות בין באי כוח',
  'נספח תנאים מתלים',
  'כתב התחייבות לרישום משכנתא ראשונה',
  'מכתב לבנק המוכר — בקשת יתרה לסילוק',
  'התחייבות המוכר לסילוק משכנתא קיימת',
  'הוראות לרישום בלשכת המקרקעין',
  'תצהיר היעדר חובות והיעדר הליכים',
  'נספח תכולה — מה נשאר בנכס',
  'בקשה לאישור ועד בית / דמי ניהול',
  'פרוטוקול מסירה',
  'בקשה לאישור עירייה',
  'מכתב לצד שכנגד',
  'הסכמת יורשים / תצהיר יורש',
  'פרוטוקול מורשי חתימה',
  'הסכם שיתוף במקרקעין',
  'נספח חריגות בנייה / התחייבות להכשרה',
  'כתב ערבות',
  'הסכם שכירות ביניים עד למסירה',
  'הסכם קומבינציה',
  'נספח תמורות — עסקת קומבינציה',
  'נספח ערבות חוק מכר',
  'הסכם שכירות בלתי מוגנת',
  'שטר חוב — בטוחה לשכירות',
  'כתב ערבות אישית — שכירות',
  'פרוטוקול מסירת מושכר',
] as const;

function allDocuments(ctx: DocContext): LegalDocument[] {
  return [
    { id: 'sale-agreement', title: 'הסכם מכר', group: 'חוזה', audience: 'both', html: saleAgreement(ctx) },
    { id: 'deed', title: 'שטר מכר', group: 'טאבו', audience: 'both', html: deedOfSale(ctx) },
    { id: 'poa-joint', title: 'ייפוי כוח בלתי חוזר לפי סעיף 91', group: 'ייפוי כוח', audience: 'both', html: poaJoint(ctx) },
    { id: 'poa-buyer', title: 'ייפוי כוח בלתי חוזר — הקונה', group: 'ייפוי כוח', audience: 'buyer', html: poaBuyer(ctx) },
    { id: 'poa-seller', title: 'ייפוי כוח בלתי חוזר — המוכר', group: 'ייפוי כוח', audience: 'seller', html: poaSeller(ctx) },
    { id: 'poa-notary', title: 'ייפוי כוח נוטריוני', group: 'ייפוי כוח', audience: 'both', html: notarialPoa(ctx) },
    { id: 'poa-bank', title: 'ייפוי כוח בלתי חוזר לבנק למשכנתא', group: 'מימון', audience: 'buyer', html: poaBank(ctx) },
    { id: 'poa-seller-bank', title: 'ייפוי כוח למוכר כלפי הבנק — סילוק משכנתא', group: 'מימון', audience: 'seller', html: poaSellerBank(ctx) },
    { id: 'caution-on', title: 'בקשה לרישום הערת אזהרה', group: 'טאבו', audience: 'both', html: cautionRegister(ctx) },
    { id: 'caution-off', title: 'בקשה לביטול הערת אזהרה', group: 'טאבו', audience: 'both', html: cautionCancel(ctx) },
    { id: 'form-7000', title: 'הצהרה לטופס 7000', group: 'מס', audience: 'both', html: form7000(ctx) },
    { id: 'purchase-tax', title: 'הצהרת רוכש — בקשה לשומת מס רכישה', group: 'מס', audience: 'buyer', html: purchaseTaxDeclaration(ctx) },
    { id: 'capital-gains', title: 'דיווח מס שבח + בקשת פטור דירת מגורים מזכה', group: 'מס', audience: 'seller', html: capitalGainsReport(ctx) },
    { id: 'form-50', title: 'בקשה לטופס 50 / אישור מס שבח לרישום', group: 'מס', audience: 'seller', html: form50Request(ctx) },
    { id: 'fees', title: 'הסכם שכר טרחה', group: 'משרד', audience: 'both', html: feeAgreement(ctx) },
    { id: 'payments', title: 'נספח תשלומים', group: 'חוזה', audience: 'both', html: paymentAppendix(ctx) },
    { id: 'trust', title: 'נספח נאמנות', group: 'חוזה', audience: 'both', html: trustAppendix(ctx) },
    { id: 'dual-trust', title: 'הסכם נאמנות בין באי כוח', group: 'חוזה', audience: 'both', html: dualCounselTrust(ctx) },
    { id: 'conditions', title: 'נספח תנאים מתלים', group: 'חוזה', audience: 'both', html: conditionsAppendix(ctx) },
    { id: 'mortgage-first', title: 'כתב התחייבות לרישום משכנתא ראשונה', group: 'מימון', audience: 'buyer', html: firstMortgageUndertaking(ctx) },
    { id: 'bank-balance', title: 'מכתב לבנק המוכר — בקשת יתרה לסילוק', group: 'מימון', audience: 'both', html: mortgageBalanceLetter(ctx) },
    { id: 'discharge', title: 'התחייבות המוכר לסילוק משכנתא קיימת', group: 'מימון', audience: 'seller', html: dischargeUndertaking(ctx) },
    { id: 'registry', title: 'הוראות לרישום בלשכת המקרקעין', group: 'טאבו', audience: 'both', html: registryInstructions(ctx) },
    { id: 'affidavit', title: 'תצהיר היעדר חובות והיעדר הליכים', group: 'מוכר', audience: 'seller', html: noDebtAffidavit(ctx) },
    { id: 'contents', title: 'נספח תכולה — מה נשאר בנכס', group: 'חוזה', audience: 'both', html: contentsAppendix(ctx) },
    { id: 'vaad', title: 'בקשה לאישור ועד בית / דמי ניהול', group: 'רשויות', audience: 'both', html: houseCommitteeRequest(ctx) },
    { id: 'delivery', title: 'פרוטוקול מסירה', group: 'סגירה', audience: 'both', html: deliveryProtocol(ctx) },
    { id: 'muni', title: 'בקשה לאישור עירייה', group: 'רשויות', audience: 'both', html: municipalRequest(ctx) },
    { id: 'letter', title: 'מכתב לצד שכנגד', group: 'התכתבות', audience: 'both', html: opposingLetter(ctx) },
    { id: 'heirs', title: 'הסכמת יורשים / תצהיר יורש', group: 'מיוחד', audience: 'seller', html: heirsConsent(ctx) },
    { id: 'corporate', title: 'פרוטוקול מורשי חתימה', group: 'מיוחד', audience: 'both', html: corporateResolution(ctx) },
    { id: 'sharing', title: 'הסכם שיתוף במקרקעין', group: 'מיוחד', audience: 'both', html: sharingAgreement(ctx) },
    { id: 'deviation', title: 'נספח חריגות בנייה / התחייבות להכשרה', group: 'מיוחד', audience: 'both', html: buildingDeviationAppendix(ctx) },
    { id: 'guarantee', title: 'כתב ערבות', group: 'מיוחד', audience: 'buyer', html: guaranteeDeed(ctx) },
    { id: 'interim-lease', title: 'הסכם שכירות ביניים עד למסירה', group: 'מיוחד', audience: 'both', html: interimLease(ctx) },
    { id: 'combination', title: 'הסכם קומבינציה', group: 'קומבינציה', audience: 'both', html: combinationAgreement(ctx) },
    { id: 'combination-app', title: 'נספח תמורות — עסקת קומבינציה', group: 'קומבינציה', audience: 'both', html: combinationConsideration(ctx) },
    { id: 'sale-law-guar', title: 'נספח ערבות חוק מכר', group: 'קומבינציה', audience: 'both', html: saleLawGuarantee(ctx) },
    { id: 'rental-agreement', title: 'הסכם שכירות בלתי מוגנת', group: 'שכירות', audience: 'both', rentalOnly: true, html: rentalAgreement(ctx) },
    { id: 'rental-note', title: 'שטר חוב — בטוחה לשכירות', group: 'שכירות', audience: 'both', rentalOnly: true, html: rentalPromissoryNote(ctx) },
    { id: 'rental-guarantee', title: 'כתב ערבות אישית — שכירות', group: 'שכירות', audience: 'both', rentalOnly: true, html: rentalGuarantee(ctx) },
    { id: 'rental-delivery', title: 'פרוטוקול מסירת מושכר', group: 'שכירות', audience: 'both', rentalOnly: true, html: rentalDelivery(ctx) },
  ];
}

/** Sale-family documents that remain useful for rental files as well. */
const RENTAL_SHARED_IDS = new Set(['poa-notary', 'fees', 'letter', 'corporate']);

export function buildDocumentPack(
  ctx: DocContext,
  represented?: RepresentedSide,
  dealType?: string,
): LegalDocument[] {
  let pack = allDocuments(ctx);
  if (dealType === 'rental') pack = pack.filter((doc) => doc.rentalOnly || RENTAL_SHARED_IDS.has(doc.id));
  else if (dealType) pack = pack.filter((doc) => !doc.rentalOnly);
  if (!represented) return pack;
  return pack.filter((doc) => documentVisibleForSide(doc.audience, represented));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Renders a user-defined template ({variable} placeholders) into a printable document. */
export function renderCustomDocument(ctx: DocContext, template: CustomTemplate): LegalDocument {
  const filled = renderTemplateText(template.body, ctx);
  const paragraphs = escapeHtml(filled)
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br/>')}</p>`)
    .join('');
  return {
    id: `custom-${template.id}`,
    title: template.title,
    group: 'תבניות שלי',
    audience: template.audience,
    html: `${header(ctx, template.title)}${paragraphs}`,
  };
}

export function renderCustomDocuments(
  ctx: DocContext,
  templates: CustomTemplate[],
  represented?: RepresentedSide,
): LegalDocument[] {
  return templates
    .filter((t) => !represented || documentVisibleForSide(t.audience, represented))
    .map((t) => renderCustomDocument(ctx, t));
}
