import {
  Beef,
  Beer,
  Car,
  Carrot,
  Coffee,
  Croissant,
  Dumbbell,
  Package,
  Paperclip,
  PawPrint,
  Plug,
  Shirt,
  Snowflake,
  Sparkles,
  SprayCan,
  Sprout,
  Tag,
  Utensils,
  Wheat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Só apresentação: o ícone e a cor de um departamento são escolhidos pelo NOME que a API devolve.
// Os departamentos em si (nomes, slugs, quantidade de subcategorias) vêm de lib/taxonomy.ts.

const ICON_RULES: [RegExp, LucideIcon][] = [
  [/frio|congel/i, Snowflake],
  [/merce|gr[aã]o|mantim/i, Wheat],
  [/bebida|cerveja|vinho|destilad/i, Beer],
  [/higien|perfum|beleza|cuidado/i, Sparkles],
  [/limpez|lavand/i, SprayCan],
  [/carne|aves?\b|peixe|churras|a[cç]ougue/i, Beef],
  [/horti|fruta|legum|verdur|natural/i, Carrot],
  [/padaria|matinal|p[aã]o|confeit/i, Croissant],
  [/caf[eé]|cafeteria/i, Coffee],
  [/pet|animal|ra[cç][aã]o/i, PawPrint],
  [/utilid|dom[eé]stic|cozinha|casa|bazar/i, Utensils],
  [/descart|embalag/i, Package],
  [/eletr[oô]n|eletro|el[eé]tric/i, Plug],
  [/autom|carro|moto/i, Car],
  [/jardin|plant/i, Sprout],
  [/papel|escrit|escola/i, Paperclip],
  [/esporte|lazer|fitness/i, Dumbbell],
  [/vestu|roupa|moda|cal[cç]ad/i, Shirt],
];

export const iconFor = (name: string): LucideIcon => {
  const rule = ICON_RULES.find(([re]) => re.test(name));
  return rule ? rule[1] : Tag;
};

const TONES = ["bg-sand text-[#8a5a12]", "bg-mist text-[#24628f]", "bg-lime-soft text-forest", "bg-blush text-[#a02a4a]"];
export const toneFor = (index: number) => TONES[index % TONES.length];
