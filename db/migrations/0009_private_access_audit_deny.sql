-- Politica de negação explicita na trilha privada: nenhuma leitura/escrita pelo browser.
-- Revogacoes de schema, tabelas e FORCE RLS permanecem a primeira barreira.
begin;
create policy access_audit_deny_client
on marketplace_private.access_audit
for all to authenticated using (false) with check (false);
commit;
