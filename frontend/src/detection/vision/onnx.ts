/**
 * YOLOv8n ONNX scaffold - inert until a model file exists at the configured URL.
 * We purposefully lazy-load onnxruntime-web so the first paint is not blocked by its WASM.
 *
 * Drop a model at /public/assets/models/cards.onnx (classification head over the 35 card ids,
 * output order matching ALL_CARD_IDS) to activate the fallback.
 */
import { config, ALL_CARD_IDS } from '@/engine';

type Session = { inputNames: readonly string[]; outputNames: readonly string[]; run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: Float32Array | Uint8Array | Int32Array }>> };

let sessionPromise: Promise<Session | null> | null = null;

export interface ClassifierStatus {
  available: boolean;
  message: string;
}

/** Prefetch (idempotent). Resolves to `null` quietly if the model is absent. */
export function warmClassifier(): Promise<Session | null> {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    try {
      const head = await fetch(config.detection.modelUrl, { method: 'HEAD', cache: 'no-store' });
      if (!head.ok) return null;
      const type = head.headers.get('content-type') ?? '';
      if (type.includes('text/html')) return null;
      const ort = await import('onnxruntime-web');
      const session = await ort.InferenceSession.create(config.detection.modelUrl, {
        executionProviders: ['wasm'],
      });
      return session as unknown as Session;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.debug('[onnx] model unavailable', err);
      return null;
    }
  })();
  return sessionPromise as Promise<Session | null>;
}

export async function classifierStatus(): Promise<ClassifierStatus> {
  const s = await warmClassifier();
  return s ? { available: true, message: 'Model AI aktif.' } : { available: false, message: 'Model AI tidak ada - deteksi hanya pakai marker.' };
}

/** Classify a 224x224 RGBA crop. Returns top-1 label and its confidence, or null. */
export async function classifyCrop(crop: ImageData): Promise<{ cardId: string; confidence: number } | null> {
  const session = await warmClassifier();
  if (!session) return null;
  try {
    const ort = await import('onnxruntime-web');
    const data = new Float32Array(3 * crop.width * crop.height);
    // Convert RGBA -> CHW float in [0, 1].
    const plane = crop.width * crop.height;
    for (let i = 0, p = 0; i < plane; i++, p += 4) {
      data[i] = crop.data[p] / 255;
      data[i + plane] = crop.data[p + 1] / 255;
      data[i + 2 * plane] = crop.data[p + 2] / 255;
    }
    const tensor = new ort.Tensor('float32', data, [1, 3, crop.height, crop.width]);
    const inputName: string = session.inputNames[0];
    const output = await session.run({ [inputName]: tensor });
    const first = output[session.outputNames[0]];
    const scores = Array.from(first.data as Float32Array);
    let best = 0;
    for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;
    const cardId = ALL_CARD_IDS[best] ?? null;
    if (!cardId) return null;
    // Softmax on top-1 vs rest for a rough confidence.
    const max = scores[best];
    let sum = 0;
    for (const s of scores) sum += Math.exp(s - max);
    const confidence = 1 / sum;
    return { cardId, confidence };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.debug('[onnx] classify error', err);
    return null;
  }
}
