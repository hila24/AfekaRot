/**
 * build-html.js — לוגיקת בניית הדף המעוצב.
 *
 * זהו בדיוק הקוד שרץ בתוך ה-Code node "Build HTML" ב-n8n.
 * הוא מקבל את ה-JSON מ-Groq (עיר, מבוא, רשימת אטרקציות עם קואורדינטות)
 * ואת 3 כתובות התמונות מ-Openverse, ומחזיר מחרוזת HTML שלמה ועצמאית.
 *
 * המפה: Leaflet + אריחי OpenStreetMap (חינמי, ללא מפתח API),
 * עם סמן (marker) לכל אטרקציה לפי נקודות הציון (lat/lng) שה-AI החזיר.
 */

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPage(data, images) {
  const city = escapeHtml(data.city || '');
  const country = escapeHtml(data.country || '');
  const intro = escapeHtml(data.intro || '');
  const attractions = Array.isArray(data.attractions) ? data.attractions : [];

  // מרכז המפה = ממוצע הקואורדינטות של האטרקציות (נפילה אחורה לתל אביב).
  const pts = attractions.filter(a => typeof a.lat === 'number' && typeof a.lng === 'number');
  const centerLat = pts.length ? pts.reduce((s, a) => s + a.lat, 0) / pts.length : 32.0853;
  const centerLng = pts.length ? pts.reduce((s, a) => s + a.lng, 0) / pts.length : 34.7818;

  const imgs = (images || []).slice(0, 3);
  const gallery = imgs.map((url, i) =>
    `      <img src="${escapeHtml(url)}" alt="${city} ${i + 1}" loading="lazy">`
  ).join('\n');

  const cards = attractions.map((a, i) => `
      <article class="card">
        <span class="num">${i + 1}</span>
        <h3>${escapeHtml(a.name)}</h3>
        <p>${escapeHtml(a.description)}</p>
        <small>📍 ${Number(a.lat).toFixed(4)}, ${Number(a.lng).toFixed(4)}</small>
      </article>`).join('\n');

  // נתוני הסמנים מוזרקים כ-JSON בטוח לתוך הסקריפט.
  const markers = JSON.stringify(attractions.map(a => ({
    name: a.name, lat: a.lat, lng: a.lng
  })));

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${city}${country ? ' · ' + country : ''} — מדריך אטרקציות</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    :root { --bg:#0f172a; --card:#1e293b; --accent:#38bdf8; --text:#e2e8f0; }
    * { box-sizing: border-box; }
    body { margin:0; font-family:"Segoe UI",Arial,sans-serif; background:var(--bg); color:var(--text); }
    header { padding:48px 20px; text-align:center; background:linear-gradient(135deg,#0ea5e9,#6366f1); color:#fff; }
    header h1 { margin:0; font-size:2.6rem; }
    header p { max-width:760px; margin:16px auto 0; line-height:1.7; opacity:.95; }
    .wrap { max-width:1000px; margin:0 auto; padding:24px 20px 60px; }
    h2 { color:var(--accent); border-bottom:2px solid #334155; padding-bottom:8px; }
    .gallery { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
    .gallery img { width:100%; height:200px; object-fit:cover; border-radius:12px; }
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:16px; }
    .card { background:var(--card); border-radius:14px; padding:18px; position:relative; }
    .card .num { position:absolute; inset-inline-start:14px; top:-14px; width:30px; height:30px;
      background:var(--accent); color:#04293a; border-radius:50%; display:grid; place-items:center; font-weight:700; }
    .card h3 { margin:6px 0 8px; }
    .card p { line-height:1.6; opacity:.92; }
    .card small { color:var(--accent); }
    #map { height:420px; border-radius:14px; margin-top:8px; }
    footer { text-align:center; padding:24px; opacity:.6; font-size:.85rem; }
  </style>
</head>
<body>
  <header>
    <h1>${city}${country ? ' · ' + country : ''}</h1>
    <p>${intro}</p>
  </header>
  <div class="wrap">
    <h2>תמונות מהאזור</h2>
    <div class="gallery">
${gallery}
    </div>

    <h2>אטרקציות מומלצות</h2>
    <div class="cards">
${cards}
    </div>

    <h2>מפה ונקודות ציון</h2>
    <div id="map"></div>
  </div>
  <footer>נוצר אוטומטית באמצעות n8n + Groq AI · מפה: OpenStreetMap</footer>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const markers = ${markers};
    const map = L.map('map').setView([${centerLat}, ${centerLng}], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    const group = [];
    markers.forEach(m => {
      if (typeof m.lat === 'number' && typeof m.lng === 'number') {
        const mk = L.marker([m.lat, m.lng]).addTo(map).bindPopup(m.name);
        group.push(mk);
      }
    });
    if (group.length) map.fitBounds(L.featureGroup(group).getBounds().pad(0.2));
  </script>
</body>
</html>`;
}

// ייצוא לשימוש מקומי/בדיקות; ב-n8n הקוד מודבק ישירות ל-Code node.
if (typeof module !== 'undefined') module.exports = { buildPage, escapeHtml };
