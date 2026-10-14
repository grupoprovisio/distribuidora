import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Static B2B sitemap: no external catalog or VTEX/Atacadão network calls. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths: Array<[string, number, "daily" | "weekly" | "monthly" | "yearly"]> = [
    ["/", 1, "weekly"], ["/compradores", 0.9, "weekly"], ["/vendedores", 0.8, "weekly"],
    ["/fornecedores", 0.8, "weekly"], ["/produtos", 0.7, "weekly"], ["/como-funciona", 0.6, "monthly"],
    ["/contato", 0.5, "monthly"], ["/termos-marketplace", 0.2, "yearly"],
    ["/privacidade", 0.2, "yearly"], ["/termos", 0.2, "yearly"],
  ];
  return paths.map(([path, priority, changeFrequency]) => ({
    url: `${SITE_URL}${path}`, lastModified: now, changeFrequency, priority,
  }));
}
