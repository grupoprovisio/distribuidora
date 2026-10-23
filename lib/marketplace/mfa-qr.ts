/** Encode Auth's SVG as an image URL; never render its markup into the DOM. */
export function mfaQrImageUrl(input: string): string {
  if (typeof input !== "string" || input.length > 1_000_000) throw new Error("QR Code invalido.");
  let svg = input.trim();
  if (/^data:image\/svg\+xml;base64,[A-Za-z0-9+/]+={0,2}$/.test(svg)) return svg;
  if (svg.startsWith("data:image/svg+xml")) {
    const comma = svg.indexOf(",");
    if (comma < 0) throw new Error("QR Code invalido.");
    svg = svg.slice(comma + 1).trim();
    if (/^%3c/i.test(svg)) svg = decodeURIComponent(svg);
  }
  const svgStart = svg.search(/<svg\b/i);
  const preamble = svgStart < 0 ? "invalid" : svg.slice(0, svgStart).replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!/^(?:<\?xml[^>]*>\s*)?(?:<!DOCTYPE[^>]*>\s*)?$/i.test(preamble) || !/<\/svg>\s*$/i.test(svg)) {
    throw new Error("QR Code invalido.");
  }
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.slice(svgStart));
}
