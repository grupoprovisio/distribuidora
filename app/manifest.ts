import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Distribuidora",
    description: SITE_DESCRIPTION,
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f6f4",
    theme_color: "#0e4b3f",
    categories: ["shopping", "lifestyle"],
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
