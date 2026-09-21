import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Só vale no `next dev`: libera abrir por 127.0.0.1 e pelo IP da rede local (testar no celular).
  allowedDevOrigins: ["127.0.0.1", "192.168.100.107", "*.trycloudflare.com"],
  images: {
    // CDNs de imagem do Atacadão (VTEX). Redimensionamento é feito na própria URL (ver lib/products.ts).
    remotePatterns: [
      { protocol: "https", hostname: "atacadaobr.vteximg.com.br" },
      { protocol: "https", hostname: "atacadaobr.vtexassets.com" },
    ],
  },
};

export default nextConfig;
