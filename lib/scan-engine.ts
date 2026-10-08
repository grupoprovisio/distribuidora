// Motor de leitura de QR e códigos de barras. Recebe um <canvas> (quadro da câmera ou foto) e devolve o texto lido.
//  • Leitor nativo do navegador (BarcodeDetector) quando existe: rápido e lê em qualquer orientação.
//  • Senão, ZXing. Ele lê bem código de barras deitado; para o vertical, alternamos a cada quadro entre a imagem
//    normal e girada 90°, então um código em pé é pego em até 2 quadros (sem o "tentar mais forte", que é lento).

export type Decoded = { text: string; format: string };

export type Engine = {
  kind: "native" | "zxing";
  /** Um quadro de vídeo. `tick` alterna a orientação no ZXing. */
  decode(canvas: HTMLCanvasElement, tick: number): Promise<Decoded | null>;
  /** Uma foto: tenta as duas orientações e, se preciso, o modo mais insistente. */
  decodeStill(canvas: HTMLCanvasElement): Promise<Decoded | null>;
};

const NATIVE_FORMATS = ["qr_code", "ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "data_matrix"];

type NativeDetector = { detect(source: CanvasImageSource): Promise<{ rawValue: string; format: string }[]> };
type NativeDetectorCtor = {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
};

async function createNative(): Promise<Engine | null> {
  const Ctor = (window as unknown as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const supported = await Ctor.getSupportedFormats();
    const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
    // Sem suporte a código de barras 1D (só QR, por exemplo): melhor usar o ZXing.
    if (!formats.includes("ean_13")) return null;
    const detector = new Ctor({ formats });
    const run = async (canvas: HTMLCanvasElement) => {
      const [hit] = await detector.detect(canvas);
      return hit ? { text: hit.rawValue, format: hit.format.toUpperCase() } : null;
    };
    return { kind: "native", decode: (c) => run(c), decodeStill: (c) => run(c) };
  } catch {
    return null;
  }
}

async function createZxing(): Promise<Engine> {
  const [lib, browser] = await Promise.all([import("@zxing/library"), import("@zxing/browser")]);
  const { MultiFormatReader, BinaryBitmap, HybridBinarizer, DecodeHintType, BarcodeFormat } = lib;

  const formats = [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
    BarcodeFormat.DATA_MATRIX,
  ];
  const fast = new Map<import("@zxing/library").DecodeHintType, unknown>([[DecodeHintType.POSSIBLE_FORMATS, formats]]);
  const hard = new Map(fast).set(DecodeHintType.TRY_HARDER, true);
  const reader = new MultiFormatReader();

  const attempt = (canvas: HTMLCanvasElement, hints: typeof fast): Decoded | null => {
    try {
      const bitmap = new BinaryBitmap(new HybridBinarizer(new browser.HTMLCanvasElementLuminanceSource(canvas)));
      const result = reader.decode(bitmap, hints);
      return { text: result.getText(), format: BarcodeFormat[result.getBarcodeFormat()] };
    } catch {
      return null; // NotFoundException: nada neste quadro
    }
  };

  // Gira 90° no sentido horário: (x, y) -> (altura - y, x).
  const turned = document.createElement("canvas");
  const rotate = (src: HTMLCanvasElement) => {
    turned.width = src.height;
    turned.height = src.width;
    const ctx = turned.getContext("2d", { willReadFrequently: true })!;
    ctx.setTransform(0, 1, -1, 0, src.height, 0);
    ctx.drawImage(src, 0, 0);
    return turned;
  };

  return {
    kind: "zxing",
    decode: async (canvas, tick) => attempt(tick % 2 === 0 ? canvas : rotate(canvas), fast),
    decodeStill: async (canvas) => {
      const upright = attempt(canvas, fast) ?? attempt(rotate(canvas), fast);
      return upright ?? attempt(canvas, hard) ?? attempt(rotate(canvas), hard);
    },
  };
}

export async function createEngine(): Promise<Engine> {
  return (await createNative()) ?? (await createZxing());
}
