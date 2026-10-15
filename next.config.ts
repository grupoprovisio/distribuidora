import type { NextConfig } from "next";

const devOrigins = (process.env.DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Só vale no `next dev`: libera abrir por 127.0.0.1, túneis do Cloudflare e os hosts de `DEV_ORIGINS` (IP da rede local, separados por vírgula).
  allowedDevOrigins: ["127.0.0.1", "*.trycloudflare.com", ...devOrigins],
  // Remote product images will be enabled only for authorized and reviewed suppliers.
  // No VTEX/Atacadao image CDN is allowed in the new marketplace.
  images: { remotePatterns: [] },
};

export default nextConfig;
