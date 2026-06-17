# בניית האוטומציה ב-Make.com — מדריך מלא (7 מודולים)

זהו המדריך המעודכן, המשקף את האוטומציה שנבנתה בפועל. Make חינמי לתמיד
(1000 פעולות/חודש, 2 תרחישים פעילים) — אין טרייל שפג.

## זרימה כללית
```
1. Airtable  – Watch Records   (טריגר: עיר חדשה / דחייה)
2. Tools     – Set variable    (שם קובץ ייחודי לכל הרצה)
3. HTTP      – Openverse        (3 תמונות, ללא מפתח)
4. HTTP      – Groq AI          (מייצר דף HTML מלא + מפה)
5. GitHub    – Make an API Call (commit הדף — גיבוי בכל הרצה)
6. Airtable  – Update a Record  (PageLink + Status=PendingApproval)
7. Email     – Send an Email    (Outlook SMTP — שולח את הדף)
```
- **אישור:** המשתמש קובע `Status=Approved` ב-Airtable → הקישור כבר שמור.
- **דחייה:** `Status=Rejected` (+ `Note`) → הטריגר רץ שוב ויוצר דף חדש לפי ההערה.

> **חשוב — מספרי מודולים:** ב-Make לכל מודול יש מספר פנימי שלא בהכרח 1..7
> (אם מוחקים ומוסיפים מודול, המספרים קופצים). בכל הפניה (`{{N.שדה}}`) השתמשו
> ב**מספר האמיתי** שמופיע על העיגול. בבנייה שלנו: Airtable=1, Set variable=17,
> Openverse=2, Groq=4, GitHub=5, Airtable Update=9, Email=15.

## טבלת ה-Airtable
שדות: `City` (text), `Email` (email), `Status` (single-select: `New`/`PendingApproval`/`Approved`/`Rejected`), `Note` (long text), `PageLink` (URL), `Last Modified` (**Last modified time**, עוקב אחרי **All editable fields**).

---

## מודול 1 — Airtable › Watch Records
- **Connection:** Airtable PAT (ראו README).
- **Base / Table:** הבסיס והטבלה.
- **Trigger field:** `Last Modified`  · **Label field:** `Last Modified`
- **Limit:** `2`
- **Formula** (מסנן רק עיר חדשה או נדחתה; `TRIM` מנקה רווחים נסתרים):
  ```
  OR(TRIM({Status})="New",TRIM({Status})="Rejected")
  ```
> ⚠️ אם נתקעים על מודול 1 בדחייה: ודאו ש-`Last Modified` עוקב אחרי **כל השדות**
> (Edit field → All editable fields), אחרת שינוי Status לא מעדכן אותו והטריגר לא תופס.

## מודול 2 — Tools › Set variable  (שם קובץ ייחודי)
מוסיפים אותו **בין מודול 1 ל-Openverse** (לוחצים על הקו → `+`).
- **Variable name:** `fname`
- **Variable value:**
  ```
  page-{{1.id}}-{{formatDate(now; "YYYYMMDDHHmmss")}}.html
  ```
> זה נותן שם ייחודי לכל הרצה → GitHub לא מבקש `sha` בדחייה, וכל הרצה נשמרת בנפרד
> (מקיים את הדרישה "גיבוי בכל הפעלה"). בהמשך מפנים אליו כ-`{{17.fname}}` (לפי המספר אצלכם).

## מודול 3 — HTTP › Make a request  (Openverse — תמונות)
- **URL:** `https://api.openverse.org/v1/images/`
- **Method:** `GET`
- **Query String:** `q` = `{{1.City}}` · `page_size` = `6`
- **Parse response:** Yes
> ⚠️ משתמשים ב-`{{1.City}}` בלבד — **בלי** "landmark" (ערים קטנות מחזירות 0 תוצאות עם המילה הזו).

## מודול 4 — HTTP › Make a request  (Groq — מייצר HTML)
- **URL:** `https://api.groq.com/openai/v1/chat/completions`
- **Method:** `POST`
- **Authentication:** API key → Header → Name `Authorization`, Value `Bearer gsk_...`
  (ודאו שאין **שורה ריקה / רווח** בסוף הערך — זה שובר את ה-header).
- **Body type:** Raw · **Content type:** JSON
- **Request content:** מדביקים את כל `groq-http-body.json`.
- **Parse response:** Yes
> ה-prompt מורה ל-AI להחזיר דף HTML שלם. הקואורדינטות נשמרות כ-`data-lat`/`data-lng`
> על הכרטיסים, והמפה קוראת אותן מה-DOM — כך גרשיים בשם אטרקציה לא שוברים את המפה.

## מודול 5 — GitHub › Make an API Call  (גיבוי הדף)
*(לאפליקציית GitHub ב-Make אין מודול "Create a File", לכן API Call ידני.)*
- **Connection:** GitHub (Token עם הרשאת **Contents: Read+Write**, או Sign in).
- **URL** (שורה אחת, **בלי newline בסוף!**):
  ```
  /repos/hila24/AfekaRot/contents/hw-3/generated/{{17.fname}}
  ```
- **Method:** `PUT`
- **Body:** מדביקים את `github-api-body.json` (התוכן מקודד ב-`base64`).
  ודאו שמספר המודול בתוך `base64(...)` תואם ל-Groq שלכם (אצלנו `4`).

## מודול 6 — Airtable › Update a Record  (שמירת הקישור)
- **Record ID:** `{{1.id}}`
- **Status:** `PendingApproval`
- **PageLink:**
  ```
  https://hila24.github.io/AfekaRot/hw-3/generated/{{17.fname}}
  ```

## מודול 7 — Email › Send an Email  (Outlook)
> Make **חוסם SMTP רגיל ל-Gmail**. השתמשנו בחשבון **Outlook** (SMTP מותר), או לחלופין
> "Sign in with Microsoft". (אם רוצים Gmail — חייבים את אפליקציית Gmail עם OAuth.)
- **Connection (SMTP):** Host `smtp-mail.outlook.com` · Port `587` · STARTTLS · המייל + הסיסמה.
- **To:** `{{1.Email}}`
- **Subject:** `הדף שלך עבור {{1.City}} מוכן — לאישור/דחייה`
- **Content type:** HTML
- **Content:**
```html
<div dir="rtl" style="font-family:Arial">
  <h2>הדף עבור {{1.City}} מוכן 🎉</h2>
  <p>צפייה בדף: <a href="https://hila24.github.io/AfekaRot/hw-3/generated/{{17.fname}}">לחצו כאן</a></p>
  <p><b>להחלטה ב-Airtable:</b> Status=Approved לאישור, או Status=Rejected + Note ליצירת דף חדש.</p>
</div>
```

---

## תקלות שנתקלנו בהן (ותיקונן)
| תקלה | סיבה | תיקון |
|------|------|-------|
| header Authorization לא תקין | שורה ריקה/רווח אחרי המפתח | להשאיר שורה אחת בלבד |
| קובץ נשמר עם `%0A` בשם | newline בסוף שדה ה-URL | למחוק את השורה הריקה |
| קישור במייל ריק | הפניה לפלט GitHub שלא נפתר | לבנות מ-`{{fname}}` (Set variable) |
| תמונות שבורות | "landmark" בשאילתה = 0 תוצאות | `q = {{1.City}}` בלבד |
| המפה לא נטענת | גרשיים `"` בשם שברו JS | קואורדינטות מ-`data-lat`/`data-lng` (DOM) |
| תקוע על מודול 1 בדחייה | Last Modified לא עוקב אחרי Status | Edit field → All editable fields |
| Rejected לא עובר בפורמולה | רווח נסתר בערך האופציה | `TRIM({Status})` בפורמולה |
| GitHub 422 "sha wasn't supplied" | שם קובץ חוזר על עצמו בדחייה | שם ייחודי לכל הרצה (Set variable) |
| GitHub Pages 404 לרגע | Pages בונה מחדש ~1-3 דק' אחרי commit | להמתין דקה-שתיים |

## דברים לערוך לפני הרצה
1. בכל מקום `hila24` / `AfekaRot` → שם המשתמש והריפו שלכם.
2. להפעיל GitHub Pages (Settings → Pages → Branch: main).
3. למלא 4 חיבורים: Groq, Airtable, GitHub, Outlook (ראו README).
