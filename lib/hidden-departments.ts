const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");

const DEPARTMENT_LABELS = new Map([
  [normalize("Higiene e perfumaria"), "Higiene"],
  [normalize("Limpeza"), "Limpeza e Acessórios"],
]);

const HIDDEN_DEPARTMENTS = new Set(
  [
    "Frios e congelados",
    "Bebidas",
    "Automotivo",
    "Pet shop",
    "Carnes, aves e peixes",
    "Jardinagem",
    "Vestuário",
    "Esporte e lazer",
    "Suplementos alimentares",
    "Drogaria",
    "Eletrônicos e eletroportáteis",
  ].map(normalize),
);

export function isHiddenDepartment(value: string | undefined) {
  return value ? HIDDEN_DEPARTMENTS.has(normalize(value)) : false;
}

export function displayDepartmentName(value: string) {
  return DEPARTMENT_LABELS.get(normalize(value)) ?? value;
}

export function hasHiddenDepartmentPath(path: string[]) {
  return path.some(isHiddenDepartment);
}
