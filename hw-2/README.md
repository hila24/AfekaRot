# מודל CNN בדפדפן — תרגיל 2

בניית מודל CNN בצד הלקוח (client-side) בשני דפי HTML עם JavaScript ו-CSS,
**ללא ספריות חיצוניות** — כל הרשת ממומשת מאפס בוונילה JS.

כתובת השרת (GitHub Pages):
https://hila24.github.io/AfekaRot/hw-2/

## איך מריצים
פתיחה ישירה של `index.html` בדפדפן (לחיצה כפולה), או הרצת שרת מקומי:
```bash
python3 -m http.server 8000   # ואז http://localhost:8000
```

## הקבצים
| קובץ | תפקיד |
|------|-------|
| `index.html` | **דף המודל** — קנבס לציור, פרמטרים, אימון, מדדים, ויזואליזציה |
| `concepts.html` | **דף המושגים** — מילון 40 מושגים (עברית+אנגלית) |
| `cnn.js` | מנוע ה-CNN מאפס: Conv2D, ReLU, MaxPool, Flatten, Dense, Softmax + Backprop |
| `model.js` | לוגיקת דף המודל: ציור, סט אימון, לולאת אימון, LocalStorage |
| `concepts.js` | 40 המושגים, וחיפוש/סינון |
| `style.css` | עיצוב משותף (RTL) |

## דף המודל — מה יש בו
- **ציור** של 3 צורות: עיגול / ריבוע / משולש, ותיוגן לסט אימון.
- **פרמטרים נשלטים:** מספר שכבות קונבולוציה, מספר פילטרים, גודל הפילטר,
  קצב למידה (Learning Rate) ומספר אפוקים (Epochs).
- **אימון** עם הצגת Loss ו-Accuracy בכל אפוק + יומן חי.
- **חיזוי** עם הסתברות לכל מחלקה.
- **ויזואליזציה:** הקלט 28×28 ומפות המאפיינים (Feature Maps) של שכבת הקונבולוציה.
- **שמירת משקלים ב-LocalStorage** (שמור / טען) וכפתור **איפוס**.

## הארכיטקטורה של הרשת
```
קלט 28×28×1
[ Conv → ReLU → MaxPool(2×2) ]  × מספר שכבות
Flatten
Dense → 3 פלטים
Softmax + Cross-Entropy
```
האימון משתמש ב-Stochastic Gradient Descent (אצווה בגודל 1) עם Backpropagation מלא.

## דף המושגים
40 מושגים מחולקים ל**מושגים בסיסיים** (CNN, Convolution, Filter, Feature Map,
Pooling, Neuron, ReLU ועוד) ו**מושגי אימון** (Forward Pass, Backpropagation,
Weights, Learning Rate, Loss, Epoch, Batch, Accuracy, Overfitting ועוד),
עם חיפוש וסינון לפי קטגוריה.
