# ה-Prompt של ה-AI (Groq)

ב-Make אין צומת קוד, ולכן **ה-AI מחזיר את דף ה-HTML המלא** (לא JSON).
זה גם מה שהתרגיל מבקש: "בעזרת AI מקבלים דף HTML מעוצב".

- **מודל:** `llama-3.3-70b-versatile` (חינמי ב-Groq), טמפרטורה 0.4.
- **גוף הבקשה המלא** (להעתקה ישירה למודול Groq ב-Make): הקובץ `groq-http-body.json`.
- לפני ה-Groq רץ מודול **Openverse** שמביא 3 כתובות תמונה אמיתיות; הן מוזרקות ל-prompt.

## מה ה-prompt מורה ל-AI
- להחזיר **רק** מסמך HTML שלם (בלי markdown / fences), בעברית RTL, לפי תבנית קבועה.
- למלא: שם העיר, מבוא, 3 התמונות שניתנו, ו**5 אטרקציות אמיתיות שנמצאות בתוך העיר**.
- לכל אטרקציה: שם בעברית, תיאור, וקואורדינטות אמיתיות.

## איך המפה לא נשברת (לקח חשוב)
בגרסה ראשונה המפה נבנתה ממערך JS שה-AI כתב (`const markers=[...]`). שמות עם
**גרשיים** (למשל `גן החיות התנ״כי`) שברו את ה-JavaScript והמפה נעלמה.

**הפתרון:** הקואורדינטות נשמרות כתכונות **`data-lat` / `data-lng`** על כל כרטיס
(`<article class='card' data-lat='...' data-lng='...'>`), וסקריפט ה-Leaflet קורא
אותן מה-DOM ואת שם האטרקציה מ-`textContent`. כך גרשיים בשם הם טקסט HTML רגיל
ולא יכולים לשבור שום קוד. זה המבנה שנמצא ב-`groq-http-body.json`.

## הודעת ה-User (עם המשתנים של Make)
```
City/country: {{1.City}}.
Use these 3 image URLs: {{2.data.results[1].url}}, {{2.data.results[2].url}}, {{2.data.results[3].url}}.
Note for improvement (leave as-is if empty): {{1.Note}}
```
