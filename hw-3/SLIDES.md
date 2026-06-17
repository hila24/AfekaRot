# תוכן לשקפי ההגשה — תרגיל 3

> הטקסט כאן זהה למה שכבר נמצא ב-`submission-hw3.pptx`. גוררים למצגת את 3 צילומי המסך.

## שקף 1 — כותרת
- **אוטומציה: מעיר → דף HTML מעוצב עם AI**
- מגישים: רועי דובין 322865320, הילה רוט 211602487
- כלים: Make.com · Airtable · Groq AI · GitHub · **Outlook** · Leaflet/OpenStreetMap · Openverse

## שקף 2 — תצוגת הדף שנוצר
- צילום מסך של הדף (גלריית 3 תמונות + 5 כרטיסי אטרקציות + המפה עם הסמנים).
- קישור חי לדוגמה: https://hila24.github.io/AfekaRot/hw-3/generated/page-...html

## שקף 3 — Make + הקישור ב-Airtable
- צילום ה-canvas של Make (7 המודולים, כולם ירוקים).
- צילום טבלת ה-Airtable עם שורה `Status=Approved` וה-`PageLink`.

## שקף 4 — תצוגה כללית של הזרימה
```
Airtable(Watch) → Set variable → Openverse → Groq(AI) → GitHub(commit)
→ Airtable(Update) → Email(Outlook)
   אישור: Status=Approved   ·   דחייה: Status=Rejected + Note → דף חדש
```

## שקף 5 — פירוט שלבי הזרימה (7 מודולים)
1. **Airtable – Watch Records** — טריגר: עיר חדשה (New) או דחייה (Rejected). Formula עם `TRIM`.
2. **Tools – Set variable** — `fname` = שם קובץ ייחודי לכל הרצה (גיבוי נפרד בכל פעם).
3. **HTTP – Openverse** — 3 תמונות אמיתיות של האזור (ללא מפתח).
4. **HTTP – Groq AI** — מחזיר דף HTML מלא: מבוא + 5 אטרקציות + מפת Leaflet עם סמנים.
5. **GitHub – Make an API Call** — commit של הדף (גיבוי בכל הרצה), והקישור הופך ל-URL ציבורי.
6. **Airtable – Update a Record** — שומר PageLink ומסמן Status=PendingApproval.
7. **Email – Send an Email (Outlook)** — שולח את הדף + הנחיה לאשר/לדחות ב-Airtable.

## שקף 6 — הנחיית הבודק: היכן משלבים את ה-API Keys ⭐
| מפתח | מאיפה משיגים | פורמט | לאיזה מודול ב-Make |
|------|--------------|-------|--------------------|
| **Groq** (AI) | console.groq.com → API Keys | `Bearer gsk_…` | מודול HTTP(Groq) — Header Authorization |
| **Airtable** | airtable.com/create/tokens | `pat…` | מודולי Airtable (Watch + Update) — Connection |
| **GitHub** | github.com/settings/tokens (Contents: R+W) | `github_pat_…` | מודול GitHub — Connection |
| **Outlook** (מייל) | smtp-mail.outlook.com:587 / Sign in | סיסמה / OAuth | מודול Email — Connection |
| Openverse / OpenStreetMap | —  (ללא מפתח) | — | מודול Openverse / מפה |

> המפתחות נכנסים רק לתוך Make (Connections של המודולים), לא לקובץ בפרויקט.
