-- Proposta para homologacao: NAO aplicada automaticamente ao banco de producao.
-- A imagem binaria fica em Supabase Storage; somente metadados no Postgres.
create table if not exists public.product_images (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 storage_path text not null unique,
 mime_type text not null check (mime_type = 'image/webp'),
 size_bytes integer not null check (size_bytes between 1 and 5242880),
 created_at timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images(product_id);
alter table public.product_images enable row level security;
create policy "admin_product_images_select" on public.product_images for select to authenticated
 using ((select marketplace_private.is_verified_platform_admin()));
create policy "admin_product_images_insert" on public.product_images for insert to authenticated
 with check ((select marketplace_private.is_verified_platform_admin()) and storage_path like product_id::text || '/%');
create policy "admin_product_images_delete" on public.product_images for delete to authenticated
 using ((select marketplace_private.is_verified_platform_admin()));
create policy "buyer_product_images_select" on public.product_images for select to authenticated
 using (exists (select 1 from public.products p where p.id=product_images.product_id));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('provisio-produtos','provisio-produtos',false,5242880,array['image/webp'])
 on conflict (id) do nothing;
create policy "product_image_admin_upload" on storage.objects for insert to authenticated
 with check (bucket_id='provisio-produtos' and (select marketplace_private.is_verified_platform_admin())
   and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\\.webp$');
create policy "product_image_admin_read" on storage.objects for select to authenticated
 using (bucket_id='provisio-produtos' and (select marketplace_private.is_verified_platform_admin()));
create policy "product_image_admin_delete" on storage.objects for delete to authenticated
 using (bucket_id='provisio-produtos' and (select marketplace_private.is_verified_platform_admin()));
-- NOTA: imagens comerciais para compradores devem ser fornecidas por URL assinada,
-- somente apos verificacao de oferta autorizada. Nunca tornar o bucket publico sem revisao.
