import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const BUCKET      = 'congregation-logos'
const MAX_BYTES   = 512 * 1024           // 512 KB
const ALLOWED     = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth: somente ADMIN_PLATAFORMA
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'ADMIN_PLATAFORMA') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params

  // Parse multipart
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Campo "file" obrigatório' }, { status: 400 })
  }

  // Validações
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: `Tipo não suportado. Use: ${ALLOWED.join(', ')}` },
      { status: 422 }
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Arquivo muito grande. Máximo: 512 KB' },
      { status: 422 }
    )
  }

  // Extensão segura
  const extMap: Record<string, string> = {
    'image/png':     'png',
    'image/jpeg':    'jpg',
    'image/webp':    'webp',
    'image/svg+xml': 'svg',
  }
  const ext      = extMap[file.type] ?? 'png'
  const path     = `${id}/logo.${ext}`                // ex: <uuid>/logo.png
  const buffer   = Buffer.from(await file.arrayBuffer())

  // Upload com service role (bypassa RLS de storage)
  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,            // substitui se já existir
    })

  if (uploadError) {
    console.error('[logo upload]', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // URL pública
  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)

  // Atualiza congregação com a nova URL
  const supabase = await createClient()
  const { error: updateError } = await supabase
    .from('congregations')
    .update({ logo_url: publicUrl })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ url: publicUrl })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'ADMIN_PLATAFORMA') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const admin   = createAdminClient()

  // Remove todos os arquivos de logo desta congregação
  const { data: files } = await admin.storage.from(BUCKET).list(id)
  if (files && files.length > 0) {
    await admin.storage.from(BUCKET).remove(files.map(f => `${id}/${f.name}`))
  }

  // Limpa o campo no banco
  const supabase = await createClient()
  await supabase.from('congregations').update({ logo_url: null }).eq('id', id)

  return NextResponse.json({ success: true })
}
