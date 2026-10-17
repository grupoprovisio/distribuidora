-- Supabase Provisio: indices para chaves estrangeiras compostas e convites.
-- Operacao aditiva, sem acesso publico e sem alteracao de dados.
begin;
create index if not exists offers_supplier_product_org_fk_idx
  on public.offers (supplier_product_id, supplier_org_id);
create index if not exists inventory_positions_product_org_fk_idx
  on public.inventory_positions (supplier_product_id, supplier_org_id);
create index if not exists organization_members_invited_by_fk_idx
  on public.organization_members (invited_by) where invited_by is not null;
commit;
