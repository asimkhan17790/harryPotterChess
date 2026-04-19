import { useEffect, useRef, useState, useCallback } from 'react';
import { difficultyToConfig } from '../utils/difficultyMapping';
import type { Difficulty } from '../utils/difficultyMapping';

const TIMEOUT_MS = 10_000;

export interface UseStockfishReturn {
  requestMove: (fen: string, difficulty: Difficulty) => Promise<string | null>;
  ready: boolean;
}

export function useStockfish(enabled: boolean): UseStockfishReturn {
  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  // Resolve fn for the currently pending requestMove call
  const pendingRef = useRef<((move: string | null) => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Load the stockfish Emscripten build directly as the worker.
    // It self-initializes when it detects a worker context, posts UCI output
    // back via postMessage, and accepts UCI commands via onmessage.
    const worker = new Worker('/stockfish-nnue-16-single.js');
    workerRef.current = worker;

    // Kick off UCI handshake immediately — queued until WASM finishes loading.
    worker.postMessage('isready');

    worker.onmessage = (e: MessageEvent<string>) => {
      const line = e.data;

      if (line === 'readyok') {
        setReady(true);
        return;
      }

      if (line.startsWith('bestmove') && pendingRef.current) {
        const parts = line.split(' ');
        const move = parts[1] === '(none)' ? null : (parts[1] ?? null);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        pendingRef.current(move);
        pendingRef.current = null;
      }
    };

    worker.onerror = () => {
      if (pendingRef.current) {
        pendingRef.current(null);
        pendingRef.current = null;
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      setReady(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled]);

  const requestMove = useCallback(
    (fen: string, difficulty: Difficulty): Promise<string | null> => {
      const worker = workerRef.current;
      if (!worker || !ready) return Promise.resolve(null);
      // Cancel any in-flight request
      if (pendingRef.current) {
        pendingRef.current(null);
        pendingRef.current = null;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }

      return new Promise<string | null>((resolve) => {
        pendingRef.current = resolve;

        timeoutRef.current = setTimeout(() => {
          if (pendingRef.current === resolve) {
            pendingRef.current = null;
            resolve(null);
          }
        }, TIMEOUT_MS);

        const { skillLevel, movetime } = difficultyToConfig(difficulty);
        worker.postMessage('ucinewgame');
        worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go movetime ${movetime}`);
      });
    },
    [ready],
  );

  if (!enabled) {
    return { requestMove: () => Promise.resolve(null), ready: false };
  }

  return { requestMove, ready };
}
