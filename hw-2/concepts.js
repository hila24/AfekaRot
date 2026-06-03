/* ===================================================================
   concepts.js  —  40 CNN / machine-learning concepts (Hebrew + English),
   shown as a searchable/filterable glossary.
   Plain JavaScript, no libraries.
   =================================================================== */

'use strict';

/* Each concept: he (Hebrew term), en (English term),
   def (Hebrew definition), cat ('basic' | 'training'). */
const CONCEPTS = [
  /* ---------------- מושגים בסיסיים (Basic) ---------------- */
  { he: 'רשת קונבולוציה', en: 'CNN (Convolutional Neural Network)', cat: 'basic',
    def: 'רשת נוירונים שמיועדת לעיבוד תמונות, ומשתמשת בשכבות קונבולוציה כדי לזהות תבניות מקומיות.' },
  { he: 'קונבולוציה', en: 'Convolution', cat: 'basic',
    def: 'פעולה שבה פילטר "מחליק" על פני התמונה ומחשב מכפלה סקלרית בכל מיקום, כדי להדגיש מאפיינים.' },
  { he: 'פילטר / גרעין', en: 'Filter / Kernel', cat: 'basic',
    def: 'מטריצת משקלים קטנה (למשל 3×3) שלומדת לזהות מאפיין מסוים כמו קצה, פינה או צבע.' },
  { he: 'מפת מאפיינים', en: 'Feature Map', cat: 'basic',
    def: 'הפלט של שכבת קונבולוציה — מפה שמציינת היכן בתמונה נמצא המאפיין שהפילטר מזהה.' },
  { he: 'איגום / דגימה', en: 'Pooling', cat: 'basic',
    def: 'פעולה שמקטינה את מפת המאפיינים ומשמרת את המידע החשוב, כדי להפחית חישוב ורגישות למיקום.' },
  { he: 'איגום מקסימום', en: 'Max Pooling', cat: 'basic',
    def: 'סוג של pooling שבוחר את הערך המקסימלי בכל חלון (למשל 2×2), כלומר את האות החזק ביותר.' },
  { he: 'נוירון', en: 'Neuron', cat: 'basic',
    def: 'יחידת חישוב בסיסית שמקבלת קלטים, מכפילה במשקלים, מסכמת ומפעילה פונקציית אקטיבציה.' },
  { he: 'רֵלוּ', en: 'ReLU (Rectified Linear Unit)', cat: 'basic',
    def: 'פונקציית אקטיבציה שמחזירה 0 לערכים שליליים ואת הערך עצמו לערכים חיוביים: max(0, x).' },
  { he: 'פונקציית אקטיבציה', en: 'Activation Function', cat: 'basic',
    def: 'פונקציה לא-לינארית שמופעלת על פלט הנוירון ומאפשרת לרשת ללמוד קשרים מורכבים.' },
  { he: 'ערוץ', en: 'Channel', cat: 'basic',
    def: 'ממד עומק של תמונה או מפת מאפיינים — למשל תמונת RGB היא בעלת 3 ערוצים.' },
  { he: 'צעד', en: 'Stride', cat: 'basic',
    def: 'גודל הקפיצה של הפילטר בכל מעבר על התמונה. צעד גדול יותר מקטין את הפלט.' },
  { he: 'ריפוד', en: 'Padding', cat: 'basic',
    def: 'הוספת אפסים בשולי התמונה כדי לשמור על הגודל לאחר הקונבולוציה ולא לאבד מידע בקצוות.' },
  { he: 'שיטוח', en: 'Flatten', cat: 'basic',
    def: 'הפיכת מפת מאפיינים תלת-ממדית לוקטור חד-ממדי, לקראת השכבה המלאה (Dense).' },
  { he: 'שכבה מלאה', en: 'Fully Connected / Dense Layer', cat: 'basic',
    def: 'שכבה שבה כל נוירון מחובר לכל הנוירונים בשכבה הקודמת — מבצעת את הסיווג הסופי.' },
  { he: 'סופטמקס', en: 'Softmax', cat: 'basic',
    def: 'פונקציה שהופכת ציונים גולמיים להסתברויות שסכומן 1, לבחירת המחלקה הסבירה ביותר.' },
  { he: 'הטיה', en: 'Bias', cat: 'basic',
    def: 'פרמטר נוסף שמתווסף לסכום המשוקלל ומאפשר להזיז את פונקציית האקטיבציה.' },
  { he: 'טנזור', en: 'Tensor', cat: 'basic',
    def: 'מערך רב-ממדי של מספרים — הייצוג של נתונים ומשקלים ברשת (סקלר, וקטור, מטריצה ומעלה).' },
  { he: 'שדה קליטה', en: 'Receptive Field', cat: 'basic',
    def: 'אזור בתמונת הקלט שמשפיע על נוירון מסוים. ככל שמעמיקים ברשת, השדה גדל.' },
  { he: 'שכבת קלט', en: 'Input Layer', cat: 'basic',
    def: 'השכבה הראשונה שמקבלת את הנתונים הגולמיים (למשל תמונה 28×28) ומעבירה אותם הלאה.' },
  { he: 'שכבת פלט', en: 'Output Layer', cat: 'basic',
    def: 'השכבה האחרונה שמפיקה את התוצאה — למשל הסתברות לכל מחלקה בבעיית סיווג.' },

  /* ---------------- מושגי אימון (Training) ---------------- */
  { he: 'מעבר קדימה', en: 'Forward Pass', cat: 'training',
    def: 'הזרמת הקלט דרך כל שכבות הרשת מהקלט עד הפלט, כדי לחשב את החיזוי.' },
  { he: 'התפשטות לאחור', en: 'Backpropagation', cat: 'training',
    def: 'אלגוריתם שמחשב את הגרדיאנט של ההפסד לפי כל משקל, מהפלט לאחור, לצורך עדכון.' },
  { he: 'משקלים', en: 'Weights', cat: 'training',
    def: 'הפרמטרים הנלמדים של הרשת — הם נכפלים בקלטים וקובעים את חשיבות כל חיבור.' },
  { he: 'קצב למידה', en: 'Learning Rate', cat: 'training',
    def: 'גודל הצעד שבו מעדכנים את המשקלים. גבוה מדי — לא יתכנס; נמוך מדי — איטי מאוד.' },
  { he: 'הפסד', en: 'Loss', cat: 'training',
    def: 'מדד לכמה החיזוי רחוק מהתשובה הנכונה. מטרת האימון היא למזער אותו.' },
  { he: 'אנטרופיה צולבת', en: 'Cross-Entropy', cat: 'training',
    def: 'פונקציית הפסד נפוצה לסיווג, שמודדת את הפער בין התפלגות החיזוי לתווית האמיתית.' },
  { he: 'אפוק', en: 'Epoch', cat: 'training',
    def: 'מעבר מלא אחד של האלגוריתם על כל דוגמאות סט האימון.' },
  { he: 'אצווה', en: 'Batch', cat: 'training',
    def: 'קבוצת דוגמאות שעוברות יחד ברשת לפני עדכון המשקלים — מאזנת בין יציבות למהירות.' },
  { he: 'מיני-אצווה', en: 'Mini-Batch', cat: 'training',
    def: 'אצווה קטנה (למשל 32 דוגמאות) — הגישה הנפוצה ביותר לאימון בפועל.' },
  { he: 'דיוק', en: 'Accuracy', cat: 'training',
    def: 'אחוז הדוגמאות שהרשת סיווגה נכון מתוך כלל הדוגמאות.' },
  { he: 'התאמת יתר', en: 'Overfitting', cat: 'training',
    def: 'מצב שבו הרשת "שיננה" את סט האימון אך מתפקדת גרוע על נתונים חדשים.' },
  { he: 'התאמת חסר', en: 'Underfitting', cat: 'training',
    def: 'מצב שבו הרשת פשוטה מדי או לא אומנה מספיק, ולכן אינה לומדת אפילו את סט האימון.' },
  { he: 'ירידת גרדיאנט', en: 'Gradient Descent', cat: 'training',
    def: 'אלגוריתם אופטימיזציה שמעדכן משקלים בכיוון ההפוך לגרדיאנט כדי למזער את ההפסד.' },
  { he: 'גרדיאנט', en: 'Gradient', cat: 'training',
    def: 'וקטור הנגזרות החלקיות של ההפסד — מצביע על כיוון העלייה התלולה ביותר.' },
  { he: 'מאמן / אופטימייזר', en: 'Optimizer', cat: 'training',
    def: 'האלגוריתם שמעדכן את המשקלים על סמך הגרדיאנטים (למשל SGD, Adam).' },
  { he: 'סט אימון', en: 'Training Set', cat: 'training',
    def: 'אוסף הדוגמאות שעליהן הרשת לומדת ומעדכנת את המשקלים שלה.' },
  { he: 'סט בדיקה', en: 'Test Set', cat: 'training',
    def: 'דוגמאות שלא נראו באימון, המשמשות להערכת הביצועים האמיתיים של המודל.' },
  { he: 'נשירה', en: 'Dropout', cat: 'training',
    def: 'טכניקה שמכבה אקראית חלק מהנוירונים באימון, כדי למנוע התאמת יתר.' },
  { he: 'היפר-פרמטר', en: 'Hyperparameter', cat: 'training',
    def: 'פרמטר שנקבע מראש ולא נלמד — למשל קצב הלמידה, מספר השכבות ומספר הפילטרים.' },
  { he: 'קידוד וֶן-הוט', en: 'One-Hot Encoding', cat: 'training',
    def: 'ייצוג של תווית כווקטור עם 1 במיקום המחלקה ו-0 בכל השאר.' },
  { he: 'נרמול', en: 'Normalization', cat: 'training',
    def: 'הבאת נתוני הקלט לסקלה/צורה אחידה לפני האימון — למשל מירכוז וקנה-מידה אחיד של הציור — כדי שהרשת תתמקד בצורה ולא במיקום או בגודל, וכדי לייצב את הלמידה.' },
];

/* =================================================================
   GLOSSARY RENDERING + SEARCH + FILTER
   ================================================================= */
const grid = document.getElementById('conceptGrid');
let currentCat = 'all';
let currentSearch = '';

function catLabel(cat) { return cat === 'basic' ? 'בסיסי' : 'אימון'; }

function renderConcepts() {
  const q = currentSearch.trim().toLowerCase();
  grid.innerHTML = '';
  let shown = 0;
  CONCEPTS.forEach(c => {
    if (currentCat !== 'all' && c.cat !== currentCat) return;
    if (q && !(c.he.toLowerCase().includes(q) ||
               c.en.toLowerCase().includes(q) ||
               c.def.toLowerCase().includes(q))) return;
    shown++;
    const card = document.createElement('div');
    card.className = 'concept-card';
    card.innerHTML =
      `<span class="badge tag">${catLabel(c.cat)}</span>` +
      `<div class="term-he">${c.he}</div>` +
      `<div class="term-en">${c.en}</div>` +
      `<div class="def">${c.def}</div>`;
    grid.appendChild(card);
  });
  if (shown === 0) grid.innerHTML = '<p class="hint">לא נמצאו מושגים תואמים.</p>';
}

document.getElementById('search').addEventListener('input', e => {
  currentSearch = e.target.value; renderConcepts();
});
document.querySelectorAll('button[data-cat]').forEach(btn =>
  btn.addEventListener('click', () => { currentCat = btn.dataset.cat; renderConcepts(); }));

renderConcepts();
