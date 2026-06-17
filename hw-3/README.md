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
| `submission-hw3.pptx` | **מצגת ההגשה** — 5 שקפים, מכניסים בה 3 צילומי מסך |
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

## איפה משיגים ומשלבים כל מפתח API  ⭐ (חשוב למי שבודק)

> **כלל ברזל:** המפתחות נכנסים **רק** לתוך Make (במסך החיבורים/Connections של כל מודול),
> **לעולם לא** לקובץ בפרויקט.

### 1. Groq (ה-AI) — חינמי
- **משיגים:** <https://console.groq.com> → **API Keys** → *Create API Key* → מעתיקים `gsk_...`.
- **משלבים:** מודול **HTTP (Groq)** → Authentication = **API key** → Header: `Authorization` = `Bearer gsk_...`
  (שורה אחת בלבד — בלי רווח/שורה ריקה בסוף).

### 2. Airtable (טריגר + שמירת הקישור) — חינמי
- **משיגים:** <https://airtable.com/create/tokens> → הרשאות `data.records:read` + `data.records:write` + `schema.bases:read`, משייכים את ה-Base → `pat...`.
- **טבלה:** `City`, `Email`, `Status` (New/PendingApproval/Approved/Rejected), `Note`, `PageLink`, `Last Modified` (עוקב אחרי All editable fields).
- **משלבים:** במודולי **Airtable** (Watch + Update) → Connection → מדביקים את ה-PAT.

### 3. GitHub (גיבוי בכל הרצה) — חינמי
- **משיגים:** <https://github.com/settings/tokens> → Fine-grained token → הרשאת **Contents: Read and write** על הריפו → `github_pat_...`.
- **משלבים:** מודול **GitHub** → Connection.

### 4. מייל — **Outlook** (חינמי)
- Make חוסם SMTP רגיל ל-Gmail, לכן השתמשנו ב-**Outlook**:
- **משלבים:** מודול **Email → Send an Email** → Connection (SMTP): Host `smtp-mail.outlook.com`, Port `587`, STARTTLS, המייל והסיסמה. (חלופה: "Sign in with Microsoft".)

### ללא מפתח
- **Openverse** (תמונות) ו-**OpenStreetMap/Leaflet** (מפה).

---

## הגשה
`submission-hw3.pptx` — 5 שקפים מוכנים. גוררים פנימה 3 צילומי מסך:
1. **הדף שנוצר** (שקף 2)  2. **ה-canvas של Make** (שקף 3)  3. **טבלת Airtable** (שקף 3).
שקף 5 כולל את **טבלת ה-API Keys** לבודק.

## בדיקת מנוע הדף מקומית (לא חובה)
```bash
cd hw-3
node -e "const{buildPage}=require('./build-html.js'); require('fs').writeFileSync('test.html', buildPage({city:'פריז',country:'צרפת',intro:'בירת האור.',attractions:[{name:'מגדל אייפל',description:'סמל העיר.',lat:48.8584,lng:2.2945}]},['https://live.staticflickr.com/15/69824900_eb428925be_b.jpg']))"
```
