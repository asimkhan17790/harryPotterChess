// Classic Web Worker loaded directly from public/ — NOT bundled by Vite.
// importScripts is available in classic worker context.
importScripts('/stockfish-nnue-16-single.js');

var engine = null;

/* global Stockfish */
Stockfish().then(function (sf) {
  engine = sf;
  sf.addMessageListener(function (line) {
    self.postMessage(line);
  });
  self.postMessage('__ready__');
}).catch(function () {
  self.postMessage('__error__:Stockfish init failed');
});

self.onmessage = function (e) {
  if (engine) engine.postMessage(e.data);
};
