-- =============================================================
-- 007_storage_logos.sql
-- Bucket público para logos de congregações
-- =============================================================

-- Cria o bucket se não existir
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'congregation-logos',
  'congregation-logos',
  true,                          -- leitura pública (URLs diretas funcionam)
  524288,                        -- 512 KB máximo por arquivo
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública de qualquer arquivo do bucket
create policy "logos_public_read"
  on storage.objects for select
  using (bucket_id = 'congregation-logos');

-- Upload somente por ADMIN_PLATAFORMA (verificado na route — a policy é extra defesa)
create policy "logos_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'congregation-logos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'ADMIN_PLATAFORMA'
        and is_active = true
    )
  );

-- Substituição de arquivo existente
create policy "logos_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'congregation-logos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'ADMIN_PLATAFORMA'
        and is_active = true
    )
  );

-- Remoção
create policy "logos_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'congregation-logos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'ADMIN_PLATAFORMA'
        and is_active = true
    )
  );
