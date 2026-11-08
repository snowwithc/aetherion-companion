/** Ambient module declarations for libraries without upstream TS types. */
declare module 'js-aruco' {
  export interface JsArucoCorner { x: number; y: number }
  export interface JsArucoMarkerResult { id: number; corners: JsArucoCorner[] }
  export class Detector {
    constructor();
    detect(image: ImageData): JsArucoMarkerResult[];
  }
  export namespace AR {
    class Detector {
      constructor();
      detect(image: ImageData): JsArucoMarkerResult[];
    }
  }
  const _default: {
    AR: typeof AR;
    CV: unknown;
    SVD: unknown;
    POS1: unknown;
    POS2: unknown;
  };
  export default _default;
  export const AR: {
    Detector: new () => { detect(image: ImageData): JsArucoMarkerResult[] };
  };
}
