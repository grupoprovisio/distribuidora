import { ArrowRight, Search } from "lucide-react";

/** Busca por nome ou código de barras. Envia via GET para /buscar (funciona sem JS). */
export function SearchForm({ defaultValue = "", className = "" }: { defaultValue?: string; className?: string }) {
  return (
    <form
      action="/buscar"
      role="search"
      className={`flex h-11 items-center gap-2 rounded-full bg-paper pl-4 pr-1.5 text-ink shadow-card ${className}`}
    >
      <Search size={18} className="shrink-0 text-muted" aria-hidden />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Nome ou código"
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-medium placeholder:text-muted"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-lime text-forest-deep transition-transform active:scale-90"
      >
        <ArrowRight size={16} strokeWidth={2.6} aria-hidden />
      </button>
    </form>
  );
}
