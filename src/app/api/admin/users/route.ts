import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile || !['ADMIN_PLATAFORMA', 'ADMIN_DISCIPULADO'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.email || !body.password || !body.name) {
    return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios' }, { status: 400 })
  }

  // Admin de discipulado não pode criar admin de plataforma
  if (profile.role !== 'ADMIN_PLATAFORMA' && body.role === 'ADMIN_PLATAFORMA') {
    return NextResponse.json({ error: 'Sem permissão para criar admin de plataforma' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      name: body.name,
      role: body.role ?? 'DISCIPULADOR',
      congregation_id: body.congregation_id ?? profile.congregation_id,
    },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true }, { status: 201 })
}
