"use client";

/** Converte formatos decodificaveis pelo navegador para WebP, sem depender do plano Pro. */
export async function optimizeProductImage(file: File): Promise<File> {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/bmp"]);
  if (!allowed.has(file.type)) throw new Error("Formato nao suportado. Use JPG, PNG, WebP, AVIF, GIF ou BMP.");
  if (file.size > 15 * 1024 * 1024) throw new Error("A imagem deve ter ate 15 MB.");
  const image = await createImageBitmap(file);
  try {
    if (image.width * image.height > 50_000_000) throw new Error("Imagem muito grande (limite de 50 megapixels).");
    const ratio = Math.min(1, 1600 / image.width, 1600 / image.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Conversao de imagem indisponivel neste navegador.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob || blob.type !== "image/webp") throw new Error("Este navegador nao suporta exportacao WebP.");
    if (blob.size > 5 * 1024 * 1024) throw new Error("Imagem otimizada acima de 5 MB.");
    return new File([blob], "produto.webp", { type: "image/webp" });
  } finally {
    image.close();
  }
}
