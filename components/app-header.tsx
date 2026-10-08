import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ListButton } from "@/components/list-button";
import { SearchForm } from "@/components/search-form";
import { WRAP } from "@/lib/ui";

const THEME = {
  forest: "bg-forest",
  terra: "bg-terra",
  plum: "bg-plum",
  wine: "bg-wine",
} as const;

export type HeaderTheme = keyof typeof THEME;

type Props = {
  /** Cor do cabeçalho (cada seção tem a sua, como na referência). */
  theme?: HeaderTheme;
  title?: string;
  /** Mostra o botão voltar apontando para esta rota. */
  backHref?: string;
  /** Troca o título pela barra de busca. */
  search?: boolean;
  query?: string;
  topContent?: React.ReactNode;
  children?: React.ReactNode;
};

/** Cabeçalho colorido com base curva, estilo do app de referência. Conteúdo extra entra abaixo da barra. */
export function AppHeader({ theme = "forest", title, backHref, search, query, topContent, children }: Props) {
  return (
    <header className={`${THEME[theme]} relative overflow-hidden text-white`}>
      <div className={`${WRAP} pt-[calc(env(safe-area-inset-top)+0.9rem)]`}>
        {topContent}
        <div className="flex items-center gap-3">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="Voltar"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
            >
              <ChevronLeft size={22} aria-hidden />
            </Link>
          ) : !search ? (
            <span aria-hidden className="size-11 shrink-0" />
          ) : null}

          {search ? (
            <SearchForm defaultValue={query} className="flex-1 lg:mx-auto lg:max-w-2xl" />
          ) : (
            <h1 className="flex-1 truncate text-center text-lg font-extrabold tracking-tight">{title}</h1>
          )}

          <ListButton />
        </div>
        {children}
      </div>
      {/* Base curva: elipse da cor do fundo sobre a faixa colorida. */}
      <div
        aria-hidden
        className="mt-5 h-6 bg-canvas sm:h-8"
        style={{ borderRadius: "50% 50% 0 0 / 100% 100% 0 0", marginInline: "-6%" }}
      />
    </header>
  );
}
