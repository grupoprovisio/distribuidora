# Pré-validação CSV — Fornecedor Provisio

- Rota privada /app/fornecedor/importar; acesso protegido pelo layout do fornecedor no servidor.
- Arquivo CSV é lido inteiramente no navegador, até 1 MB; não há POST nem gravação em banco.
- Parser do domínio previewAuthorizedCsv identifica SKU, produto, unidade, embalagem, preço em centavos, quantidade mínima e região.
- Exibe erros por linha e a prévia de 30 linhas válidas, com modelo para download.
- Fonte obrigatória SUPPLIER_CSV_AUTHORIZED. Não aceita VTEX/Atacadão como origem comercial.
- O arquivo de prévia é somente preparação: não concede aprovação nem publica ofertas.
- Páginas públicas Início, Sou comprador e Sou fornecedor, imagens, cards, textos e layout não alterados.
- Próximas fases: criar workflow administrativo de homologação, API autorizada para cadastrar lote por organização fornecedora, controle de duplicados idempotente e logs, após avaliação de RLS e risco LGPD.
