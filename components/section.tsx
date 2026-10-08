import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionTitle({ children, href, action = "Ver mais" }: { children: React.ReactNode; href?: string; action?: string }) {
  return (
    <div className="mb-3 mt-8 flex items-baseline justify-between gap-4 first:mt-0 sm:mb-4">
      <h2 className="text-lg font-extrabold tracking-tight sm:text-xl">{children}</h2>
      {href ? (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-forest hover:underline">
          {action}
          <ArrowRight size={14} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="mx-auto grid max-w-md place-items-center rounded-[2rem] bg-paper px-6 py-12 text-center shadow-card ring-1 ring-line/70">
      <div className="grid size-20 place-items-center rounded-full bg-lime-soft">
        <Icon size={34} className="text-forest" aria-hidden />
      </div>
      <h2 className="mt-5 text-lg font-extrabold">{title}</h2>
      <p className="mt-1 max-w-xs text-sm font-medium text-muted">{text}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  );
}

export const primaryButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lime px-6 text-sm font-extrabold text-forest-deep transition-transform active:scale-95";
