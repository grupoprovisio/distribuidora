export const COMMERCIAL_EMAIL = "contato@grupoprovisio.com";

export const CONTACT_TOPICS = [
  ["compras", "Compras e catálogo"],
  ["financeiro", "Financeiro"],
  ["entrega", "Entrega"],
  ["fornecedor", "Fornecedor"],
] as const;

export function prepareContactEmail(fields: FormData) {
  const read = (key: string) => String(fields.get(key) ?? "").trim();
  const name = read("name");
  const contact = read("contact");
  const message = read("message");
  const topic = CONTACT_TOPICS.find(([key]) => key === read("topic"));
  if (!topic || !name || !contact || !message) return null;

  const subject = `Contato Provisio: ${topic[1]}`;
  const body = [`Nome: ${name}`, `Contato: ${contact}`, "", message]
    .join("\n")
    .replace(/\r?\n/g, "\r\n");
  return {
    category: topic[0],
    href: `mailto:${COMMERCIAL_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}
