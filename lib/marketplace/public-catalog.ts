import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';
type Row = Database['public']['Functions']['provisio_public_product_showcase']['Returns'][number];
/** Reads only the existing anonymous showcase; never substitutes privileged table reads. */
export const publicCatalog = cache(async () => {
  const db = await createClient();
  const rows: Row[] = [];
  for (let offset = 0; offset < 10000; offset += 50) {
    const {data,error} = await db.rpc('provisio_public_product_showcase', {p_search:'',p_limit:50,p_offset:offset});
    if (error) throw new Error('Catálogo indisponível');
    rows.push(...(data ?? []));
    if (!data || data.length < 50) return rows;
  }
  throw new Error('Catálogo excede o limite de consulta');
});
export async function publicPhoto(row:Row) {
  if (!row.image_storage_path) return null;
  const db = await createClient();
  const result = await db.storage.from('provisio-produtos').createSignedUrl(row.image_storage_path,300);
  return result.data?.signedUrl ?? null;
}
export type PublicProduct = {slug:string;name:string;category:string;regions:string[];imageUrl:string|null};
export async function publicProduct(row:Row):Promise<PublicProduct> {
  return {slug:row.slug,name:row.product_name,category:row.category_name,regions:row.regions ?? [],imageUrl:await publicPhoto(row)};
}
