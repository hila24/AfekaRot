# אוטומציה: מעיר → דף HTML מעוצב עם AI — תרגיל 3

אוטומציה ב-**Make.com** שמתחילה בטריגר ב-**Airtable**: המשתמש רושם שם של עיר/מדינה,
וה-AI (**Groq**, חינמי) מייצר דף HTML מעוצב ובו **3 תמונות** של האזור, **5 אטרקציות**
מומלצות, ו**מפה אינטראקטיבית עם נקודות הציון** של האטרקציות. הדף נשלח **למייל**
לאישור/דחייה, **מגובה ל-GitHub בכל הרצה**, ואם אושר — הקישור נשמר חזרה ב-Airtable.

> **למה Make.com?** חינמי לתמיד (לא טרייל), ויזואלי, ונותן תרשים זרימה לשקף ההגשה.

## מגישים
רועי דובין 322865320 והילה רוט 211602487

תצוגה מקדימה של דף לדוגמה (GitHub Pages):
[https://hila24.github.io/AfekaRot/hw-3/sample.html](https://hila24.github.io/AfekaRot/hw-3/sample.html)

## הקבצים
| קובץ | תפקיד |
|------|-------|
| `make-build-guide.md` | **המדריך המלא** — בניית 7 המודולים ב-Make, כולל כל התקלות והתיקונים |
| `groq-http-body.json` | גוף הבקשה למודול Groq (ה-prompt שמייצר את דף ה-HTML) — מדביקים כמו שהוא |
| `github-api-body.json` | גוף הבקשה למודול GitHub (commit הקובץ, מקודד base64) |
| `prompt.md` | ה-prompt של ה-AI בהסבר קריא |
| `sample.html` | דף לדוגמה (תל אביב) — לתצוגה ולהרצה ב-GitHub Pages |
| `hw3.pptx` | **מצגת ההגשה** — 5 שקפים עם צילומי המסך |
| `SLIDES.md` | תוכן הטקסט לשקפים |
| `workflow.n8n.json` + `build-html.js` | חלופת n8n (לא בשימוש — בחרנו Make) |

## זרימת האוטומציה (7 מודולים)
```
1. Airtable – Watch Records   ← טריגר: Status=New או Rejected (Formula עם TRIM)
2. Tools    – Set variable     ← fname = שם קובץ ייחודי לכל הרצה
3. HTTP     – Openverse         ← 3 תמונות אמיתיות (q={{City}}, ללא מפתח)
4. HTTP     – Groq AI           ← מחזיר דף HTML מלא: גלריה + 5 אטרקציות + מפת Leaflet
5. GitHub   – Make an API Call  ← commit הדף לריפו  ← גיבוי בכל הרצה
6. Airtable – Update a Record   ← PageLink = קישור הדף, Status = PendingApproval
7. Email    – Send an Email     ← Outlook: שולח את הדף + הנחיה לאשר/לדחות ב-Airtable
     אישור: Status=Approved  → הקישור כבר שמור ✅
     דחייה: Status=Rejected + Note → הטריגר רץ שוב ויוצר דף חדש 🔁
```

המפה חינמית (Leaflet + OpenStreetMap), התמונות מ-Openverse (**ללא מפתח**), והסמנים
נקבעים מהקואורדינטות (`data-lat`/`data-lng`) שה-AI מחזיר לכל אטרקציה.

---

## מה בדיוק בניתי — התרחיש שלי (מספרים אמיתיים)

> סעיף זה מתאר את הבנייה הקונקרטית, כך שברור בדיוק לאן כל טוקן נכנס.

- **ריפו:** `hila24/AfekaRot` · **דפים נשמרים ב:** `hw-3/generated/page-<id>-<timestamp>.html`
- **כתובת הדפים:** `https://hila24.github.io/AfekaRot/hw-3/generated/...`
- **בסיס Airtable** עם טבלה אחת ובה השדות: `City`, `Email`, `Status`, `Note`, `PageLink`, `Last Modified`.

המודולים בתרחיש שלי (המספר = המספר האמיתי על העיגול ב-Make):

| # מודול | מה הוא | המפתח/חיבור שמשולב בו |
|---------|--------|------------------------|
| **1** | Airtable – Watch Records (טריגר) | חיבור **Airtable PAT** |
| **17** | Tools – Set variable (`fname`) | — (ללא מפתח) |
| **2** | HTTP – Openverse (`GET /v1/images/`) | — (ללא מפתח) |
| **4** | HTTP – Groq (`POST /openai/v1/chat/completions`) | **Groq** — header `Authorization: Bearer gsk_...` |
| **5** | GitHub – Make an API Call (`PUT .../contents/...`) | חיבור **GitHub** (Token עם Contents: R+W) |
| **9** | Airtable – Update a Record | אותו חיבור **Airtable PAT** (כמו מודול 1) |
| **15** | Email – Send an Email | חיבור **Outlook** (SMTP) |

**כך שכל טוקן שהבודק משיג (מהעמודים הכלליים בסעיף הבא) נכנס למודול הזה:**
Groq → מודול **4** · Airtable → מודולים **1 + 9** · GitHub → מודול **5** · Outlook → מודול **15**.

---

## איך משיגים ומשלבים כל מפתח API — צעד אחר צעד  ⭐ (חשוב למי שבודק)

> **כלל ברזל:** המפתחות נכנסים **רק** לתוך Make (מסך ה-Connections של כל מודול),
> **לעולם לא** לקובץ בפרויקט.

### 1. Groq — מפתח ה-AI (חינמי)
**איך משיגים את הטוקן:**
1. נכנסים ל-<https://console.groq.com> ומתחברים (אפשר עם חשבון Google).
2. בתפריט הצד השמאלי לוחצים על **API Keys**.
3. לוחצים **Create API Key** → נותנים שם (`afeka-hw3`) → **Submit**.
4. **מעתיקים מיד** את המפתח שמתחיל ב-`gsk_...` — הוא מוצג רק פעם אחת!

**איך משלבים ב-Make:** מודול **HTTP (Groq)** → *Authentication* = **API key** →
*Add to* = **Header** → **Name** = `Authorization` , **Value** = `Bearer gsk_...`
(המילה `Bearer`, רווח, ואז המפתח — שורה אחת, בלי רווח/שורה ריקה בסוף).

### 2. Airtable — Personal Access Token (חינמי)
**איך משיגים את הטוקן:**
1. נכנסים ל-<https://airtable.com/create/tokens> (מחוברים לחשבון).
2. לוחצים **Create new token** → נותנים שם.
3. תחת **Scopes** → **Add a scope** ובוחרים שלושה: `data.records:read`, `data.records:write`, `schema.bases:read`.
4. תחת **Access** → **Add a base** → בוחרים את הבסיס שלכם.
5. לוחצים **Create token** → **מעתיקים** את המפתח שמתחיל ב-`pat...`.

**איך משלבים ב-Make:** במודולי **Airtable** (Watch + Update) → *Connection* →
**Create a connection** → סוג **Personal Access Token** → מדביקים את ה-`pat...`.

### 3. GitHub — Fine-grained Token (חינמי)
**איך משיגים את הטוקן:**
1. ב-GitHub: לוחצים על תמונת הפרופיל (ימין-עליון) → **Settings**.
2. גוללים למטה בתפריט הצד → **Developer settings**.
3. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
4. ממלאים **Token name** ו-**Expiration** (למשל 90 יום).
5. תחת **Repository access** → בוחרים **Only select repositories** → בוחרים את `AfekaRot`.
6. תחת **Permissions** → **Repository permissions** → מוצאים **Contents** → קובעים **Read and write**.
7. לוחצים **Generate token** → **מעתיקים** את המפתח שמתחיל ב-`github_pat_...`.

**איך משלבים ב-Make:** מודול **GitHub** → *Connection* → **Create a connection** →
מדביקים את ה-Token (או **Sign in with GitHub**).

### 4. מייל — Outlook (חינמי)
> Make **חוסם SMTP רגיל ל-Gmail**, לכן השתמשנו ב-**Outlook** (SMTP מותר).

**מה צריך:**
1. חשבון Outlook/Hotmail.
2. אם מופעל אצלכם **אימות דו-שלבי** — צריך **App Password**: <https://account.microsoft.com/security> → *Advanced security options* → *App passwords* → יצירה והעתקה. (בלי 2FA — הסיסמה הרגילה.)

**איך משלבים ב-Make:** מודול **Email → Send an Email** → *Connection* → **Create a connection** (SMTP):
- **Connection type:** `Others (SMTP)` · **Email provider:** `Outlook.com`
- (או ידני: **Host** `smtp-mail.outlook.com` · **Port** `587` · **STARTTLS**)
- **Username:** המייל המלא · **Password:** הסיסמה / App Password.

### ללא מפתח (לא צריך כלום)
- **Openverse** (תמונות) ו-**OpenStreetMap/Leaflet** (מפה) — חינמיים וללא מפתח.

---

## הגשה
`hw3.pptx` — 5 שקפים עם צילומי המסך:
1. **הדף שנוצר** (שקף 2)  2. **ה-canvas של Make** (שקף 3)  3. **טבלת Airtable** (שקף 3).
שקף 5 כולל את **טבלת ה-API Keys** לבודק.

## בדיקת מנוע הדף מקומית (לא חובה)
```bash
cd hw-3
node -e "const{buildPage}=require('./build-html.js'); require('fs').writeFileSync('test.html', buildPage({city:'פריז',country:'צרפת',intro:'בירת האור.',attractions:[{name:'מגדל אייפל',description:'סמל העיר.',lat:48.8584,lng:2.2945}]},['https://live.staticflickr.com/15/69824900_eb428925be_b.jpg']))"
```
