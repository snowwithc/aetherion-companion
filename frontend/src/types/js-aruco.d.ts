/** Ambient module declaration for js-aruco (no upstream TS types). Only what we use. */
declare module 'js-aruco' {
  export interface JsArucoPoint { x: number; y: number }
  export interface JsArucoMarkerResult { id: number; corners: JsArucoPoint[] }
  export interface JsArucoImageLike { width: number; height: number; data: Uint8ClampedArray | number[] }

  /** The detector's internal helpers - we call them directly to tune thresholds. */
  export interface JsArucoDetector {
    grey: unknown;
    thres: unknown;
    binary: unknown[];
    contours: unknown[];
    detect(image: JsArucoImageLike): JsArucoMarkerResult[];
    findCandidates(contours: unknown[], minSize: number, epsilon: number, minLength: number): unknown[];
    clockwiseCorners(candidates: unknown[]): unknown[];
    notTooNear(candidates: unknown[], minDist: number): unknown[];
    findMarkers(grey: unknown, candidates: unknown[], warpSize: number): JsArucoMarkerResult[];
    hammingDistance(bits: number[][]): number;
    mat2id(bits: number[][]): number;
    rotate(bits: number[][]): number[][];
  }

  export interface JsArucoCV {
    grayscale(image: JsArucoImageLike, dst: unknown): unknown;
    adaptiveThreshold(src: unknown, dst: unknown, kernelSize: number, threshold: number): unknown;
    findContours(src: unknown, binary: unknown[]): unknown[];
  }

  const _default: {
    AR: { Detector: new () => JsArucoDetector };
    CV: JsArucoCV;
  };
  export default _default;
}
