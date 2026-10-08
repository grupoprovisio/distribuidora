# ADR-0001: Núcleo comercial autorizado independente do comparador

**Status:** Aceito para desenvolvimento local  
**Data:** 2026-10-08

## Contexto

O projeto atual consulta APIs VTEX/Atacadão e persiste parte da experiência apenas no navegador. O destino exige distribuidora própria e fornecedores homologados, sem converter preços externos em produtos vendáveis.

## Decisão

Criar contratos internos para produto mestre, produto do fornecedor e oferta vendável. Toda oferta exige organização vendedora, aprovação, vigência e `sourceType` autorizado. O comparador externo não implementa esses contratos e fica excluído do novo catálogo.

## Consequências

- Busca, ofertas e checkout podem operar com fixtures locais sem rede.
- Dados antigos continuam acessíveis somente por fluxos legados até migração explícita.
- Um banco relacional e identidade própria serão necessários em fases futuras.
- A distribuidora própria será uma organização normal com `isPlatformOwned=true`.
