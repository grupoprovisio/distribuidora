# Revisão administrativa do catálogo — 17/10/2026
## Objetivo
Criar fila real e somente leitura de produtos mestres em rascunho, SKUs pendentes e ofertas pendentes, sem alterar as três páginas públicas da Provisio nem liberar vendedor.
## Segurança
Nova migração 0012 concede exclusivamente SELECT via políticas RLS a PLATFOM_ADMIN validado pela função privada já existente, que exige sessão Auth viva e MFA AAL2. Políticas originais de fornecedor permanecem intactas. Não concede leitura a comprador, anon nem roles adicionais; nenhum grant ou policy de escrita.
## Testes
CI aplica migração 0012 no PostgreSQL descartável, executa RLS geral 0001..0011 e depois verifica leitura AAL2 (seis tabelas) e negação AAL1, sessão expirada, sessão forjada, comprador e anônimo. A tela não captura dados em erro: fail closed. Paginação real no servidor (20 itens) e filas de pendência por status.
## Gate remoto
Até aplicação verificada de 0012 no Supabase da Provisio, a tela pode exibir fila vazia mesmo havendo dados (RLS fornecedor apenas). Não interpretar como homologação completa. Aplicar migração só após CI e revisão, sem permissões públicas.
