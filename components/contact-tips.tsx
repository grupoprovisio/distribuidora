"use client";

import { MotionConfig, motion } from "motion/react";

const tips = [
  "Informe sua cidade e região de entrega.",
  "Diga quais categorias e volumes você compra.",
  "Se já tiver uma lista, envie os SKUs ou fotos.",
];

export function ContactTips() {
  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        className="mt-10 rounded-3xl bg-paper p-5 shadow-card ring-1 ring-line/70 sm:p-8"
        aria-labelledby="contact-tips-title"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={{
          hidden: { opacity: 0, y: 18 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.45, staggerChildren: 0.12 } },
        }}
      >
        <motion.h2
          id="contact-tips-title"
          className="text-xl font-extrabold"
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
        >
          Para agilizar o atendimento
        </motion.h2>
        <ul className="mt-5 grid gap-3 text-sm font-semibold text-muted sm:grid-cols-3">
          {tips.map((tip) => (
            <motion.li
              key={tip}
              className="rounded-2xl bg-canvas p-4"
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            >
              {tip}
            </motion.li>
          ))}
        </ul>
      </motion.section>
    </MotionConfig>
  );
}
