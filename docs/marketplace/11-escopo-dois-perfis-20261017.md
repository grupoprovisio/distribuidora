# Decisão de escopo — 17/10/2026

## Regra vigente e prioritária
O Grupo Provisio terá **somente duas jornadas comerciais públicas e dois painéis correspondentes**:
- **Sou comprador** — `/compradores` e `/app/comprador/*`;
- **Sou fornecedor** — `/fornecedores` e `/app/fornecedor/*`.

**Não implementar, exibir ou planejar o perfil Sou vendedor**. Isso inclui landing page, cadastro, painel, carteira de representantes, CRM, regras de comissão por vendedor, menus, sitemap, marketing e documentação futura. A decisão de 17/10/2026 prevalece sobre menções anteriores a vendedores no plano original. Não criar novos esquemas ou migrations para vendedores.

O modelo de negócio continua **híbrido**: a própria distribuidora opera como fornecedora autorizada ao lado de parceiros independentes. Não confundir entidade interna responsável pela oferta (seller de banco/marketplace) com um perfil público de representante comercial. Nomes técnicos legados e migrações já aplicadas só podem ser removidos após auditoria de impacto e segurança, sem alterações destrutivas nesta frente de frontend.

## Regras de desenvolvimento
- Preservar as rotas úteis e o design atual; links antigos como `/empresas` redirecionam para `/compradores`.
- Frontend pode avançar sem backend completo, desde que não apresente êxito falso de cadastro, pedido, pagamento ou homologação.
- Qualquer catálogo público vendável terá exclusivamente ofertas próprias ou homologadas. Dados externos VTEX/Atacadão não entram no novo núcleo comercial.
- Trabalhar somente em branch isolada; nenhum merge, deploy, alteração de produção, migração de banco, acesso a dados fiscais ou alteração de autenticação sem revisão.
- Fases que mencionem vendedor no documento `PLANO_CODEX_DISTRIBUIDORA_MARKETPLACE_HIBRIDO.md` estão **expressamente revogadas**.
- Portais atuais permanecem sujeitos a verificação de acesso pelo servidor; não expor dados de uma organização a outra.
- Verificar lint, TypeScript/build e experiência mobile antes de merge.

## Frontend preparado nesta branch
1. Homepage institucional com cartões só para comprador e fornecedor;
2. Navegação e footer sem vendedor; sitemap e metadados alinhados;
3. Páginas públicas com benefícios, passos, FAQ e contato transparente;
4. Painéis e subpáginas com navegação e módulos de demonstração honestos;
5. Acesso do portal vendedor desativado no app;
6. Documento DESIGN.md e contrato UX para consistência.

## Pendências
- Execução de testes, compilação e validação visual em ambiente com Node/dependências;
- Confirmação das configurações de autenticação, RLS, storage e homologação para operações reais;
- Preparar integração real de cadastros, catálogo e pedidos em etapa de backend independente.
