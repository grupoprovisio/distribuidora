import "server-only";

import { request } from "@/lib/atacadao";

// Departamentos e subcategorias vêm da árvore de categorias do própria Distribuidora (nada fixo no app):
// se a loja criar, renomear ou remover um departamento, o app acompanha.

export type Department = {
  id: number;
  /** Slug do departamento (valor de `category-1` na busca). */
  slug: string;
  name: string;
  subs: { id: number; slug: string; name: string }[];
};

type TreeNode = { id: number; name: string; url?: string; children?: TreeNode[] };

// Departamentos que a Provisio não comercializa não devem aparecer na navegação.
// A fonte VTEX continua intacta; esta regra vale somente para o catálogo do site.
const HIDDEN_DEPARTMENTS = new Set(["mercearia"]);
const isHiddenDepartment = (name: string, slug: string) =>
  HIDDEN_DEPARTMENTS.has(name.trim().toLowerCase()) || HIDDEN_DEPARTMENTS.has(slug.trim().toLowerCase());

const segments = (url?: string) => {
  try {
    return new URL(url ?? "").pathname.split("/").filter(Boolean);
  } catch {
    return [];
  }
};

/** Departamentos na ordem em que o site os apresenta, cada um com suas subcategorias. Em cache por 1 hora. */
export async function getDepartments(): Promise<Department[]> {
  try {
    const res = await request("/api/catalog_system/pub/category/tree/2", { revalidate: 3600 });
    if (!res.ok) return [];
    const tree = (await res.json()) as TreeNode[];
    return tree.flatMap((n): Department[] => {
      const slug = segments(n.url)[0];
      if (!slug || isHiddenDepartment(n.name, slug)) return [];
      const subs = (n.children ?? []).flatMap((c) => {
        const s = segments(c.url)[1];
        return s ? [{ id: c.id, slug: s, name: c.name }] : [];
      });
      return [{ id: n.id, slug, name: n.name, subs }];
    });
  } catch {
    return [];
  }
}
