import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getDepartments } from "@/lib/taxonomy";

// Atualiza de hora em hora: os departamentos vêm da própria loja, então acompanham o que ela criar ou tirar.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/promocoes`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/empresas`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/categorias`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/buscar`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/quem-somos`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/entregas`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contato`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/orcamento`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/privacidade`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/termos`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Um endereço por departamento (ex.: /buscar?cat=mercearia). Se a loja não responder, o sitemap sai só com as páginas fixas.
  try {
    const departments = await getDepartments();
    return [
      ...pages,
      ...departments.map((d) => ({ url: `${SITE_URL}/buscar?cat=${d.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.6 })),
    ];
  } catch {
    return pages;
  }
}
