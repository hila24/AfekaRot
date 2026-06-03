/* ===================================================================
   cnn.js  —  A small Convolutional Neural Network written from scratch
              in plain JavaScript (no external libraries).

   The network is a stack of "layers". Every layer implements:
       forward(input)            -> output           (saves what it needs)
       backward(gradOutput, lr)  -> gradInput        (and updates its own weights)

   Tensors are simple nested arrays:
       images / feature maps : tensor[channel][row][col]   (3-D)
       vectors               : plain 1-D arrays

   Architecture built by the UI (see model.js):
       Input 28x28x1
       [ Conv -> ReLU -> MaxPool ]  x  (number of conv layers)
       Flatten
       Dense (-> 3 outputs)
       Softmax + Cross-Entropy loss
   =================================================================== */

/* ---------- small math / tensor helpers ---------- */

// Random number in a range, used to initialise weights.
function rand(min, max) { return Math.random() * (max - min) + min; }

// Create a 3-D tensor [C][H][W] filled with 0.
function zeros3(c, h, w) {
  const t = new Array(c);
  for (let i = 0; i < c; i++) {
    t[i] = new Array(h);
    for (let j = 0; j < h; j++) t[i][j] = new Float32Array(w);
  }
  return t;
}

/* ===================================================================
   Conv2D  —  a convolution layer.
   weights shape: [numFilters][inChannels][fSize][fSize]
   bias    shape: [numFilters]
   Uses "valid" convolution (no padding), stride 1.
   =================================================================== */
class Conv2D {
  constructor(inChannels, numFilters, fSize) {
    this.inChannels = inChannels;
    this.numFilters = numFilters;
    this.fSize = fSize;

    // He-style initialisation: keeps activations from exploding/vanishing.
    const scale = Math.sqrt(2 / (inChannels * fSize * fSize));
    this.W = [];
    for (let f = 0; f < numFilters; f++) {
      const filt = zeros3(inChannels, fSize, fSize);
      for (let c = 0; c < inChannels; c++)
        for (let i = 0; i < fSize; i++)
          for (let j = 0; j < fSize; j++)
            filt[c][i][j] = rand(-1, 1) * scale;
      this.W.push(filt);
    }
    this.b = new Float32Array(numFilters); // biases start at 0
  }

  forward(input) {
    this.input = input;                       // remember for backprop
    const C = this.inChannels, F = this.fSize;
    const inH = input[0].length, inW = input[0][0].length;
    const outH = inH - F + 1, outW = inW - F + 1;
    const out = zeros3(this.numFilters, outH, outW);

    for (let f = 0; f < this.numFilters; f++) {
      const filt = this.W[f];
      for (let oi = 0; oi < outH; oi++) {
        for (let oj = 0; oj < outW; oj++) {
          let sum = this.b[f];
          // dot product of the filter with the current input patch
          for (let c = 0; c < C; c++)
            for (let fi = 0; fi < F; fi++)
              for (let fj = 0; fj < F; fj++)
                sum += input[c][oi + fi][oj + fj] * filt[c][fi][fj];
          out[f][oi][oj] = sum;
        }
      }
    }
    this.outShape = [this.numFilters, outH, outW];
    return out;
  }

  backward(dOut, lr) {
    const C = this.inChannels, F = this.fSize;
    const inH = this.input[0].length, inW = this.input[0][0].length;
    const outH = dOut[0].length, outW = dOut[0][0].length;

    // Gradients w.r.t. weights, bias and input.
    const dW = [];
    for (let f = 0; f < this.numFilters; f++) dW.push(zeros3(C, F, F));
    const db = new Float32Array(this.numFilters);
    const dInput = zeros3(C, inH, inW);

    for (let f = 0; f < this.numFilters; f++) {
      const filt = this.W[f];
      for (let oi = 0; oi < outH; oi++) {
        for (let oj = 0; oj < outW; oj++) {
          const grad = dOut[f][oi][oj];
          db[f] += grad;
          for (let c = 0; c < C; c++)
            for (let fi = 0; fi < F; fi++)
              for (let fj = 0; fj < F; fj++) {
                // chain rule: spread this output's gradient back to weights and input
                dW[f][c][fi][fj] += this.input[c][oi + fi][oj + fj] * grad;
                dInput[c][oi + fi][oj + fj] += filt[c][fi][fj] * grad;
              }
        }
      }
    }

    // Gradient-descent update of the parameters.
    for (let f = 0; f < this.numFilters; f++) {
      this.b[f] -= lr * db[f];
      for (let c = 0; c < C; c++)
        for (let fi = 0; fi < F; fi++)
          for (let fj = 0; fj < F; fj++)
            this.W[f][c][fi][fj] -= lr * dW[f][c][fi][fj];
    }
    return dInput;
  }

  // Export / import for LocalStorage persistence.
  exportWeights() {
    return { type: 'Conv2D', inChannels: this.inChannels, numFilters: this.numFilters,
             fSize: this.fSize, W: this.W.map(f => f.map(c => Array.from(c).map(r => Array.from(r)))),
             b: Array.from(this.b) };
  }
  importWeights(d) {
    this.W = d.W.map(f => f.map(c => c.map(r => Float32Array.from(r))));
    this.b = Float32Array.from(d.b);
  }
}

/* ===================================================================
   ReLU  —  activation: keeps positives, zeros negatives.
   =================================================================== */
class ReLU {
  forward(input) {
    this.input = input;
    return input.map(c => c.map(row => row.map(v => (v > 0 ? v : 0))));
  }
  backward(dOut) {
    // gradient passes only where the input was positive
    return dOut.map((c, ci) =>
      c.map((row, ri) =>
        row.map((v, vi) => (this.input[ci][ri][vi] > 0 ? v : 0))));
  }
  exportWeights() { return { type: 'ReLU' }; }
  importWeights() {}
}

/* ===================================================================
   MaxPool2D  —  2x2 pooling, stride 2. Keeps the strongest signal in
   each window and shrinks the map by half.
   =================================================================== */
class MaxPool2D {
  constructor(size = 2) { this.size = size; }

  forward(input) {
    this.input = input;
    const C = input.length, inH = input[0].length, inW = input[0][0].length;
    const s = this.size;
    const outH = Math.floor(inH / s), outW = Math.floor(inW / s);
    const out = zeros3(C, outH, outW);
    // remember which position won, so backprop can route the gradient there
    this.argmax = [];

    for (let c = 0; c < C; c++) {
      this.argmax[c] = [];
      for (let oi = 0; oi < outH; oi++) {
        this.argmax[c][oi] = [];
        for (let oj = 0; oj < outW; oj++) {
          let best = -Infinity, bi = 0, bj = 0;
          for (let i = 0; i < s; i++)
            for (let j = 0; j < s; j++) {
              const v = input[c][oi * s + i][oj * s + j];
              if (v > best) { best = v; bi = i; bj = j; }
            }
          out[c][oi][oj] = best;
          this.argmax[c][oi][oj] = [bi, bj];
        }
      }
    }
    return out;
  }

  backward(dOut) {
    const C = this.input.length, inH = this.input[0].length, inW = this.input[0][0].length;
    const s = this.size;
    const dInput = zeros3(C, inH, inW);
    const outH = dOut[0].length, outW = dOut[0][0].length;
    for (let c = 0; c < C; c++)
      for (let oi = 0; oi < outH; oi++)
        for (let oj = 0; oj < outW; oj++) {
          const [bi, bj] = this.argmax[c][oi][oj];
          dInput[c][oi * s + bi][oj * s + bj] = dOut[c][oi][oj]; // only winner gets gradient
        }
    return dInput;
  }
  exportWeights() { return { type: 'MaxPool2D', size: this.size }; }
  importWeights() {}
}

/* ===================================================================
   Flatten  —  turns a 3-D feature map into a 1-D vector for the Dense layer.
   =================================================================== */
class Flatten {
  forward(input) {
    this.shape = [input.length, input[0].length, input[0][0].length];
    const out = [];
    for (let c = 0; c < input.length; c++)
      for (let i = 0; i < input[0].length; i++)
        for (let j = 0; j < input[0][0].length; j++)
          out.push(input[c][i][j]);
    return out;
  }
  backward(dOut) {
    const [C, H, W] = this.shape;
    const t = zeros3(C, H, W);
    let k = 0;
    for (let c = 0; c < C; c++)
      for (let i = 0; i < H; i++)
        for (let j = 0; j < W; j++)
          t[c][i][j] = dOut[k++];
    return t;
  }
  exportWeights() { return { type: 'Flatten' }; }
  importWeights() {}
}

/* ===================================================================
   Dense  —  fully connected layer.  out = W * x + b
   W shape: [outDim][inDim]
   =================================================================== */
class Dense {
  constructor(inDim, outDim) {
    this.inDim = inDim;
    this.outDim = outDim;
    const scale = Math.sqrt(2 / inDim);
    this.W = [];
    for (let o = 0; o < outDim; o++) {
      const row = new Float32Array(inDim);
      for (let i = 0; i < inDim; i++) row[i] = rand(-1, 1) * scale;
      this.W.push(row);
    }
    this.b = new Float32Array(outDim);
  }
  forward(input) {
    this.input = input;
    const out = new Float32Array(this.outDim);
    for (let o = 0; o < this.outDim; o++) {
      let sum = this.b[o];
      const row = this.W[o];
      for (let i = 0; i < this.inDim; i++) sum += row[i] * input[i];
      out[o] = sum;
    }
    return out;
  }
  backward(dOut, lr) {
    const dInput = new Float32Array(this.inDim);
    for (let o = 0; o < this.outDim; o++) {
      const grad = dOut[o];
      const row = this.W[o];
      for (let i = 0; i < this.inDim; i++) {
        dInput[i] += row[i] * grad;            // gradient to previous layer
        row[i]   -= lr * grad * this.input[i]; // weight update
      }
      this.b[o] -= lr * grad;                  // bias update
    }
    return dInput;
  }
  exportWeights() {
    return { type: 'Dense', inDim: this.inDim, outDim: this.outDim,
             W: this.W.map(r => Array.from(r)), b: Array.from(this.b) };
  }
  importWeights(d) {
    this.W = d.W.map(r => Float32Array.from(r));
    this.b = Float32Array.from(d.b);
  }
}

/* ===================================================================
   Softmax + Cross-Entropy
   Turns the raw scores into probabilities and computes the loss.
   The combined gradient (probs - oneHot) is famously simple.
   =================================================================== */
function softmax(logits) {
  const max = Math.max(...logits);            // subtract max for numeric stability
  const exps = logits.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
}
function crossEntropy(probs, label) {
  return -Math.log(probs[label] + 1e-9);
}

/* ===================================================================
   CNN  —  builds and runs the full layer stack.
   =================================================================== */
class CNN {
  /*
     config = {
       inputSize:   28,
       numClasses:  3,
       convLayers:  1..3,
       numFilters:  number of filters per conv layer,
       filterSize:  3 or 5,
       learningRate, epochs
     }
  */
  constructor(config) {
    this.config = config;
    this.build();
  }

  build() {
    const cfg = this.config;
    this.layers = [];
    let channels = 1;          // grayscale input
    let size = cfg.inputSize;  // current feature-map side length

    for (let l = 0; l < cfg.convLayers; l++) {
      this.layers.push(new Conv2D(channels, cfg.numFilters, cfg.filterSize));
      size = size - cfg.filterSize + 1;          // valid conv shrinks the map
      this.layers.push(new ReLU());
      this.layers.push(new MaxPool2D(2));
      size = Math.floor(size / 2);               // pooling halves the map
      channels = cfg.numFilters;
    }

    this.flattenDim = channels * size * size;
    this.layers.push(new Flatten());
    this.layers.push(new Dense(this.flattenDim, cfg.numClasses));
    // (Softmax is applied separately so we can reuse its simple gradient.)
  }

  // Run input through every layer, return raw logits.
  forwardLogits(input) {
    let x = input;
    for (const layer of this.layers) x = layer.forward(x);
    return x;
  }

  // Full prediction: probabilities over the classes.
  predict(input) {
    return softmax(Array.from(this.forwardLogits(input)));
  }

  // One training step on a single example. Returns the loss.
  trainStep(input, label, lr) {
    const logits = Array.from(this.forwardLogits(input));
    const probs = softmax(logits);
    const loss = crossEntropy(probs, label);

    // dLoss/dLogits for softmax + cross-entropy = probs - oneHot
    const dLogits = probs.slice();
    dLogits[label] -= 1;

    // Backpropagate through the stack in reverse.
    let grad = dLogits;
    for (let i = this.layers.length - 1; i >= 0; i--)
      grad = this.layers[i].backward(grad, lr);

    return loss;
  }

  /* ---- weight persistence (LocalStorage) ---- */
  exportWeights() {
    return { config: this.config, layers: this.layers.map(l => l.exportWeights()) };
  }
  importWeights(data) {
    this.config = data.config;
    this.build();
    data.layers.forEach((d, i) => this.layers[i].importWeights(d));
  }

  // Returns the feature maps right after the FIRST conv+ReLU, for visualisation.
  getFirstConvMaps(input) {
    let x = this.layers[0].forward(input);  // Conv2D
    x = this.layers[1].forward(x);          // ReLU
    return x;                               // [numFilters][H][W]
  }
}
