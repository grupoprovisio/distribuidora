import Link from "next/link";
import { ChevronRight, Scale } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SectionTitle } from "@/components/section";
import { iconFor, toneFor } from "@/lib/categories";
import { getDepartments } from "@/lib/taxonomy";
import { WRAP } from "@/lib/ui";

export const metadata = { title: "Categorias · Distribuidora" };

export default async function CategoriasPage() {
  const departments = await getDepartments();

  return (
    <>
      <AppHeader theme="terra" search />

      <main className={`${WRAP} pt-2`}>
        <Link
          href="/lista/montar"
          className="flex items-center gap-4 rounded-3xl bg-gradient-to-r from-plum to-[#8a45c4] p-4 text-white shadow-card sm:p-5"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15">
            <Scale size={22} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold sm:text-base">Monte a lista com as melhores opções</span>
            <span className="block text-xs font-medium text-white/75">Diga o que precisa e a quantidade: mostramos o mais barato.</span>
          </span>
          <ChevronRight size={20} aria-hidden />
        </Link>

        <SectionTitle>Todas as categorias</SectionTitle>
        {departments.length === 0 ? (
          <p className="rounded-3xl bg-paper px-5 py-8 text-center text-sm font-semibold text-muted shadow-card ring-1 ring-line/70">
            Não consegui carregar as categorias agora. Tente de novo em instantes.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-4">
            {departments.map((d, i) => {
              const Icon = iconFor(d.name);
              return (
                <li key={d.slug}>
                  <Link
                    href={`/buscar?cat=${d.slug}`}
                    className="flex h-full min-h-28 flex-col justify-between rounded-3xl bg-paper p-4 shadow-card ring-1 ring-line/70 transition-transform active:scale-[0.97]"
                  >
                    <span className={`grid size-11 place-items-center self-end rounded-2xl ${toneFor(i)}`}>
                      <Icon size={22} aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-extrabold leading-tight sm:text-base">{d.name}</span>
                      <span className="block text-xs font-medium text-muted">
                        {d.subs.length} {d.subs.length === 1 ? "subcategoria" : "subcategorias"}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
