/* ===================================================================
   model.js  —  UI logic for the model page:
   drawing on canvas, building the dataset, configuring & training the
   CNN, showing accuracy/loss, visualising feature maps, and saving the
   trained weights to LocalStorage.
   Depends on cnn.js (the from-scratch CNN engine).
   =================================================================== */

'use strict';

const INPUT_SIZE = 28;          // the network input is 28x28 grayscale
const NUM_CLASSES = 3;          // circle / square / triangle
const CLASS_NAMES = ['עיגול', 'ריבוע', 'משולש'];
const STORAGE_DATA = 'cnn_dataset_v1';
const STORAGE_WEIGHTS = 'cnn_weights_v1';

/* ---------- application state ---------- */
let net = null;                 // the CNN instance
let dataset = [];               // [{ pixels: Float32Array(784), label: 0|1|2 }]
let isTraining = false;
let modelTrainedCounts = null;  // [c0,c1,c2] the model was trained on (for display when dataset is empty)

/* =================================================================
   DRAWING CANVAS
   ================================================================= */
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
let drawing = false;

function clearCanvas() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
clearCanvas();

// Convert a mouse/touch event into canvas coordinates.
function pos(e) {
  const r = canvas.getBoundingClientRect();
  const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
  const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
  return { x: cx * (canvas.width / r.width), y: cy * (canvas.height / r.height) };
}

function startDraw(e) { drawing = true; ctx.beginPath(); draw(e); e.preventDefault(); }
function endDraw() { drawing = false; }
function draw(e) {
  if (!drawing) return;
  const p = pos(e);
  ctx.lineWidth = 24;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#fff';
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  e.preventDefault();
}
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', endDraw);
canvas.addEventListener('touchstart', startDraw);
canvas.addEventListener('touchmove', draw);
window.addEventListener('touchend', endDraw);

/* =================================================================
   IMAGE PREPROCESSING
   Downsample the 280x280 drawing to a 28x28 tensor of values in [0,1].
   ================================================================= */
function getPixels() {
  // ---- Normalise the drawing like MNIST does, so the network is robust
  //      to WHERE on the canvas and HOW BIG the shape was drawn. ----
  const W = canvas.width, H = canvas.height;
  const full = ctx.getImageData(0, 0, W, H).data;

  // 1) Find the bounding box of the drawn (non-black) pixels.
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (full[(y * W + x) * 4] > 40) {       // red channel > threshold = ink
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

  const pixels = new Float32Array(INPUT_SIZE * INPUT_SIZE);
  if (maxX < 0) return pixels;                 // nothing drawn -> blank

  // 2) Scale the shape so its longer side fits a 20px box, keeping aspect ratio,
  //    and centre it inside the 28x28 input (a 4px margin all around, as in MNIST).
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const scale = 20 / Math.max(bw, bh);
  const dw = Math.max(1, Math.round(bw * scale));
  const dh = Math.max(1, Math.round(bh * scale));
  const ox = Math.floor((INPUT_SIZE - dw) / 2);
  const oy = Math.floor((INPUT_SIZE - dh) / 2);

  const tmp = document.createElement('canvas');
  tmp.width = INPUT_SIZE; tmp.height = INPUT_SIZE;
  const tctx = tmp.getContext('2d');
  tctx.fillStyle = '#000';
  tctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  // copy just the cropped shape, scaled and centred
  tctx.drawImage(canvas, minX, minY, bw, bh, ox, oy, dw, dh);

  const img = tctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
    pixels[i] = img[i * 4] / 255;              // red channel -> 0..1
  }
  return pixels;
}

// Turn the flat 784-vector into the [1][28][28] tensor the CNN expects.
function toTensor(pixels) {
  const t = [[]];
  for (let i = 0; i < INPUT_SIZE; i++) {
    t[0][i] = new Float32Array(INPUT_SIZE);
    for (let j = 0; j < INPUT_SIZE; j++) t[0][i][j] = pixels[i * INPUT_SIZE + j];
  }
  return t;
}

/* =================================================================
   DATA AUGMENTATION
   Produce a randomly transformed copy of a 28x28 image — rotation,
   scale and small shift — so one drawing teaches the network many
   orientations/sizes. This makes the model far more robust (e.g. it
   learns that a triangle is a triangle in ANY rotation).
   Uses inverse mapping with nearest-neighbour sampling. Plain JS.
   ================================================================= */
function augmentPixels(src) {
  const N = INPUT_SIZE;
  const out = new Float32Array(N * N);
  const cx = (N - 1) / 2, cy = (N - 1) / 2;

  const angle = (Math.random() * 2 - 1) * (Math.PI / 2);  // rotation: ±90°
  const scale = 0.8 + Math.random() * 0.4;                // scale: 0.8x .. 1.2x
  const dx = (Math.random() * 2 - 1) * 3;                 // shift: ±3 px
  const dy = (Math.random() * 2 - 1) * 3;
  const cos = Math.cos(angle), sin = Math.sin(angle);

  // For each output pixel, find where it came from in the source (inverse map).
  for (let oy = 0; oy < N; oy++) {
    for (let ox = 0; ox < N; ox++) {
      let tx = (ox - cx - dx) / scale;
      let ty = (oy - cy - dy) / scale;
      const ix = Math.round(cx + tx * cos + ty * sin);
      const iy = Math.round(cy - tx * sin + ty * cos);
      if (ix >= 0 && ix < N && iy >= 0 && iy < N) out[oy * N + ox] = src[iy * N + ix];
    }
  }
  return out;
}

function isCanvasEmpty(pixels) {
  let sum = 0;
  for (let i = 0; i < pixels.length; i++) sum += pixels[i];
  return sum < 1;   // basically blank
}

/* =================================================================
   DATASET MANAGEMENT
   ================================================================= */
function addExample(label) {
  const pixels = getPixels();
  if (isCanvasEmpty(pixels)) { log('⚠️ הציור ריק — צייר משהו לפני התיוג'); return; }
  dataset.push({ pixels: Array.from(pixels), label });
  saveDataset();
  updateCounts();
  log(`➕ נוספה דוגמה: ${CLASS_NAMES[label]} (סה"כ ${dataset.length})`);
  clearCanvas();
}

function updateCounts() {
  // If a trained model is loaded, show what IT was trained on (stable — adding
  // single examples won't change it; only re-training does).
  // Otherwise (building a fresh dataset, no trained model yet) show the live counts.
  let c;
  if (modelTrainedCounts) {
    c = modelTrainedCounts;
  } else {
    c = [0, 0, 0];
    dataset.forEach(d => c[d.label]++);
  }
  document.getElementById('count0').textContent = c[0];
  document.getElementById('count1').textContent = c[1];
  document.getElementById('count2').textContent = c[2];
}

function saveDataset() {
  try { localStorage.setItem(STORAGE_DATA, JSON.stringify(dataset)); } catch (e) {}
}
function loadDataset() {
  try {
    const raw = localStorage.getItem(STORAGE_DATA);
    if (raw) { dataset = JSON.parse(raw); updateCounts(); }
  } catch (e) {}
}

/* =================================================================
   MODEL BUILD / CONFIG
   ================================================================= */
function readConfig() {
  return {
    inputSize:    INPUT_SIZE,
    numClasses:   NUM_CLASSES,
    convLayers:   +document.getElementById('convLayers').value,
    numFilters:   +document.getElementById('numFilters').value,
    filterSize:   +document.getElementById('filterSize').value,
    learningRate: +document.getElementById('learningRate').value,
    epochs:       +document.getElementById('epochs').value,
  };
}

function buildModel() {
  const cfg = readConfig();
  net = new CNN(cfg);
  modelTrainedCounts = null;   // a freshly built model is untrained
  updateCounts();
  log(`🛠️ נבנה מודל: ${cfg.convLayers} שכבות קונבולוציה, ${cfg.numFilters} פילטרים, ` +
      `פילטר ${cfg.filterSize}×${cfg.filterSize}, וקטור שטוח באורך ${net.flattenDim}`);
  document.getElementById('accuracy').textContent = '—';
  document.getElementById('loss').textContent = '—';
}

/* =================================================================
   TRAINING LOOP
   One "epoch" = one shuffled pass over the whole dataset (online SGD,
   batch size 1). We yield to the browser between epochs so the UI
   stays responsive and the log updates live.
   ================================================================= */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function train() {
  if (isTraining) return;
  if (dataset.length < 3) { log('⚠️ צריך לפחות 3 דוגמאות (רצוי כמה מכל צורה)'); return; }
  if (!net) buildModel();

  isTraining = true;
  setButtonsDisabled(true);
  const cfg = readConfig();
  const lr = cfg.learningRate;
  const AUG_PER = 4;   // each example -> 1 original + 3 randomly augmented copies per epoch
  log(`🚀 מתחיל אימון: ${cfg.epochs} אפוקים, ${dataset.length} דוגמאות ` +
      `(×${AUG_PER} עם הגדלת נתונים/Augmentation), LR=${lr}`);

  for (let epoch = 1; epoch <= cfg.epochs; epoch++) {
    // Build this epoch's samples: the clean drawing + several random variations.
    const samples = [];
    for (const ex of dataset) {
      samples.push({ pixels: ex.pixels, label: ex.label });             // original
      for (let k = 1; k < AUG_PER; k++)
        samples.push({ pixels: augmentPixels(ex.pixels), label: ex.label }); // augmented
    }
    shuffle(samples);

    let totalLoss = 0;
    for (const s of samples) {
      totalLoss += net.trainStep(toTensor(s.pixels), s.label, lr);
    }
    const avgLoss = totalLoss / samples.length;
    const acc = evaluateAccuracy();   // accuracy is measured on the clean originals

    document.getElementById('epochNow').textContent = `${epoch} / ${cfg.epochs}`;
    document.getElementById('loss').textContent = avgLoss.toFixed(4);
    document.getElementById('accuracy').textContent = (acc * 100).toFixed(1) + '%';
    log(`אפוק ${epoch}: loss=${avgLoss.toFixed(4)}  accuracy=${(acc * 100).toFixed(1)}%`);

    await new Promise(r => setTimeout(r, 0));  // let the browser repaint
  }

  log('✅ האימון הסתיים');
  // the model is now trained on the current dataset — record & show those counts
  modelTrainedCounts = [0, 0, 0];
  dataset.forEach(d => modelTrainedCounts[d.label]++);
  updateCounts();
  saveWeights();              // keep a copy in LocalStorage (survives refresh on this browser)
  downloadWeightsFile();      // download pretrained-weights.js so the model can ship with the site
  isTraining = false;
  setButtonsDisabled(false);
}

// Download the trained weights as a file (pretrained-weights.js) that the
// page can load on startup. Put this file in the project folder and commit it,
// and the live site will open already-trained.
function downloadWeightsFile() {
  if (!net) return;
  const out = net.exportWeights();
  // also remember how many examples of each shape the model was trained on,
  // so the counts can be shown even on a fresh browser / the live site.
  const counts = [0, 0, 0];
  dataset.forEach(d => counts[d.label]++);
  out.trainedCounts = counts;
  const content = 'window.PRETRAINED_WEIGHTS = ' + JSON.stringify(out) + ';';
  const blob = new Blob([content], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pretrained-weights.js';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  log('📤 הורד הקובץ pretrained-weights.js — שימי אותו בתיקיית hw-2 כדי שהאתר ייטען מאומן');
}

// Load weights bundled in the project (from window.PRETRAINED_WEIGHTS, set by
// pretrained-weights.js). Works on the live site and via file:// alike.
function loadBundledWeights() {
  try {
    const data = window.PRETRAINED_WEIGHTS;
    if (!data) return false;
    net = new CNN(data.config);
    net.importWeights(data);
    syncConfigToUI(data.config);
    if (data.trainedCounts) modelTrainedCounts = data.trainedCounts;
    updateCounts();   // show the counts the model was trained on
    log('✨ נטען מודל מאומן מהקובץ pretrained-weights.js');
    return true;
  } catch (e) { log('❌ טעינת המודל מהקובץ נכשלה: ' + e.message); return false; }
}

// Accuracy over the whole training set.
function evaluateAccuracy() {
  let correct = 0;
  for (const ex of dataset) {
    const probs = net.predict(toTensor(ex.pixels));
    let best = 0;
    for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
    if (best === ex.label) correct++;
  }
  return correct / dataset.length;
}

/* =================================================================
   PREDICTION + VISUALIZATION
   ================================================================= */
function predict() {
  if (!net) { log('⚠️ בנה ואמן מודל קודם'); return; }
  const pixels = getPixels();
  if (isCanvasEmpty(pixels)) { log('⚠️ הציור ריק'); return; }
  const input = toTensor(pixels);
  const probs = net.predict(input);

  for (let i = 0; i < NUM_CLASSES; i++) {
    const pct = (probs[i] * 100);
    document.getElementById('prob' + i + 'Bar').style.width = pct + '%';
    document.getElementById('prob' + i).textContent = pct.toFixed(1) + '%';
  }
  let best = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;

  // show the winning shape prominently at the top of the page
  const emojis = ['⭕', '⬜', '🔺'];
  document.getElementById('topShape').textContent =
    `${emojis[best]} ${CLASS_NAMES[best]} — ${(probs[best] * 100).toFixed(1)}%`;
  log(`🔮 חיזוי: ${CLASS_NAMES[best]} (${(probs[best] * 100).toFixed(1)}%)`);

  drawInputViz(pixels);
  drawFeatureMaps(input);
}

function drawInputViz(pixels) {
  const c = document.getElementById('inputViz');
  const cx = c.getContext('2d');
  const img = cx.createImageData(INPUT_SIZE, INPUT_SIZE);
  for (let i = 0; i < pixels.length; i++) {
    const v = Math.round(pixels[i] * 255);
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  cx.putImageData(img, 0, 0);
}

function drawFeatureMaps(input) {
  const maps = net.getFirstConvMaps(input);   // [numFilters][H][W]
  const container = document.getElementById('featureMaps');
  container.innerHTML = '';

  maps.forEach((map, idx) => {
    const H = map.length, W = map[0].length;
    // find max value to scale the brightness
    let max = 1e-6;
    for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) if (map[i][j] > max) max = map[i][j];

    const fig = document.createElement('figure');
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.className = 'viz-canvas';
    cv.style.width = '56px'; cv.style.height = '56px';
    const cx = cv.getContext('2d');
    const img = cx.createImageData(W, H);
    for (let i = 0; i < H; i++)
      for (let j = 0; j < W; j++) {
        const v = Math.round((map[i][j] / max) * 255);
        const k = (i * W + j) * 4;
        img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v; img.data[k + 3] = 255;
      }
    cx.putImageData(img, 0, 0);
    const cap = document.createElement('figcaption');
    cap.textContent = 'פילטר ' + (idx + 1);
    fig.appendChild(cv); fig.appendChild(cap);
    container.appendChild(fig);
  });
}

/* =================================================================
   WEIGHT PERSISTENCE (LocalStorage)
   ================================================================= */
function saveWeights() {
  if (!net) { log('⚠️ אין מודל לשמירה'); return; }
  try {
    const out = net.exportWeights();
    const counts = [0, 0, 0];
    dataset.forEach(d => counts[d.label]++);
    out.trainedCounts = counts;
    localStorage.setItem(STORAGE_WEIGHTS, JSON.stringify(out));
    log('💾 המשקלים נשמרו ב-LocalStorage');
  } catch (e) { log('❌ שמירה נכשלה: ' + e.message); }
}
function loadWeights() {
  try {
    const raw = localStorage.getItem(STORAGE_WEIGHTS);
    if (!raw) { log('⚠️ לא נמצאו משקלים שמורים'); return; }
    const data = JSON.parse(raw);
    net = new CNN(data.config);
    net.importWeights(data);
    syncConfigToUI(data.config);
    if (data.trainedCounts) modelTrainedCounts = data.trainedCounts;
    updateCounts();
    log('📂 המשקלים נטענו מ-LocalStorage');
    document.getElementById('accuracy').textContent = (evaluateAccuracy() * 100).toFixed(1) + '%';
  } catch (e) { log('❌ טעינה נכשלה: ' + e.message); }
}

function syncConfigToUI(cfg) {
  document.getElementById('convLayers').value = cfg.convLayers;
  document.getElementById('numFilters').value = cfg.numFilters;
  document.getElementById('filterSize').value = cfg.filterSize;
  document.getElementById('learningRate').value = cfg.learningRate;
  document.getElementById('epochs').value = cfg.epochs;
  refreshOutputs();
}

/* =================================================================
   RESET
   ================================================================= */
function reset() {
  if (!confirm('לאפס את המודל והמשקלים? (סט הדוגמאות יישאר)')) return;
  localStorage.removeItem(STORAGE_WEIGHTS);
  buildModel();
  ['prob0', 'prob1', 'prob2'].forEach(id => document.getElementById(id).textContent = '0%');
  ['prob0Bar', 'prob1Bar', 'prob2Bar'].forEach(id => document.getElementById(id).style.width = '0%');
  document.getElementById('accuracy').textContent = '—';
  document.getElementById('loss').textContent = '—';
  document.getElementById('epochNow').textContent = '—';
  document.getElementById('featureMaps').innerHTML = '';
  log('♻️ המודל אופס');
}

/* =================================================================
   UI HELPERS + EVENT WIRING
   ================================================================= */
function log(msg) {
  const el = document.getElementById('log');
  const time = new Date().toLocaleTimeString('he-IL');
  el.innerHTML += `[${time}] ${msg}\n`;
  el.scrollTop = el.scrollHeight;
}

function setButtonsDisabled(state) {
  ['trainBtn', 'buildBtn', 'resetBtn', 'predictBtn'].forEach(id => document.getElementById(id).disabled = state);
}

// Keep the <output> next to each slider in sync.
function refreshOutputs() {
  document.getElementById('convLayersVal').textContent = document.getElementById('convLayers').value;
  document.getElementById('numFiltersVal').textContent = document.getElementById('numFilters').value;
  document.getElementById('learningRateVal').textContent = (+document.getElementById('learningRate').value).toFixed(3);
  document.getElementById('epochsVal').textContent = document.getElementById('epochs').value;
}

// Label buttons (data-label = 0/1/2)
document.querySelectorAll('button[data-label]').forEach(btn =>
  btn.addEventListener('click', () => addExample(+btn.dataset.label)));

document.getElementById('clearCanvas').addEventListener('click', clearCanvas);
document.getElementById('predictBtn').addEventListener('click', predict);
document.getElementById('clearData').addEventListener('click', () => {
  if (!confirm('למחוק את כל הדוגמאות?')) return;
  dataset = []; saveDataset(); updateCounts(); log('🗑️ סט הדוגמאות נמחק');
});
document.getElementById('buildBtn').addEventListener('click', buildModel);
document.getElementById('trainBtn').addEventListener('click', train);
document.getElementById('resetBtn').addEventListener('click', reset);
document.getElementById('saveBtn').addEventListener('click', saveWeights);
document.getElementById('loadBtn').addEventListener('click', loadWeights);

['convLayers', 'numFilters', 'learningRate', 'epochs'].forEach(id =>
  document.getElementById(id).addEventListener('input', refreshOutputs));

/* ---------- startup ---------- */
loadDataset();
refreshOutputs();
buildModel();
// Seed the trained-counts from the bundled file as a fallback, so the numbers
// show even if we end up loading weights from LocalStorage with an empty dataset.
if (window.PRETRAINED_WEIGHTS && window.PRETRAINED_WEIGHTS.trainedCounts) {
  modelTrainedCounts = window.PRETRAINED_WEIGHTS.trainedCounts;
}
// On open, load a trained model if one is available:
//   1) this browser's own LocalStorage (your latest training), else
//   2) the bundled pretrained-weights.js shipped with the site.
if (localStorage.getItem(STORAGE_WEIGHTS)) {
  loadWeights();
  log('✨ נטען מודל מאומן ששמור מהפעם הקודמת (LocalStorage)');
} else if (loadBundledWeights()) {
  // loaded from the file
} else {
  log('מוכן. צייר צורות, תייג אותן, ואז אמן את המודל. 🎨');
}
updateCounts();   // ensure the counts reflect dataset, or the trained model
