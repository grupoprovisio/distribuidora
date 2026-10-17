import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Telas pessoais, portais ainda demonstrativos e rotas de servidor não têm o que indexar.
      disallow: ["/api/", "/admin", "/app/", "/conta", "/lista", "/scan", "/checkout"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
