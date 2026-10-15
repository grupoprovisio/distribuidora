/** Regras de visibilidade do mix comercial da Provisio (sem alterar a fonte VTEX). */
const HIDDEN_DEPARTMENTS = new Set(["mercearia"]);

export function isHiddenDepartment(value: string | undefined): boolean {
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return HIDDEN_DEPARTMENTS.has(normalized);
}
