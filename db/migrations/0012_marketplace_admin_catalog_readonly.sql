-- Catalogo comercial Provisio: revisao READ-ONLY apenas para PLATFORM_ADMIN com MFA.
-- O helper privado valida perfil, vinculo, organizacao e sessao Auth AAL2.
-- A leitura por fornecedores permanece isolada. Nada e liberado para anon ou comprador.
begin;
create policy admin_catalog_products_read on public.products
  for select to authenticated
  using ((select marketplace_private.is_verified_platform_admin()));
create policy admin_catalog_supplier_products_read on public.supplier_products
  for select to authenticated
  using ((select marketplace_private.is_verified_platform_admin()));
create policy admin_catalog_offers_read on public.offers
  for select to authenticated
  using ((select marketplace_private.is_verified_platform_admin()));
create policy admin_catalog_offer_regions_read on public.offer_regions
  for select to authenticated
  using ((select marketplace_private.is_verified_platform_admin()));
create policy admin_catalog_price_tiers_read on public.offer_price_tiers
  for select to authenticated
  using ((select marketplace_private.is_verified_platform_admin()));
create policy admin_catalog_inventory_read on public.inventory_positions
  for select to authenticated
  using ((select marketplace_private.is_verified_platform_admin()));
-- Nenhum grant de escrita. A autenticacao AAL2 e a RLS continuam obrigatorias.
commit;
