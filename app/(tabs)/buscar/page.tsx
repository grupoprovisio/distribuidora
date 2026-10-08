import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { SearchResults } from "@/components/search-results";
import { getDepartments } from "@/lib/taxonomy";
import { CATALOG_SORTS, type CatalogSort } from "@/lib/catalog-types";
import { WRAP } from "@/lib/ui";

export const metadata = { title: "Buscar · Distribuidora" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const SLUG = /^[a-z0-9-]{1,80}$/;

export default async function BuscarPage(props: PageProps<"/buscar">) {
  const sp = await props.searchParams;
  const q = first(sp.q).trim().slice(0, 80);
  const cat = first(sp.cat).split("/").filter((s) => SLUG.test(s)).slice(0, 3);
  const brandRaw = first(sp.brand);
  const brand = SLUG.test(brandRaw) ? brandRaw : undefined;
  const sortRaw = first(sp.sort);
  const sort = ((CATALOG_SORTS as readonly string[]).includes(sortRaw) ? sortRaw : "score_desc") as CatalogSort;
  const min = Number(first(sp.min));
  const max = Number(first(sp.max));

  const departments = await getDepartments();
  const dept = departments.find((d) => d.slug === cat[0]);
  const deptHref = (slug?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (slug) p.set("cat", slug);
    const s = p.toString();
    return s ? `/buscar?${s}` : "/buscar";
  };
  const chip = "shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition-colors";

  return (
    <>
      <AppHeader theme="forest" search query={q} backHref="/">
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <Link href={deptHref()} className={`${chip} ${!dept ? "bg-lime text-forest-deep" : "bg-white/15 text-white"}`}>
            Todas
          </Link>
          {departments.map((d) => (
            <Link key={d.slug} href={deptHref(d.slug)} className={`${chip} ${dept?.slug === d.slug ? "bg-lime text-forest-deep" : "bg-white/15 text-white"}`}>
              {d.name}
            </Link>
          ))}
        </div>
      </AppHeader>

      <main className={`${WRAP} pt-2`}>
        {/* `key` zera o "carregar mais" quando qualquer filtro muda. */}
        <SearchResults key={`${q}|${cat.join("/")}|${brand}|${sort}|${min}|${max}`} q={q} cat={cat} brand={brand} sort={sort} min={Number.isFinite(min) && min > 0 ? min : undefined} max={Number.isFinite(max) && max > 0 ? max : undefined} />
      </main>
    </>
  );
}
