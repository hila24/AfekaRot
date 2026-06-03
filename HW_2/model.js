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
  const c = [0, 0, 0];
  dataset.forEach(d => c[d.label]++);
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
  log(`🚀 מתחיל אימון: ${cfg.epochs} אפוקים, ${dataset.length} דוגמאות, LR=${lr}`);

  for (let epoch = 1; epoch <= cfg.epochs; epoch++) {
    const order = dataset.slice();
    shuffle(order);
    let totalLoss = 0;
    for (const ex of order) {
      const input = toTensor(ex.pixels);
      totalLoss += net.trainStep(input, ex.label, lr);
    }
    const avgLoss = totalLoss / order.length;
    const acc = evaluateAccuracy();

    document.getElementById('epochNow').textContent = `${epoch} / ${cfg.epochs}`;
    document.getElementById('loss').textContent = avgLoss.toFixed(4);
    document.getElementById('accuracy').textContent = (acc * 100).toFixed(1) + '%';
    log(`אפוק ${epoch}: loss=${avgLoss.toFixed(4)}  accuracy=${(acc * 100).toFixed(1)}%`);

    await new Promise(r => setTimeout(r, 0));  // let the browser repaint
  }

  log('✅ האימון הסתיים');
  isTraining = false;
  setButtonsDisabled(false);
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
    localStorage.setItem(STORAGE_WEIGHTS, JSON.stringify(net.exportWeights()));
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
// Auto-load previously saved weights so a trained model "survives" a refresh.
if (localStorage.getItem(STORAGE_WEIGHTS)) {
  loadWeights();
  log('✨ נטען מודל מאומן ששמור מהפעם הקודמת');
} else {
  log('מוכן. צייר צורות, תייג אותן, ואז אמן את המודל. 🎨');
}
