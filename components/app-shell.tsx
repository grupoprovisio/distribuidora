"use client";

import { MotionConfig } from "motion/react";
import { Credit } from "@/components/credit";
import { FloatingNav } from "@/components/floating-nav";

/** Casca das telas com abas: conteúdo fluido + rodapé com o crédito + navegação flutuante. Respeita "reduzir movimento" do sistema. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-dvh flex-col pb-28 sm:pb-32">
        <div className="flex-1">{children}</div>
        <Credit />
      </div>
      <FloatingNav />
    </MotionConfig>
  );
}
