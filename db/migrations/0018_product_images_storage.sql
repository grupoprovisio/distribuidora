-- Imagens de produto privadas, armazenadas no Supabase Storage.
-- Metadados visiveis apenas por administrador ou comprador que ja pode ler o produto via RLS.
begin;
create table public.product_images (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete restrict,
 storage_path text not null unique,
 mime_type text not null check (mime_type = 'image/webp'),
 size_bytes integer not null check (size_bytes between 1 and 5242880),
 created_at timestamptz not null default now(),
 constraint product_image_path_ck check (
  storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
  and split_part(storage_path, '/', 1) = product_id::text
 )
);
create index product_images_product_created_idx on public.product_images(product_id,created_at desc);
alter table public.product_images enable row level security;
alter table public.product_images force row level security;
grant select on public.product_images to authenticated;
grant insert(product_id,storage_path,mime_type,size_bytes) on public.product_images to authenticated;
grant delete on public.product_images to authenticated;
create policy product_images_admin_read on public.product_images for select to authenticated
 using ((select marketplace_private.is_verified_platform_admin()));
create policy product_images_admin_insert on public.product_images for insert to authenticated
 with check ((select marketplace_private.is_verified_platform_admin()));
create policy product_images_admin_delete on public.product_images for delete to authenticated
 using ((select marketplace_private.is_verified_platform_admin()));
-- A leitura de products e controlada por RLS; nenhuma imagem de produto sem oferta elegivel e exposta.
create policy product_images_buyer_eligible on public.product_images for select to authenticated
 using (exists(select 1 from public.products p where p.id=product_id));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('provisio-produtos','provisio-produtos',false,5242880,array['image/webp'])
 on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/webp'];
create policy provisio_product_upload_admin on storage.objects for insert to authenticated
 with check (
  bucket_id='provisio-produtos' and (select marketplace_private.is_verified_platform_admin())
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
 );
create policy provisio_product_read_admin on storage.objects for select to authenticated
 using (bucket_id='provisio-produtos' and (select marketplace_private.is_verified_platform_admin()));
create policy provisio_product_read_buyer on storage.objects for select to authenticated
 using (bucket_id='provisio-produtos' and exists (
  select 1 from public.product_images pi where pi.storage_path=name
 ));
create policy provisio_product_delete_admin on storage.objects for delete to authenticated
 using (bucket_id='provisio-produtos' and (select marketplace_private.is_verified_platform_admin()));
commit;
