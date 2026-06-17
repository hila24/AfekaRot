# בניית האוטומציה ב-Make.com — צעד אחר צעד

Make חינמי לתמיד (1000 פעולות/חודש, 2 תרחישים פעילים) — אין טרייל שפג.
זהו המדריך הראשי. יש גם `make-blueprint.json` שאפשר לנסות לייבא, אבל אם הייבוא
לא חלק — בונים ידנית לפי המדריך הזה (~15-20 דקות).

## רעיון כללי
האישור/דחייה נעשה דרך **Airtable עצמו** (שדה `Status`), לא דרך כפתורים במייל —
זה הדרך הנקייה ב-Make. המשתמש מקבל מייל עם הדף + קישור, ואז ב-Airtable משנה את
`Status` ל-`Approved` (לשמור) או ל-`Rejected` + כותב `Note` (ליצור דף חדש).

```
Airtable (Watch Records, לפי Last modified)
  └─ Filter: Status = "New"  OR  Status = "Rejected"
  └─ HTTP: Openverse  → 3 כתובות תמונה
  └─ HTTP: Groq       → דף HTML מלא (משבץ את 3 התמונות + מפה עם 5 קואורדינטות)
  └─ GitHub: Create a File → קומיט הדף  (גיבוי בכל הרצה)
  └─ Airtable: Update → PageLink = קישור GitHub Pages, Status = "PendingApproval"
  └─ Email: Send       → הדף + הקישור + הנחיה: לאשר/לדחות ב-Airtable
```
- **אישור:** המשתמש קובע `Status=Approved` → הטריגר רץ, ה-Filter חוסם (לא New/Rejected) → לא קורה כלום, והקישור כבר שמור. ✅
- **דחייה:** `Status=Rejected` (+ Note) → הטריגר רץ, ה-Filter עובר → נוצר דף חדש לפי ההערה → חוזר ל-PendingApproval. 🔁

## טבלת ה-Airtable
שדות: `City` (text), `Email` (email), `Status` (single-select: `New`,`PendingApproval`,`Approved`,`Rejected`), `Note` (long text), `PageLink` (URL).

---

## המודולים, אחד-אחד

### מודול 1 — Airtable › Watch Records (טריגר)
- מוסיפים מודול **Airtable → Watch Records**.
- **Connection:** Create → מדביקים את ה-Airtable PAT (ראו README, סעיף המפתחות).
- **Base / Table:** בוחרים את הבסיס והטבלה.
- **Trigger:** `Last modified time` (כדי שגם דחייה תפעיל). אם אין שדה כזה — צרו שדה "Last Modified" ב-Airtable.
- **Limit:** 2.

### מודול 2 — Filter (בין מודול 1 ל-3)
- לוחצים על החיבור (הקו) בין המודולים → **Set up a filter**.
- תנאי: `Status` **equal** `New` → ואז **OR** → `Status` equal `Rejected`.

### מודול 3 — HTTP › Make a request (Openverse — תמונות)
- **URL:** `https://api.openverse.org/v1/images/`
- **Method:** GET
- **Query String:** `q` = `{{1.City}} city landmark` , `page_size` = `6`
- **Parse response:** Yes (כדי לקבל JSON).
- בפלט נשתמש ב: `{{3.results[1].url}}`, `{{3.results[2].url}}`, `{{3.results[3].url}}`.

### מודול 4 — HTTP › Make a request (Groq — מייצר HTML)
- **URL:** `https://api.groq.com/openai/v1/chat/completions`
- **Method:** POST
- **Headers:** הוסיפו header אחד — `Authorization` = `Bearer gsk_...` (המפתח שלכם מ-Groq).
- **Body type:** Raw · **Content type:** JSON (application/json)
- **Request content:** מדביקים את ה-JSON הבא (ה-prompt המלא ב-`prompt.md`):
```json
{
  "model": "llama-3.3-70b-versatile",
  "temperature": 0.4,
  "messages": [
    { "role": "system", "content": "<<< מדביקים כאן את ה-System message מ-prompt.md (כולל התבנית) >>>" },
    { "role": "user", "content": "City/country: {{1.City}}. Use these 3 image URLs: {{3.results[1].url}}, {{3.results[2].url}}, {{3.results[3].url}}. {{if(1.Status = \"Rejected\"; \"Previous page rejected. User note: \" + 1.Note; \"\")}}" }
  ]
}
```
- **Parse response:** Yes.
- ה-HTML נמצא ב: `{{4.choices[1].message.content}}`.

### מודול 5 — GitHub › Create a File (גיבוי בכל הרצה)
- **Connection:** Create → מתחברים עם GitHub (ראו README).
- **Owner:** `hila24` · **Repo:** `AfekaRot` *(עדכנו לשלכם)*
- **Path:** `hw-3/generated/{{replace(lower(1.City); " "; "-")}}-{{formatDate(now; "YYYYMMDD-HHmmss")}}.html`
- **Content:** `{{4.choices[1].message.content}}`
- **Commit message:** `hw-3: backup page for {{1.City}}`
- שומרים בצד את ה-Path הזה — נבנה ממנו את הקישור במודול הבא.

### מודול 6 — Airtable › Update a Record
- **Record ID:** `{{1.id}}`
- **PageLink:** `https://hila24.github.io/AfekaRot/{{5.content.path}}` *(עדכנו owner/repo)*
- **Status:** `PendingApproval`

### מודול 7 — Email › Send an Email
- **Connection:** Create → SMTP של Gmail (host `smtp.gmail.com`, port `465`/SSL, App Password) — או חיבור Gmail המובנה של Make.
- **To:** `{{1.Email}}`
- **Subject:** `הדף שלך עבור {{1.City}} מוכן — לאישור/דחייה`
- **Content type:** HTML
- **Content:**
```html
<div dir="rtl" style="font-family:Arial">
  <h2>הדף עבור {{1.City}} מוכן 🎉</h2>
  <p>צפייה בדף המלא (כולל מפה אינטראקטיבית):
     <a href="https://hila24.github.io/AfekaRot/{{5.content.path}}">לחצו כאן</a></p>
  <hr>
  <p><b>להחלטה:</b> פתחו את שורת הרשומה ב-Airtable —</p>
  <ul>
    <li>לאישור: שנו את <b>Status</b> ל-<b>Approved</b>.</li>
    <li>לדחייה: שנו ל-<b>Rejected</b> ואפשר להוסיף <b>Note</b> לשיפור — וייווצר דף חדש.</li>
  </ul>
</div>
```

זהו. מפעילים את התרחיש (**Scheduling → ON**), מוסיפים שורה ב-Airtable עם `City`,
`Email` ו-`Status=New`, ותוך דקה מתחילה הריצה.

---

## מה צריך לערוך לפני הפעלה
1. בכל מקום שכתוב `hila24` / `AfekaRot` — שמים את שם המשתמש והריפו שלכם.
2. מפעילים GitHub Pages על הריפו (Settings → Pages → Branch: main) כדי שהקישור יהיה צפייה.
3. 3 המפתחות (Groq, Airtable, GitHub) + חיבור המייל — לפי הסעיף ב-`README.md`.
