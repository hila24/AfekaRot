# תוכן לשקפי ההגשה — תרגיל 3

> ההגשה על גבי שקף. מומלץ שקף אחד לכל סעיף למטה (אפשר לאחד).

## שקף 1 — כותרת
- **אוטומציה: מעיר → דף HTML מעוצב עם AI**
- מגישים: רועי דובין 322865320, הילה רוט 211602487
- כלים: Make.com · Airtable · Groq AI · GitHub · Gmail · Leaflet/OpenStreetMap · Openverse

## שקף 2 — תצוגת הדף שנוצר
- צילום מסך של `sample.html` (גלריית 3 תמונות + 5 כרטיסי אטרקציות + המפה עם הסמנים).
- קישור חי: https://hila24.github.io/AfekaRot/hw-3/sample.html

## שקף 3 — הקישור ב-Airtable
- צילום מסך של טבלת ה-Airtable עם שורה שאושרה:
  `City`, `Status = Approved`, `PageLink` (קישור לדף).

## שקף 4 — תצוגה כללית של שלבי הזרימה
הדביקו צילום מסך של ה-canvas ב-Make, או השתמשו בתרשים:
```
Airtable (Watch) → Filter(New/Rejected) → Openverse(תמונות)
→ Groq(AI מחזיר HTML) → GitHub(גיבוי בכל הרצה)
→ Airtable Update(PageLink, PendingApproval) → Email(הדף + הנחיה)
   אישור: Status=Approved  (הקישור כבר שמור)
   דחייה: Status=Rejected + Note → הטריגר רץ שוב ויוצר דף חדש
```

## שקף 5 — פירוט פרטני של השלבים
1. **טריגר Airtable** — שורה עם שם עיר (Status=New); גם דחייה (Status=Rejected) מפעילה.
2. **Filter** — ממשיך רק אם Status הוא New או Rejected.
3. **Openverse** — 3 תמונות אמיתיות של האזור (ללא מפתח).
4. **Groq AI** — מחזיר דף HTML מלא: מבוא + 5 אטרקציות + מפת Leaflet עם סמנים (קואורדינטות אמיתיות).
5. **GitHub** — קומיט של הדף בכל הרצה (גיבוי), והקישור הופך ל-URL ציבורי (GitHub Pages).
6. **Airtable Update** — שומר את PageLink ומסמן Status=PendingApproval.
7. **Email** — המשתמש מקבל את הדף + קישור, ומחליט ב-Airtable: Approved (שמור) או Rejected+Note (דף חדש).

## שקף 6 — הנחיית הבודק: היכן משלבים את ה-API Keys ⭐
| מפתח | מאיפה משיגים | לאיזה מודול ב-Make |
|------|--------------|--------------------|
| **Groq** (AI) | console.groq.com → API Keys | מודול HTTP(Groq) → Header: `Authorization: Bearer gsk_…` |
| **Airtable** PAT | airtable.com/create/tokens | מודולי Airtable (Watch + Update) → Connection |
| **GitHub** token | github.com/settings/tokens (scope: repo) | מודול GitHub → Connection |
| **Gmail** | App Password (myaccount.google.com/apppasswords) | מודול Email → Connection (SMTP) |
| Openverse / OpenStreetMap | — | ללא מפתח |

> הערה: המפתחות נכנסים רק לתוך Make (Connections של המודולים), לא לקובץ בפרויקט.

הפירוט המלא, צעד-אחר-צעד, נמצא ב-`make-build-guide.md` וב-`README.md`.
