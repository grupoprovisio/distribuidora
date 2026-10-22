# Cadastro comercial P1 — evidências de implementação e homologação (22/10/2026)

## Escopo preservado
- Jornadas comerciais: somente **Sou Comprador** e **Sou Fornecedor**. **ADM** é interno.
- Home, landing pages e componentes promocionais existentes preservados.
- Nenhum perfil público de vendedor/comissão/representante foi incluído.
- Nenhum dado VTEX/Atacadão é reutilizado como produto ou oferta vendável.

## Entregas na branch
- **Categorias**: produto mestre e relações N:N, formulários administrativos e validação por RLS.
- **Solicitação de fornecedor**: produto, categoria, unidade, SKU, embalagem, preço (centavos), estoque, UF. Grava *pending* só na organização autorizada.
- **Admin**: fila de solicitações; homologação atômica cria produto *draft*, SKU *pending* e oferta *pending* — sem publicação automática. Administrador ativa/homologa em etapas existentes.
- **Estoque**: fornecedor com papel de escrita ajusta sua quantidade disponível em RPC atômica, sem tocar nas reservas. Quem só lê não escreve.
- **Preços**: fornecedor cria oferta pendente por região; aprovação exige ADM com MFA e regras comerciais existentes.
- **Imagens**: browser converte JPG/PNG/GIF/BMP/WebP/AVIF decodificáveis para WebP <= 1600 px e <= 5 MB; bucket privado, metadados relacionalmente vinculados, URLs temporárias em catálogo elegível.
- **Migrações novas**: 0016-0021 em ordem; armazenamento de imagens é migrado com 0018.
- **Testes CI**: workflow catalog-p1-rls.yml executa Postgres 17 isolado com cenários cross-tenant e integrações do catálogo.

## Evidências observadas
- Docker PostgreSQL 17 isolado: migrações 0001-0021 aplicadas em ordem, sem erros.
- SQL fixture 2 fornecedores + admin com AAL2 + perfil READ: escrita apenas da própria organização; leitura de SKU, estoque, solicitações e objetos de imagem de outra organização negada; alteração de preço e promoção transacional com status pendentes. Testes completaram sem erro.
- Node/Next: typecheck, lint (modo quiet), test:marketplace, test:frontend-scope, test:supabase-foundation e Next production build aprovados.
- Chrome 155 headless no Mac: home, comprador, fornecedor e login em 390px; rotas protegidas redirecionaram sem sessão; PNG/JPEG/WebP 2000x1000 -> WebP 1600x800 com assinatura RIFF/WEBP correta.
- Não foram executados login AAL2, upload/download privado ou gravações comerciais no Supabase hospedado porque a branch de homologação requer confirmação explícita de cobrança.

## Gates de liberação ainda abertos
1. Criar branch temporária do Supabase no projeto certo **após autorização do custo informado US$ 0,01344/h**. Nunca aplicar migrações numa produção compartilhada só para testar.
2. Aplicar migrações 0016-0021 na branch com verificação dos advisors. Validar RLS com sessões reais de 2 organizações e confirmar buckets/policies reais do Storage.
3. Testar upload de imagens de tipos suportados, visualização na área ADM e pelo comprador elegível, negando outro fornecedor.
4. Executar fluxo autenticado **Fornecedor -> solicitação -> ADM MFA -> produto mestre -> SKU -> preço/estoque -> comprador elegível** no navegador (desktop e mobile).
5. Regenerar os tipos do Supabase diretamente da branch hospedada e verificar drift; reexecutar CI/build/preview Vercel.
6. Só após gates verdes, aprovar PR, merge protegido e publicação na produção. Verificar domínio grupoprovisio.com e ter plano de rollback.

## Notas de ambiente
- Testes Docker ficaram limitados a um container com rede desabilitada, sem portas publicadas; **não** representam Storage/Auth hospedados.
- O frontend usa chave pública Supabase do ambiente e Auth SSR; nunca usa service_role no navegador.
- Scripts `scripts/sql-test/local-*-bootstrap.sql` são **somente fixtures locais**, jamais aplicar em Supabase hospedado.
- Branch local isolada do repositório; nunca alterar outras branches/arquivos em trabalho simultâneo no Mac.
