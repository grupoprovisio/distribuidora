# Evidências de encerramento — Fases 0 e 1 (21/10/2026)

## Regras de conclusão
As porcentagens de 80% (fase 0) e 90% (fase 1) são estimativas anteriores, **não certificações de aceite**. Não registrar 100% sem evidências.

### Fase 0 — Auditoria
- [x] Documento de inventário inicial (`00-auditoria.md`).
- [x] Matriz de transição e rollback (`01-plano-migracao.md`).
- [x] Decisão vigente de escopo com dois perfis (`11-escopo-dois-perfis-20261017.md`).
- [x] Workflow de validação criado nesta branch (`.github/workflows/provisio-fases-0-1.yml`).
- [ ] Atualizar inventário de rotas, dependências, dados e ambiente ao HEAD atual; revisão integral do repositório.
- [ ] Confirmar execução de lint, typecheck, testes e build com resultados observáveis.
- [ ] Confirmar que o ambiente de CI é capaz de executar o workflow, sem alterar produção.

### Fase 1 — Site público (preservação, não redesign)
- [x] Página inicial `/`, `/compradores` e `/fornecedores` presentes na árvore do projeto.
- [x] Navegação `lib/nav.ts` e `app/sitemap.ts` direcionam aos dois perfis.
- [x] Teste estático existente de proteção de arquivos e imagens mediante hashes de blob Git.
- [x] Workflow criado para executar `npm run test:frontend-scope`.
- [ ] Demonstrar execução bem-sucedida do teste de integridade visual.
- [ ] Demonstrar responsividade em 375px, 768px e 1440px, sem modificar layout aprovado.
- [ ] Demonstrar navegação por teclado, semântica e contraste/acessibilidade das páginas existentes.
- [ ] Confirmar build e navegação sem links quebrados.

## Verificações feitas nesta interação
- Conferidos arquivos do GitHub da branch `docs/provisio-progresso-dois-perfis-20261020`.
- Commit da criação do workflow: `8f5da91193f9c21ba56d2da2dc72733fc6e6e716`.
- Consulta de status do commit retornou lista vazia de statuses; **não equivale a sucesso nem comprova a execução do workflow**.
- Nenhum teste local, teste de navegador, alteração das páginas públicas, merge, deploy, ou mudança no banco foi executado nesta interação.

## Critério para 100%
Fase 0: evidências de inventário revisado + auditoria de integrações/ambiente e CI com execução bem-sucedida.
Fase 1: testes de proteção + build + smoke visual/responsivo/acessibilidade aprovados, preservando a identidade atual.

Não modificar `/`, `/compradores`, `/fornecedores`, suas fotografias, textos, cards ou arquivos visuais protegidos.
