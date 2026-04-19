// Classic Web Worker — loads the Stockfish Emscripten build via importScripts.
// The .js file resolves its sibling .wasm by relative URL, so both must be
// served from the same directory (client/public/).

declare function importScripts(...urls: string[]): void;
declare const self: Worker & { Stockfish?: () => Promise<StockfishInstance> };

interface StockfishInstance {
  addMessageListener: (cb: (line: string) => void) => void;
  postMessage: (msg: string) => void;
}

importScripts('/stockfish-nnue-16-single.js');

let engine: StockfishInstance | null = null;

(async () => {
  if (!self.Stockfish) {
    self.postMessage('__error__:Stockfish global not found');
    return;
  }
  engine = await self.Stockfish();
  engine.addMessageListener((line: string) => {
    self.postMessage(line);
  });
  self.postMessage('__ready__');
})();

self.onmessage = (e: MessageEvent<string>) => {
  engine?.postMessage(e.data);
};
