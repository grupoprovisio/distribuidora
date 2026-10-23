/** Compare browser Origin with the actual HTTP Host, not Next's internal bind name. */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    const supplied = new URL(origin);
    const internal = new URL(request.url);
    if (!["http:", "https:"].includes(supplied.protocol) || supplied.origin !== origin) return false;
    // A browser cannot override Host. Never use caller-supplied X-Forwarded-Host here.
    const host = request.headers.get("host") ?? internal.host;
    if (!host || /[\s/@?#\\]/.test(host)) return false;
    const target = new URL(internal.protocol + "//" + host);
    return supplied.origin === target.origin;
  } catch { return false; }
}
