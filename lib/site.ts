// Identidade comercial do site — sem dependência de catálogo externo.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
export const SITE_NAME = "Grupo Provisio";
export const SITE_TITLE = "Grupo Provisio · Distribuidora e marketplace B2B";
export const SITE_DESCRIPTION = "Uma plataforma B2B em desenvolvimento para conectar distribuidores próprios, fornecedores homologados, compradores e representantes comerciais.";
export const SITE_KEYWORDS = [
  "Grupo Provisio", "distribuidora B2B", "marketplace de fornecedores",
  "abastecimento empresarial", "compras corporativas", "fornecedores homologados",
  "representantes comerciais", "catálogo autorizado",
];
