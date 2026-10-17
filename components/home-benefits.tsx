"use client";

import { motion } from "motion/react";

const benefits = [
  ["Preço por volume", "Condições melhores para quem compra mais."],
  ["Catálogo organizado", "Encontre marcas e categorias sem perder tempo."],
  ["Atendimento próximo", "Fale com a equipe quando sua compra exigir atenção."],
];

export function HomeBenefits() {
  return (
    <section className="mt-10 grid gap-3 sm:grid-cols-3" aria-label="Benefícios da Distribuidora">
      {benefits.map(([title, text], index) => (
        <motion.div
          key={title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="border-l-2 border-lime pl-4"
        >
          <p className="text-sm font-extrabold">{title}</p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-muted">{text}</p>
        </motion.div>
      ))}
    </section>
  );
}
