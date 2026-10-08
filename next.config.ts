import type { NextConfig } from "next";

const devOrigins = (process.env.DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
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
