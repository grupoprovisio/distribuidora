import type { NextConfig } from "next";

// Identificadores públicos para conferir a versão efetivamente servida pelo domínio.
const releaseId = "provisio-recovery-mfa-20261023";
const gitRevision = process.env.VERCEL_GIT_COMMIT_SHA;
const releaseHeaders = [
  { key: "X-Provisio-Release", value: releaseId },
  ...(/^[a-f0-9]{40}$/i.test(gitRevision ?? "")
    ? [{ key: "X-Provisio-Revision", value: gitRevision!.toLowerCase() }]
    : []),
];

const devOrigins = (process.env.DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: releaseHeaders }];
  },
  // Só vale no `next dev`: libera abrir por 127.0.0.1, túneis do Cloudflare e os hosts de `DEV_ORIGINS` (IP da rede local, separados por vírgula).
  allowedDevOrigins: ["127.0.0.1", "*.trycloudflare.com", ...devOrigins],
  images: {
    // CDNs de imagem da Distribuidora (VTEX). Redimensionamento é feito na própria URL (ver lib/products.ts).
    remotePatterns: [
      { protocol: "https", hostname: "atacadaobr.vteximg.com.br" },
      { protocol: "https", hostname: "atacadaobr.vtexassets.com" },
    ],
  },
};

export default nextConfig;
