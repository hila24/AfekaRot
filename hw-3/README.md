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
| `make-build-guide.md` | **המדריך הראשי** — בניית האוטומציה ב-Make, מודול-אחר-מודול |
| `make-blueprint.json` | נסיון ייבוא מהיר ל-Make (אם הייבוא לא חלק — בונים לפי המדריך) |
| `prompt.md` | ה-prompt שנשלח ל-Groq (ה-AI מחזיר את דף ה-HTML המלא) |
| `sample.html` | דף לדוגמה שנוצר (תל אביב) — לתצוגה בשקף ובהרצה ב-GitHub Pages |
| `SLIDES.md` | תוכן מוכן לשקפי ההגשה |
| `workflow.n8n.json` + `build-html.js` | **חלופה ל-n8n** (אם תבחרו n8n במקום Make) — לא נדרש |

## זרימת האוטומציה
```
Airtable (Watch Records, לפי Last modified)
   └─ Filter: Status = "New" OR "Rejected"
   └─ Openverse        ← 3 תמונות אמיתיות (ללא מפתח API)
   └─ Groq (AI)        ← מחזיר דף HTML מלא: גלריה + 5 אטרקציות + מפת Leaflet עם סמנים
   └─ GitHub           ← קומיט הדף לריפו  ← גיבוי בכל הרצה
   └─ Airtable Update  ← PageLink = קישור הדף, Status = "PendingApproval"
   └─ Email            ← שולח את הדף + הקישור + הנחיה לאשר/לדחות ב-Airtable
        אישור: Status=Approved  → הקישור כבר שמור ✅
        דחייה: Status=Rejected + Note → הטריגר רץ שוב ויוצר דף חדש לפי ההערה 🔁
```

המפה חינמית לגמרי (Leaflet + OpenStreetMap, ללא מפתח), והתמונות מ-Openverse
(**ללא מפתח**). הסמנים על המפה נקבעים מהקואורדינטות שה-AI מחזיר לכל אטרקציה.

---

## איפה משיגים ומשלבים כל מפתח API  ⭐ (חשוב למי שבודק)

> **כלל ברזל:** המפתחות נכנסים **רק** לתוך Make (במסך החיבורים/Connections של כל מודול),
> **לעולם לא** לקובץ בפרויקט.

צריך 3 מפתחות + חיבור מייל אחד:

### 1. Groq (ה-AI) — חינמי
- **משיגים:** <https://console.groq.com> → התחברות → **API Keys** → *Create API Key* → מעתיקים `gsk_...`.
- **משלבים ב-Make:** מודול **HTTP (Groq)** → תחת *Headers* מוסיפים header:
  `Authorization` = `Bearer gsk_********************` (המילה `Bearer`, רווח, ואז המפתח).

### 2. Airtable (הטריגר + שמירת הקישור) — חינמי
- **משיגים:** <https://airtable.com/create/tokens> → *Create token* → הרשאות `data.records:read` + `data.records:write` + `schema.bases:read`, משייכים את ה-Base, ומעתיקים `pat...`.
- **בונים טבלה** עם השדות: `City` (text), `Email` (email), `Status` (single-select: `New`/`PendingApproval`/`Approved`/`Rejected`), `Note` (long text), `PageLink` (URL).
- **משלבים ב-Make:** במודולי **Airtable** → *Create a connection* → מדביקים את ה-PAT, ובוחרים Base + Table.

### 3. GitHub (גיבוי בכל הרצה) — חינמי
- **משיגים:** <https://github.com/settings/tokens> → *Generate new token (classic)* → הרשאת **`repo`** → מעתיקים `ghp_...`.
- **משלבים ב-Make:** מודול **GitHub** → *Create a connection* (התחברות עם GitHub, או הדבקת ה-Token).

### 4. מייל (Gmail) — חינמי
- **הכי קל:** מודול **Email → Send an Email** → *Create a connection* עם SMTP:
  Host `smtp.gmail.com`, Port `465` (SSL), User = המייל, Password = **App Password**
  (מ-<https://myaccount.google.com/apppasswords>, דורש אימות דו-שלבי פעיל).

### ללא מפתח (לא צריך כלום)
- **Openverse** (תמונות) ו-**OpenStreetMap/Leaflet** (מפה).

---

## דברים לערוך לפני הרצה ראשונה
1. בכל מקום שכתוב `hila24` / `AfekaRot` — שמים את שם המשתמש והריפו שלכם (מזה נבנה קישור ה-GitHub Pages שנשמר ב-Airtable).
2. מפעילים **GitHub Pages** על הריפו (Settings → Pages → Branch: main).
3. ממלאים את 3 המפתחות + חיבור המייל לפי הסעיף למעלה.
4. מפעילים את התרחיש (**Scheduling → ON**) — שורה חדשה ב-Airtable עם `Status=New` מתחילה ריצה.

המדריך המלא, מודול-אחר-מודול, נמצא ב-`make-build-guide.md`.

## בדיקת מנוע הדף מקומית (לא חובה)
```bash
cd hw-3
node -e "const{buildPage}=require('./build-html.js'); require('fs').writeFileSync('test.html', buildPage({city:'פריז',country:'צרפת',intro:'בירת האור.',attractions:[{name:'מגדל אייפל',description:'סמל העיר.',lat:48.8584,lng:2.2945}]},['https://live.staticflickr.com/15/69824900_eb428925be_b.jpg']))"
```
