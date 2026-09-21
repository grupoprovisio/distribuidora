import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Telas pessoais (conta, lista, compras) e rotas de servidor não têm o que indexar.
      disallow: ["/api/", "/conta", "/lista", "/scan"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
